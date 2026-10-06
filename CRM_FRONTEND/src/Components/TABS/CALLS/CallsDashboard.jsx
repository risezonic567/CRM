import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, X } from 'lucide-react';
import CallsTable from './CallsTable';
import CallDispositionModal from './CallDispositionModal';
import PaginationBar from '../../shared/PaginationBar';
import { useListCallsQuery } from '../../../REDUX_FEATURES/REDUX_SLICES/Call_api/callApi';
import {
  selectCallFilters,
  setCallFilters,
  resetCallFilters,
} from '../../../REDUX_FEATURES/REDUX_SLICES/Call_api/callSlice';
import { CALL_DISPOSITIONS } from '../../../constants/dispositions';
import Can from '../../shared/Can';

const PAGE_SIZE = 10;

const CallsDashboard = () => {
  const dispatch = useDispatch();
  const [, setSearchParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const filters = useSelector(selectCallFilters);

  /** Deep-link into Inquiries detail (same URL contract as InquiriesDashboard). */
  const openInquiryFromCall = (inquiryId) => {
    if (!inquiryId) return;
    setSearchParams({ tab: 'inquiries', inquiryId: String(inquiryId) });
  };

  const { data, isFetching } = useListCallsQuery({
    page,
    limit: PAGE_SIZE,
    disposition: filters.disposition || undefined,
    search: filters.search || undefined,
  });

  const items = data?.data || [];
  const meta = data?.meta || {};
  const totalCount = meta.total ?? items.length;
  const totalPages = meta.pages ?? 1;

  const handleSearchChange = (e) => {
    setPage(1);
    dispatch(setCallFilters({ search: e.target.value }));
  };

  const handleDispositionChange = (e) => {
    setPage(1);
    dispatch(setCallFilters({ disposition: e.target.value }));
  };

  const handleReset = () => {
    setPage(1);
    dispatch(resetCallFilters());
  };

  const hasActiveFilters = Boolean(filters.search || filters.disposition);

  return (
    <div className="flex flex-col gap-5 text-slate-900 font-sans">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Calls Log
            <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
              {totalCount} records
            </span>
          </h1>
          <p className="text-[13px] text-slate-500 mt-1">
            Log incoming customer dispositions. New booking disposition automatically opens the flight wizard.
          </p>
        </div>

        <Can do="call.create">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-semibold border border-slate-900 transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" strokeWidth={2.2} />
            Log Call
          </button>
        </Can>
      </div>

      {/* Filter toolbar */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none w-4 h-4" strokeWidth={1.8} />
          <input
            type="text"
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-600 transition-colors"
            placeholder="Search caller name, phone number, or notes…"
            value={filters.search || ''}
            onChange={handleSearchChange}
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-slate-700 focus:outline-none focus:border-sky-600 cursor-pointer"
            value={filters.disposition || ''}
            onChange={handleDispositionChange}
          >
            <option value="">All Dispositions</option>
            {CALL_DISPOSITIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>

          {hasActiveFilters && (
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-md transition-colors cursor-pointer"
              onClick={handleReset}
            >
              <X className="w-3.5 h-3.5" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Calls Table */}
      <CallsTable
        items={items}
        isLoading={isFetching}
        onOpenCreate={() => setOpen(true)}
        onOpenInquiry={openInquiryFromCall}
        footer={
          <PaginationBar
            page={page}
            pages={totalPages}
            total={totalCount}
            limit={PAGE_SIZE}
            onPageChange={setPage}
            disabled={isFetching}
          />
        }
      />

      {/* Call Disposition Modal */}
      <CallDispositionModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
};

export default CallsDashboard;
