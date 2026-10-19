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

  const save = async () => {
    const name = String(form.name || '').trim();
    if (!name) {
      toast.error('Agency legal name is required');
      return;
    }
    try {
      await updateCompany({ name }).unwrap();
      toast.success('Agency name updated');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Update failed'));
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 sm:p-6 max-w-2xl shadow-xs">
      <div className="border-b border-slate-100 pb-3.5 mb-5">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-slate-800" strokeWidth={1.8} />
          Agency Profile
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Legal name used on authorization text, emails, and customer confirm
          pages. Agents can still edit wording in the wizard; Reset fills from
          this name.
        </p>
      </div>

      <div className="flex flex-col gap-1 max-w-md">
        <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
          <span>Agency Legal Name</span>
          <span className="text-rose-500">*</span>
        </label>
        <input
          className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-600 transition-colors"
          value={form.name}
          onChange={(e) => setForm({ name: e.target.value })}
          placeholder="e.g. Risezonic Travel Ltd"
        />
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
              Saving…
            </>
          ) : (
            'Save Agency Name'
          )}
        </button>
      </div>
    </div>
  );
};

export default CompanyTab;
