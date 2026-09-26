import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Building2, Loader2 } from 'lucide-react';
import {
  useGetCompanyQuery,
  useUpdateCompanyMutation,
} from '../../../../REDUX_FEATURES/REDUX_SLICES/User_api/userApi';
import { getErrorMessage } from '../../../../utils/getErrorMessage';

const CompanyTab = () => {
  const { data, isFetching } = useGetCompanyQuery();
  const [updateCompany, { isLoading }] = useUpdateCompanyMutation();
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (data?.data?.agency) {
      const a = data.data.agency;
      setForm({
        name: a.name || '',
        currency: a.currency || 'USD',
        defaultMarkup: a.defaultMarkup ?? 50,
        merchantFeePercent: a.merchantFeePercent ?? 2,
        address: a.address || '',
        country: a.country || '',
      });
    }
  }, [data]);

  if (isFetching || !form) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-6 max-w-2xl shadow-xs">
        <div className="py-12 px-6 text-center flex flex-col items-center justify-center gap-3 text-slate-500 text-xs">
          <Loader2 className="w-6 h-6 animate-spin text-slate-700" />
          <p>Loading agency configuration…</p>
        </div>
      </div>
    );
  }

  const set = (field) => (e) =>
    setForm({
      ...form,
      [field]:
        e.target.type === 'number' ? Number(e.target.value) : e.target.value,
    });

  const save = async () => {
    try {
      await updateCompany(form).unwrap();
      toast.success('Agency settings updated successfully');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Update failed'));
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 sm:p-6 max-w-2xl shadow-xs">
      <div className="border-b border-slate-100 pb-3.5 mb-5">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-slate-800" strokeWidth={1.8} />
          Agency Profile & Financial Configuration
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Set base quotation currency, default airfare markup margins, and payment processing fees.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
            <span>Agency Legal Name</span>
            <span className="text-rose-500">*</span>
          </label>
          <input
            className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-600 transition-colors"
            value={form.name}
            onChange={set('name')}
            placeholder="e.g. Risezonic Travel Ltd"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
            <span>Operational Currency</span>
            <span className="text-rose-500">*</span>
          </label>
          <input
            className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-600 transition-colors uppercase"
            value={form.currency}
            onChange={set('currency')}
            placeholder="USD"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
            <span>Default Markup Margin ({form.currency})</span>
            <span className="text-rose-500">*</span>
          </label>
          <input
            className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-600 transition-colors"
            type="number"
            min="0"
            step="1"
            value={form.defaultMarkup}
            onChange={set('defaultMarkup')}
            placeholder="50"
          />
          <span className="text-[11px] text-slate-400 mt-0.5">
            Base margin added automatically to supplier airfare net rate
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
            <span>Merchant Processing Fee (%)</span>
            <span className="text-rose-500">*</span>
          </label>
          <input
            className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-600 transition-colors"
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={form.merchantFeePercent}
            onChange={set('merchantFeePercent')}
            placeholder="2"
          />
          <span className="text-[11px] text-slate-400 mt-0.5">
            Payment surcharge applied at ticket issuance
          </span>
        </div>

        <div className="flex flex-col gap-1 sm:col-span-2">
          <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
            <span>Operating / Billing Address</span>
            <span className="text-[11px] font-normal text-slate-400">(optional)</span>
          </label>
          <input
            className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-600 transition-colors"
            value={form.address}
            onChange={set('address')}
            placeholder="Suite 500, Travel Plaza, 100 Main Street"
          />
        </div>

        <div className="flex flex-col gap-1 sm:col-span-2">
          <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
            <span>Country / Jurisdiction</span>
            <span className="text-[11px] font-normal text-slate-400">(optional)</span>
          </label>
          <input
            className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-600 transition-colors"
            value={form.country}
            onChange={set('country')}
            placeholder="United States"
          />
        </div>
      </div>

      <div className="mt-5 flex justify-start">
        <button
          type="button"
          disabled={isLoading}
          onClick={save}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed rounded-lg border border-slate-900 transition-colors shadow-xs cursor-pointer"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Saving Settings…
            </>
          ) : (
            'Save Agency Profile'
          )}
        </button>
      </div>
    </div>
  );
};

export default CompanyTab;
