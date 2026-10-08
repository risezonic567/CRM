import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ClipboardList,
  Loader2,
  Plane,
  Send,
  Users,
  CreditCard,
  FileText,
} from 'lucide-react';
import {
  selectWizard,
  setWizardStep,
  resetWizard,
  patchWizard,
} from '../../../../REDUX_FEATURES/REDUX_SLICES/Inquiry_api/inquirySlice';
import { useSendInquiryMutation } from '../../../../REDUX_FEATURES/REDUX_SLICES/Inquiry_api/inquiryApi';
import { selectAccessToken } from '../../../../REDUX_FEATURES/REDUX_SLICES/Auth_api/authSlice';
import {
  connectSocket,
  disconnectSocket,
  subscribeInquiry,
  getSocket,
} from '../../../../SERVICES/socket';
import { getErrorMessage } from '../../../../utils/getErrorMessage';
import {
  buildAuthorizationText,
  extractAuthFillsFromText,
  missingAuthFillLabels,
  renderAuthorizationHtml,
  resolveAuthFills,
} from '../../../../utils/buildAuthorizationText';
import WaitingConfirmModal from '../WaitingConfirmModal';
import PnrItineraryTable from './PnrItineraryTable';

/**
 * Staff preview before sending authorization email.
 * Customer total = cost + markup only (no merchant fee).
 * Authorization text uses ONE total; staff pricing breakdown stays separate.
 */
