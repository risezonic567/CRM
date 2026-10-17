import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Wallet, X, Loader2 } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { useRecordCallPricingMutation } from '../../../REDUX_FEATURES/REDUX_SLICES/Call_api/callApi';
import { inquiryApi } from '../../../REDUX_FEATURES/REDUX_SLICES/Inquiry_api/inquiryApi';
import {
  POPULAR_INQUIRY_CURRENCIES,
  currencyOptionLabel,
  normalizeInquiryCurrency,
} from '../../../constants/currencies';
import { getErrorMessage } from '../../../utils/getErrorMessage';
import { can } from '../../roles';

/**
 * Record supplier + markup on a call (backfill before full service wizard).
 * Payment received → inquiry authorized → Dashboard Margin Collected.
 */
const CallMarkupModal = ({ open, call, onClose }) => {
  const dispatch = useDispatch();
  const [recordPricing, { isLoading }] = useRecordCallPricingMutation();

  const existing = call?.inquiryId?.pricing;
  const [currency, setCurrency] = useState('USD');
  const [supplier, setSupplier] = useState('');
  const [markup, setMarkup] = useState('');
  const [paymentReceived, setPaymentReceived] = useState(true);

  useEffect(() => {
    if (!open || !call) return;
    setCurrency(normalizeInquiryCurrency(existing?.currency));
    setSupplier(
      existing?.costPrice != null && existing.costPrice !== ''
        ? String(existing.costPrice)
        : ''
    );
    setMarkup(
      existing?.markup != null && existing.markup !== ''
        ? String(existing.markup)
        : ''
    );
    // Default on for backfill so Margin Collected updates when payment already taken
    setPaymentReceived(true);
  }, [open, call, existing?.currency, existing?.costPrice, existing?.markup]);

  const total = useMemo(() => {
    const s = Number(supplier) || 0;
    const m = Number(markup) || 0;
    return Math.round((s + m) * 100) / 100;
  }, [supplier, markup]);

  if (!open || !call) return null;

  const handleSave = async () => {
    if (!can('call.create')) {
      toast.error('Viewers cannot record markup');
      return;
    }
    const costPrice = Number(supplier);
    const markupNum = Number(markup);
    if (!Number.isFinite(costPrice) || costPrice < 0) {
      toast.error('Enter a valid supplier price');
      return;
    }
    if (!Number.isFinite(markupNum) || markupNum < 0) {
      toast.error('Enter a valid markup');
      return;
    }

    try {
      const res = await recordPricing({
        id: call._id,
        body: {
          costPrice,
          markup: markupNum,
          currency: normalizeInquiryCurrency(currency),
          paymentReceived,
        },
      }).unwrap();
      toast.success(res.message || 'Markup saved');
      dispatch(
        inquiryApi.util.invalidateTags([
          'InquiryMargin',
          'Inquiries',
          'Inquiry',
        ])
      );
      onClose?.();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to save markup'));
    }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="p-4 sm:px-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800">
              <Wallet className="w-4 h-4" strokeWidth={1.8} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Record Markup</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Supplier + markup for this call. Payment received counts toward Margin Collected.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 w-7 h-7 rounded-md flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-3.5">
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-semibold text-slate-700">Currency *</span>
            <select
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 focus:border-sky-600 focus:outline-none"
              value={currency}
              onChange={(e) => setCurrency(normalizeInquiryCurrency(e.target.value))}
            >
              {POPULAR_INQUIRY_CURRENCIES.map((code) => (
                <option key={code} value={code}>
                  {currencyOptionLabel(code)}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-semibold text-slate-700">
                Supplier price ({currency})
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-sky-600 focus:outline-none"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-semibold text-slate-700">
                Markup ({currency})
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-sky-600 focus:outline-none"
                value={markup}
                onChange={(e) => setMarkup(e.target.value)}
              />
            </label>
          </div>

          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
            <span className="font-semibold text-slate-600">Total (customer)</span>
            <p className="mt-0.5 text-sm font-bold tabular-nums text-slate-900">
              {currency} {total.toFixed(2)}
            </p>
          </div>

          <label className="flex items-start gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
              checked={paymentReceived}
              onChange={(e) => setPaymentReceived(e.target.checked)}
            />
            <span className="text-xs text-slate-700">
              <span className="font-semibold">Payment received</span>
              <span className="block text-slate-500 mt-0.5">
                Count this markup in Dashboard → Margin Collected (marks inquiry authorized).
              </span>
            </span>
          </label>
        </div>

        <div className="py-3 px-4 sm:px-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-medium text-slate-600 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors cursor-pointer shadow-xs"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed rounded-lg border border-slate-900 transition-colors shadow-xs cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Saving…
              </>
            ) : (
              'Save Markup'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CallMarkupModal;
