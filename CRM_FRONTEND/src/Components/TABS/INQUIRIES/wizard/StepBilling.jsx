import React, { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { CreditCard } from 'lucide-react';
import {
  patchWizard,
  selectWizard,
  setWizardStep,
} from '../../../../REDUX_FEATURES/REDUX_SLICES/Inquiry_api/inquirySlice';

const fieldClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100';

const labelClass = 'mb-1 block text-xs font-medium text-slate-500';

const PRESET_CARD_TYPES = [
  'Visa',
  'Mastercard',
  'American Express',
  'Discover',
];

function isPresetCardType(cardType) {
  const t = String(cardType || '').trim();
  return t === 'Amex' || PRESET_CARD_TYPES.includes(t);
}

const StepBilling = () => {
  const dispatch = useDispatch();
  const wizard = useSelector(selectWizard);
  const b = wizard.billing || {};
  // CVV is UI-only — never written to Redux / draft / send payload
  const [cvv, setCvv] = useState('');
  // Keep Other selected even while the custom text field is still empty
  const [otherMode, setOtherMode] = useState(() => {
    const t = String(b.cardType || '').trim();
    return Boolean(t) && !isPresetCardType(t);
  });

  const selectValue = useMemo(() => {
    const t = String(b.cardType || '').trim();
    if (otherMode) return 'Other';
    if (!t) return '';
    if (t === 'Amex') return 'American Express';
    if (PRESET_CARD_TYPES.includes(t)) return t;
    return 'Other';
  }, [b.cardType, otherMode]);

  const isOther = selectValue === 'Other';

  const set = (field) => (e) =>
    dispatch(patchWizard({ billing: { ...b, [field]: e.target.value } }));

  const handleNext = () => {
    if (!b.cardType?.trim()) {
      toast.error(isOther ? 'Enter the card type' : 'Select a card type');
      return;
    }
    if (!b.cardholderName?.trim()) {
      toast.error('Enter cardholder name');
      return;
    }
    if (!/^\d{4}$/.test(String(b.last4 || '').trim())) {
      toast.error('Enter last 4 digits of the card');
      return;
    }
    if (!b.expiryMonth?.trim() || !b.expiryYear?.trim()) {
      toast.error('Enter card expiry');
      return;
    }
    // cvv intentionally discarded — not stored
    setCvv('');
    dispatch(setWizardStep(5));
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <CreditCard className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              Billing & card details
            </h3>
            <p className="mt-0.5 text-sm text-slate-500">
              Address and card on file for authorization. CVV is optional for
              agent verification and is never saved.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Billing phone</label>
              <input
                className={fieldClass}
                placeholder="Phone number"
                value={b.phone || ''}
                onChange={set('phone')}
                type="tel"
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Billing address</label>
              <input
                className={fieldClass}
                placeholder="Street address"
                value={b.address || ''}
                onChange={set('address')}
                type="text"
              />
            </div>
            <div>
              <label className={labelClass}>State</label>
              <input
                className={fieldClass}
                placeholder="State / province"
                value={b.state || ''}
                onChange={set('state')}
                type="text"
              />
            </div>
            <div>
              <label className={labelClass}>Zip</label>
              <input
                className={fieldClass}
                placeholder="ZIP / postal code"
                value={b.zip || ''}
                onChange={set('zip')}
                type="text"
              />
            </div>
            <div>
              <label className={labelClass}>Country</label>
              <input
                className={fieldClass}
                placeholder="Country"
                value={b.country || ''}
                onChange={set('country')}
                type="text"
              />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Card on file
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Card type</label>
                <select
                  className={fieldClass}
                  value={selectValue}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === 'Other') {
                      setOtherMode(true);
                      if (isPresetCardType(b.cardType)) {
                        dispatch(
                          patchWizard({ billing: { ...b, cardType: '' } })
                        );
                      }
                      return;
                    }
                    setOtherMode(false);
                    dispatch(
                      patchWizard({ billing: { ...b, cardType: v } })
                    );
                  }}
                >
                  <option value="">Select…</option>
                  {PRESET_CARD_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                  <option value="Other">Other</option>
                </select>
                {isOther ? (
                  <input
                    className={`${fieldClass} mt-2`}
                    placeholder="Enter card type"
                    value={b.cardType || ''}
                    onChange={set('cardType')}
                    type="text"
                    autoComplete="off"
                  />
                ) : null}
              </div>
              <div>
                <label className={labelClass}>Cardholder name</label>
                <input
                  className={fieldClass}
                  placeholder="Name on card"
                  value={b.cardholderName || ''}
                  onChange={set('cardholderName')}
                  type="text"
                  autoComplete="cc-name"
                />
              </div>
              <div>
                <label className={labelClass}>Last 4 digits</label>
                <input
                  className={fieldClass}
                  placeholder="1234"
                  value={b.last4 || ''}
                  onChange={(e) =>
                    dispatch(
                      patchWizard({
                        billing: {
                          ...b,
                          last4: e.target.value.replace(/\D/g, '').slice(0, 4),
                        },
                      })
                    )
                  }
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  autoComplete="off"
                />
              </div>
              <div>
                <label className={labelClass}>
                  CVV{' '}
                  <span className="font-normal text-slate-400">(optional, not saved)</span>
                </label>
                <input
                  className={fieldClass}
                  placeholder="•••"
                  value={cvv}
                  onChange={(e) =>
                    setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))
                  }
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  autoComplete="off"
                />
              </div>
              <div>
                <label className={labelClass}>Expiry month</label>
                <input
                  className={fieldClass}
                  placeholder="MM"
                  value={b.expiryMonth || ''}
                  onChange={(e) =>
                    dispatch(
                      patchWizard({
                        billing: {
                          ...b,
                          expiryMonth: e.target.value.replace(/\D/g, '').slice(0, 2),
                        },
                      })
                    )
                  }
                  type="text"
                  inputMode="numeric"
                  maxLength={2}
                  autoComplete="cc-exp-month"
                />
              </div>
              <div>
                <label className={labelClass}>Expiry year</label>
                <input
                  className={fieldClass}
                  placeholder="YY or YYYY"
                  value={b.expiryYear || ''}
                  onChange={(e) =>
                    dispatch(
                      patchWizard({
                        billing: {
                          ...b,
                          expiryYear: e.target.value.replace(/\D/g, '').slice(0, 4),
                        },
                      })
                    )
                  }
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  autoComplete="cc-exp-year"
                />
              </div>
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
          onClick={handleNext}
        >
          Next → Preview &amp; Authorize
        </button>
      </div>
    </div>
  );
};

export default StepBilling;
