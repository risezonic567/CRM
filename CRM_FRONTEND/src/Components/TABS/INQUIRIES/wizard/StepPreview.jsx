import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ClipboardList, Loader2, Plane, Send, Users } from 'lucide-react';
import {
  selectWizard,
  setWizardStep,
  resetWizard,
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
import WaitingConfirmModal from '../WaitingConfirmModal';

/**
 * Pricing (matches backend calculatePricing):
 *   base (cost) + agency fee (markup) = customer grand total
 *   merchant fee = (base + agency) * MERCHANT_FEE_PERCENT / 100
 *   → staff-only; NOT deducted from what the customer pays
 */
const StepPreview = ({ onDone }) => {
  const dispatch = useDispatch();
  const [, setSearchParams] = useSearchParams();
  const wizard = useSelector(selectWizard);
  const accessToken = useSelector(selectAccessToken);
  const [sendInquiry, { isLoading }] = useSendInquiryMutation();
  const [waiting, setWaiting] = useState(false);
  const [sentInquiry, setSentInquiry] = useState(null);

  const cost = Number(wizard.costPrice || 0);
  const markup = Number(wizard.markup || 0);
  const feePercent = Number(wizard.merchantFeePercent);
  const safePercent =
    Number.isFinite(feePercent) && feePercent >= 0 ? feePercent : 2;
  const subtotal = Math.round((cost + markup) * 100) / 100;
  const merchantFee =
    Math.round(((subtotal * safePercent) / 100) * 100) / 100;
  const grandTotal = subtotal;
  const agencyNet = Math.round((subtotal - merchantFee) * 100) / 100;
  const currency = wizard.currency || 'USD';

  useEffect(() => {
    if (!waiting || !sentInquiry?._id || !accessToken) return undefined;

    const socket = connectSocket(accessToken);
    subscribeInquiry(sentInquiry._id);

    const onConfirmed = (payload) => {
      if (payload.inquiryId !== String(sentInquiry._id)) return;
      toast.success('Customer confirmed inquiry!');
      setWaiting(false);
      disconnectSocket();
      dispatch(resetWizard());
      setSearchParams({ tab: 'inquiries', inquiryId: payload.inquiryId });
    };

    socket.on('inquiry:confirmed', onConfirmed);
    return () => {
      getSocket()?.off('inquiry:confirmed', onConfirmed);
    };
  }, [waiting, sentInquiry, accessToken, dispatch, setSearchParams]);

  const handleSend = async () => {
    if (!wizard.inquiryId || !wizard.selectedOffer) {
      toast.error('Missing inquiry or offer');
      return;
    }
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
        billing: wizard.billing,
        notes: wizard.notes || '',
      };

      const res = await sendInquiry({ id: wizard.inquiryId, body }).unwrap();
      const inquiry = res.data?.inquiry;
      toast.success('Sent to customer');
      setSentInquiry(inquiry);
      setWaiting(true);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Send failed'));
    }
  };

  const offer = wizard.selectedOffer;
  const outbound = offer?.outbound || offer;
  const inbound = offer?.inbound;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <ClipboardList className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              Preview (staff)
            </h3>
            <p className="mt-0.5 text-sm text-slate-500">
              Review details before sending the inquiry to the customer.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {/* Customer */}
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

          {/* Flight */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <Plane className="h-4 w-4 text-slate-400" />
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Flight
              </p>
            </div>
            <p className="text-sm font-medium text-slate-900">
              {wizard.travel.from} → {wizard.travel.to}
              {wizard.travel.returnDate ? ' · Round trip' : ' · One way'}
            </p>
            {wizard.travel.departureDate && (
              <p className="mt-0.5 text-sm text-slate-600">
                Depart {wizard.travel.departureDate}
                {wizard.travel.returnDate
                  ? ` · Return ${wizard.travel.returnDate}`
                  : ''}
              </p>
            )}
            {outbound?.airline?.name && (
              <p className="mt-2 text-sm text-slate-700">
                Outbound:{' '}
                <span className="font-medium">
                  {outbound.airline?.name} {outbound.flightNumber}
                </span>
              </p>
            )}
            {inbound && (
              <p className="mt-1 text-sm text-slate-700">
                Return:{' '}
                <span className="font-medium">
                  {inbound.airline?.name} {inbound.flightNumber}
                </span>
                {' · '}
                {wizard.travel.to} → {wizard.travel.from}
              </p>
            )}
          </div>

          {/* Passengers */}
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

          {/* Pricing */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Pricing
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Base fare</span>
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
                <span>Grand total (customer pays)</span>
                <span className="tabular-nums">
                  {currency} {grandTotal.toFixed(2)}
                </span>
              </div>
              <div className="mt-2 rounded-xl bg-slate-50 px-3 py-2.5 text-xs text-slate-500">
                <p>
                  Merchant fee ({safePercent}% of grand total): {currency}{' '}
                  {merchantFee.toFixed(2)}
                </p>
                <p className="mt-1">
                  Agency net after merchant fee: {currency}{' '}
                  {agencyNet.toFixed(2)}
                </p>
                <p className="mt-1.5 text-slate-400">
                  Merchant fee is staff accounting only — it is not deducted from
                  the customer total in the email.
                </p>
              </div>
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
              Send to Customer
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
