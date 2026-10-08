import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Plane,
  User,
  CreditCard,
  Clock,
  AlertTriangle,
  Users,
  MapPin,
  FileText,
  Loader2,
  Mail,
  Download,
  Eye,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import axiosInstance from '../../../SERVICES/AxiosInstance';
import {
  useGetInquiryQuery,
  useResendConfirmationMutation,
} from '../../../REDUX_FEATURES/REDUX_SLICES/Inquiry_api/inquiryApi';
import { CLOSE_SOURCES } from '../../../constants/dispositions';
import StatusBadge from '../../shared/StatusBadge';
import { getErrorMessage } from '../../../utils/getErrorMessage';
import PnrItineraryTable from './wizard/PnrItineraryTable';
import {
  docRoleLabel,
  formatDocCountdown,
  listInquirySupportDocs,
  resolveDocExpiresAt,
} from '../../../utils/docExpiryCountdown';

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

function money(currency, amount) {
  return `${currency || 'USD'} ${Number(amount || 0).toFixed(2)}`;
}

function FlightLeg({ title, offer, from, to }) {
  if (!offer && !from) return null;
  const airline = offer?.airline?.name || offer?.airline || '—';
  const flightNo = offer?.flightNumber || '';
  const dep = offer?.departure?.at;
  const arr = offer?.arrival?.at;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
        {title}
      </p>
      <p className="text-sm font-semibold text-slate-900">
        {airline} {flightNo ? `(${flightNo})` : ''}
      </p>
      <p className="mt-1 text-sm text-slate-700">
        {from || offer?.departure?.airport || '—'} →{' '}
        {to || offer?.arrival?.airport || '—'}
      </p>
      {(dep || arr || offer?.duration) && (
        <p className="mt-1 text-xs text-slate-500">
          {dep ? formatDate(dep) : '—'}
          {arr ? ` → ${formatDate(arr)}` : ''}
          {offer?.duration ? ` · ${offer.duration}` : ''}
        </p>
      )}
      {typeof offer?.stops === 'number' && (
        <p className="mt-0.5 text-xs text-slate-400">
          {offer.stops === 0 ? 'Non-stop' : `${offer.stops} stop(s)`}
        </p>
      )}
    </div>
  );
}

const Section = ({ icon: Icon, title, children }) => (
  <section className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm sm:p-5">
    <div className="mb-3 flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
        <Icon className="h-4 w-4" />
      </div>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
    </div>
    {children}
  </section>
);

