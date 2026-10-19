import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { Contact } from 'lucide-react';
import {
  patchWizard,
  selectWizard,
  setWizardStep,
} from '../../../../REDUX_FEATURES/REDUX_SLICES/Inquiry_api/inquirySlice';
import {
  clampPhone10,
  isValidPhone10,
  PHONE_10_ERROR,
} from '../../../../utils/phoneValidation';

const fieldClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100';

const labelClass = 'mb-1 block text-xs font-medium text-slate-500';

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

  const handleNext = () => {
    if (!String(c.firstName || '').trim()) {
      toast.error('Enter first name');
      return;
    }
    if (!String(c.lastName || '').trim()) {
      toast.error('Enter last name');
      return;
    }
    if (!String(c.phone || '').trim()) {
      toast.error('Enter phone number');
      return;
    }
    if (!isValidPhone10(c.phone)) {
      toast.error(PHONE_10_ERROR);
      return;
    }
    const email = String(c.email || '').trim();
    if (!email) {
      toast.error('Enter email');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Enter a valid email');
      return;
    }
    dispatch(setWizardStep(1));
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Contact className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              Customer details
            </h3>
            <p className="mt-0.5 text-sm text-slate-500">
              Primary contact for this inquiry. First, last, phone, and email are
              required; middle name is optional.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className={labelClass}>First name *</label>
              <input
                className={fieldClass}
                placeholder="First name"
                value={c.firstName}
                onChange={set('firstName')}
                type="text"
              />
            </div>
            <div>
              <label className={labelClass}>Middle name</label>
              <input
                className={fieldClass}
                placeholder="Middle name"
                value={c.middleName || ''}
                onChange={set('middleName')}
                type="text"
              />
            </div>
            <div>
              <label className={labelClass}>Last name *</label>
              <input
                className={fieldClass}
                placeholder="Last name"
                value={c.lastName}
                onChange={set('lastName')}
                type="text"
              />
            </div>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Phone * (10 digits)</label>
              <input
                className={fieldClass}
                placeholder="10-digit phone"
                value={c.phone}
                onChange={(e) =>
                  dispatch(
                    patchWizard({
                      customer: { ...c, phone: clampPhone10(e.target.value) },
                    })
                  )
                }
                type="tel"
                inputMode="numeric"
                maxLength={10}
                autoComplete="tel"
              />
            </div>
            <div>
              <label className={labelClass}>Email *</label>
              <input
                className={fieldClass}
                placeholder="email@example.com"
                value={c.email}
                onChange={set('email')}
                type="email"
              />
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        onClick={handleNext}
      >
        Next → Flight Search
      </button>
    </div>
  );
};

export default StepCustomer;
