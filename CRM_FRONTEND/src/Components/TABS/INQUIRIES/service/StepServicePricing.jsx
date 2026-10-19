import React, { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import {
  patchWizard,
  selectWizard,
  setWizardStep,
} from '../../../../REDUX_FEATURES/REDUX_SLICES/Inquiry_api/inquirySlice';
import {
  POPULAR_INQUIRY_CURRENCIES,
  currencyOptionLabel,
  filterInquiryCurrencies,
  matchCurrencyFromQuery,
  normalizeInquiryCurrency,
} from '../../../../constants/currencies';

/**
 * Service authorize pricing — no itinerary. Same math as booking quote step.
 */
const StepServicePricing = () => {
  const dispatch = useDispatch();
  const wizard = useSelector(selectWizard);

  const [supplier, setSupplier] = useState(String(wizard.costPrice ?? ''));
  const [markup, setMarkup] = useState(String(wizard.markup ?? 0));
  const [currency, setCurrency] = useState(() =>
    normalizeInquiryCurrency(wizard.currency)
  );
  const [currencyQuery, setCurrencyQuery] = useState('');

  const total = useMemo(() => {
    const s = Number(supplier) || 0;
    const m = Number(markup) || 0;
    return Math.round((s + m) * 100) / 100;
  }, [supplier, markup]);

  const currencyOptions = useMemo(() => {
    let filtered = filterInquiryCurrencies(currencyQuery);
    if (currency && !filtered.includes(currency)) {
      filtered = [currency, ...filtered];
    }
    const popularSet = new Set(POPULAR_INQUIRY_CURRENCIES);
    const popular = POPULAR_INQUIRY_CURRENCIES.filter((c) =>
      filtered.includes(c)
    );
    const rest = filtered.filter((c) => !popularSet.has(c));
    return { popular, rest };
  }, [currencyQuery, currency]);

  const applyCurrency = (nextRaw) => {
    const next = normalizeInquiryCurrency(nextRaw);
    setCurrency(next);
    dispatch(patchWizard({ currency: next }));
  };

  const handleContinue = () => {
    const costPrice = Number(supplier);
    if (!Number.isFinite(costPrice) || costPrice < 0) {
      toast.error('Enter a valid supplier price');
      return;
    }
    const markupNum = Number(markup);
    if (!Number.isFinite(markupNum) || markupNum < 0) {
      toast.error('Enter a valid markup');
      return;
    }
    const curr = normalizeInquiryCurrency(currency);
    dispatch(
      patchWizard({
        costPrice,
        markup: markupNum,
        merchantFeePercent: 0,
        currency: curr,
      })
    );
    dispatch(setWizardStep(2));
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-sm font-bold text-slate-900">Pricing</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Choose currency, then set supplier price and markup. Customer sees{' '}
          <span className="font-semibold">total only</span> (no conversion).
        </p>
      </div>

      <div className="flex max-w-sm flex-col gap-1.5 text-xs">
        <span className="font-semibold text-slate-700">Currency *</span>
        <input
          type="search"
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-600 focus:outline-none"
          placeholder="Search currency (e.g. GBP)"
          value={currencyQuery}
          onChange={(e) => {
            const next = e.target.value;
            setCurrencyQuery(next);
            const matched = matchCurrencyFromQuery(next);
            if (matched) applyCurrency(matched);
          }}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            const matched = matchCurrencyFromQuery(currencyQuery);
            if (matched) applyCurrency(matched);
          }}
          aria-label="Search currencies"
        />
        <select
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 focus:border-sky-600 focus:outline-none"
          value={currency}
          onChange={(e) => applyCurrency(e.target.value)}
        >
          {currencyOptions.popular.length > 0 && (
            <optgroup label="Popular">
              {currencyOptions.popular.map((code) => (
                <option key={code} value={code}>
                  {currencyOptionLabel(code)}
                </option>
              ))}
            </optgroup>
          )}
          {currencyOptions.rest.length > 0 && (
            <optgroup label="All currencies">
              {currencyOptions.rest.map((code) => (
                <option key={code} value={code}>
                  {currencyOptionLabel(code)}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-semibold text-slate-700">
            Supplier price ({currency})
          </span>
          <input
            type="number"
            min="0"
            step="0.01"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-sky-600 focus:outline-none"
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-semibold text-slate-700">
            Markup ({currency})
          </span>
          <input
            type="number"
            min="0"
            step="0.01"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-sky-600 focus:outline-none"
            value={markup}
            onChange={(e) => setMarkup(e.target.value)}
          />
        </label>
        <div className="flex flex-col gap-1 text-xs">
          <span className="font-semibold text-slate-700">Total (customer)</span>
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold tabular-nums text-slate-900">
            {currency} {total.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          onClick={() => dispatch(setWizardStep(0))}
        >
          Back
        </button>
        <button
          type="button"
          className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          onClick={handleContinue}
        >
          Next → Billing
        </button>
      </div>
    </div>
  );
};

export default StepServicePricing;
