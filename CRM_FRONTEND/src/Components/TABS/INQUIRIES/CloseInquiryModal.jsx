import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle, X } from 'lucide-react';
import InquiryCloseFormBody from './InquiryCloseFormBody';
import { useCloseInquiryMutation } from '../../../REDUX_FEATURES/REDUX_SLICES/Inquiry_api/inquiryApi';
import { CLOSE_SOURCES } from '../../../constants/dispositions';
import { getErrorMessage } from '../../../utils/getErrorMessage';

/**
 * List-row close: required reason → POST /inquiries/:id/close → status cancelled.
 */
const CloseInquiryModal = ({ open, inquiry, onClose, onClosed }) => {
  const [values, setValues] = useState({ reason: '' });
  const [closeInquiry, { isLoading }] = useCloseInquiryMutation();

  useEffect(() => {
    if (open) setValues({ reason: '' });
  }, [open, inquiry?._id]);

  if (!open || !inquiry) return null;

  const handleSubmit = async () => {
    if (!values.reason.trim()) {
      toast.error('Reason is required');
      return;
    }
    try {
      await closeInquiry({
        id: inquiry._id,
        body: {
          reason: values.reason.trim(),
          source: CLOSE_SOURCES.INQUIRIES_LIST,
        },
      }).unwrap();
      toast.success('Inquiry closed');
      onClosed?.();
      onClose?.();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to close inquiry'));
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div
        className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="close-inquiry-title"
      >
        <div className="p-4 sm:px-6 border-b border-slate-100 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2
                id="close-inquiry-title"
                className="text-base font-bold text-slate-900"
              >
                Close inquiry
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                {inquiry.inquiryReference || '—'}
                {inquiry.invoiceNumber ? ` · ${inquiry.invoiceNumber}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="w-7 h-7 rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 flex items-center justify-center cursor-pointer shrink-0"
            aria-label="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-3">
          <p className="text-xs text-slate-500 leading-relaxed">
            Ends this inquiry (status becomes Cancelled). Resume will no longer
            be available. Authorized bookings cannot be closed here.
          </p>
          <InquiryCloseFormBody values={values} onChange={setValues} />
        </div>

        <div className="py-3 px-4 sm:px-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-3.5 py-2 text-xs font-medium text-slate-600 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors cursor-pointer shadow-xs disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={handleSubmit}
            className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-60 rounded-lg border border-rose-600 transition-colors shadow-xs cursor-pointer"
          >
            {isLoading ? 'Closing…' : 'Confirm Close'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CloseInquiryModal;
