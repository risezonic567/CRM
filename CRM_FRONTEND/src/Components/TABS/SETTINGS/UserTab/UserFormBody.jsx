import React from 'react';
import { AlertCircle } from 'lucide-react';
import { ROLES, ROLE_LABELS } from '../../../roles';

const UserFormBody = ({ values, onChange, errors = {}, mode = 'add' }) => {
  const set = (field) => (e) =>
    onChange({
      ...values,
      [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value,
    });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
          <span>First Name</span>
          <span className="text-rose-500">*</span>
        </label>
        <input
          className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-600 transition-colors"
          value={values.firstName}
          onChange={set('firstName')}
          placeholder="e.g. Alex"
        />
        {errors.firstName && (
          <span className="text-[11px] text-rose-500 flex items-center gap-1 mt-0.5">
            <AlertCircle className="w-3 h-3 shrink-0" />
            {errors.firstName}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
          <span>Last Name</span>
          <span className="text-[11px] font-normal text-slate-400">(optional)</span>
        </label>
        <input
          className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-600 transition-colors"
          value={values.lastName}
          onChange={set('lastName')}
          placeholder="e.g. Morgan"
        />
      </div>

      <div className="flex flex-col gap-1 sm:col-span-2">
        <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
          <span>Email Address</span>
          <span className="text-rose-500">*</span>
        </label>
        <input
          type="email"
          className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-600 transition-colors"
          value={values.email}
          onChange={set('email')}
          placeholder="alex@risezonic.com"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
          <span>Password</span>
          {mode === 'edit' ? (
            <span className="text-[11px] font-normal text-slate-400">(leave blank to keep current)</span>
          ) : (
            <span className="text-rose-500">*</span>
          )}
        </label>
        <input
          type="password"
          className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-600 transition-colors"
          value={values.password || ''}
          onChange={set('password')}
          placeholder={mode === 'edit' ? '••••••••' : 'Initial password'}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
          <span>Role & Permission Level</span>
          <span className="text-rose-500">*</span>
        </label>
        <select
          className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md text-slate-700 focus:outline-none focus:border-sky-600 transition-colors cursor-pointer bg-white"
          value={values.role}
          onChange={set('role')}
        >
          <option value={ROLES.AGENT}>{ROLE_LABELS[ROLES.AGENT]} (Sales & Inquiries)</option>
          <option value={ROLES.VIEWER}>{ROLE_LABELS[ROLES.VIEWER]} (Read-Only)</option>
        </select>
      </div>

      {mode === 'edit' && (
        <div className="sm:col-span-2 mt-1">
          <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-800">
            <input
              type="checkbox"
              className="w-4 h-4 rounded text-slate-900 focus:ring-0 cursor-pointer accent-slate-900"
              checked={Boolean(values.isActive)}
              onChange={set('isActive')}
            />
            <span>Active Account (enabled for CRM login)</span>
          </label>
        </div>
      )}
    </div>
  );
};

export default UserFormBody;
