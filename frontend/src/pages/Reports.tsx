import React, { useState, useEffect } from 'react';
import {
  BarChart3, Download, Printer, Filter, Calendar,
  FileSpreadsheet, Users, Receipt, Clock, Flame, RefreshCw
} from 'lucide-react';
import { api } from '../services/api';

export const Reports: React.FC = () => {
  const [reportType, setReportType] = useState<string>('members');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [reportData, setReportData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

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
    { id: 'members', label: 'Member Registry Report', icon: Users },
    { id: 'payments', label: 'Payment & Collection Report', icon: Receipt },
    { id: 'financials', label: 'Financial Summary Report', icon: Flame },
  ];

  const handleExportCSV = () => {
    if (!reportData?.data || reportData.data.length === 0) {
      alert('No data available to export');
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
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow-md shadow-orange-500/20 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Report Type Selector & Filters */}
      <div className="glass-panel p-4 rounded-2xl space-y-4 no-print shadow-sm">
        {/* Selector Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {reportOptions.map((opt) => {
            const Icon = opt.icon;
            const isSelected = reportType === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setReportType(opt.id)}
                className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all text-left ${
                  isSelected
                    ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                    : 'bg-slate-50 text-slate-600 hover:text-slate-900 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>

        {/* Date Filter */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
            />
          </div>
          <div className="pt-4">
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              className="text-xs text-slate-500 hover:text-slate-900 underline font-medium"
            >
              Reset Dates
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

        {/* Financial Summary Special View */}
        {reportType === 'financials' && reportData?.summary && (
          <div className="grid grid-cols-3 gap-4 text-center p-6 bg-slate-50 rounded-2xl border border-slate-200">
            <div>
              <span className="text-xs text-slate-500 uppercase font-bold block">Total Revenue</span>
              <span className="text-2xl font-black text-slate-900 font-heading mt-1 block">
                ₹{reportData.summary.total_revenue.toLocaleString('en-IN')}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-500 uppercase font-bold block">Total Expenses</span>
              <span className="text-2xl font-black text-rose-600 font-heading mt-1 block">
                ₹{reportData.summary.total_expenses.toLocaleString('en-IN')}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-500 uppercase font-bold block">Net Profit</span>
              <span className="text-2xl font-black text-emerald-600 font-heading mt-1 block">
                ₹{reportData.summary.net_profit.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
