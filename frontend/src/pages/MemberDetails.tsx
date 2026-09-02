import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, RefreshCw, MessageSquare, CreditCard,
  Phone, Mail, MapPin, Calendar, Clock,
  Receipt, Plus, Trash2, CheckCircle
} from 'lucide-react';
import { Member, ReceiptData } from '../types';
import { api } from '../services/api';
import { StatusBadge } from '../components/common/StatusBadge';

interface MemberDetailsProps {
  memberId: number;
  onBack: () => void;
  onRenew: (memberId: number) => void;
  onTakePayment: (memberId: number) => void;
  onOpenWhatsApp: (memberId: number) => void;
  onViewReceipt: (receiptData: ReceiptData) => void;
}

export const MemberDetails: React.FC<MemberDetailsProps> = ({
  memberId,
  onBack,
  onRenew,
  onTakePayment,
  onOpenWhatsApp,
  onViewReceipt,
}) => {
  const [member, setMember] = useState<Member | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'memberships' | 'payments' | 'notes'
  >('overview');

  const fetchMember = async () => {
    setIsLoading(true);
    try {
      const res = await api.getMember(memberId);
      setMember(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMember();
  }, [memberId]);

  if (isLoading || !member) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-slate-400">
        <RefreshCw className="w-8 h-8 text-orange-500 animate-spin" />
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Loading Member Profile...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-sm transition-colors self-start"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Members</span>
        </button>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {Number(member.pending_amount) > 0 && (
            <button
              onClick={() => onTakePayment(member.id)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Collect ₹{Number(member.pending_amount).toLocaleString('en-IN')} Due</span>
            </button>
          )}

          <button
            onClick={() => onOpenWhatsApp(member.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
            <span>WhatsApp</span>
          </button>

          <button
            onClick={() => onRenew(member.id)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Renew Plan</span>
          </button>
        </div>
      </div>

      {/* Member Profile Header Card */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white font-black text-2xl sm:text-3xl font-heading flex items-center justify-center shadow-md shadow-orange-500/20 flex-shrink-0">
              {member.first_name?.charAt(0) || 'M'}
            </div>

            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-heading tracking-tight">
                  {member.full_name}
                </h1>
                <StatusBadge status={member.membership_status} size="sm" />
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-medium">
                <span className="font-mono text-orange-600 font-bold bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200">
                  {member.member_id}
                </span>
                <span className="flex items-center gap-1 font-mono">
                  <Phone className="w-3 h-3 text-slate-400" />
                  +91 {member.phone}
                </span>
                {member.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3 text-slate-400" />
                    {member.email}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-3 sm:border-l sm:border-slate-100 sm:pl-6 text-xs">
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Current Plan</span>
              <span className="font-bold text-slate-900 text-sm block mt-0.5">
                {member.current_plan || 'None'}
              </span>
              <span className="text-[10px] text-slate-500 block">
                {member.days_remaining > 0 ? `${member.days_remaining} Days Left` : 'Expired'}
              </span>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Pending Due</span>
              <span
                className={`font-black text-sm block mt-0.5 ${
                  Number(member.pending_amount) > 0 ? 'text-rose-600' : 'text-emerald-600'
                }`}
              >
                ₹{Number(member.pending_amount).toLocaleString('en-IN')}
              </span>
              {Number(member.pending_amount) > 0 ? (
                <button
                  onClick={() => onTakePayment(member.id)}
                  className="text-[10px] font-bold text-rose-600 underline block"
                >
                  Clear Dues →
                </button>
              ) : (
                <span className="text-[10px] text-emerald-600 font-bold block">Paid in Full</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Profile Tabs Bar */}
      <div className="flex border-b border-slate-200 text-xs font-bold gap-1 overflow-x-auto pb-1">
        {[
          { id: 'overview', label: 'Personal & Gym Details' },
          { id: 'memberships', label: `Memberships History (${member.memberships?.length || 0})` },
          { id: 'payments', label: `Receipts & Payments (${member.payments?.length || 0})` },
          { id: 'notes', label: 'Staff Notes' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`px-4 py-2.5 rounded-xl whitespace-nowrap transition-all ${
              activeTab === t.id
                ? 'bg-orange-500 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-panel p-6 rounded-3xl space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-2">
              Personal Information
            </h3>
            <div className="space-y-3 text-xs text-slate-600">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span>Date of Birth:</span>
                <span className="font-semibold text-slate-800">{member.dob || 'Not provided'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span>Gender:</span>
                <span className="font-semibold text-slate-800">{member.gender}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span>Residential Address:</span>
                <span className="font-semibold text-slate-800">{member.address || 'Sinnar'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span>Emergency Contact:</span>
                <span className="font-semibold text-slate-800">
                  {member.emergency_contact_name || '—'}{' '}
                  {member.emergency_contact_phone && `(+91 ${member.emergency_contact_phone})`}
                </span>
              </div>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-3xl space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-2">
              Gym Subscription Details
            </h3>
            <div className="space-y-3 text-xs text-slate-600">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span>Joining Date:</span>
                <span className="font-semibold text-slate-800">
                  {new Date(member.joining_date).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span>Current Plan:</span>
                <span className="font-semibold text-orange-600">{member.current_plan || 'None'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span>Lead Source:</span>
                <span className="font-semibold text-slate-800">{member.source}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Memberships History */}
      {activeTab === 'memberships' && (
        <div className="glass-panel rounded-2xl overflow-hidden border border-slate-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                <th className="py-3 px-4">Plan Name</th>
                <th className="py-3 px-4">Start Date</th>
                <th className="py-3 px-4">End Date</th>
                <th className="py-3 px-4">Final Fee</th>
                <th className="py-3 px-4">Paid</th>
                <th className="py-3 px-4">Pending Due</th>
                <th className="py-3 px-4">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {member.memberships?.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-900">{m.plan_name}</td>
                  <td className="py-3 px-4 text-slate-600">
                    {new Date(m.start_date).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {new Date(m.end_date).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-900">
                    ₹{Number(m.final_amount).toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4 font-bold text-emerald-600">
                    ₹{Number(m.paid_amount).toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4 font-bold text-rose-600">
                    {Number(m.pending_amount) > 0 ? (
                      `₹${Number(m.pending_amount).toLocaleString('en-IN')}`
                    ) : (
                      <span className="text-emerald-600">✓ Settled</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        m.is_renewal
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-blue-50 text-blue-800 border-blue-200'
                      }`}
                    >
                      {m.is_renewal ? 'Renewal' : 'Initial Enrollment'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: Payments & Receipts */}
      {activeTab === 'payments' && (
        <div className="glass-panel rounded-2xl overflow-hidden border border-slate-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                <th className="py-3 px-4">Receipt #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4">Amount Paid</th>
                <th className="py-3 px-4">Cashier</th>
                <th className="py-3 px-4 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {member.payments?.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-orange-600">{p.receipt_number}</td>
                  <td className="py-3 px-4 text-slate-600">
                    {new Date(p.payment_date).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-800">{p.payment_method}</td>
                  <td className="py-3 px-4 font-black text-emerald-600">
                    ₹{Number(p.amount).toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4 text-slate-500">{p.received_by_name || 'Admin'}</td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={async () => {
                        const receiptData = await api.getReceipt(p.id);
                        onViewReceipt(receiptData);
                      }}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1"
                    >
                      <Receipt className="w-3.5 h-3.5 text-orange-600" />
                      <span>Print Receipt</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 4: Staff Notes */}
      {activeTab === 'notes' && (
        <div className="glass-panel p-6 rounded-3xl space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-2">
            Staff & Medical Notes
          </h3>
          <p className="text-xs text-slate-700 bg-slate-50 p-4 rounded-2xl border border-slate-200 leading-relaxed">
            {member.notes || 'No remarks recorded for this member.'}
          </p>
        </div>
      )}
    </div>
  );
};
