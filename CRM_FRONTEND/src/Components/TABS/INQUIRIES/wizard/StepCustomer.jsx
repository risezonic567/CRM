import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  patchWizard,
  selectWizard,
  setWizardStep,
} from '../../../../REDUX_FEATURES/REDUX_SLICES/Inquiry_api/inquirySlice';

const StepCustomer = () => {
  const dispatch = useDispatch();
  const wizard = useSelector(selectWizard);
  const c = wizard.customer;

  const set = (field) => (e) =>
    dispatch(
      patchWizard({
        customer: { ...c, [field]: e.target.value },
      })
    );

  return (
    <div className="space-y-3">
      <h3 className="font-medium text-slate-800">Customer info</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          className="rounded-md border px-3 py-2 text-sm"
          placeholder="First Name *"
          value={c.firstName}
          onChange={set('firstName')}
          type="text"
        />
        <input
          className="rounded-md border px-3 py-2 text-sm"
          placeholder="Last Name *"
          value={c.lastName}
          onChange={set('lastName')}
          type="text"
        />
        <input
          className="rounded-md border px-3 py-2 text-sm"
          placeholder="Phone *"
          value={c.phone}
          onChange={set('phone')}
          type="tel"
        />
        <input
          className="rounded-md border px-3 py-2 text-sm"
          placeholder="Email *"
          value={c.email}
          onChange={set('email')}
          type="email"
        />
      </div>
      <button
        type="button"
        className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white"
        onClick={() => {
          if (!c.firstName || !c.lastName || !c.phone || !c.email) return;
          dispatch(setWizardStep(1));
        }}
      >
        Next
      </button>
    </div>
  );
};

export default StepCustomer;