const InquiryDetailPage = ({ inquiryId, onBack }) => {
  const { data, isFetching, isError } = useGetInquiryQuery(inquiryId, {
    skip: !inquiryId,
    // After authorize (or any external status change), avoid showing wizard-era cache
    refetchOnMountOrArgChange: true,
  });
  const [resendConfirmation, { isLoading: isResending }] =
    useResendConfirmationMutation();
  const [isDownloading, setIsDownloading] = useState(false);
  const [viewingDocId, setViewingDocId] = useState(null);
  const [showRawUserAgent, setShowRawUserAgent] = useState(false);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const inq = data?.data?.inquiry;
  const offer = inq?.selectedOffer || {};
  const outbound = offer.outbound || offer;
  const inbound = offer.inbound || null;
  const pnrSegments =
    offer?.raw?.source === 'pnr' && Array.isArray(offer.raw.segments)
      ? offer.raw.segments
      : [];
  const currency = inq?.pricing?.currency || 'USD';
  const isConfirmed = inq?.status === 'authorized';
  const supportDocs = useMemo(() => listInquirySupportDocs(inq), [inq]);

  useEffect(() => {
    if (!supportDocs.length) return undefined;
    const id = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [supportDocs.length]);

  const handleResendConfirmation = async () => {
    if (!inquiryId) return;
    try {
      const res = await resendConfirmation(inquiryId).unwrap();
      toast.success(res?.message || 'Authorization receipt resent');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to resend authorization receipt'));
    }
  };

  const handleDownloadConfirmation = async () => {
    if (!inquiryId) return;
    setIsDownloading(true);
    try {
      const res = await axiosInstance.get(
        `/inquiries/${inquiryId}/confirmation-receipt`,
        { responseType: 'blob' }
      );
      const ref = inq?.inquiryReference || inquiryId;
      const blob = new Blob([res.data], {
        type: 'text/html;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Authorized-${ref}.html`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success('Authorization receipt downloaded');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to download authorization receipt'));
    } finally {
      setIsDownloading(false);
    }
  };

  const handleViewSupportDocument = async (doc) => {
    if (!inquiryId || !doc) return;
    const docId = doc.id || 'legacy';
    setViewingDocId(docId);
    try {
      const res = await axiosInstance.get(
        `/inquiries/${inquiryId}/support-documents/${encodeURIComponent(docId)}`,
        { responseType: 'blob' }
      );
      const mime =
        doc.mimeType ||
        res.headers?.['content-type'] ||
        'application/octet-stream';
      const blob = new Blob([res.data], { type: mime });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to open supporting document'));
    } finally {
      setViewingDocId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4 text-slate-900">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
              Inquiry details
            </h1>
            {inq?.inquiryReference && (
              <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 font-mono text-xs font-bold text-sky-700">
                {inq.inquiryReference}
              </span>
            )}
            {inq?.status && <StatusBadge status={inq.status} />}
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            Full record for this flight inquiry
          </p>
        </div>
        {isConfirmed && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadConfirmation}
              disabled={isDownloading}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
            >
              {isDownloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Download authorization receipt
            </button>
            <button
              type="button"
              onClick={handleResendConfirmation}
              disabled={isResending}
              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-sm font-medium text-emerald-800 shadow-sm transition hover:bg-emerald-100 disabled:opacity-60"
            >
              {isResending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mail className="h-4 w-4" />
              )}
              Resend authorization receipt
            </button>
          </div>
        )}
      </div>

      {isFetching && !inq && (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-16 text-xs text-slate-500">
          <Loader2 className="h-6 w-6 animate-spin text-slate-700" />
          <p>Loading inquiry record…</p>
        </div>
      )}

      {isError && (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 py-12">
          <AlertTriangle className="h-6 w-6 text-rose-600" />
          <p className="text-sm font-semibold text-rose-700">
            Failed to load inquiry record.
          </p>
          <button
            type="button"
            onClick={onBack}
            className="mt-2 text-sm font-medium text-slate-600 underline"
          >
            Back to list
          </button>
        </div>
      )}

      {inq && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Section icon={User} title="Customer">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-[11px] font-medium text-slate-500">Name</p>
                <p className="text-sm font-semibold text-slate-900">
                  {inq.customer?.firstName} {inq.customer?.lastName}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-500">Email</p>
                <p className="truncate text-sm font-semibold text-slate-900">
                  {inq.customer?.email || '—'}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-500">Phone</p>
                <p className="text-sm font-semibold text-slate-900">
                  {inq.customer?.phone || '—'}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-500">Created</p>
                <p className="text-sm font-semibold text-slate-900">
                  {formatDate(inq.createdAt)}
                </p>
              </div>
            </div>
          </Section>

          <Section icon={MapPin} title="Travel">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-[11px] font-medium text-slate-500">Route</p>
                <p className="text-sm font-semibold text-slate-900">
                  {inq.travel?.from || '—'} → {inq.travel?.to || '—'}
                  {inq.travel?.returnDate ? ' · Round trip' : ' · One way'}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-500">
                  Departure
                </p>
                <p className="text-sm font-semibold text-slate-900">
                  {inq.travel?.departureDate
                    ? formatDate(inq.travel.departureDate)
                    : '—'}
                </p>
              </div>
              {inq.travel?.returnDate && (
                <div>
                  <p className="text-[11px] font-medium text-slate-500">
                    Return
                  </p>
                  <p className="text-sm font-semibold text-slate-900">
                    {formatDate(inq.travel.returnDate)}
                  </p>
                </div>
              )}
              <div>
                <p className="text-[11px] font-medium text-slate-500">Cabin</p>
                <p className="text-sm font-semibold capitalize text-slate-900">
                  {inq.travel?.cabinClass || '—'}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-500">
                  Passengers (search)
                </p>
                <p className="text-sm font-semibold text-slate-900">
                  {inq.travel?.passengers ?? '—'}
                </p>
              </div>
            </div>
          </Section>

          <div className="space-y-3 lg:col-span-2">
            <div className="mb-1 flex items-center gap-2 px-1">
              <Plane className="h-4 w-4 text-blue-600" />
              <h3 className="text-sm font-semibold text-slate-900">
                {pnrSegments.length ? 'Itinerary' : 'Selected flight'}
              </h3>
            </div>
            {pnrSegments.length ? (
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <PnrItineraryTable segments={pnrSegments} />
              </div>
            ) : outbound?.flightNumber || outbound?.airline ? (
              <div className="grid gap-3 md:grid-cols-2">
                <FlightLeg
                  title={inbound ? 'Departing' : 'Flight'}
                  offer={outbound}
                  from={inq.travel?.from}
                  to={inq.travel?.to}
                />
                {inbound && (
                  <FlightLeg
                    title="Returning"
                    offer={inbound}
                    from={inq.travel?.to}
                    to={inq.travel?.from}
                  />
                )}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
                No itinerary recorded yet
              </p>
            )}
          </div>

          <Section icon={Users} title="Passengers">
            {(inq.passengers || []).length ? (
              <ul className="space-y-2">
                {inq.passengers.map((p, i) => (
                  <li
                    key={i}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                  >
                    <span className="font-semibold text-slate-900">
                      {p.firstName} {p.middleName ? `${p.middleName} ` : ''}
                      {p.lastName}
                    </span>
                    {p.type && (
                      <span className="ml-1.5 text-xs capitalize text-slate-400">
                        ({p.type})
                      </span>
                    )}
                    <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-slate-500">
                      {p.phone && <span>{p.phone}</span>}
                      {p.email && <span>{p.email}</span>}
                      {p.dob && <span>DOB {p.dob}</span>}
                      {p.documentNumber && (
                        <span>
                          {p.documentType || 'Doc'} {p.documentNumber}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">No passengers recorded</p>
            )}
          </Section>

          {supportDocs.length > 0 && (
            <Section icon={FileText} title="Supporting documents">
              <ul className="space-y-2">
                {supportDocs.map((doc) => {
                  const expiresAt = resolveDocExpiresAt(doc);
                  const countdown = formatDocCountdown(
                    expiresAt,
                    new Date(nowTick)
                  );
                  const expired = countdown === 'Expired';
                  const docId = doc.id || 'legacy';
                  return (
                    <li
                      key={docId}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900">
                          {docRoleLabel(doc)}
                          {doc.label ? ` — ${doc.label}` : ''}
                        </p>
                        <p className="text-xs text-slate-500">
                          {doc.docKind || 'passport'}
                          {doc.originalName ? ` · ${doc.originalName}` : ''}
                        </p>
                        {countdown ? (
                          <p
                            className={`mt-0.5 text-xs font-medium tabular-nums ${
                              expired ? 'text-rose-600' : 'text-amber-700'
                            }`}
                          >
                            {expired
                              ? 'Expired (pending cleanup)'
                              : `Expires in ${countdown}`}
                          </p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        disabled={viewingDocId === docId}
                        onClick={() => handleViewSupportDocument(doc)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
                      >
                        {viewingDocId === docId ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Eye className="h-3.5 w-3.5" />
                        )}
                        View
                      </button>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-2 text-[11px] text-slate-400">
                Documents are stored on this server only and shown for viewing
                (not downloaded). Retention target: 3 days.
              </p>
            </Section>
          )}

          <Section icon={FileText} title="Billing">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-[11px] font-medium text-slate-500">Phone</p>
                <p className="text-sm font-semibold text-slate-900">
                  {inq.billing?.phone || '—'}
                </p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-[11px] font-medium text-slate-500">Address</p>
                <p className="text-sm font-semibold text-slate-900">
                  {inq.billing?.address || '—'}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-500">State</p>
                <p className="text-sm font-semibold text-slate-900">
                  {inq.billing?.state || '—'}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-500">Zip</p>
                <p className="text-sm font-semibold text-slate-900">
                  {inq.billing?.zip || '—'}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-500">Country</p>
                <p className="text-sm font-semibold text-slate-900">
                  {inq.billing?.country || '—'}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-500">Card</p>
                <p className="text-sm font-semibold text-slate-900">
                  {inq.billing?.cardType || '—'}
                  {inq.billing?.last4 ? ` •••• ${inq.billing.last4}` : ''}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-500">
                  Cardholder
                </p>
                <p className="text-sm font-semibold text-slate-900">
                  {inq.billing?.cardholderName || '—'}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-500">Expiry</p>
                <p className="text-sm font-semibold text-slate-900">
                  {inq.billing?.expiryMonth && inq.billing?.expiryYear
                    ? `${inq.billing.expiryMonth}/${inq.billing.expiryYear}`
                    : '—'}
                </p>
              </div>
            </div>
          </Section>

          <Section icon={CreditCard} title="Pricing">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Supplier price</span>
                <span className="font-medium tabular-nums text-slate-800">
                  {money(currency, inq.pricing?.costPrice)}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Agency fee</span>
                <span className="font-medium tabular-nums text-emerald-700">
                  {money(currency, inq.pricing?.markup)}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-semibold text-slate-900">
                <span>Total</span>
                <span className="tabular-nums">
                  {money(currency, inq.pricing?.sellingPrice)}
                </span>
              </div>
              {Number(inq.pricing?.merchantFee) > 0 && (
                <p className="pt-1 text-xs text-slate-400">
                  Merchant fee (legacy):{' '}
                  {money(currency, inq.pricing.merchantFee)}
                </p>
              )}
            </div>
          </Section>

          {(inq.emailSentAt ||
            inq.confirmedAt ||
            inq.agreement?.agreedAt ||
            inq.notes) && (
            <Section icon={Clock} title="Timeline & notes">
              <div className="grid gap-3 sm:grid-cols-2">
                {inq.emailSentAt && (
                  <div>
                    <p className="text-[11px] font-medium text-slate-500">
                      Quotation sent
                    </p>
                    <p className="text-sm font-semibold text-slate-900">
                      {formatDate(inq.emailSentAt)}
                    </p>
                  </div>
                )}
                {inq.confirmedAt && (
                  <div>
                    <p className="text-[11px] font-medium text-slate-500">
                      Customer authorized
                    </p>
                    <p className="text-sm font-semibold text-emerald-600">
                      {formatDate(inq.confirmedAt)}
                    </p>
                  </div>
                )}
                {(inq.agreement?.agreedAt ||
                  inq.agreement?.agreedIp ||
                  inq.agreement?.browser ||
                  inq.agreement?.os ||
                  inq.agreement?.deviceType ||
                  inq.agreement?.agreedUserAgent) && (
                  <div className="sm:col-span-2 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                      Agreement proof
                    </p>
                    {inq.agreement?.clientSummary && (
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {inq.agreement.clientSummary}
                      </p>
                    )}
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {inq.agreement?.agreedAt && (
                        <div>
                          <p className="text-[11px] font-medium text-slate-500">
                            Agreed at
                          </p>
                          <p className="text-sm font-semibold text-slate-900">
                            {formatDate(inq.agreement.agreedAt)}
                          </p>
                        </div>
                      )}
                      {inq.agreement?.agreedIp && (
                        <div>
                          <p className="text-[11px] font-medium text-slate-500">
                            IP address
                          </p>
                          <p className="text-sm font-semibold text-slate-900">
                            {inq.agreement.agreedIp}
                          </p>
                        </div>
                      )}
                      {inq.agreement?.browser && (
                        <div>
                          <p className="text-[11px] font-medium text-slate-500">
                            Browser
                          </p>
                          <p className="text-sm font-semibold text-slate-900">
                            {inq.agreement.browser}
                          </p>
                        </div>
                      )}
                      {inq.agreement?.os && (
                        <div>
                          <p className="text-[11px] font-medium text-slate-500">
                            OS
                          </p>
                          <p className="text-sm font-semibold text-slate-900">
                            {inq.agreement.os}
                          </p>
                        </div>
                      )}
                      {inq.agreement?.deviceType &&
                        inq.agreement.deviceType !== 'unknown' && (
                          <div>
                            <p className="text-[11px] font-medium text-slate-500">
                              Device
                            </p>
                            <p className="text-sm font-semibold capitalize text-slate-900">
                              {inq.agreement.deviceType}
                            </p>
                          </div>
                        )}
                    </div>
                    {inq.agreement?.agreedUserAgent && (
                      <div className="mt-3 border-t border-emerald-100 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowRawUserAgent((v) => !v)}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-slate-900"
                        >
                          {showRawUserAgent ? (
                            <ChevronUp className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5" />
                          )}
                          Raw user-agent (audit)
                        </button>
                        {showRawUserAgent && (
                          <p className="mt-1 break-all text-xs text-slate-500">
                            {inq.agreement.agreedUserAgent}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {inq.notes && (
                  <div className="sm:col-span-2">
                    <p className="text-[11px] font-medium text-slate-500">
                      Notes
                    </p>
                    <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-800">
                      {inq.notes}
                    </p>
                  </div>
                )}
              </div>
            </Section>
          )}

          {(inq.status === 'cancelled' || inq.closeReason) && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950 lg:col-span-2">
              <div className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-800">
                <AlertTriangle className="h-3.5 w-3.5" />
                Closure / cancellation
              </div>
              <p className="text-sm text-slate-800">
                {inq.closeReason?.trim() || 'No reason recorded'}
              </p>
              <div className="mt-2 flex flex-wrap gap-4 text-[11px] text-slate-500">
                {inq.closeSource && (
                  <span>
                    Source:{' '}
                    {CLOSE_SOURCE_LABELS[inq.closeSource] || inq.closeSource}
                  </span>
                )}
                {inq.closedAt && <span>Closed: {formatDate(inq.closedAt)}</span>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InquiryDetailPage;
