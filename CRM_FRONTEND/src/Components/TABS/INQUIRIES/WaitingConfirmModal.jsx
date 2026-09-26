import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Mail, ArrowLeft, Loader2, AlertTriangle } from 'lucide-react';
import InquiryCloseFormBody from './InquiryCloseFormBody';
import { useCloseInquiryMutation } from '../../../REDUX_FEATURES/REDUX_SLICES/Inquiry_api/inquiryApi';
import { CLOSE_SOURCES } from '../../../constants/dispositions';
import { getErrorMessage } from '../../../utils/getErrorMessage';

const WaitingConfirmModal = ({ open, inquiry, email, onClosed }) => {
  const [showReason, setShowReason] = useState(false);
  const [values, setValues] = useState({ reason: '' });
  const [closeInquiry, { isLoading }] = useCloseInquiryMutation();

  if (!open || !inquiry) return null;

  const handleCloseWait = async () => {
    if (!values.reason.trim()) {
      toast.error('Reason is required');
      return;
    }
    try {
      await closeInquiry({
        id: inquiry._id || inquiry,
        body: {
          reason: values.reason.trim(),
          source: CLOSE_SOURCES.WAITING_MODAL,
        },
      }).unwrap();
      toast.success('Waiting closed — reason saved');
      onClosed?.();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to close'));
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div
        className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col"
        role="dialog"
        aria-modal="true"
      >
        {!showReason ? (
          <div className="text-center p-6 sm:p-8 flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 mb-4">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>

            <h2 className="text-lg font-bold text-slate-900 mb-1">
              Awaiting Customer Confirmation
            </h2>

            <p className="text-xs text-slate-500 mb-3">
              Quotation & preview itinerary link dispatched to:
            </p>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 border border-slate-200 rounded-md font-semibold text-xs text-slate-800 mb-2">
              <Mail className="w-3.5 h-3.5 text-slate-500" />
              {email || inquiry?.customer?.email || '—'}
            </div>

            <p className="text-[11px] text-slate-400 mb-5">
              Reference: <span className="font-mono text-sky-600 font-semibold">{inquiry?.inquiryReference || '—'}</span>
            </p>

            <button
              type="button"
              onClick={() => setShowReason(true)}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 bg-white hover:bg-rose-50 border border-rose-200 hover:border-rose-300 px-3.5 py-2 rounded-lg transition-colors cursor-pointer shadow-xs"
            >
              Customer Disconnected / End Session
            </button>
          </div>
        ) : (
          <>
            <div className="p-4 sm:px-6 border-b border-slate-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Close Waiting Session</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Record reason before closing active customer session
                </p>
              </div>
            </div>

            <div className="p-4 sm:p-6 space-y-3">
              <p className="text-xs text-slate-500 leading-relaxed">
                Agents cannot confirm on behalf of the customer. Please state why this session is ending.
              </p>

              <InquiryCloseFormBody
                values={values}
                onChange={setValues}
              />
            </div>

            <div className="py-3 px-4 sm:px-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowReason(false)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-600 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={handleCloseWait}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-60 rounded-lg border border-rose-600 transition-colors shadow-xs cursor-pointer"
              >
                {isLoading ? 'Closing…' : 'Confirm Close'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default WaitingConfirmModal;
