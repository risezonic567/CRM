import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  Eye,
  Trash2,
  Plane,
  FileText,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import {
  useListInquiriesQuery,
  useLazyLookupInquiriesQuery,
  useDeleteInquiryMutation,
} from '../../../REDUX_FEATURES/REDUX_SLICES/Inquiry_api/inquiryApi';
import { can } from '../../roles';
import Can from '../../shared/Can';
import { getErrorMessage } from '../../../utils/getErrorMessage';
import StatusBadge from '../../shared/StatusBadge';
import PaginationBar from '../../shared/PaginationBar';
import InquiryWizard from './InquiryWizard';
import InquiryDetailPage from './InquiryDetailPage';

const PAGE_SIZE = 10;

const getCustomerInitials = (firstName, lastName) => {
  const f = firstName?.[0] || '';
  const l = lastName?.[0] || '';
  return (f + l).toUpperCase() || '?';
};

const InquiriesDashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const showWizard = searchParams.get('wizard') === '1';
  const detailId =
    !showWizard && searchParams.get('inquiryId')
      ? searchParams.get('inquiryId')
      : null;

  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [lookupActive, setLookupActive] = useState(false);
  const { data, isFetching } = useListInquiriesQuery({ page, limit: PAGE_SIZE });
  const [lookup, { data: lookupData, isFetching: isLookupFetching }] =
    useLazyLookupInquiriesQuery();
  const [deleteInquiry, { isLoading: isDeleting }] = useDeleteInquiryMutation();

  const listItems = data?.data || [];
  const lookupItems = lookupData?.data || [];
  const items = lookupActive ? lookupItems : listItems;
  const meta = data?.meta || {};
  const totalCount = lookupActive
    ? lookupItems.length
    : (meta.total ?? listItems.length);
  const totalPages = meta.pages ?? 1;

  const openDetail = (id) => {
    setSearchParams({ tab: 'inquiries', inquiryId: id });
  };

  const closeDetail = () => {
    setSearchParams({ tab: 'inquiries' });
  };

  const handleLookupSubmit = (e) => {
    e?.preventDefault();
    if (q.trim()) {
      setLookupActive(true);
      lookup(q.trim());
    }
  };

  const handleClearLookup = () => {
    setQ('');
    setLookupActive(false);
    setPage(1);
  };

  const handleDelete = async (inq) => {
    if (!can('inquiry.delete')) {
      toast.error('Viewers cannot delete inquiries');
      return;
    }
    const ok = window.confirm(
      `Delete inquiry ${inq.inquiryReference}? This cannot be undone.`
    );
    if (!ok) return;
    try {
      await deleteInquiry(inq._id).unwrap();
      toast.success('Inquiry deleted');
      if (detailId === inq._id) closeDetail();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete inquiry'));
    }
  };

  const showListLoading = !lookupActive && isFetching;
  const showLookupLoading = lookupActive && isLookupFetching;

  return (
    <div className="flex flex-col gap-5 text-slate-900 font-sans">
      {showWizard ? (
        <InquiryWizard />
      ) : detailId ? (
        <InquiryDetailPage inquiryId={detailId} onBack={closeDetail} />
      ) : (
        <>
          {/* Header bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Flight Inquiries
                <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                  {totalCount} records
                </span>
              </h1>
              <p className="text-[13px] text-slate-500 mt-1">
                Manage flight drafts, preview links dispatched to customers, and
                verified bookings.
              </p>
            </div>
          </div>

          {/* Lookup & Search Card */}
          <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <form
              onSubmit={handleLookupSubmit}
              className="flex items-center gap-2 w-full max-w-lg"
            >
              <div className="relative flex-1">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none w-4 h-4"
                  strokeWidth={1.8}
                />
                <input
                  type="text"
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-600 transition-colors"
                  placeholder="Lookup Reference ID, customer email, or phone…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-1.5 rounded-md text-xs font-semibold border border-slate-900 transition-colors shadow-sm cursor-pointer whitespace-nowrap"
              >
                Lookup
              </button>
              {q && (
                <button
                  type="button"
                  className="text-xs font-medium text-slate-500 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-md transition-colors cursor-pointer"
                  onClick={handleClearLookup}
                >
                  Clear
                </button>
              )}
            </form>
          </div>

          {/* Table Container */}
          {showListLoading || showLookupLoading ? (
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <div className="py-14 px-6 text-center flex flex-col items-center justify-center gap-3 text-slate-500 text-xs">
                <Loader2 className="w-6 h-6 animate-spin text-slate-700" />
                <p>{lookupActive ? 'Looking up…' : 'Loading inquiries…'}</p>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                        Reference
                      </th>
                      <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                        Customer
                      </th>
                      <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                        Route
                      </th>
                      <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                        Status
                      </th>
                      <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                        Agency Fee
                      </th>
                      <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                        Selling Price
                      </th>
                      <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((inq) => {
                      const custName =
                        `${inq.customer?.firstName || ''} ${inq.customer?.lastName || ''}`.trim() ||
                        'Unknown';
                      const initials = getCustomerInitials(
                        inq.customer?.firstName,
                        inq.customer?.lastName
                      );

                      return (
                        <tr
                          key={inq._id}
                          className="hover:bg-slate-50/75 transition-colors cursor-pointer"
                          onClick={() => openDetail(inq._id)}
                        >
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center font-mono font-bold text-xs text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded">
                              {inq.inquiryReference}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-bold border border-slate-200 shrink-0">
                                {initials}
                              </div>
                              <div>
                                <div className="font-semibold text-slate-900">
                                  {custName}
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  {inq.customer?.email || '—'}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="inline-flex items-center gap-1.5 font-semibold text-xs text-slate-800 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
                              <span>{inq.travel?.from || '—'}</span>
                              <Plane className="w-3 h-3 text-slate-400 rotate-90" />
                              <span>{inq.travel?.to || '—'}</span>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <StatusBadge status={inq.status} />
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-bold text-xs text-emerald-700">
                              <span className="text-[11px] font-semibold text-slate-500 mr-1">
                                {inq.pricing?.currency || 'USD'}
                              </span>
                              {Number(inq.pricing?.markup || 0).toFixed(2)}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-bold text-xs text-slate-900">
                              <span className="text-[11px] font-semibold text-slate-500 mr-1">
                                {inq.pricing?.currency || 'USD'}
                              </span>
                              {Number(inq.pricing?.sellingPrice || 0).toFixed(2)}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div
                              className="flex items-center justify-end gap-1.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {inq.status === 'draft' && (
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-[11px] font-semibold transition-colors cursor-pointer shadow-xs whitespace-nowrap"
                                  onClick={() =>
                                    setSearchParams({
                                      tab: 'inquiries',
                                      wizard: '1',
                                      inquiryId: inq._id,
                                    })
                                  }
                                >
                                  Resume Wizard
                                  <ArrowRight className="w-3 h-3" />
                                </button>
                              )}
                              <button
                                type="button"
                                title={`View ${inq.inquiryReference}`}
                                aria-label={`View ${inq.inquiryReference}`}
                                className="w-7 h-7 rounded border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center transition-colors cursor-pointer shadow-xs"
                                onClick={() => openDetail(inq._id)}
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <Can do="inquiry.delete">
                                <button
                                  type="button"
                                  title={`Delete ${inq.inquiryReference}`}
                                  aria-label={`Delete ${inq.inquiryReference}`}
                                  disabled={isDeleting}
                                  className="w-7 h-7 rounded border border-rose-200 hover:border-rose-300 bg-white hover:bg-rose-50 text-rose-600 flex items-center justify-center transition-colors cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                                  onClick={() => handleDelete(inq)}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </Can>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {!items.length && (
                <div className="py-14 px-6 text-center flex flex-col items-center justify-center gap-2">
                  <div className="w-11 h-11 rounded-full bg-slate-50 border border-slate-200 text-slate-500 flex items-center justify-center mb-1">
                    <FileText className="w-5 h-5" strokeWidth={1.75} />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-800">
                    No inquiries found
                  </h3>
                  <p className="text-xs text-slate-500 max-w-xs">
                    No flight inquiries logged yet. Record a call disposition
                    with &quot;New Booking&quot; to initiate one.
                  </p>
                </div>
              )}

              {!lookupActive && (
                <PaginationBar
                  page={page}
                  pages={totalPages}
                  total={meta.total ?? 0}
                  limit={PAGE_SIZE}
                  onPageChange={setPage}
                  disabled={isFetching}
                />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default InquiriesDashboard;
