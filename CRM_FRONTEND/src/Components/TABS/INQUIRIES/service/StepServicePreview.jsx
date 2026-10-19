import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ClipboardList,
  Loader2,
  Send,
  CreditCard,
  FileText,
} from 'lucide-react';
import {
  selectWizard,
  setWizardStep,
  resetWizard,
  patchWizard,
} from '../../../../REDUX_FEATURES/REDUX_SLICES/Inquiry_api/inquirySlice';
import { normalizeInquiryCurrency } from '../../../../constants/currencies';
import {
  inquiryApi,
  useSendInquiryMutation,
  useGetInquiryQuery,
} from '../../../../REDUX_FEATURES/REDUX_SLICES/Inquiry_api/inquiryApi';
import { useGetCompanyQuery } from '../../../../REDUX_FEATURES/REDUX_SLICES/User_api/userApi';
import { selectAccessToken } from '../../../../REDUX_FEATURES/REDUX_SLICES/Auth_api/authSlice';
import {
  connectSocket,
  disconnectSocket,
  subscribeInquiry,
  unsubscribeInquiry,
  getSocket,
} from '../../../../SERVICES/socket';
import { axiosInstance } from '../../../../SERVICES/AxiosInstance';
import { getErrorMessage } from '../../../../utils/getErrorMessage';
import {
  buildAuthorizationText,
  extractAuthFillsFromText,
  missingAuthFillLabels,
  renderAuthorizationHtml,
  resolveAuthFills,
} from '../../../../utils/buildAuthorizationText';
import { servicePurposeLabel } from '../../../../constants/serviceDispositions';
import WaitingConfirmModal from '../WaitingConfirmModal';

/**
 * Service authorize preview — no itinerary / passengers; purpose from disposition.
 */
