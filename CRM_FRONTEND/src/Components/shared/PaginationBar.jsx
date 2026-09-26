import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Simple Prev / Page X of Y / Next — page-based lists only.
 */
const PaginationBar = ({ page, pages, total, limit, onPageChange, disabled = false, className = '' }) => {
  const safePages = Math.max(1, Number(pages) || 1);
  const safePage = Math.min(Math.max(1, Number(page) || 1), safePages);
  const safeTotal = Number(total) || 0;
  const safeLimit = Number(limit) || 10;

  if (safeTotal <= 0) return null;

  const from = (safePage - 1) * safeLimit + 1;
  const to = Math.min(safePage * safeLimit, safeTotal);

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 py-2.5 border-t border-slate-200 bg-slate-50/80 ${className}`.trim()}
    >
      <p className="text-[11px] text-slate-500">
        Showing <span className="font-semibold text-slate-700">{from}</span>
        –
        <span className="font-semibold text-slate-700">{to}</span>
        {' '}of{' '}
        <span className="font-semibold text-slate-700">{safeTotal}</span>
      </p>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={disabled || safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-white hover:bg-slate-100 border border-slate-300 rounded-md transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Prev
        </button>

        <span className="text-[11px] font-semibold text-slate-700 px-2 tabular-nums">
          {safePage} / {safePages}
        </span>

        <button
          type="button"
          disabled={disabled || safePage >= safePages}
          onClick={() => onPageChange(safePage + 1)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-white hover:bg-slate-100 border border-slate-300 rounded-md transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
          aria-label="Next page"
        >
          Next
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default PaginationBar;
