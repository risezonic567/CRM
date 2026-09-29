import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  patchWizard,
  selectWizard,
  setWizardStep,
} from '../../../../REDUX_FEATURES/REDUX_SLICES/Inquiry_api/inquirySlice';

const StepBilling = () => {
  const dispatch = useDispatch();
  const wizard = useSelector(selectWizard);
  const b = wizard.billing;

  const set = (field) => (e) =>
    dispatch(patchWizard({ billing: { ...b, [field]: e.target.value } }));

  return (
    <div className="space-y-3">
      <h3 className="font-medium text-slate-800">Billing details</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          className="rounded-md border px-3 py-2 text-sm"
          placeholder="Billing phone"
          value={b.phone}
          onChange={set('phone')}
          type="tel"
        />
        <input
          className="rounded-md border px-3 py-2 text-sm sm:col-span-2"
          placeholder="Billing address"
          value={b.address}
          onChange={set('address')}
          type="text"
        />
        <input
          className="rounded-md border px-3 py-2 text-sm"
          placeholder="State"
          value={b.state}
          onChange={set('state')}
          type="text"
        />
        <input
          className="rounded-md border px-3 py-2 text-sm"
          placeholder="Zip"
          value={b.zip}
          onChange={set('zip')}
          type="text"
        />
        <input
          className="rounded-md border px-3 py-2 text-sm"
          placeholder="Country"
          value={b.country}
          onChange={set('country')}
          type="text"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          className="rounded-md border px-4 py-2 text-sm"
          onClick={() => dispatch(setWizardStep(3))}
        >
          Back
        </button>
        <button
          type="button"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white"
          onClick={() => dispatch(setWizardStep(5))}
        >
          Next → Preview
        </button>
      </div>
    </div>
  );
};

export default StepBilling;
