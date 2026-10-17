import React, { useMemo, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, X, RefreshCw } from 'lucide-react';
import CallsTable from './CallsTable';
import CallDispositionModal from './CallDispositionModal';
import CallNotesModal from './CallNotesModal';
import CallMarkupModal from './CallMarkupModal';
import PaginationBar from '../../shared/PaginationBar';
import { useListCallsQuery } from '../../../REDUX_FEATURES/REDUX_SLICES/Call_api/callApi';
import {
  selectCallFilters,
  setCallFilters,
  resetCallFilters,
} from '../../../REDUX_FEATURES/REDUX_SLICES/Call_api/callSlice';
import { useListUsersQuery } from '../../../REDUX_FEATURES/REDUX_SLICES/User_api/userApi';
import { CALL_DISPOSITIONS } from '../../../constants/dispositions';
import Can from '../../shared/Can';
import { isAdmin } from '../../roles';

const PAGE_SIZE = 10;

const CallsDashboard = () => {
  const dispatch = useDispatch();
  const [, setSearchParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [notesCallId, setNotesCallId] = useState(null);
  const [markupCallId, setMarkupCallId] = useState(null);
  const [page, setPage] = useState(1);
  const filters = useSelector(selectCallFilters);
  const adminView = isAdmin();

  /** Deep-link into Inquiries detail (same URL contract as InquiriesDashboard). */
  const openInquiryFromCall = (inquiryId) => {
    if (!inquiryId) return;
    setSearchParams({ tab: 'inquiries', inquiryId: String(inquiryId) });
  };

  const { data: usersRes } = useListUsersQuery(
    { page: 1, limit: 100 },
    { skip: !adminView }
  );

  const agentOptions = useMemo(() => {
    const items = Array.isArray(usersRes?.data) ? usersRes.data : [];
    return items
      .filter((u) => u?.isActive !== false && u?.role !== 'viewer')
      .map((u) => ({
        id: u._id,
        label:
          `${u.firstName || ''} ${u.lastName || ''}`.trim() ||
          u.email ||
          'User',
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [usersRes]);

  const { data, isFetching, refetch } = useListCallsQuery({
    page,
    limit: PAGE_SIZE,
    disposition: filters.disposition || undefined,
    search: filters.search || undefined,
    loggedBy: adminView && filters.loggedBy ? filters.loggedBy : undefined,
  });

  const items = data?.data || [];
  const meta = data?.meta || {};
  const totalCount = meta.total ?? items.length;
  const totalPages = meta.pages ?? 1;
  /** Keep modal in sync after list refetch (e.g. new note added). */
  const notesCall = notesCallId
    ? items.find((c) => c._id === notesCallId) || null
    : null;
  const markupCall = markupCallId
    ? items.find((c) => c._id === markupCallId) || null
    : null;

  const handleSearchChange = (e) => {
    setPage(1);
    dispatch(setCallFilters({ search: e.target.value }));
  };

  const handleClearSearch = () => {
    setPage(1);
    dispatch(setCallFilters({ search: '' }));
  };

  const handleDispositionChange = (e) => {
    setPage(1);
    dispatch(setCallFilters({ disposition: e.target.value }));
  };

  const handleAgentChange = (e) => {
    setPage(1);
    dispatch(setCallFilters({ loggedBy: e.target.value }));
  };

  const handleReset = () => {
    setPage(1);
    dispatch(resetCallFilters());
  };

  const handleRefresh = () => {
    refetch();
  };

  const hasActiveFilters = Boolean(
    filters.search || filters.disposition || (adminView && filters.loggedBy)
  );

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
            className="w-full pl-9 pr-8 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-600 transition-colors"
            placeholder="Search caller name, phone number, or notes…"
            value={filters.search || ''}
            onChange={handleSearchChange}
          />
          {Boolean(filters.search) && (
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-slate-700 cursor-pointer"
              title="Clear search"
              aria-label="Clear search"
              onClick={handleClearSearch}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
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

          {adminView ? (
            <select
              className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-slate-700 focus:outline-none focus:border-sky-600 cursor-pointer max-w-[180px]"
              value={filters.loggedBy || ''}
              onChange={handleAgentChange}
              aria-label="Filter by agent"
            >
              <option value="">All Agents</option>
              {agentOptions.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          ) : null}

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

          <button
            type="button"
            className="inline-flex items-center justify-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-md transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh list"
            aria-label="Refresh calls"
            disabled={isFetching}
            onClick={handleRefresh}
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* Calls Table */}
      <CallsTable
        items={items}
        isLoading={isFetching}
        onOpenCreate={() => setOpen(true)}
        onOpenInquiry={openInquiryFromCall}
        onOpenNotes={(call) => setNotesCallId(call._id)}
        onOpenMarkup={(call) => setMarkupCallId(call._id)}
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

      <CallNotesModal
        open={Boolean(notesCallId)}
        call={notesCall}
        onClose={() => setNotesCallId(null)}
      />

      <CallMarkupModal
        open={Boolean(markupCallId)}
        call={markupCall}
        onClose={() => setMarkupCallId(null)}
      />
    </div>
  );
};

export default CallsDashboard;
