import React from 'react';
import { Phone, PhoneOff, Plus, Loader2 } from 'lucide-react';
import { CALL_DISPOSITIONS } from '../../../constants/dispositions';
import { isViewer } from '../../roles';

const labelFor = (value) =>
  CALL_DISPOSITIONS.find((d) => d.value === value)?.label || value;

const getDispositionConfig = (value) => {
  switch (value) {
    case 'new_booking':
      return { badge: 'bg-emerald-50 text-emerald-800 border-emerald-200', dot: 'bg-emerald-600' };
    case 'inquiry_general':
      return { badge: 'bg-sky-50 text-sky-800 border-sky-200', dot: 'bg-sky-600' };
    case 'follow_up':
      return { badge: 'bg-indigo-50 text-indigo-800 border-indigo-200', dot: 'bg-indigo-600' };
    case 'callback':
      return { badge: 'bg-amber-50 text-amber-800 border-amber-200', dot: 'bg-amber-600' };
    case 'complaint':
      return { badge: 'bg-rose-50 text-rose-800 border-rose-200', dot: 'bg-rose-600' };
    case 'spam_junk':
      return { badge: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-500' };
    default:
      return { badge: 'bg-slate-50 text-slate-700 border-slate-200', dot: 'bg-slate-400' };
  }
};

const getCallerInitials = (name) => {
  if (!name || name === '—') return '?';
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

/** Prefer Call fields; fall back to linked inquiry customer (synced / legacy rows). */
const resolveCaller = (call) => {
  const cust = call.inquiryId?.customer;
  const fromInquiry = [cust?.firstName, cust?.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();
  const name = (call.callerName || '').trim() || fromInquiry;
  const phone = (call.phoneNumber || '').trim() || (cust?.phone || '').trim();
  return {
    name: name || 'Anonymous / Unspecified',
    phone: phone || '',
  };
};

const CallsTable = ({ items = [], isLoading, onOpenCreate, footer = null }) => {
  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="py-14 px-6 text-center flex flex-col items-center justify-center gap-3 text-slate-500 text-xs">
          <Loader2 className="w-6 h-6 animate-spin text-slate-700" />
          <p>Loading calls log…</p>
        </div>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="py-14 px-6 text-center flex flex-col items-center justify-center gap-2">
          <div className="w-11 h-11 rounded-full bg-slate-50 border border-slate-200 text-slate-500 flex items-center justify-center mb-1">
            <PhoneOff className="w-5 h-5" strokeWidth={1.75} />
          </div>
          <h3 className="text-sm font-semibold text-slate-800">No call records found</h3>
          <p className="text-xs text-slate-500 max-w-xs">
            No logged calls match your active filter or search criteria.
          </p>
          {!isViewer() && onOpenCreate && (
            <button
              type="button"
              onClick={onOpenCreate}
              className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold border border-slate-900 transition-colors shadow-sm cursor-pointer mt-2"
            >
              <Plus className="w-4 h-4" strokeWidth={2.2} />
              Log First Call
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">Date & Time</th>
              <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">Caller</th>
              <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">Phone</th>
              <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">Disposition</th>
              <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">Remarks</th>
              <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">Inquiry Ref</th>
              <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">Logged By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((call) => {
              const { name: callerName, phone: phoneNumber } = resolveCaller(call);
              const agentName = call.loggedBy
                ? `${call.loggedBy.firstName || ''} ${call.loggedBy.lastName || ''}`.trim()
                : '—';
              const dispConfig = getDispositionConfig(call.disposition);

              return (
                <tr key={call._id} className="hover:bg-slate-50/75 transition-colors">
                  <td className="py-3 px-4 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                    {call.createdAt
                      ? new Date(call.createdAt).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—'}
                  </td>

                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-bold border border-slate-200 shrink-0">
                        {getCallerInitials(callerName)}
                      </div>
                      <span className="font-semibold text-slate-900">{callerName}</span>
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    {phoneNumber ? (
                      <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-slate-700 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {phoneNumber}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>

                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${dispConfig.badge} whitespace-nowrap`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${dispConfig.dot}`} />
                      {labelFor(call.disposition)}
                    </span>
                  </td>

                  <td className="py-3 px-4">
                    <div className="max-w-[240px] truncate text-slate-600" title={call.remarks || ''}>
                      {call.remarks || '—'}
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    {call.inquiryId?.inquiryReference ? (
                      <span className="inline-flex items-center text-[11px] font-semibold font-mono text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded">
                        {call.inquiryId.inquiryReference}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>

                  <td className="py-3 px-4 text-slate-600 font-medium">
                    {agentName}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {footer}
    </div>
  );
};

export default CallsTable;
