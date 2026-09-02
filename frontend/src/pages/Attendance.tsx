import React, { useState, useEffect } from 'react';
import {
  CalendarCheck, QrCode, Search, RefreshCw, Clock,
  Flame, Award, User, CheckCircle2, AlertTriangle, ArrowUpRight
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { Attendance as AttendanceType } from '../types';
import { api } from '../services/api';
import { StatusBadge } from '../components/common/StatusBadge';

interface AttendanceProps {
  onOpenScanner: () => void;
  onSelectMember: (memberId: number) => void;
}

export const Attendance: React.FC<AttendanceProps> = ({
  onOpenScanner,
  onSelectMember,
}) => {
  const [records, setRecords] = useState<AttendanceType[]>([]);
  const [stats, setStats] = useState<any | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchAttendanceData = async () => {
    setIsLoading(true);
    try {
      const [attRes, statsRes] = await Promise.all([
        api.getAttendance({ date: selectedDate }),
        api.getAttendanceStats(),
      ]);
      setRecords(attRes);
      setStats(statsRes);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceData();
  }, [selectedDate]);

  const filteredRecords = records.filter(
    (r) =>
      r.member_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.member_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.member_phone && r.member_phone.includes(searchTerm))
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 font-heading tracking-tight">Attendance & Check-In</h2>
          <p className="text-xs text-slate-500">
            Live QR scanner check-ins, peak hours footfall analysis, and member workout logs.
          </p>
        </div>
        <button
          onClick={onOpenScanner}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold rounded-2xl shadow-md shadow-orange-500/20 transition-all"
        >
          <QrCode className="w-5 h-5" />
          <span>Launch QR Scanner / Check-In</span>
        </button>
      </div>

      {/* Analytics Row: Peak Hours Chart & Most Active Members */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Peak Hours Hourly Chart */}
          <div className="lg:col-span-2 glass-panel p-5 sm:p-6 rounded-3xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-600" />
                  Today's Peak Hours Heatmap (6 AM – 10 PM)
                </h3>
                <p className="text-[11px] text-slate-500">Identify rush hours to optimize gym floor staffing</p>
              </div>
              <span className="text-xs font-bold text-orange-700 bg-orange-50 px-2.5 py-1 rounded-full border border-orange-200">
                {stats.today_total} Total Today
              </span>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.hours_distribution} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="hour" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e2e8f0',
                      borderRadius: '12px',
                      fontSize: '12px',
                      boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.08)',
                    }}
                  />
                  <Bar dataKey="count" name="Members" fill="#ea580c" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top 5 Active Members Leaderboard */}
          <div className="glass-panel p-5 sm:p-6 rounded-3xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">Top Active Members</h3>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">This Month</span>
            </div>

            <div className="space-y-2.5 pt-1">
              {stats.top_active_members?.map((m: any, idx: number) => (
                <div
                  key={m.id}
                  onClick={() => onSelectMember(m.id)}
                  className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-orange-300 cursor-pointer flex items-center justify-between text-xs transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                        idx === 0
                          ? 'bg-amber-400 text-slate-900'
                          : idx === 1
                          ? 'bg-slate-300 text-slate-900'
                          : 'bg-orange-100 text-orange-800'
                      }`}
                    >
                      #{idx + 1}
                    </span>
                    <div className="min-w-0">
                      <span className="font-bold text-slate-900 block truncate">{m.full_name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{m.member_id}</span>
                    </div>
                  </div>
                  <span className="text-xs font-black text-emerald-600 whitespace-nowrap">
                    {m.visit_count} Days
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Date Filter & Search Bar */}
      <div className="glass-panel p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label className="font-semibold text-slate-600">Filter Date:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
          />
          <button
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            className="px-3 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl border border-slate-200 font-semibold"
          >
            Today
          </button>
        </div>

        <div className="relative w-full sm:w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-3.5 h-3.5" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search member attendance..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white"
          />
        </div>
      </div>

      {/* Attendance Records Table */}
      <div className="glass-panel rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                <th className="py-3 px-4">Member Info</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Check-In Time</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4">Membership Status</th>
                <th className="py-3 px-4 text-right">Profile</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredRecords.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4">
                    <span className="font-bold text-slate-900 block">{r.member_name}</span>
                    <span className="font-mono text-[10px] text-orange-600 font-bold">{r.member_id}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {new Date(r.date).toLocaleDateString('en-IN', {
                      weekday: 'short',
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-bold text-emerald-600 flex items-center gap-1.5 font-mono">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(r.check_in_time).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                      })}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-[10px] font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                      {r.check_in_method}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={r.membership_status || 'ACTIVE'} size="sm" />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => onSelectMember(r.member)}
                      className="text-xs text-orange-600 hover:text-orange-700 font-bold"
                    >
                      View Profile →
                    </button>
                  </td>
                </tr>
              ))}

              {filteredRecords.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400 text-xs">
                    No attendance check-ins recorded for this date.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
