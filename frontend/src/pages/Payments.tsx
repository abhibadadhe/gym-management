import React, { useState, useEffect } from 'react';
import {
  CreditCard, Search, Filter, Receipt, ArrowUpRight,
  IndianRupee, CheckCircle2, AlertTriangle, RefreshCw, Printer, Calendar
} from 'lucide-react';
import { Payment, MemberMembership, ReceiptData } from '../types';
import { api } from '../services/api';
import { Modal } from '../components/common/Modal';
import confetti from 'canvas-confetti';

interface PaymentsProps {
  onViewReceipt: (receiptData: ReceiptData) => void;
  onOpenQuickPayment?: (memberId?: number) => void;
}

export const Payments: React.FC<PaymentsProps> = ({
  onViewReceipt,
}) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [pendingDues, setPendingDues] = useState<MemberMembership[]>([]);
  const [activeTab, setActiveTab] = useState<'history' | 'dues'>('history');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [methodFilter, setMethodFilter] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Collect Payment Modal State
  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);
  const [collectTarget, setCollectTarget] = useState<MemberMembership | null>(null);
  const [collectAmount, setCollectAmount] = useState('');
  const [collectMethod, setCollectMethod] = useState('UPI');
  const [collectRef, setCollectRef] = useState('');
  const [isCollecting, setIsCollecting] = useState(false);

  const fetchPaymentsData = async () => {
    setIsLoading(true);
    try {
      const [paymentsRes, duesRes] = await Promise.all([
        api.getPayments({
          method: methodFilter || undefined,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
        }),
        api.getPendingDues(),
      ]);
      setPayments(paymentsRes);
      setPendingDues(duesRes);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentsData();
  }, [methodFilter, startDate, endDate]);

  const totalCollected = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const todayStr = new Date().toISOString().split('T')[0];
  const todayCollected = payments
    .filter((p) => p.payment_date === todayStr)
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const totalDues = pendingDues.reduce((sum, d) => sum + Number(d.pending_amount), 0);

  const handleOpenCollect = (due: MemberMembership) => {
    setCollectTarget(due);
    setCollectAmount(due.pending_amount.toString());
    setCollectMethod('UPI');
    setCollectRef('');
    setIsCollectModalOpen(true);
  };

  const handleExecuteCollect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectTarget || !collectAmount) return;

    setIsCollecting(true);
    try {
      const res = await api.createPayment({
        member: collectTarget.member,
        membership: collectTarget.id,
        amount: Number(collectAmount),
        payment_method: collectMethod,
        transaction_ref: collectRef.trim(),
        payment_date: new Date().toISOString().split('T')[0],
        notes: `Dues clearance payment for ${collectTarget.plan_name}`,
      });

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
      });

      setIsCollectModalOpen(false);
      fetchPaymentsData();

      // Show receipt
      const receiptData = await api.getReceipt(res.id);
      onViewReceipt(receiptData);
    } catch (err) {
      alert('Failed to record dues payment');
    } finally {
      setIsCollecting(false);
    }
  };

  const handleViewReceipt = async (paymentId: number) => {
    try {
      const receiptData = await api.getReceipt(paymentId);
      onViewReceipt(receiptData);
    } catch (e) {
      alert('Could not generate receipt');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 font-heading tracking-tight">Payment & Fee Records</h2>
          <p className="text-xs text-slate-500">
            Real-time transaction ledger, balance dues settlements, and printable tax receipts.
          </p>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-5 rounded-2xl">
          <span className="text-xs font-semibold text-slate-500 block">Total Filtered Collection</span>
          <span className="text-2xl font-black text-emerald-600 font-heading mt-0.5 block">
            ₹{totalCollected.toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] text-slate-400 block mt-1">{payments.length} Transactions</span>
        </div>

        <div className="glass-panel p-5 rounded-2xl">
          <span className="text-xs font-semibold text-slate-500 block">Today's Collections</span>
          <span className="text-2xl font-black text-orange-600 font-heading mt-0.5 block">
            ₹{todayCollected.toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] text-slate-400 block mt-1">Recorded on {todayStr}</span>
        </div>

        <div className="glass-panel p-5 rounded-2xl">
          <span className="text-xs font-semibold text-slate-500 block">Outstanding Pending Dues</span>
          <span className="text-2xl font-black text-rose-600 font-heading mt-0.5 block">
            ₹{totalDues.toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] text-rose-600 font-medium block mt-1">{pendingDues.length} Members with dues</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-1">
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'history'
              ? 'bg-orange-500 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Payment History ({payments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('dues')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'dues'
              ? 'bg-orange-500 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-rose-500" />
          <span>Pending Dues Settlement ({pendingDues.length})</span>
        </button>
      </div>

      {/* Tab 1: Payment History */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="glass-panel p-4 rounded-2xl flex flex-wrap items-center gap-3 text-xs">
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Payment Method</label>
              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
              >
                <option value="">All Payment Modes</option>
                <option value="UPI">UPI</option>
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">From Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">To Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
              />
            </div>

            <div className="ml-auto pt-4">
              <button
                onClick={() => {
                  setMethodFilter('');
                  setStartDate('');
                  setEndDate('');
                }}
                className="text-xs text-slate-500 hover:text-slate-900 underline font-medium"
              >
                Reset Filters
              </button>
            </div>
          </div>

          {/* Payments Table */}
          <div className="glass-panel rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                    <th className="py-3 px-4">Receipt No</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Member</th>
                    <th className="py-3 px-4">Plan</th>
                    <th className="py-3 px-4">Method & Ref</th>
                    <th className="py-3 px-4">Amount Paid</th>
                    <th className="py-3 px-4 text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-orange-600">{p.receipt_number}</td>
                      <td className="py-3 px-4 text-slate-600">
                        {new Date(p.payment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block">{p.member_name}</span>
                        <span className="text-[11px] text-slate-400 font-mono">{p.member_id}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{p.plan_name || 'Gym Subscription'}</td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800 block">{p.payment_method}</span>
                        {p.transaction_ref && (
                          <span className="text-[10px] text-slate-400 font-mono block truncate max-w-[150px]">
                            {p.transaction_ref}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-black text-emerald-600 text-sm">
                        ₹{Number(p.amount).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleViewReceipt(p.id)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5 ml-auto"
                        >
                          <Printer className="w-3.5 h-3.5 text-orange-600" />
                          <span>View & Print</span>
                        </button>
                      </td>
                    </tr>
                  ))}

                  {payments.length === 0 && !isLoading && (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400 text-xs">
                        No transactions recorded matching the selected filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Pending Dues */}
      {activeTab === 'dues' && (
        <div className="glass-panel rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                  <th className="py-3 px-4">Member</th>
                  <th className="py-3 px-4">Plan</th>
                  <th className="py-3 px-4">Total Fee</th>
                  <th className="py-3 px-4">Paid So Far</th>
                  <th className="py-3 px-4">Pending Due</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {pendingDues.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 block">{d.member_name}</span>
                      <span className="text-[11px] text-slate-400 font-mono">{d.member_code}</span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700">{d.plan_name}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      ₹{Number(d.final_amount).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-emerald-600 font-semibold">
                      ₹{Number(d.paid_amount).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 font-black text-rose-600 text-sm">
                      ₹{Number(d.pending_amount).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenCollect(d)}
                        className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs rounded-xl shadow-md shadow-orange-500/20 transition-all inline-flex items-center gap-1.5"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Collect Payment</span>
                      </button>
                    </td>
                  </tr>
                ))}

                {pendingDues.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-500 text-xs">
                      <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-600" />
                      All member accounts are fully settled. No pending dues!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Collect Due Payment Modal */}
      <Modal
        isOpen={isCollectModalOpen}
        onClose={() => setIsCollectModalOpen(false)}
        title="Collect Balance Fee"
        subtitle={`Recipient: ${collectTarget?.member_name} (${collectTarget?.plan_name})`}
        maxWidth="md"
      >
        <form onSubmit={handleExecuteCollect} className="space-y-4 text-xs">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex justify-between items-center">
            <span className="text-slate-600 font-medium">Total Pending Due:</span>
            <span className="font-black text-rose-600 text-base">
              ₹{Number(collectTarget?.pending_amount || 0).toLocaleString('en-IN')}
            </span>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Amount to Collect (₹) <span className="text-slate-400 font-normal">(Can be partial)</span>
            </label>
            <input
              type="number"
              min="1"
              max={collectTarget ? Number(collectTarget.pending_amount) : 99999}
              value={collectAmount}
              onChange={(e) => setCollectAmount(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-orange-400 rounded-xl text-slate-900 font-black text-base font-mono focus:outline-none focus:border-orange-500 shadow-sm"
              required
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Payment Method</label>
            <select
              value={collectMethod}
              onChange={(e) => setCollectMethod(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white font-bold"
            >
              <option value="UPI">UPI</option>
              <option value="CASH">Cash</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Transaction Ref / UTR No.</label>
            <input
              type="text"
              value={collectRef}
              onChange={(e) => setCollectRef(e.target.value)}
              placeholder="Optional UTR / Ref Number"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white"
            />
          </div>

          <button
            type="submit"
            disabled={isCollecting || !collectAmount}
            className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs rounded-xl shadow-md shadow-orange-500/20 transition-all mt-2"
          >
            {isCollecting ? 'Recording Payment...' : 'Record Payment & Generate Receipt'}
          </button>
        </form>
      </Modal>
    </div>
  );
};
