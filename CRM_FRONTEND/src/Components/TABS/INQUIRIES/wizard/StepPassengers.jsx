import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  patchWizard,
  selectWizard,
  setWizardStep,
} from '../../../../REDUX_FEATURES/REDUX_SLICES/Inquiry_api/inquirySlice';
import { PASSENGER_TYPES } from '../../../../constants/dispositions';

const blankPax = () => ({
  firstName: '',
  lastName: '',
  middleName: '',
  dob: '',
  email: '',
  phone: '',
  documentType: '',
  documentNumber: '',
  type: 'adult',
});

const StepPassengers = () => {
  const dispatch = useDispatch();
  const wizard = useSelector(selectWizard);
  const passengers =
    wizard.passengers?.length > 0 ? wizard.passengers : [blankPax()];

  const update = (list) => dispatch(patchWizard({ passengers: list }));

  const setField = (idx, field, value) => {
    const next = passengers.map((p, i) =>
      i === idx ? { ...p, [field]: value } : p
    );
    update(next);
  };

  return (
    <div className="space-y-4">
      <h3 className="font-medium text-slate-800">Passenger details</h3>
      {passengers.map((p, idx) => (
        <div key={idx} className="rounded-lg border border-slate-200 p-3 space-y-2">
          <p className="text-xs font-medium text-slate-500">Passenger {idx + 1}</p>
          <div className="grid gap-2 sm:grid-cols-3">
            <input
              className="rounded border px-2 py-1.5 text-sm"
              placeholder="First *"
              value={p.firstName}
              onChange={(e) => setField(idx, 'firstName', e.target.value)}
              type="text"
            />
            <input
              className="rounded border px-2 py-1.5 text-sm"
              placeholder="Middle"
              value={p.middleName}
              onChange={(e) => setField(idx, 'middleName', e.target.value)}
              type="text"
            />
            <input
              className="rounded border px-2 py-1.5 text-sm"
              placeholder="Last *"
              value={p.lastName}
              onChange={(e) => setField(idx, 'lastName', e.target.value)}
            />
            <input
              type="date"
              className="rounded border px-2 py-1.5 text-sm"
              value={p.dob || ''}
              onChange={(e) => setField(idx, 'dob', e.target.value)}
            />
            <input
              className="rounded border px-2 py-1.5 text-sm"
              placeholder="Email"
              value={p.email}
              onChange={(e) => setField(idx, 'email', e.target.value)}
              type="email"
            />
            <input
              className="rounded border px-2 py-1.5 text-sm"
              placeholder="Calling phone *"
              value={p.phone}
              onChange={(e) => setField(idx, 'phone', e.target.value)}
              type="tel"
            />
            <select
              className="rounded border px-2 py-1.5 text-sm"
              value={p.type}
              onChange={(e) => setField(idx, 'type', e.target.value)}
            >
              {PASSENGER_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <input
              className="rounded border px-2 py-1.5 text-sm"
              placeholder="Doc type (optional)"
              value={p.documentType}
              onChange={(e) => setField(idx, 'documentType', e.target.value)}
            />
            <input
              className="rounded border px-2 py-1.5 text-sm"
              placeholder="Doc number (optional)"
              value={p.documentNumber}
              onChange={(e) => setField(idx, 'documentNumber', e.target.value)}
            />
          </div>
        </div>
      ))}
      <button
        type="button"
        className="text-sm text-slate-700 underline"
        onClick={() => update([...passengers, blankPax()])}
      >
        + Add Passenger
      </button>
      <div className="flex gap-2">
        <button
          type="button"
          className="rounded-md border px-4 py-2 text-sm"
          onClick={() => dispatch(setWizardStep(2))}
        >
          Back
        </button>
        <button
          type="button"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white"
          onClick={() => {
            const ok = passengers.every(
              (p) => p.firstName && p.lastName && p.phone
            );
            if (!ok) return;
            update(passengers);
            dispatch(setWizardStep(4));
          }}
        >
          Next → Billing
        </button>
      </div>
    </div>
  );
};

export default StepPassengers;
