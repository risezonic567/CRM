import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
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

  return (
    <div className="space-y-4">
      <h3 className="font-medium text-slate-800">Preview (staff)</h3>
      <div className="space-y-2 rounded-lg border border-slate-200 p-4 text-sm">
        <p>
          <strong>Customer:</strong> {wizard.customer.firstName}{' '}
          {wizard.customer.lastName} · {wizard.customer.email}
        </p>
        <p>
          <strong>Route:</strong> {wizard.travel.from} → {wizard.travel.to}
        </p>
        <p>
          <strong>Passengers:</strong>{' '}
          {(wizard.passengers || [])
            .map((p) => `${p.firstName} ${p.lastName}`)
            .join(', ')}
        </p>
        <hr />
        <p>
          Base fare: {wizard.currency} {cost.toFixed(2)}
        </p>
        <p>
          Agency fee: {wizard.currency} {markup.toFixed(2)}
        </p>
        <p className="text-base font-semibold">
          Grand total (customer pays): {wizard.currency} {grandTotal.toFixed(2)}
        </p>
        <hr />
        <p>
          Merchant fee ({safePercent}% of grand total): {wizard.currency}{' '}
          {merchantFee.toFixed(2)}
        </p>
        <p className="text-xs text-slate-600">
          Agency net after merchant fee: {wizard.currency} {agencyNet.toFixed(2)}
        </p>
        <p className="text-xs text-slate-500">
          Merchant fee is staff accounting only — it is not deducted from the
          customer total in the email.
        </p>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          className="rounded-md border px-4 py-2 text-sm"
          onClick={() => dispatch(setWizardStep(4))}
        >
          Edit Details
        </button>
        <button
          type="button"
          disabled={isLoading}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-60"
          onClick={handleSend}
        >
          {isLoading ? 'Sending…' : 'Send to Customer'}
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
