import React, { useState, useEffect } from 'react';
import {
  Search, UserPlus, RefreshCw, Eye, MessageSquare,
  CreditCard, ChevronRight, CheckCircle2, Trash2
} from 'lucide-react';
import { Member } from '../types';
import { api } from '../services/api';
import { StatusBadge } from '../components/common/StatusBadge';

interface MembersProps {
  onSelectMember: (memberId: number) => void;
  onAddMember: () => void;
  onRenewMember: (memberId: number) => void;
  onTakePayment: (memberId: number) => void;
  onOpenWhatsApp: (memberId: number) => void;
}

export const Members: React.FC<MembersProps> = ({
  onSelectMember,
  onAddMember,
  onRenewMember,
  onTakePayment,
  onOpenWhatsApp,
}) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('ALL');

  const fetchMembers = async () => {
    setIsLoading(true);
    try {
      const res = await api.getMembers({
        search: searchTerm || undefined,
        status: activeTab === 'ALL' || activeTab === 'PENDING_DUES' ? undefined : activeTab,
      });
      setMembers(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchMembers();
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [searchTerm, activeTab]);

  const filteredMembers = members.filter((m) => {
    if (activeTab === 'PENDING_DUES') {
      return Number(m.pending_amount) > 0;
    }
    return true;
  });

  const tabCounts = {
    ALL: members.length,
    ACTIVE: members.filter((m) => m.membership_status === 'ACTIVE').length,
    EXPIRING_SOON: members.filter((m) => m.membership_status === 'EXPIRING_SOON').length,
    EXPIRED: members.filter((m) => m.membership_status === 'EXPIRED').length,
    PENDING_DUES: members.filter((m) => Number(m.pending_amount) > 0).length,
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 font-heading tracking-tight">Member Registry</h2>
          <p className="text-xs text-slate-500">
            Complete member records, subscription validity, contact profiles, and dues tracking.
          </p>
        </div>

        <button
          onClick={onAddMember}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold rounded-xl shadow-md shadow-orange-500/20 transition-all self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Enroll New Member</span>
        </button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="glass-panel p-4 rounded-2xl space-y-3">
        {/* Status Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-3 text-xs font-bold">
          {[
            { id: 'ALL', label: 'All Members', count: tabCounts.ALL },
            { id: 'ACTIVE', label: 'Active', count: tabCounts.ACTIVE },
            { id: 'EXPIRING_SOON', label: 'Expiring Soon (≤7d)', count: tabCounts.EXPIRING_SOON },
            { id: 'EXPIRED', label: 'Expired', count: tabCounts.EXPIRED },
            { id: 'PENDING_DUES', label: 'Pending Dues', count: tabCounts.PENDING_DUES },
          ].map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${isSelected
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${isSelected ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by member name, phone number (+91), or Member ID (e.g. MF20260001)..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-orange-500 focus:bg-white transition-colors"
          />
        </div>
      </div>

      {/* Members Table */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                <th className="py-3 px-4">Member Info</th>
                <th className="py-3 px-4">Current Plan</th>
                <th className="py-3 px-4">Validity / Expiry</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Pending Dues</th>
                <th className="py-3 px-4 text-right">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredMembers.map((member) => (
                <tr
                  key={member.id}
                  className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                  onClick={() => onSelectMember(member.id)}
                >
                  {/* Member Name & ID */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-700 font-bold flex items-center justify-center text-xs flex-shrink-0 border border-orange-200">
                        {member.first_name.charAt(0)}
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 group-hover:text-orange-600 transition-colors block">
                          {member.full_name}
                        </span>
                        <span className="font-mono text-[11px] text-orange-600 font-semibold block">
                          {member.member_id}
                        </span>
                        <span className="text-[11px] text-slate-400 block font-mono">
                          +91 {member.phone}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Plan */}
                  <td className="py-3 px-4">
                    <span className="font-semibold text-slate-800 block">
                      {member.current_plan || 'No Active Plan'}
                    </span>
                  </td>

                  {/* Validity */}
                  <td className="py-3 px-4">
                    {member.expiry_date ? (
                      <div>
                        <span className="font-medium text-slate-800 block">
                          {new Date(member.expiry_date).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                        <span
                          className={`text-[10px] font-bold block ${member.days_remaining <= 0
                            ? 'text-rose-600'
                            : member.days_remaining <= 7
                              ? 'text-amber-600'
                              : 'text-emerald-600'
                            }`}
                        >
                          {member.days_remaining <= 0
                            ? 'Expired'
                            : `${member.days_remaining} days left`}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-400 text-xs">—</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="py-3 px-4">
                    <StatusBadge status={member.membership_status} size="sm" />
                  </td>

                  {/* Dues */}
                  <td className="py-3 px-4">
                    {Number(member.pending_amount) > 0 ? (
                      <span className="font-black text-rose-600 text-xs bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200">
                        ₹{Number(member.pending_amount).toLocaleString('en-IN')} Due
                      </span>
                    ) : (
                      <span className="text-[11px] text-emerald-600 font-bold">✓ Settled</span>
                    )}
                  </td>

                  {/* Quick Actions */}
                  <td
                    className="py-3 px-4 text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      {/* WhatsApp */}
                      <button
                        onClick={() => onOpenWhatsApp(member.id)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-emerald-100 text-slate-500 hover:text-emerald-700 transition-colors"
                        title="Send WhatsApp Message"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>

                      {/* Renew */}
                      <button
                        onClick={() => onRenewMember(member.id)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-amber-100 text-slate-500 hover:text-amber-700 transition-colors"
                        title="Renew Subscription"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>

                      {/* View Details / Edit */}
                      <button
                        onClick={() => onSelectMember(member.id)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                        title="View & Edit Profile"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={async () => {
                          if (window.confirm(`Are you sure you want to delete member ${member.full_name} (${member.member_id})?`)) {
                            try {
                              await api.deleteMember(member.id);
                              fetchMembers();
                            } catch (err: any) {
                              alert(err.response?.data?.detail || 'Failed to delete member.');
                            }
                          }
                        }}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition-colors"
                        title="Delete Member"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredMembers.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400 text-xs">
                    No members found matching the selected search and filter criteria.
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
