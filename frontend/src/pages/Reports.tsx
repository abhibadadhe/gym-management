import React, { useState, useEffect } from 'react';
import {
  BarChart3, Download, Printer, Filter, Calendar,
  FileSpreadsheet, Users, Receipt, Clock, Flame, RefreshCw,
  ShoppingBag, X
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

export const Reports: React.FC = () => {
  const { showToast } = useToast();
  const [reportType, setReportType] = useState<string>('members');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [reportData, setReportData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const handleMonthChange = (monthStr: string) => {
    setSelectedMonth(monthStr);
    if (!monthStr) {
      setStartDate('');
      setEndDate('');
      return;
    }
    const [year, month] = monthStr.split('-').map(Number);
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    setStartDate(start);
    setEndDate(end);
  };

  const fetchReport = async () => {
    setIsLoading(true);
    try {
      const res = await api.getReport(reportType, startDate || undefined, endDate || undefined);
      setReportData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [reportType, startDate, endDate]);

  const reportOptions = [
    { id: 'members', label: 'Member Registry', icon: Users },
    { id: 'payments', label: 'Fees & Collections', icon: Receipt },
    { id: 'supplements', label: 'Supplements & Store', icon: ShoppingBag },
    { id: 'financials', label: 'Financial Summary', icon: Flame },

  ];

  const handleExportCSV = () => {
    if (!reportData?.data || reportData.data.length === 0) {
      showToast('No data available to export.', 'info');
      return;
    }

    const rows = reportData.data;
    const headers = Object.keys(rows[0]);
    const csvContent = [
      headers.join(','),
      ...rows.map((row: any) =>
        headers.map((h) => `"${(row[h] || '').toString().replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Morya_Fitness_${reportType}_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Report CSV exported successfully!', 'success');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-2xl font-black text-slate-900 font-heading tracking-tight">Reports & Business Analytics</h2>
          <p className="text-xs text-slate-500">
            Generate and export structured data sheets for members, revenue collections, attendance, and P&L.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            disabled={!reportData?.data || reportData.data.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold rounded-xl transition-colors disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export CSV</span>
          </button>

        </div>
      </div>

      {/* Report Type Selector & Filters */}
      <div className="glass-panel p-4 rounded-2xl space-y-4 no-print shadow-sm">
        {/* Selector Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {reportOptions.map((opt) => {
            const Icon = opt.icon;
            const isSelected = reportType === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => {
                  setReportType(opt.id);
                  setReportData(null);
                }}
                className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all text-left ${isSelected
                  ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:text-slate-900 border-slate-200 hover:bg-slate-100'
                  }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{opt.label}</span>
              </button>
            );
          })}
        </div>

        {/* Month Filter */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100 text-xs">
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Select Month</label>
            <div className="flex items-center gap-1.5">
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => handleMonthChange(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:border-orange-500 focus:bg-white cursor-pointer"
              />
              {selectedMonth && (
                <button
                  type="button"
                  onClick={() => handleMonthChange('')}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title="Clear Month Filter"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Quick Month Preset Buttons */}
          <div className="flex items-center gap-1.5 self-end">
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                const mStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                handleMonthChange(mStr);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${selectedMonth === `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
                ? 'bg-orange-500 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
            >
              This Month
            </button>

            <button
              type="button"
              onClick={() => {
                const now = new Date();
                now.setMonth(now.getMonth() - 1);
                const mStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                handleMonthChange(mStr);
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all"
            >
              Last Month
            </button>
          </div>

          <div className="ml-auto pt-4">
            <button
              onClick={() => handleMonthChange('')}
              className="text-xs text-slate-500 hover:text-slate-900 underline font-medium"
            >
              All-Time Records
            </button>
          </div>
        </div>
      </div>

      {/* Printable Report Paper / Table Preview */}
      <div id="printable-receipt" className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm">
        <div className="border-b border-slate-100 pb-4 mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-900 font-heading uppercase">
              MORYA FITNESS — {reportData?.title || 'Report'}
            </h3>
            <p className="text-xs text-slate-500">
              Sinnar, Nashik • Generated on {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>
          {reportData?.data && (
            <span className="text-xs font-bold text-orange-700 bg-orange-50 px-3 py-1 rounded-full border border-orange-200">
              {reportData.data.length} Total Records
            </span>
          )}
        </div>

        {/* Supplements Summary KPI Cards */}
        {reportType === 'supplements' && reportData?.summary && reportData.summary.total_sales_count !== undefined && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-transparent rounded-2xl border border-orange-200/60 mb-6">
            <div className="p-3.5 bg-white rounded-xl shadow-xs border border-orange-100">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Total Store Sales</span>
              <span className="text-2xl font-black text-orange-600 font-heading mt-1 block">
                ₹{Number(reportData.summary.total_revenue || 0).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="p-3.5 bg-white rounded-xl shadow-xs border border-orange-100">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Invoices Billed</span>
              <span className="text-2xl font-black text-slate-900 font-heading mt-1 block">
                {reportData.summary.total_sales_count || 0}
              </span>
            </div>
            <div className="p-3.5 bg-white rounded-xl shadow-xs border border-orange-100">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Total Units Sold</span>
              <span className="text-2xl font-black text-slate-900 font-heading mt-1 block">
                {reportData.summary.total_units_sold || 0}
              </span>
            </div>
            <div className="p-3.5 bg-white rounded-xl shadow-xs border border-orange-100">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Average Order Value</span>
              <span className="text-2xl font-black text-emerald-600 font-heading mt-1 block">
                ₹{Number(reportData.summary.average_sale_value || 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        )}

        {/* Data Table */}
        {reportData?.data && reportData.data.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                  {Object.keys(reportData.data[0]).map((key) => (
                    <th key={key} className="py-2.5 px-3">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {reportData.data.map((row: any, i: number) => (
                  <tr key={i} className="hover:bg-slate-50">
                    {Object.keys(row).map((key) => (
                      <td key={key} className="py-2.5 px-3">
                        {row[key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {(!reportData?.data || reportData.data.length === 0) && !isLoading && (
          <div className="text-center py-12 text-slate-400 text-xs">
            No report records found for the selected time period.
          </div>
        )}

        {/* Financial Summary Special View */}
        {reportType === 'financials' && reportData?.summary && reportData.summary.total_expenses !== undefined && (
          <div className="grid grid-cols-3 gap-4 text-center p-6 bg-slate-50 rounded-2xl border border-slate-200">
            <div>
              <span className="text-xs text-slate-500 uppercase font-bold block">Total Revenue</span>
              <span className="text-2xl font-black text-slate-900 font-heading mt-1 block">
                ₹{Number(reportData.summary.total_revenue || 0).toLocaleString('en-IN')}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-500 uppercase font-bold block">Total Expenses</span>
              <span className="text-2xl font-black text-rose-600 font-heading mt-1 block">
                ₹{Number(reportData.summary.total_expenses || 0).toLocaleString('en-IN')}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-500 uppercase font-bold block">Net Profit</span>
              <span className="text-2xl font-black text-emerald-600 font-heading mt-1 block">
                ₹{Number(reportData.summary.net_profit || 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
