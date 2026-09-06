import React, { useState, useEffect } from 'react';
import {
  TrendingUp, TrendingDown, IndianRupee, CreditCard,
  Flame, PieChart as PieIcon, RefreshCw, ArrowUpRight, ArrowDownRight,
  ShieldCheck, AlertCircle
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts';
import { api } from '../services/api';

export const Financials: React.FC = () => {
  const [summary, setSummary] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchFinancials = async () => {
    setIsLoading(true);
    try {
      const res = await api.getFinancialSummary();
      setSummary(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFinancials();
  }, []);

  const formatINR = (val: number | undefined) => {
    return `₹${Number(val || 0).toLocaleString('en-IN')}`;
  };

  if (isLoading || !summary) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-slate-400">
        <RefreshCw className="w-8 h-8 text-orange-500 animate-spin" />
        <span className="text-sm font-semibold">Calculating Financial P&L Statement...</span>
      </div>
    );
  }

  const isProfitable = summary.net_profit >= 0;
  const isMonthProfitable = summary.this_month_profit >= 0;

  const BAR_COLORS = ['#ea580c', '#3b82f6', '#10b981', '#a855f7', '#ec4899', '#eab308', '#06b6d4'];

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 font-heading tracking-tight">Financial P&L Dashboard</h2>
          <p className="text-xs text-slate-500">
            Comprehensive Profit & Loss, operating expense margins, and revenue receivables for Morya Fitness.
          </p>
        </div>
        <button
          onClick={fetchFinancials}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 text-xs font-semibold self-start sm:self-auto transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Primary KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 1. All-Time Total Revenue */}
        <div className="glass-panel p-5 rounded-3xl space-y-2 shadow-sm border border-emerald-200/80 bg-emerald-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider text-[10px]">
              All-Time Total Revenue
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-slate-900 font-heading">{formatINR(summary.total_revenue)}</h3>
          <span className="text-[11px] text-emerald-700 font-medium block">
            Combined Fees & Supplements
          </span>
        </div>

        {/* 2. All-Time Fees Collection */}
        <div className="glass-panel p-5 rounded-3xl space-y-2 shadow-sm border border-orange-200/80 bg-orange-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-orange-800 uppercase tracking-wider text-[10px]">
              Fees Collection (All-Time)
            </span>
            <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xs">
              🏋️
            </div>
          </div>
          <h3 className="text-2xl font-black text-slate-900 font-heading">
            {formatINR(summary.membership_revenue?.all_time ?? summary.total_revenue)}
          </h3>
          <span className="text-[11px] text-slate-500 block font-medium">
            Gym membership enrollments & renewals
          </span>
        </div>

        {/* 3. All-Time Supplements Revenue */}
        <div className="glass-panel p-5 rounded-3xl space-y-2 shadow-sm border border-amber-200/80 bg-amber-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider text-[10px]">
              Supplements Revenue (All-Time)
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
              🛍️
            </div>
          </div>
          <h3 className="text-2xl font-black text-amber-900 font-heading">
            {formatINR(summary.supplement_revenue?.all_time ?? 0)}
          </h3>
          <span className="text-[11px] text-emerald-700 block font-semibold">
            Profit: {formatINR(summary.supplement_revenue?.total_profit ?? 0)} ({summary.supplement_revenue?.profit_margin ?? 0}%)
          </span>
        </div>

        {/* 4. All-Time Expenses */}
        <div className="glass-panel p-5 rounded-3xl space-y-2 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
              All-Time Expenses
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-rose-600 font-heading">{formatINR(summary.total_expenses)}</h3>
          <span className="text-[11px] text-slate-400 block font-medium">
            Operating expenditures & bills
          </span>
        </div>

        {/* 5. All-Time Net Profit */}
        <div className="glass-panel p-5 rounded-3xl space-y-2 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
              All-Time Net Profit
            </span>
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                isProfitable
                  ? 'bg-emerald-100 text-emerald-600'
                  : 'bg-rose-100 text-rose-600'
              }`}
            >
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <h3
            className={`text-2xl font-black font-heading ${
              isProfitable ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {formatINR(summary.net_profit)}
          </h3>
          <span className="text-[11px] text-slate-400 block font-medium">
            Total Revenue minus Expenses
          </span>
        </div>

        {/* 6. Pending Receivables */}
        <div className="glass-panel p-5 rounded-3xl space-y-2 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
              Pending Receivables
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-rose-600 font-heading">{formatINR(summary.pending_dues)}</h3>
          <span className="text-[11px] text-rose-600 font-medium">
            Unpaid member dues to collect
          </span>
        </div>
      </div>

      {/* Month Comparison Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* This Month Performance Box */}
        <div className="glass-panel p-6 rounded-3xl space-y-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 font-heading">Current Month Performance</h3>
            <span className="text-xs font-bold text-orange-700 bg-orange-50 px-2.5 py-1 rounded-full border border-orange-200">
              September 2026
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center text-xs">
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Collections</span>
                <span className="text-lg font-black text-slate-900 font-heading block mt-0.5">
                  {formatINR(summary.this_month_collection)}
                </span>
              </div>
              <span className="text-[9px] text-slate-400 block mt-1 font-medium">
                Fees: {formatINR(summary.membership_revenue?.this_month ?? 0)} | Sup: {formatINR(summary.supplement_revenue?.this_month ?? 0)}
              </span>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Expenses</span>
                <span className="text-lg font-black text-rose-600 font-heading block mt-0.5">
                  {formatINR(summary.this_month_expenses)}
                </span>
              </div>
              <span className="text-[9px] text-slate-400 block mt-1 font-medium">Operating Bills</span>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Net Margin</span>
                <span
                  className={`text-lg font-black font-heading block mt-0.5 ${
                    isMonthProfitable ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {formatINR(summary.this_month_profit)}
                </span>
              </div>
              <span className="text-[9px] text-slate-400 block mt-1 font-medium">Collection - Expense</span>
            </div>
          </div>
        </div>

        {/* Previous Month Performance Box */}
        <div className="glass-panel p-6 rounded-3xl space-y-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 font-heading">Previous Month Performance</h3>
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
              August 2026
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center text-xs">
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Collections</span>
                <span className="text-lg font-black text-slate-900 font-heading block mt-0.5">
                  {formatINR(summary.last_month_collection)}
                </span>
              </div>
              <span className="text-[9px] text-slate-400 block mt-1 font-medium">
                Fees: {formatINR(summary.membership_revenue?.last_month ?? 0)} | Sup: {formatINR(summary.supplement_revenue?.last_month ?? 0)}
              </span>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Expenses</span>
                <span className="text-lg font-black text-rose-600 font-heading block mt-0.5">
                  {formatINR(summary.last_month_expenses)}
                </span>
              </div>
              <span className="text-[9px] text-slate-400 block mt-1 font-medium">Operating Bills</span>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Net Margin</span>
                <span className="text-lg font-black text-emerald-600 font-heading block mt-0.5">
                  {formatINR(summary.last_month_collection - summary.last_month_expenses)}
                </span>
              </div>
              <span className="text-[9px] text-slate-400 block mt-1 font-medium">Collection - Expense</span>
            </div>
          </div>
        </div>
      </div>

      {/* Category-Wise Expense Distribution Bar Chart */}
      <div className="glass-panel p-6 rounded-3xl space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 font-heading">Expenditure by Category</h3>
            <p className="text-xs text-slate-500">Detailed breakdown of operational spending</p>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={summary.category_expenses}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 10 }} />
              <YAxis
                type="category"
                dataKey="category_name"
                stroke="#64748b"
                tick={{ fontSize: 11 }}
                width={120}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderColor: '#e2e8f0',
                  borderRadius: '12px',
                  fontSize: '12px',
                  boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.08)',
                }}
                formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Amount']}
              />
              <Bar dataKey="total" radius={[0, 6, 6, 0]}>
                {summary.category_expenses?.map((_: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
