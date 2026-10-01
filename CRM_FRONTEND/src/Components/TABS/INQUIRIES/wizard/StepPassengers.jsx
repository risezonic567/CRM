import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Plus, User, Users, X } from 'lucide-react';
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

const fieldClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100';

const labelClass = 'mb-1 block text-xs font-medium text-slate-500';

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

  const removePax = (idx) => {
    if (passengers.length <= 1) return;
    update(passengers.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              Passenger details
            </h3>
            <p className="mt-0.5 text-sm text-slate-500">
              Names should match travel documents. Phone is required for each
              passenger.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {passengers.map((p, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="mb-3 flex items-center gap-2">
                <User className="h-4 w-4 text-slate-400" />
                <p className="text-sm font-semibold text-slate-800">
                  Passenger {idx + 1}
                </p>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium capitalize text-slate-600">
                  {p.type || 'adult'}
                </span>
                {passengers.length > 1 && (
                  <button
                    type="button"
                    aria-label={`Remove passenger ${idx + 1}`}
                    title="Remove passenger"
                    className="ml-auto flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                    onClick={() => removePax(idx)}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className={labelClass}>First name *</label>
                  <input
                    className={fieldClass}
                    placeholder="First name"
                    value={p.firstName}
                    onChange={(e) => setField(idx, 'firstName', e.target.value)}
                    type="text"
                  />
                </div>
                <div>
                  <label className={labelClass}>Middle name</label>
                  <input
                    className={fieldClass}
                    placeholder="Optional"
                    value={p.middleName}
                    onChange={(e) => setField(idx, 'middleName', e.target.value)}
                    type="text"
                  />
                </div>
                <div>
                  <label className={labelClass}>Last name *</label>
                  <input
                    className={fieldClass}
                    placeholder="Last name"
                    value={p.lastName}
                    onChange={(e) => setField(idx, 'lastName', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>Date of birth</label>
                  <input
                    type="date"
                    className={fieldClass}
                    value={p.dob || ''}
                    onChange={(e) => setField(idx, 'dob', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>Email</label>
                  <input
                    className={fieldClass}
                    placeholder="email@example.com"
                    value={p.email}
                    onChange={(e) => setField(idx, 'email', e.target.value)}
                    type="email"
                  />
                </div>
                <div>
                  <label className={labelClass}>Calling phone *</label>
                  <input
                    className={fieldClass}
                    placeholder="Phone number"
                    value={p.phone}
                    onChange={(e) => setField(idx, 'phone', e.target.value)}
                    type="tel"
                  />
                </div>
                <div>
                  <label className={labelClass}>Passenger type</label>
                  <select
                    className={fieldClass}
                    value={p.type}
                    onChange={(e) => setField(idx, 'type', e.target.value)}
                  >
                    {PASSENGER_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Document type</label>
                  <input
                    className={fieldClass}
                    placeholder="Passport, ID…"
                    value={p.documentType}
                    onChange={(e) =>
                      setField(idx, 'documentType', e.target.value)
                    }
                  />
                </div>
                <div>
                  <label className={labelClass}>Document number</label>
                  <input
                    className={fieldClass}
                    placeholder="Optional"
                    value={p.documentNumber}
                    onChange={(e) =>
                      setField(idx, 'documentNumber', e.target.value)
                    }
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          onClick={() => update([...passengers, blankPax()])}
        >
          <Plus className="h-4 w-4" />
          Add passenger
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          onClick={() => dispatch(setWizardStep(2))}
        >
          Back
        </button>
        <button
          type="button"
          className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
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