const StepPreview = ({ onDone }) => {
  const dispatch = useDispatch();
  const [, setSearchParams] = useSearchParams();
  const wizard = useSelector(selectWizard);
  const accessToken = useSelector(selectAccessToken);
  const [sendInquiry, { isLoading }] = useSendInquiryMutation();
  const [waiting, setWaiting] = useState(false);
  const [sentInquiry, setSentInquiry] = useState(null);
  const authEditedRef = useRef(false);

  const cost = Number(wizard.costPrice || 0);
  const markup = Number(wizard.markup || 0);
  const grandTotal = Math.round((cost + markup) * 100) / 100;
  const currency = wizard.currency || 'USD';

  const segments =
    wizard.pnrSegments || wizard.selectedOffer?.raw?.segments || [];
  const isPnr =
    wizard.selectedOffer?.raw?.source === 'pnr' || segments.length > 0;
  const billing = wizard.billing || {};

  const authorizerName = useMemo(() => {
    return (
      billing.cardholderName ||
      [wizard.customer?.firstName, wizard.customer?.lastName]
        .filter(Boolean)
        .join(' ')
        .trim()
    );
  }, [billing.cardholderName, wizard.customer?.firstName, wizard.customer?.lastName]);

  const purpose = useMemo(() => {
    if (wizard.travel?.from && wizard.travel?.to) {
      return `${wizard.travel.from} to ${wizard.travel.to}`;
    }
    return 'the itinerary detailed above';
  }, [wizard.travel?.from, wizard.travel?.to]);

  const defaultFills = useMemo(
    () =>
      resolveAuthFills({
        authorizerName,
        agencyName: 'DEMO Travel Agency',
        currency,
        total: grandTotal,
        purpose,
      }),
    [authorizerName, currency, grandTotal, purpose]
  );

  const defaultAuthText = useMemo(
    () =>
      buildAuthorizationText({
        authorizerName,
        agencyName: 'DEMO Travel Agency',
        currency,
        total: grandTotal,
        purpose,
      }),
    [authorizerName, currency, grandTotal, purpose]
  );

  /** Prefer applied/saved fills so underlines survive agent edits. */
  const displayFills = useMemo(() => {
    const saved = wizard.authorizationFills;
    if (
      saved &&
      typeof saved === 'object' &&
      (saved.authorizerName || saved.amountLabel || saved.agencyName)
    ) {
      return {
        authorizerName: String(saved.authorizerName || '').trim(),
        agencyName: String(saved.agencyName || '').trim(),
        amountLabel: String(saved.amountLabel || '').trim(),
        purpose: String(saved.purpose || '').trim(),
        currency: String(saved.currency || '').trim(),
        amount: String(saved.amount || '').trim(),
      };
    }
    const plain = wizard.authorizationText || defaultAuthText;
    if (authEditedRef.current && plain) {
      return extractAuthFillsFromText(plain, defaultFills);
    }
    return defaultFills;
  }, [
    wizard.authorizationFills,
    wizard.authorizationText,
    defaultAuthText,
    defaultFills,
  ]);

  const authHtmlPreview = useMemo(
    () =>
      renderAuthorizationHtml(
        wizard.authorizationText || defaultAuthText,
        displayFills
      ),
    [wizard.authorizationText, defaultAuthText, displayFills]
  );

  // Seed / refresh auto text when inputs change, unless agent has edited it
  useEffect(() => {
    if (authEditedRef.current && wizard.authorizationText) return;
    if (wizard.authorizationText === defaultAuthText) return;
    dispatch(
      patchWizard({
        authorizationText: defaultAuthText,
        authorizationFills: defaultFills,
      })
    );
  }, [defaultAuthText, defaultFills, dispatch, wizard.authorizationText]);

  useEffect(() => {
    if (!waiting || !sentInquiry?._id || !accessToken) return undefined;

    const socket = connectSocket(accessToken);
    subscribeInquiry(sentInquiry._id);

    const onAuthorized = (payload) => {
      if (payload.inquiryId !== String(sentInquiry._id)) return;
      toast.success('Customer authorized the itinerary');
      setWaiting(false);
      disconnectSocket();
      dispatch(resetWizard());
      setSearchParams({ tab: 'inquiries', inquiryId: payload.inquiryId });
    };

    socket.on('inquiry:authorized', onAuthorized);
    socket.on('inquiry:confirmed', onAuthorized);
    return () => {
      getSocket()?.off('inquiry:authorized', onAuthorized);
      getSocket()?.off('inquiry:confirmed', onAuthorized);
    };
  }, [waiting, sentInquiry, accessToken, dispatch, setSearchParams]);

  const handleApplyAuthChanges = () => {
    const plain = (wizard.authorizationText || defaultAuthText).trim();
    if (!plain) {
      toast.error('Authorization text is empty');
      return;
    }
    const fills = extractAuthFillsFromText(plain, defaultFills);
    authEditedRef.current = true;
    dispatch(
      patchWizard({
        authorizationText: plain,
        authorizationFills: fills,
      })
    );
    const missing = missingAuthFillLabels(plain, fills);
    if (missing.length) {
      toast.error(
        `Applied, but could not underline: ${missing.join(', ')}. Keep the sentence shape (I, NAME, authorize AGENCY…).`
      );
      return;
    }
    toast.success('Underlines updated from your text');
  };

  const handleSend = async () => {
    if (!wizard.inquiryId || !wizard.selectedOffer) {
      toast.error('Missing inquiry or offer');
      return;
    }
    const authorizationText = (
      wizard.authorizationText || defaultAuthText
    ).trim();
    if (!authorizationText) {
      toast.error('Authorization text is required');
      return;
    }
    const authorizationFills =
      wizard.authorizationFills &&
      (wizard.authorizationFills.authorizerName ||
        wizard.authorizationFills.amountLabel)
        ? wizard.authorizationFills
        : extractAuthFillsFromText(authorizationText, defaultFills);

    try {
      const body = {
        customer: wizard.customer,
        travel: {
          ...wizard.travel,
          departureDate: wizard.travel.departureDate,
          returnDate: wizard.travel.returnDate || null,
        },
        selectedOffer: wizard.selectedOffer,
        markup,
        costPrice: cost,
        currency: wizard.currency || 'USD',
        passengers: wizard.passengers,
        billing: {
          phone: billing.phone || '',
          address: billing.address || '',
          state: billing.state || '',
          zip: billing.zip || '',
          country: billing.country || '',
          cardType: billing.cardType || '',
          cardholderName: billing.cardholderName || '',
          last4: billing.last4 || '',
          expiryMonth: billing.expiryMonth || '',
          expiryYear: billing.expiryYear || '',
        },
        notes: wizard.notes || '',
        authorizationText,
        authorizationFills,
      };

      const res = await sendInquiry({ id: wizard.inquiryId, body }).unwrap();
      const inquiry = res.data?.inquiry;
      toast.success('Authorization email sent to customer');
      setSentInquiry(inquiry);
      setWaiting(true);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Send failed'));
    }
  };

  const offer = wizard.selectedOffer;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <ClipboardList className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              Preview &amp; send authorization
            </h3>
            <p className="mt-0.5 text-sm text-slate-500">
              Customer email includes itinerary, billing, and this authorization
              text. They open the authorize page and click I Authorize — no
              checkbox. No auto receipt after authorize.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Customer
            </p>
            <p className="text-sm font-medium text-slate-900">
              {wizard.customer.firstName} {wizard.customer.lastName}
            </p>
            <p className="mt-0.5 text-sm text-slate-600">
              {wizard.customer.email}
              {wizard.customer.phone ? ` · ${wizard.customer.phone}` : ''}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <Plane className="h-4 w-4 text-slate-400" />
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Itinerary
              </p>
            </div>
            <p className="mb-2 text-sm font-medium text-slate-900">
              {wizard.travel.from} → {wizard.travel.to}
              {wizard.travel.returnDate ? ' · Round trip' : ' · One way'}
            </p>
            {isPnr ? (
              <PnrItineraryTable segments={segments} />
            ) : (
              <p className="text-sm text-slate-700">
                {offer?.airline?.name} {offer?.flightNumber}
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-400" />
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Passengers
              </p>
            </div>
            <ul className="space-y-1">
              {(wizard.passengers || []).map((p, i) => (
                <li key={i} className="text-sm text-slate-800">
                  {p.firstName} {p.lastName}
                  {p.type ? (
                    <span className="ml-1.5 text-xs capitalize text-slate-400">
                      ({p.type})
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-slate-400" />
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Billing
              </p>
            </div>
            <div className="space-y-1 text-sm text-slate-800">
              <p>
                {billing.phone || '—'}
                {billing.address ? ` · ${billing.address}` : ''}
              </p>
              <p className="text-slate-600">
                {[billing.state, billing.zip, billing.country]
                  .filter(Boolean)
                  .join(', ') || '—'}
              </p>
              <p>
                {billing.cardType || 'Card'}{' '}
                {billing.last4 ? `•••• ${billing.last4}` : ''}
                {billing.cardholderName ? ` · ${billing.cardholderName}` : ''}
                {billing.expiryMonth && billing.expiryYear
                  ? ` · ${billing.expiryMonth}/${billing.expiryYear}`
                  : ''}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Pricing (staff)
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Supplier price</span>
                <span className="tabular-nums font-medium text-slate-800">
                  {currency} {cost.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Agency fee</span>
                <span className="tabular-nums font-medium text-slate-800">
                  {currency} {markup.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-2 text-base font-semibold text-slate-900">
                <span>Total (customer)</span>
                <span className="tabular-nums">
                  {currency} {grandTotal.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-400" />
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Authorization text
                </p>
              </div>
              <button
                type="button"
                className="text-xs font-medium text-sky-700 hover:underline"
                onClick={() => {
                  authEditedRef.current = false;
                  dispatch(
                    patchWizard({
                      authorizationText: defaultAuthText,
                      authorizationFills: defaultFills,
                    })
                  );
                }}
              >
                Reset to auto-fill
              </button>
            </div>
            <p className="mb-2 text-xs text-slate-500">
              Filled values are underlined (name, agency, total, route). After
              editing plain text, click Apply changes so underlines update.
            </p>
            <div
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm leading-relaxed text-slate-800 [&_.auth-fill]:border-b [&_.auth-fill]:border-slate-900 [&_.auth-fill]:font-semibold [&_.auth-fill]:px-0.5"
              dangerouslySetInnerHTML={{ __html: authHtmlPreview }}
            />
            <label className="mt-3 mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Edit plain text (optional)
            </label>
            <textarea
              className="min-h-[110px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              value={wizard.authorizationText || ''}
              onChange={(e) => {
                authEditedRef.current = true;
                dispatch(patchWizard({ authorizationText: e.target.value }));
              }}
              spellCheck
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                onClick={handleApplyAuthChanges}
              >
                Apply changes
              </button>
            </div>
            <div className="mt-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center">
              <p className="text-base font-medium text-slate-800">
                {billing.cardholderName || authorizerName || '—'}
              </p>
              <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                Customer signature (cardholder name)
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          onClick={() => dispatch(setWizardStep(4))}
        >
          Edit Details
        </button>
        <button
          type="button"
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
          onClick={handleSend}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending…
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Send authorization
            </>
          )}
        </button>
      </div>

      <WaitingConfirmModal
        open={waiting}
        inquiry={sentInquiry}
        email={wizard.customer.email}
        onClosed={() => {
          setWaiting(false);
          disconnectSocket();
          onDone?.();
        }}
      />
    </div>
  );
};

export default StepPreview;
