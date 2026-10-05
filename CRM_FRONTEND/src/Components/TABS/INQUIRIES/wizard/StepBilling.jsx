import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { CreditCard } from 'lucide-react';
import {
  patchWizard,
  selectWizard,
  setWizardStep,
} from '../../../../REDUX_FEATURES/REDUX_SLICES/Inquiry_api/inquirySlice';

const fieldClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100';

const labelClass = 'mb-1 block text-xs font-medium text-slate-500';

const StepBilling = () => {
  const dispatch = useDispatch();
  const wizard = useSelector(selectWizard);
  const b = wizard.billing;

  const set = (field) => (e) =>
    dispatch(patchWizard({ billing: { ...b, [field]: e.target.value } }));

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <CreditCard className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              Billing details
            </h3>
            <p className="mt-0.5 text-sm text-slate-500">
              Contact and address used for the inquiry billing record.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Billing phone</label>
              <input
                className={fieldClass}
                placeholder="Phone number"
                value={b.phone}
                onChange={set('phone')}
                type="tel"
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Billing address</label>
              <input
                className={fieldClass}
                placeholder="Street address"
                value={b.address}
                onChange={set('address')}
                type="text"
              />
            </div>
            <div>
              <label className={labelClass}>State</label>
              <input
                className={fieldClass}
                placeholder="State / province"
                value={b.state}
                onChange={set('state')}
                type="text"
              />
            </div>
            <div>
              <label className={labelClass}>Zip</label>
              <input
                className={fieldClass}
                placeholder="ZIP / postal code"
                value={b.zip}
                onChange={set('zip')}
                type="text"
              />
            </div>
            <div>
              <label className={labelClass}>Country</label>
              <input
                className={fieldClass}
                placeholder="Country"
                value={b.country}
                onChange={set('country')}
                type="text"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          onClick={() => dispatch(setWizardStep(3))}
        >
          Back
        </button>
        <button
          type="button"
          className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          onClick={() => dispatch(setWizardStep(5))}
        >
          Next → Preview
        </button>
      </div>
    </div>
  );
};

export default StepBilling;
