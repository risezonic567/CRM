import React from 'react';

/** Shared remarks field for wait-close / cancel — Add/Edit wrappers own APIs */
const InquiryCloseFormBody = ({ values, onChange }) => (
  <label className="block text-sm">
    <span className="mb-1 block text-slate-600">
      Reason <span className="text-red-500">*</span>
    </span>
    <textarea
      className="min-h-[96px] w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
      value={values.reason}
      onChange={(e) => onChange({ ...values, reason: e.target.value })}
      placeholder="Why is this being closed? (customer disconnected, cancelled, etc.)"
    />
  </label>
);

export default InquiryCloseFormBody;
