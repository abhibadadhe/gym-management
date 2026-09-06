import React, { useState, useEffect } from 'react';
import {
  Users, UserCheck, AlertTriangle, XCircle,
  CreditCard, TrendingUp, UserPlus, RefreshCw,
  IndianRupee, Cake, ArrowUpRight, MessageSquare, Phone,
  ShoppingBag, Receipt, Package
} from 'lucide-react';
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { DashboardData } from '../types';
import { api } from '../services/api';

interface DashboardProps {
  onNavigate: (page: string, tab?: string) => void;
  onQuickAction: (action: 'add-member' | 'renew' | 'payment', memberId?: number) => void;
  onOpenWhatsApp: (memberId: number) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onNavigate,
  onQuickAction,
  onOpenWhatsApp,
}) => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchDashboard = async () => {
    setIsLoading(true);
    try {
      const res = await api.getDashboardStats();
      setData(res);
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (isLoading || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-slate-400">
        <RefreshCw className="w-8 h-8 text-orange-500 animate-spin" />
        <span className="text-xs font-semibold tracking-wider uppercase text-slate-500">
          Loading Live Gym Metrics...
        </span>
      </div>
    );
  }

  // Safe destructuring
  const kpis = data.kpis || (data as any) || {};
  const total_members = kpis.total_members ?? (data as any).total_members ?? 0;
  const active_members = kpis.active_members ?? (data as any).active_members ?? 0;
  const expiring_soon_count = kpis.expiring_soon ?? (data as any).expiring_soon_count ?? 0;
  const expired_count = kpis.expired_members ?? (data as any).expired_count ?? 0;
  const today_revenue = kpis.today_collection ?? (data as any).today_revenue ?? 0;
  const this_month_revenue = kpis.this_month_collection ?? (data as any).this_month_revenue ?? 0;
  const total_pending_dues = kpis.pending_payments ?? (data as any).total_pending_dues ?? 0;
  const new_members_this_month = kpis.new_members_this_month ?? (data as any).new_members_this_month ?? 0;
  const supplements_month_revenue = kpis.supplements_month_revenue ?? (data as any).supplements_month_revenue ?? 0;
  const supplements_pending_dues = kpis.supplements_pending_dues ?? (data as any).supplements_pending_dues ?? 0;
  const combined_month_revenue = kpis.combined_month_revenue ?? ((Number(this_month_revenue) || 0) + (Number(supplements_month_revenue) || 0));

  const revenue_chart = data.revenue_trend || (data as any).revenue_chart || [];
  const formattedRevenueChart = (revenue_chart || []).map((item: any) => ({
    ...item,
    fee_revenue: Number(item.fee_revenue ?? item.revenue ?? 0),
    supplement_revenue: Number(item.supplement_revenue ?? 0),
    total_revenue: Number(item.revenue ?? 0),
  }));
  const plan_distribution = data.plan_distribution || [];
  const popular_products = (data as any).popular_products || [];
  const expiring_members = data.expiring_members || [];
  const pending_payments = data.pending_dues || (data as any).pending_payments || [];
  const today_birthdays = data.today_birthdays || [];

  const donutData = [
    { name: 'Active', value: active_members, color: '#10b981' },
    { name: 'Expiring Soon', value: expiring_soon_count, color: '#f59e0b' },
    { name: 'Expired', value: expired_count, color: '#ef4444' },
  ];

  const PLAN_COLORS = ['#ea580c', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899'];
  const PRODUCT_COLORS = ['#ea580c', '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4'];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Quick Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 font-heading tracking-tight">
            Gym Overview & Analytics
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time status of memberships, subscription renewals, and fee collections for Morya Fitness.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onQuickAction('add-member')}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold rounded-xl shadow-md shadow-orange-500/20 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span> Enroll New Member</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Cards Grid */}
      <div className="space-y-3 sm:space-y-4">
        {/* Membership Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Total Members */}
          <div
            onClick={() => onNavigate('members', 'ALL')}
            className="glass-panel glass-panel-hover p-4 sm:p-5 rounded-2xl cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Total Members</span>
              <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 font-heading">{total_members}</h3>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                +{new_members_this_month} new
              </span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">Total registrations</span>
          </div>

          {/* Active Members */}
          <div
            onClick={() => onNavigate('members', 'ACTIVE')}
            className="glass-panel glass-panel-hover p-4 sm:p-5 rounded-2xl cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Active Members</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <h3 className="text-2xl sm:text-3xl font-black text-emerald-600 font-heading">{active_members}</h3>
              <span className="text-[10px] font-semibold text-slate-500">
                {total_members > 0 ? Math.round((active_members / total_members) * 100) : 0}% Active
              </span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">Valid active subscriptions</span>
          </div>

          {/* Expiring Soon */}
          <div
            onClick={() => onNavigate('members', 'EXPIRING_SOON')}
            className="glass-panel glass-panel-hover p-4 sm:p-5 rounded-2xl cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Expiring Soon (≤7d)</span>
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <h3 className="text-2xl sm:text-3xl font-black text-amber-600 font-heading">{expiring_soon_count}</h3>
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                Action Req.
              </span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">Follow-up for renewal</span>
          </div>

          {/* Expired Members */}
          <div
            onClick={() => onNavigate('members', 'EXPIRED')}
            className="glass-panel glass-panel-hover p-4 sm:p-5 rounded-2xl cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Expired Members</span>
              <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                <XCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <h3 className="text-2xl sm:text-3xl font-black text-rose-600 font-heading">{expired_count}</h3>
              <span className="text-[10px] font-semibold text-rose-600">Renewable</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">Requires plan extension</span>
          </div>
        </div>

        {/* Financial Overview (Combined Month Revenue, Membership Dues, Supplements Dues) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {/* Combined This Month's Revenue */}
          <div
            onClick={() => onNavigate('financials')}
            className="glass-panel glass-panel-hover p-4 sm:p-5 rounded-2xl cursor-pointer"
            title="View Financial P&L Statement"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">This Month Revenue</span>
              <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <h3 className="text-2xl sm:text-3xl font-black text-orange-600 font-heading">
                ₹{Number(combined_month_revenue).toLocaleString('en-IN')}
              </h3>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Fees: ₹{Number(this_month_revenue).toLocaleString('en-IN')} • Supplements: ₹{Number(supplements_month_revenue).toLocaleString('en-IN')}
              {kpis.supplements_month_profit !== undefined && kpis.supplements_month_profit > 0 ? ` (Sup. Profit: ₹${Number(kpis.supplements_month_profit).toLocaleString('en-IN')})` : ''}
            </span>
          </div>

          {/* Membership Pending Dues */}
          <div
            onClick={() => onNavigate('members', 'PENDING_DUES')}
            className="glass-panel glass-panel-hover p-4 sm:p-5 rounded-2xl cursor-pointer"
            title="View Members with Pending Dues"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Membership Pending Dues</span>
              <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <h3 className="text-2xl sm:text-3xl font-black text-rose-600 font-heading">
                ₹{Number(total_pending_dues).toLocaleString('en-IN')}
              </h3>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">Balance gym fee to collect</span>
          </div>

          {/* Supplements Pending Dues */}
          <div
            onClick={() => onNavigate('supplements', 'pending_dues')}
            className="glass-panel glass-panel-hover p-4 sm:p-5 rounded-2xl cursor-pointer"
            title="View Supplements Pending Dues"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Supplements Pending Dues</span>
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <h3 className="text-2xl sm:text-3xl font-black text-amber-600 font-heading">
                ₹{Number(supplements_pending_dues).toLocaleString('en-IN')}
              </h3>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">Store counter unpaid / partial bills</span>
          </div>
        </div>
      </div>

      {/* Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trend Area Chart */}
        <div className="lg:col-span-2 glass-panel p-5 sm:p-6 rounded-3xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900 font-heading">
                Revenue & Collections Trend
              </h3>
              <p className="text-xs text-slate-500">Monthly breakdown of gym fees and supplement sales</p>
            </div>

            {/* Visual Legend Chips */}
            <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-orange-50 border border-orange-200 rounded-full text-[11px] font-bold text-orange-700">
                <span className="w-2 h-2 rounded-full bg-orange-500 shadow-sm" />
                <span>Gym Fees</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-[11px] font-bold text-emerald-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm" />
                <span>Supplements</span>
              </div>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={formattedRevenueChart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="feeRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ea580c" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#ea580c" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="supRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e2e8f0',
                    borderRadius: '12px',
                    color: '#0f172a',
                    boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.08)',
                  }}
                  formatter={(value: any, name: string) => [
                    `₹${Number(value || 0).toLocaleString('en-IN')}`,
                    name === 'fee_revenue' ? 'Gym Fees' : name === 'supplement_revenue' ? 'Supplements' : name
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="fee_revenue"
                  name="Gym Fees"
                  stroke="#ea580c"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#feeRevenueGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="supplement_revenue"
                  name="Supplements"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#supRevenueGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Membership Health Donut */}
        <div className="glass-panel p-5 sm:p-6 rounded-3xl space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 font-heading">
              Membership Health
            </h3>
            <p className="text-xs text-slate-500">Distribution of active vs expiring subscriptions</p>
          </div>

          <div className="h-48 w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {donutData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e2e8f0',
                    borderRadius: '12px',
                    boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.08)',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black text-slate-900 font-heading">{total_members}</span>
              <span className="text-[10px] uppercase font-bold text-slate-400">Total</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs pt-2 border-t border-slate-100">
            <div
              onClick={() => onNavigate('members', 'ACTIVE')}
              className="cursor-pointer p-1.5 rounded-xl hover:bg-emerald-50 transition-colors group"
              title="View Active Members"
            >
              <span className="text-[10px] text-slate-400 uppercase font-semibold group-hover:text-emerald-700">Active</span>
              <span className="font-bold text-emerald-600 block">{active_members}</span>
            </div>
            <div
              onClick={() => onNavigate('members', 'EXPIRING_SOON')}
              className="cursor-pointer p-1.5 rounded-xl hover:bg-amber-50 transition-colors group"
              title="View Expiring Soon Members"
            >
              <span className="text-[10px] text-slate-400 uppercase font-semibold group-hover:text-amber-700">Expiring</span>
              <span className="font-bold text-amber-600 block">{expiring_soon_count}</span>
            </div>
            <div
              onClick={() => onNavigate('members', 'EXPIRED')}
              className="cursor-pointer p-1.5 rounded-xl hover:bg-rose-50 transition-colors group"
              title="View Expired Members"
            >
              <span className="text-[10px] text-slate-400 uppercase font-semibold group-hover:text-rose-700">Expired</span>
              <span className="font-bold text-rose-600 block">{expired_count}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Plan Popularity Breakdown Row */}
      <div className="glass-panel p-5 sm:p-6 rounded-3xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 font-heading">
              Plan Popularity Breakdown
            </h3>
            <p className="text-xs text-slate-500">Member distribution across membership tiers</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {plan_distribution?.map((item: any, idx: number) => {
            const totalSubs = plan_distribution.reduce((acc: number, p: any) => acc + (p.value ?? p.count ?? 0), 0);
            const val = item.value ?? item.count ?? 0;
            const name = item.name ?? item.plan_name ?? 'Plan';
            const pct = totalSubs > 0 ? Math.round((val / totalSubs) * 100) : 0;
            const color = PLAN_COLORS[idx % PLAN_COLORS.length];

            return (
              <div key={name} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-800 font-bold">{name}</span>
                  <span className="text-slate-500">{val} members ({pct}%)</span>
                </div>
                <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            );
          })}

          {plan_distribution.length === 0 && (
            <div className="col-span-full text-xs text-slate-400 text-center py-6">
              No active plan subscriptions to display yet.
            </div>
          )}
        </div>
      </div>

      {/* Most Sold & Popular Products Breakdown */}
      <div className="glass-panel p-5 sm:p-6 rounded-3xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Package className="w-5 h-5 text-orange-500" />
              <h3 className="text-base font-bold text-slate-900 font-heading">
                Most Sold Products Breakdown
              </h3>
              {(kpis.supplements_total_profit ?? 0) > 0 && (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-emerald-600" />
                  <span>Total Profit: ₹{Number(kpis.supplements_total_profit).toLocaleString('en-IN')} ({kpis.supplements_profit_margin ?? 0}%)</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Top-selling supplements and nutrition products with sales & profit margins</p>
          </div>
          <button
            onClick={() => onNavigate('supplements')}
            className="text-[11px] font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 self-start sm:self-auto"
          >
            <span>Store Inventory</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {popular_products?.map((item: any, idx: number) => {
            const totalUnits = popular_products.reduce((acc: number, p: any) => acc + (p.quantity ?? 0), 0);
            const qty = item.quantity ?? 0;
            const rev = item.revenue ?? 0;
            const profit = item.profit;
            const margin = item.margin;
            const pct = totalUnits > 0 ? Math.round((qty / totalUnits) * 100) : 0;
            const color = PRODUCT_COLORS[idx % PRODUCT_COLORS.length];

            return (
              <div key={`${item.name}-${idx}`} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 hover:border-orange-300 transition-colors">
                <div className="flex justify-between items-start text-xs font-semibold gap-2">
                  <div className="min-w-0">
                    <span className="text-slate-900 font-bold block truncate">{item.name}</span>
                    {item.brand && (
                      <span className="text-[10px] text-slate-400 font-medium block truncate">{item.brand}</span>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-slate-800 font-black block">{qty} sold</span>
                    <span className="text-[10px] text-slate-500 font-medium block">Sales: ₹{Number(rev).toLocaleString('en-IN')}</span>
                    {profit !== undefined && (
                      <span className="text-[10px] text-emerald-600 font-bold block">
                        Profit: ₹{Number(profit).toLocaleString('en-IN')} ({margin ?? 0}%)
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: color }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Share of units sold</span>
                    <span className="font-bold text-slate-600">{pct}%</span>
                  </div>
                </div>
              </div>
            );
          })}

          {(!popular_products || popular_products.length === 0) && (
            <div className="col-span-full text-xs text-slate-400 text-center py-6">
              No supplement sales recorded yet. Once products are sold, their popularity breakdown will appear here.
            </div>
          )}
        </div>
      </div>

      {/* Action Feeds Row: Expiring Members, Pending Dues, Birthdays */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Expiring Soon Feed */}
        <div className="glass-panel p-5 rounded-3xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Expiring This Week ({expiring_members.length})
              </h4>
            </div>
            <button
              onClick={() => onNavigate('members', 'EXPIRING_SOON')}
              className="text-[11px] font-bold text-amber-600 hover:text-amber-700 flex items-center gap-0.5"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {expiring_members.map((m: any) => (
              <div
                key={m.id}
                className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs hover:border-amber-300 transition-colors"
              >
                <div className="min-w-0">
                  <span className="font-bold text-slate-900 block truncate">{m.full_name || m.name}</span>
                  <span className="text-[11px] text-amber-700 font-semibold">
                    {m.days_remaining} days left ({m.plan_name || m.plan})
                  </span>
                </div>

                <div className="flex items-center gap-1.5 ml-2">
                  <button
                    onClick={() => onOpenWhatsApp(m.id)}
                    className="p-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-700 transition-colors"
                    title="Send WhatsApp Reminder"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onQuickAction('renew', m.id)}
                    className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10px] rounded-lg shadow-sm"
                  >
                    Renew
                  </button>
                </div>
              </div>
            ))}

            {expiring_members.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-6">
                No memberships expiring in the next 7 days.
              </p>
            )}
          </div>
        </div>

        {/* Pending Dues Feed */}
        <div className="glass-panel p-5 rounded-3xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-rose-500" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Pending Balance Dues ({pending_payments.length})
              </h4>
            </div>
            <button
              onClick={() => onNavigate('members', 'PENDING_DUES')}
              className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-0.5"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {pending_payments.map((p: any) => (
              <div
                key={p.id || p.member_id}
                className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs hover:border-rose-300 transition-colors"
              >
                <div className="min-w-0">
                  <span className="font-bold text-slate-900 block truncate">{p.member_name || p.full_name || p.name}</span>
                  <span className="text-[11px] text-rose-600 font-bold">
                    ₹{Number(p.pending_amount).toLocaleString('en-IN')} Due
                  </span>
                </div>

                <div className="flex items-center gap-1.5 ml-2">
                  <button
                    onClick={() => onOpenWhatsApp(p.member_id || p.id)}
                    className="p-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-700 transition-colors"
                    title="Send WhatsApp Dues Reminder"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onQuickAction('payment', p.member_id || p.id)}
                    className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] rounded-lg shadow-sm"
                  >
                    Collect
                  </button>
                </div>
              </div>
            ))}

            {pending_payments.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-6">
                All member dues are completely settled!
              </p>
            )}
          </div>
        </div>

        {/* Today's Birthdays Feed */}
        <div className="glass-panel p-5 rounded-3xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <Cake className="w-4 h-4 text-orange-500" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Today's Birthdays ({today_birthdays.length})
              </h4>
            </div>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {today_birthdays.map((b: any) => (
              <div
                key={b.id}
                className="p-3 rounded-2xl bg-orange-50/60 border border-orange-200 flex items-center justify-between text-xs"
              >
                <div className="min-w-0">
                  <span className="font-bold text-slate-900 block truncate">{b.full_name || b.name}</span>
                  <span className="text-[11px] text-orange-700 font-medium">
                    +91 {b.phone}
                  </span>
                </div>

                <button
                  onClick={() => onOpenWhatsApp(b.id)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg shadow-sm flex items-center gap-1"
                >
                  <MessageSquare className="w-3 h-3" />
                  <span>Wish</span>
                </button>
              </div>
            ))}

            {today_birthdays.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-6">
                No member birthdays today.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
