import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  Eye,
  Trash2,
  Plane,
  User,
  CreditCard,
  Clock,
  AlertTriangle,
  X,
  FileText,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import {
  useListInquiriesQuery,
  useLazyLookupInquiriesQuery,
  useGetInquiryQuery,
  useDeleteInquiryMutation,
} from '../../../REDUX_FEATURES/REDUX_SLICES/Inquiry_api/inquiryApi';
import { CLOSE_SOURCES } from '../../../constants/dispositions';
import { isViewer } from '../../roles';
import { getErrorMessage } from '../../../utils/getErrorMessage';
import StatusBadge from '../../shared/StatusBadge';
import PaginationBar from '../../shared/PaginationBar';
import InquiryWizard from './InquiryWizard';

const PAGE_SIZE = 10;

const CLOSE_SOURCE_LABELS = {
  [CLOSE_SOURCES.WAITING_MODAL]: 'Waiting modal',
  [CLOSE_SOURCES.DETAIL_PAGE]: 'Detail page',
};

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const getCustomerInitials = (firstName, lastName) => {
  const f = firstName?.[0] || '';
  const l = lastName?.[0] || '';
  return (f + l).toUpperCase() || '?';
};

const InquiryViewModal = ({ inquiryId, onClose }) => {
  const { data, isFetching, isError } = useGetInquiryQuery(inquiryId, {
    skip: !inquiryId,
  });
  const inq = data?.data?.inquiry;

  return (
    <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="p-4 sm:px-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800">
              <Plane className="w-4 h-4" strokeWidth={1.8} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Inquiry Details</h2>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                {inq?.inquiryReference || 'Loading record…'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 w-7 h-7 rounded-md flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          {isFetching && !inq && (
            <div className="py-12 text-center flex flex-col items-center justify-center gap-2 text-slate-500 text-xs">
              <Loader2 className="w-6 h-6 animate-spin text-slate-700" />
              <p>Loading inquiry record…</p>
            </div>
          )}

          {isError && (
            <div className="py-8 text-center flex flex-col items-center justify-center gap-2">
              <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-rose-600">Failed to load inquiry record.</p>
            </div>
          )}

          {inq && (
            <div className="flex flex-col gap-3.5">
              {/* Status Header */}
              <div className="flex items-center justify-between py-1">
                <span className="text-xs text-slate-500 font-medium">Lifecycle Status</span>
                <StatusBadge status={inq.status} />
              </div>

              {/* Customer Info Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  Customer Information
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] text-slate-500 font-medium">Full Name</span>
                    <span className="text-xs font-semibold text-slate-900">
                      {inq.customer?.firstName} {inq.customer?.lastName}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] text-slate-500 font-medium">Email Address</span>
                    <span className="text-xs font-semibold text-slate-900 truncate">{inq.customer?.email || '—'}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] text-slate-500 font-medium">Contact Phone</span>
                    <span className="text-xs font-semibold text-slate-900">{inq.customer?.phone || '—'}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] text-slate-500 font-medium">Inquiry Reference</span>
                    <span className="text-xs font-semibold font-mono text-sky-700">
                      {inq.inquiryReference}
                    </span>
                  </div>
                </div>
              </div>

              {/* Flight Itinerary Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2.5 flex items-center gap-1.5">
                  <Plane className="w-3.5 h-3.5" />
                  Travel & Route Details
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] text-slate-500 font-medium">Route</span>
                    <span className="text-xs font-semibold text-slate-900">
                      {inq.travel?.from || '—'} → {inq.travel?.to || '—'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] text-slate-500 font-medium">Departure Date</span>
                    <span className="text-xs font-semibold text-slate-900">
                      {inq.travel?.departureDate
                        ? formatDate(inq.travel.departureDate)
                        : '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Pricing Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2.5 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5" />
                  Quotation Breakdown
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] text-slate-500 font-medium">Total Selling Price</span>
                    <span className="text-sm font-bold text-slate-900">
                      {inq.pricing?.currency || 'USD'}{' '}
                      {Number(inq.pricing?.sellingPrice || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] text-slate-500 font-medium">Created Date</span>
                    <span className="text-xs font-semibold text-slate-900">{formatDate(inq.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* Timeline Status */}
              {(inq.emailSentAt || inq.confirmedAt) && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2.5 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Verification Timeline
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {inq.emailSentAt && (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[11px] text-slate-500 font-medium">Quotation Sent</span>
                        <span className="text-xs font-semibold text-slate-900">{formatDate(inq.emailSentAt)}</span>
                      </div>
                    )}
                    {inq.confirmedAt && (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[11px] text-slate-500 font-medium">Customer Confirmed</span>
                        <span className="text-xs font-semibold text-emerald-600">
                          {formatDate(inq.confirmedAt)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Cancellation Reason Box */}
              {(inq.status === 'cancelled' || inq.closeReason) && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3.5 text-amber-950">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-amber-800 mb-1 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Closure / Cancellation Record
                  </div>
                  <p className="text-xs text-slate-800 my-1">
                    {inq.closeReason?.trim() || 'No reason recorded'}
                  </p>
                  <div className="flex gap-4 mt-2 text-[11px] text-slate-500">
                    {inq.closeSource && (
                      <span>Source: {CLOSE_SOURCE_LABELS[inq.closeSource] || inq.closeSource}</span>
                    )}
                    {inq.closedAt && (
                      <span>Closed: {formatDate(inq.closedAt)}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="py-3 px-4 sm:px-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors cursor-pointer shadow-xs"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
};

const InquiriesDashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const showWizard = searchParams.get('wizard') === '1';
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [lookupActive, setLookupActive] = useState(false);
  const [viewId, setViewId] = useState(null);
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
    if (isViewer()) {
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
      if (viewId === inq._id) setViewId(null);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete inquiry'));
    }
  };

  const showListLoading = !lookupActive && isFetching;
  const showLookupLoading = lookupActive && isLookupFetching;

  return (
    <div className="flex flex-col gap-5 text-slate-900 font-sans">
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
            Manage flight drafts, preview links dispatched to customers, and verified bookings.
          </p>
        </div>
      </div>

      {showWizard ? (
        <InquiryWizard />
      ) : (
        <>
          {/* Lookup & Search Card */}
          <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <form onSubmit={handleLookupSubmit} className="flex items-center gap-2 w-full max-w-lg">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none w-4 h-4" strokeWidth={1.8} />
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
                      <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">Reference</th>
                      <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">Customer</th>
                      <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">Route</th>
                      <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">Status</th>
                      <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">Selling Price</th>
                      <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((inq) => {
                      const custName = `${inq.customer?.firstName || ''} ${inq.customer?.lastName || ''}`.trim() || 'Unknown';
                      const initials = getCustomerInitials(inq.customer?.firstName, inq.customer?.lastName);

                      return (
                        <tr key={inq._id} className="hover:bg-slate-50/75 transition-colors">
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
                                <div className="font-semibold text-slate-900">{custName}</div>
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
                            <div className="font-bold text-xs text-slate-900">
                              <span className="text-[11px] font-semibold text-slate-500 mr-1">{inq.pricing?.currency || 'USD'}</span>
                              {Number(inq.pricing?.sellingPrice || 0).toFixed(2)}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex items-center justify-end gap-1.5">
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
                                onClick={() => setViewId(inq._id)}
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              {!isViewer() && (
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
                              )}
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
                  <h3 className="text-sm font-semibold text-slate-800">No inquiries found</h3>
                  <p className="text-xs text-slate-500 max-w-xs">
                    No flight inquiries logged yet. Record a call disposition with &quot;New Booking&quot; to initiate one.
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

      {viewId && (
        <InquiryViewModal inquiryId={viewId} onClose={() => setViewId(null)} />
      )}
    </div>
  );
};

export default InquiriesDashboard;
