import React from 'react';
import { Check } from 'lucide-react';
import { CALL_DISPOSITIONS } from '../../../constants/dispositions';

/**
 * Shared fields for call disposition — used by Add modal only in Phase 1.
 * Edit can reuse this FormBody later with independent API.
 */
const CallDispositionFormBody = ({ values, onChange }) => {
  const set = (field) => (e) =>
    onChange({ ...values, [field]: e.target.value });

  return (
    <div className="space-y-4">
      {/* Caller Info Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
            <span>Caller Name</span>
            <span className="text-[11px] font-normal text-slate-400">(optional)</span>
          </label>
          <input
            className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-600 transition-colors"
            value={values.callerName}
            onChange={set('callerName')}
            placeholder="e.g. John Doe"
            type="text"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
            <span>Phone Number</span>
            <span className="text-[11px] font-normal text-slate-400">(optional)</span>
          </label>
          <input
            className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-600 transition-colors"
            value={values.phoneNumber}
            onChange={set('phoneNumber')}
            placeholder="+1 555-0199"
            type="tel"
          />
        </div>
      </div>

      {/* Disposition Selection */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
          <span>Call Disposition</span>
          <span className="text-rose-500">*</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {CALL_DISPOSITIONS.map((d) => {
            const active = values.disposition === d.value;
            return (
              <button
                key={d.value}
                type="button"
                onClick={() => onChange({ ...values, disposition: d.value })}
                className={`flex items-center justify-between p-2 rounded-lg border text-xs font-medium transition-all text-left cursor-pointer ${
                  active
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-white hover:border-slate-300'
                }`}
              >
                <span>{d.label}</span>
                {active && <Check className="w-3.5 h-3.5 text-white shrink-0" strokeWidth={2.5} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Remarks Field */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
          <span>Remarks / Conversation Notes</span>
          {values.disposition !== 'new_booking' ? (
            <span className="text-rose-500">*</span>
          ) : (
            <span className="text-[11px] font-normal text-slate-400">(optional for new bookings)</span>
          )}
        </label>
        <textarea
          rows={3}
          className="w-full p-2.5 text-xs border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-600 transition-colors resize-y"
          value={values.remarks}
          onChange={set('remarks')}
          placeholder="Summarize customer request, route inquiries, or follow-up details discussed on call…"
        />
      </div>
    </div>
  );
};

export default CallDispositionFormBody;
