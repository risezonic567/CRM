import React from 'react';

const colors = {
  new: 'bg-slate-100 text-slate-700 border border-slate-200',
  searching: 'bg-sky-50 text-sky-700 border border-sky-200',
  quoted: 'bg-amber-50 text-amber-700 border border-amber-200',
  payment_pending: 'bg-orange-50 text-orange-700 border border-orange-200',
  pending: 'bg-orange-50 text-orange-700 border border-orange-200',
  booked: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  confirmed: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  authorized: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  preview_sent: 'bg-sky-50 text-sky-700 border border-sky-200',
  draft: 'bg-slate-100 text-slate-700 border border-slate-200',
  paid: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  ticketed: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  failed: 'bg-red-50 text-red-700 border border-red-200',
  refund_initiated: 'bg-blue-50 text-blue-700 border border-blue-200',
  refunded: 'bg-blue-50 text-blue-700 border border-blue-200',
  cancelled: 'bg-slate-100 text-slate-500 border border-slate-200',
  expired: 'bg-slate-100 text-slate-500 border border-slate-200',
};

export default function StatusBadge({ status }) {
  const normalized = String(status || '').toLowerCase();
  const cls = colors[normalized] || 'bg-slate-100 text-slate-600 border border-slate-200';
  const label = String(status || '-').replaceAll('_', ' ');

  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium capitalize ${cls}`}
    >
      {label}
    </span>
  );
}
