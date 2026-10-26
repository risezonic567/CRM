import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  PhoneCall,
  FileText,
  CheckCircle2,
  Wallet,
  Plus,
  ArrowUpRight,
  TrendingUp,
  Compass,
  Settings2,
} from 'lucide-react';
import CallDispositionModal from '../CALLS/CallDispositionModal';
import DashboardDateFilter from './DashboardDateFilter';
import { CURRENT_USER } from '../../roles';
import Can from '../../shared/Can';
import { useGetDashboardSummaryQuery } from '../../../REDUX_FEATURES/REDUX_SLICES/Dashboard_api/dashboardApi';
import { resolveDashboardRange } from '../../../utils/dashboardDateRange';

const OUTCOME_COLORS = [
  '#0284c7',
  '#0f172a',
  '#059669',
  '#d97706',
  '#7c3aed',
  '#db2777',
  '#64748b',
  '#0ea5e9',
  '#ea580c',
  '#4f46e5',
  '#94a3b8',
];

const DashboardTab = ({ onSwitchTab }) => {
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState(() => resolveDashboardRange('all'));

  const { data: summaryRes, isFetching, isError } = useGetDashboardSummaryQuery(
    {
      from: range.from,
      to: range.to,
    },
    {
      // Keep last range on screen while next range loads — no zero/empty flash
      placeholderData: (previousData) => previousData,
    }
  );

  const summary = summaryRes?.data;
  const kpis = summary?.kpis;
  const margin = kpis?.margin;

  const totalCalls = Number(kpis?.callsLogged ?? 0);
  const activeInquiries = Number(kpis?.activeInquiries ?? 0);
  const confirmationRate = Number(kpis?.authorizationRate ?? 0);
  const confirmedCount = Number(kpis?.authorizedCount ?? 0);
  const marginCurrency = margin?.currency || 'USD';
  const totalMargin = Number(margin?.totalMargin ?? 0);
  const marginConfirmedCount = Number(margin?.confirmedCount ?? 0);

  const chartData = useMemo(() => {
    const trend = summary?.trend || [];
    return trend.map((row) => ({
      name: row.label,
      calls: row.calls || 0,
      inquiries: row.inquiries || 0,
    }));
  }, [summary?.trend]);

  const dispositionBreakdown = useMemo(() => {
    const rows = summary?.dispositions || [];
    const total = rows.reduce((s, r) => s + (r.count || 0), 0) || 1;
    return rows.map((row, idx) => ({
      name: row.label || row.value,
      count: row.count || 0,
      percent: Math.round(((row.count || 0) / total) * 100),
      color: OUTCOME_COLORS[idx % OUTCOME_COLORS.length],
    }));
  }, [summary?.dispositions]);

  const dispositionChartTotal = useMemo(
    () => dispositionBreakdown.reduce((sum, row) => sum + row.count, 0),
    [dispositionBreakdown]
  );

  const trendSubtitle =
    summary?.range?.bucket === 'hour'
      ? 'Hourly call volume and flight inquiries'
      : summary?.range?.bucket === 'week'
        ? 'Weekly call volume and flight inquiries'
        : 'Daily call volume and flight inquiries';

  return (
    <div className="flex flex-col gap-5 text-slate-900 font-sans">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Overview
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-600 animate-pulse" />
              Live Operations
            </span>
          </h1>
          <p className="text-[13px] text-slate-500 mt-1">
            Welcome Back,{' '}
            <span className="font-semibold text-slate-900 uppercase">
              {CURRENT_USER.name || 'Agent'}
            </span>
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
          <DashboardDateFilter value={range} onChange={setRange} />
          {isFetching && (
            <span className="text-[11px] font-medium text-slate-400 tabular-nums">
              Updating…
            </span>
          )}
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
          {onSwitchTab && (
            <button
              type="button"
              onClick={() => onSwitchTab('inquiries')}
              className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 px-4 py-2 rounded-lg text-xs font-semibold border border-slate-200 hover:border-slate-300 transition-colors shadow-sm cursor-pointer"
            >
              Inquiries
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          )}
        </div>
      </div>

      {isError && (
        <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
          Could not load dashboard stats for this range. Try again.
        </p>
      )}

      {/* 4 Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-4 flex flex-col justify-between gap-3 shadow-xs hover:shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Calls Logged
            </span>
            <div className="w-8 h-8 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600">
              <PhoneCall className="w-4 h-4" strokeWidth={1.8} />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight leading-none">
            {totalCalls}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
              <TrendingUp className="w-3.5 h-3.5" />
              Active
            </span>
            <span>inbound records</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-4 flex flex-col justify-between gap-3 shadow-xs hover:shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Active Inquiries
            </span>
            <div className="w-8 h-8 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600">
              <FileText className="w-4 h-4" strokeWidth={1.8} />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight leading-none">
            {activeInquiries}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
              <TrendingUp className="w-3.5 h-3.5" />
              Live
            </span>
            <span>drafts & dispatched</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-4 flex flex-col justify-between gap-3 shadow-xs hover:shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Authorizations
            </span>
            <div className="w-8 h-8 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600">
              <CheckCircle2 className="w-4 h-4" strokeWidth={1.8} />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight leading-none">
            {confirmationRate}%
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="font-semibold text-emerald-600">
              {confirmedCount} verified
            </span>
            <span>customer sign-offs</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-4 flex flex-col justify-between gap-3 shadow-xs hover:shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Margin Collected
            </span>
            <div className="w-8 h-8 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600">
              <Wallet className="w-4 h-4" strokeWidth={1.8} />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight leading-none">
            <span className="text-sm font-semibold text-slate-500 mr-1">
              {marginCurrency}
            </span>
            {totalMargin.toFixed(2)}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="font-semibold text-emerald-600">
              {marginConfirmedCount} authorized
            </span>
            <span>agency fee total</span>
          </div>
        </div>
      </div>

      {/* Analytics & Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 flex flex-col shadow-xs">
          <div className="flex items-center justify-between mb-4 gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Activity Trends</h2>
              <p className="text-xs text-slate-500 mt-0.5">{trendSubtitle}</p>
            </div>
            <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 shrink-0">
              {range.label}
            </span>
          </div>

          <div className="w-full h-60">
            {chartData.length === 0 ? (
              <p className="text-xs text-slate-500 py-8 text-center">
                No activity in this range.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 8, right: 12, left: -24, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="callsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0284c7" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#0284c7" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="inqGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0f172a" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#0f172a" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#1e293b',
                      borderRadius: '6px',
                      color: '#ffffff',
                      fontSize: '12px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    }}
                    itemStyle={{ color: '#ffffff' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="calls"
                    name="Calls Logged"
                    stroke="#0284c7"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#callsGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="inquiries"
                    name="Inquiries Created"
                    stroke="#0f172a"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#inqGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-xl p-5 flex flex-col shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Call Outcomes</h2>
              <p className="text-xs text-slate-500 mt-0.5">Disposition breakdown ratio</p>
            </div>
            <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              Distribution
            </span>
          </div>

          <div className="mt-1 flex flex-1 flex-col">
            {dispositionBreakdown.length === 0 ? (
              <p className="text-xs text-slate-500 py-4">
                No call dispositions in this range.
              </p>
            ) : (
              <>
                <div className="relative h-[200px] w-full shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dispositionBreakdown}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={52}
                        outerRadius={78}
                        paddingAngle={2}
                        stroke="#fff"
                        strokeWidth={2}
                      >
                        {dispositionBreakdown.map((item) => (
                          <Cell key={item.name} fill={item.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const row = payload[0]?.payload;
                          if (!row) return null;
                          return (
                            <div className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white shadow-lg">
                              <p className="font-semibold">{row.name}</p>
                              <p className="mt-0.5 text-slate-300">
                                {row.count} calls · {row.percent}%
                              </p>
                            </div>
                          );
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold tabular-nums text-slate-900">
                      {dispositionChartTotal}
                    </span>
                    <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                      With outcome
                    </span>
                  </div>
                </div>
                <ul className="mt-3 max-h-[120px] space-y-2 overflow-y-auto pr-1">
                  {dispositionBreakdown.map((item) => (
                    <li
                      key={item.name}
                      className="flex items-center justify-between gap-2 text-xs"
                    >
                      <span className="flex min-w-0 items-center gap-1.5 font-medium text-slate-700">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="truncate">{item.name}</span>
                        <span className="shrink-0 font-normal text-slate-400">
                          ({item.count})
                        </span>
                      </span>
                      <span className="shrink-0 font-semibold tabular-nums text-slate-900">
                        {item.percent}%
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Can do="call.create">
          <div
            className="bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 rounded-xl p-4 cursor-pointer transition-all shadow-xs hover:shadow-sm flex items-start gap-3.5 text-left group"
            role="button"
            tabIndex={0}
            onClick={() => setOpen(true)}
            onKeyDown={(e) => e.key === 'Enter' && setOpen(true)}
          >
            <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-900 shrink-0 group-hover:border-slate-300">
              <PhoneCall className="w-4 h-4 text-sky-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center justify-between">
                <span>Record Call Outcome</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Log caller info, disposition details, and launch automated flight search.
              </p>
            </div>
          </div>
        </Can>

        {onSwitchTab && (
          <div
            className="bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 rounded-xl p-4 cursor-pointer transition-all shadow-xs hover:shadow-sm flex items-start gap-3.5 text-left group"
            role="button"
            tabIndex={0}
            onClick={() => onSwitchTab('inquiries')}
            onKeyDown={(e) => e.key === 'Enter' && onSwitchTab('inquiries')}
          >
            <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-900 shrink-0 group-hover:border-slate-300">
              <Compass className="w-4 h-4 text-slate-800" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center justify-between">
                <span>Flight Inquiries</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Browse flight search drafts, customer itinerary quotes, and verification states.
              </p>
            </div>
          </div>
        )}

        <Can do="settings.open">
          {onSwitchTab ? (
            <div
              className="bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 rounded-xl p-4 cursor-pointer transition-all shadow-xs hover:shadow-sm flex items-start gap-3.5 text-left group"
              role="button"
              tabIndex={0}
              onClick={() => onSwitchTab('settings')}
              onKeyDown={(e) => e.key === 'Enter' && onSwitchTab('settings')}
            >
              <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-900 shrink-0 group-hover:border-slate-300">
                <Settings2 className="w-4 h-4 text-slate-800" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-slate-900 flex items-center justify-between">
                  <span>Agency Settings</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Manage base currency, airfare markup defaults, and agent access roles.
                </p>
              </div>
            </div>
          ) : null}
        </Can>
      </div>

      <CallDispositionModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
};

export default DashboardTab;