const StepServicePreview = ({ onDone }) => {
  const dispatch = useDispatch();
  const [, setSearchParams] = useSearchParams();
  const wizard = useSelector(selectWizard);
  const accessToken = useSelector(selectAccessToken);
  const [sendInquiry, { isLoading }] = useSendInquiryMutation();
  const [waiting, setWaiting] = useState(false);
  const [sentInquiry, setSentInquiry] = useState(null);
  const [requestDoc, setRequestDoc] = useState(false);
  const [docLabel, setDocLabel] = useState('');
  const authEditedRef = useRef(false);

  const { data: inquiryRes } = useGetInquiryQuery(wizard.inquiryId, {
    skip: !wizard.inquiryId,
  });
  const { data: companyRes } = useGetCompanyQuery();
  const inquiryMeta = inquiryRes?.data?.inquiry;
  const sourceDisposition = inquiryMeta?.sourceDisposition || '';
  const agencyName =
    String(companyRes?.data?.agency?.name || '').trim() ||
    'Airline Ticket Booking';

  const cost = Number(wizard.costPrice || 0);
  const markup = Number(wizard.markup || 0);
  const grandTotal = Math.round((cost + markup) * 100) / 100;
  const currency = normalizeInquiryCurrency(wizard.currency);
  const billing = wizard.billing || {};

  const authorizerName = useMemo(() => {
    return (
      billing.cardholderName ||
      [wizard.customer?.firstName, wizard.customer?.middleName, wizard.customer?.lastName]
        .filter(Boolean)
        .join(' ')
        .trim()
    );
  }, [
    billing.cardholderName,
    wizard.customer?.firstName,
    wizard.customer?.middleName,
    wizard.customer?.lastName,
  ]);

  const purpose = useMemo(() => {
    return servicePurposeLabel(sourceDisposition) || 'travel service fee';
  }, [sourceDisposition]);

  const defaultFills = useMemo(
    () =>
      resolveAuthFills({
        authorizerName,
        agencyName,
        currency,
        total: grandTotal,
        purpose,
      }),
    [authorizerName, agencyName, currency, grandTotal, purpose]
  );

  const defaultAuthText = useMemo(
    () =>
      buildAuthorizationText({
        authorizerName,
        agencyName,
        currency,
        total: grandTotal,
        purpose,
      }),
    [authorizerName, agencyName, currency, grandTotal, purpose]
  );

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

    const inquiryId = String(sentInquiry._id);
    let settled = false;

    const finishAuthorized = (id) => {
      if (settled) return;
      settled = true;
      toast.success('Customer authorized');
      dispatch(
        inquiryApi.util.invalidateTags([
          { type: 'Inquiry', id },
          'Inquiries',
          'InquiryMargin',
        ])
      );
      setWaiting(false);
      unsubscribeInquiry(inquiryId);
      disconnectSocket();
      dispatch(resetWizard());
      setSearchParams({ tab: 'inquiries', inquiryId: id });
    };

    const socket = connectSocket(accessToken);
    subscribeInquiry(inquiryId);

    const onAuthorized = (payload) => {
      if (String(payload?.inquiryId) !== inquiryId) return;
      finishAuthorized(payload.inquiryId);
    };

    socket.on('inquiry:authorized', onAuthorized);
    socket.on('inquiry:confirmed', onAuthorized);

    const pollOnce = async () => {
      if (settled) return;
      try {
        const res = await axiosInstance.get(`/inquiries/${inquiryId}`);
        if (res.data?.data?.inquiry?.status === 'authorized') {
          finishAuthorized(inquiryId);
        }
      } catch {
        // ignore transient poll errors while waiting
      }
    };
    const pollKick = setTimeout(pollOnce, 2000);
    const pollTimer = setInterval(pollOnce, 4000);

    return () => {
      settled = true;
      clearTimeout(pollKick);
      clearInterval(pollTimer);
      getSocket()?.off('inquiry:authorized', onAuthorized);
      getSocket()?.off('inquiry:confirmed', onAuthorized);
      unsubscribeInquiry(inquiryId);
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
        `Applied, but could not underline: ${missing.join(', ')}. Keep the sentence shape (I, NAME, hereby authorize AGENCY…).`
      );
      return;
    }
    toast.success('Underlines updated from your text');
  };

  const handleSend = async () => {
    if (!wizard.inquiryId) {
      toast.error('Missing inquiry');
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

    let docRequest = { mode: 'none', slots: [] };
    if (requestDoc) {
      const label = String(docLabel || '').trim() || 'Document';
      docRequest = {
        mode: 'agent_selected',
        slots: [
          {
            key: 'doc__cardholder',
            role: 'cardholder',
            label,
            docKind: 'document',
          },
        ],
      };
    }

    try {
      const body = {
        customer: wizard.customer,
        travel: {
          from: '',
          to: '',
          fromLabel: '',
          toLabel: '',
          departureDate: null,
          returnDate: null,
          passengers: 1,
          adults: 1,
          children: 0,
          infantsInSeat: 0,
          infantsOnLap: 0,
          cabinClass: 'economy',
        },
        selectedOffer: null,
        markup,
        costPrice: cost,
        currency: normalizeInquiryCurrency(wizard.currency),
        passengers: [],
        billing: {
          phone: billing.phone || '',
          address: billing.address || '',
          city: billing.city || '',
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
        docRequest,
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
              Service fee authorize — no flight itinerary. Purpose:{' '}
              <span className="font-semibold text-slate-700">{purpose}</span>
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Customer
            </p>
            <p className="text-sm font-medium text-slate-900">
              {[
                wizard.customer.firstName,
                wizard.customer.middleName,
                wizard.customer.lastName,
              ]
                .filter(Boolean)
                .join(' ')}
            </p>
            <p className="mt-0.5 text-sm text-slate-600">
              {wizard.customer.email}
              {wizard.customer.phone ? ` · ${wizard.customer.phone}` : ''}
            </p>
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
                {billing.cardholderName || '—'}
                {billing.phone ? ` · ${billing.phone}` : ''}
              </p>
              <p className="text-slate-600">
                {[billing.address, billing.city, billing.state, billing.zip, billing.country]
                  .filter(Boolean)
                  .join(', ') || '—'}
              </p>
              <p>
                {billing.cardType || 'Card'}{' '}
                {billing.last4 ? `•••• ${billing.last4}` : ''}
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
                <span>Markup</span>
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
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Supporting document
            </p>
            <label className="flex cursor-pointer items-start gap-2.5 text-sm text-slate-800">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                checked={requestDoc}
                onChange={(e) => setRequestDoc(e.target.checked)}
              />
              <span>
                Request a supporting document on the customer authorize page
                <span className="mt-0.5 block text-xs font-normal text-slate-500">
                  Off by default. Turn on for cases like pet papers or ID.
                </span>
              </span>
            </label>
            {requestDoc && (
              <div className="mt-3">
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  Document label (shown to customer)
                </label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="e.g. Pet vaccination certificate or Document"
                  value={docLabel}
                  onChange={(e) => setDocLabel(e.target.value)}
                />
              </div>
            )}
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
                Apply underline changes
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          onClick={() => dispatch(setWizardStep(2))}
        >
          Edit Billing
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

export default StepServicePreview;
