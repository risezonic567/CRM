import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { PhoneCall, X, Loader2 } from 'lucide-react';
import CallDispositionFormBody from './CallDispositionFormBody';
import { useCreateCallMutation } from '../../../REDUX_FEATURES/REDUX_SLICES/Call_api/callApi';
import { startWizard } from '../../../REDUX_FEATURES/REDUX_SLICES/Inquiry_api/inquirySlice';
import { can } from '../../roles';
import { getErrorMessage } from '../../../utils/getErrorMessage';

const empty = {
  callerName: '',
  phoneNumber: '',
  disposition: '',
  remarks: '',
};

/**
 * Add-only disposition modal — owns createCall API.
 */
const CallDispositionModal = ({ open, onClose }) => {
  const dispatch = useDispatch();
  const [, setSearchParams] = useSearchParams();
  const [values, setValues] = useState(empty);
  const [createCall, { isLoading }] = useCreateCallMutation();

  if (!open) return null;

  const validate = () => {
    if (!values.disposition) return 'Please select a call disposition';
    // Remarks required for every disposition except new booking
    if (
      values.disposition &&
      values.disposition !== 'new_booking' &&
      !values.remarks.trim()
    ) {
      return 'Remarks are required for this disposition';
    }
    return null;
  };

  const handleSave = async () => {
    if (!can('call.create')) {
      toast.error('Viewers cannot create calls');
      return;
    }
    const validationError = validate();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      const res = await createCall(values).unwrap();
      const data = res.data;
      toast.success(res.message || 'Call recorded successfully');

      if (data?.openWizard && data?.inquiry?._id) {
        dispatch(
          startWizard({
            inquiryId: data.inquiry._id,
            phone: values.phoneNumber || '',
          })
        );
        setSearchParams({
          tab: 'inquiries',
          wizard: '1',
          inquiryId: data.inquiry._id,
        });
      } else {
        setSearchParams({ tab: 'calls' });
      }

      setValues(empty);
      onClose?.();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to save call'));
    }
  };

  const handleClose = () => {
    onClose?.();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4" onClick={handleClose}>
      <div
        className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-4 sm:px-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800">
              <PhoneCall className="w-4 h-4" strokeWidth={1.8} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Record Call Disposition</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Capture inbound notes & trigger automated inquiry if booking requested
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 w-7 h-7 rounded-md flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-4 sm:p-6">
          <CallDispositionFormBody
            values={values}
            onChange={setValues}
          />
        </div>

        {/* Footer */}
        <div className="py-3 px-4 sm:px-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={handleClose}
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
                Recording…
              </>
            ) : (
              'Save & Record'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CallDispositionModal;
