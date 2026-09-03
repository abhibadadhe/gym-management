import React, { useState, useEffect } from 'react';
import { RefreshCw, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { Member, MembershipPlan, ReceiptData } from '../types';
import { api } from '../services/api';
import confetti from 'canvas-confetti';

interface RenewMembershipProps {
  memberId?: number;
  onBack: () => void;
  onSuccess: (member: Member, receipt: ReceiptData | null) => void;
}

export const RenewMembership: React.FC<RenewMembershipProps> = ({
  memberId,
  onBack,
  onSuccess,
}) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>(memberId ? memberId.toString() : '');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [discount, setDiscount] = useState<string>('0');
  const [paidAmount, setPaidAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('UPI');
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [notes, setNotes] = useState<string>('Membership Renewal');

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [membersRes, plansRes] = await Promise.all([
          api.getMembers(),
          api.getPlans(),
        ]);
        setMembers(membersRes);
        const activePlans = plansRes.filter((p) => p.is_active);
        setPlans(activePlans);

        if (activePlans.length > 0) {
          setSelectedPlanId(activePlans[0].id.toString());
          setPaidAmount(activePlans[0].price.toString());
        }

        if (memberId) {
          const m = await api.getMember(memberId);
          setSelectedMember(m);
          setSelectedMemberId(memberId.toString());
          if (m.expiry_date && new Date(m.expiry_date) >= new Date()) {
            const nextDay = new Date(m.expiry_date);
            nextDay.setDate(nextDay.getDate() + 1);
            setStartDate(nextDay.toISOString().split('T')[0]);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [memberId]);

  const handleMemberSelect = async (mId: string) => {
    setSelectedMemberId(mId);
    if (!mId) {
      setSelectedMember(null);
      return;
    }
    try {
      const m = await api.getMember(mId);
      setSelectedMember(m);
      if (m.expiry_date && new Date(m.expiry_date) >= new Date()) {
        const nextDay = new Date(m.expiry_date);
        nextDay.setDate(nextDay.getDate() + 1);
        setStartDate(nextDay.toISOString().split('T')[0]);
      } else {
        setStartDate(new Date().toISOString().split('T')[0]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const selectedPlan = plans.find((p) => p.id.toString() === selectedPlanId);
  const planPrice = Number(selectedPlan?.price || 0);
  const discountVal = Number(discount || 0);
  const finalPayable = Math.max(0, planPrice - discountVal);
  const paidVal = Number(paidAmount || 0);
  const pendingBalance = Math.max(0, finalPayable - paidVal);

  const calculateExpiry = () => {
    if (!selectedPlan || !startDate) return 'N/A';
    const st = new Date(startDate);
    st.setDate(st.getDate() + selectedPlan.duration_days);
    return st.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const handlePlanChange = (pId: string) => {
    setSelectedPlanId(pId);
    const p = plans.find((x) => x.id.toString() === pId);
    if (p) {
      setPaidAmount((Number(p.price) - Number(discount || 0)).toString());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberId || !selectedPlanId) {
      setErrorMsg('Please select both Member and New Membership Plan.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await api.renewMember(selectedMemberId, {
        plan_id: Number(selectedPlanId),
        start_date: startDate,
        discount: Number(discount || 0),
        paid_amount: Number(paidAmount || 0),
        payment_method: paymentMethod,
        transaction_ref: transactionRef.trim(),
        notes: notes.trim(),
      });

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
      });

      let fullReceipt: ReceiptData | null = null;
      if (res.receipt?.id) {
        try {
          fullReceipt = await api.getReceipt(res.receipt.id);
        } catch (e) {}
      }

      onSuccess(res.member, fullReceipt);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Failed to renew membership.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-slate-400">
        <RefreshCw className="w-8 h-8 text-orange-500 animate-spin" />
        <span className="text-sm font-semibold">Loading Renewal Form...</span>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
          Non-Destructive Subscription Extension
        </span>
      </div>

      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm">
        <div className="border-b border-slate-100 pb-4 mb-6">
          <h2 className="text-2xl font-black text-slate-900 font-heading tracking-tight flex items-center gap-2.5">
            <RefreshCw className="w-6 h-6 text-emerald-600" />
            Renew Membership Subscription
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Generate a new subscription period starting from current expiry. Historical records remain preserved.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 text-xs">
          {/* Member Selection */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Select Member <span className="text-rose-600">*</span>
            </label>
            <select
              value={selectedMemberId}
              onChange={(e) => handleMemberSelect(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-orange-500 focus:bg-white"
              required
            >
              <option value="">-- Choose Member --</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name} ({m.member_id}) - {m.phone} [{m.membership_status}]
                </option>
              ))}
            </select>
          </div>

          {/* Current Membership Snapshot */}
          {selectedMember && (
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Current Plan</span>
                <span className="font-bold text-slate-900 text-xs">{selectedMember.current_plan || 'None'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Current Expiry</span>
                <span className="font-bold text-amber-600 text-xs">
                  {selectedMember.expiry_date
                    ? new Date(selectedMember.expiry_date).toLocaleDateString('en-IN')
                    : 'Expired / None'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Days Left</span>
                <span className="font-bold text-emerald-600 text-xs">{selectedMember.days_remaining} Days</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Pending Dues</span>
                <span className={`font-bold text-xs ${Number(selectedMember.pending_amount) > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                  ₹{Number(selectedMember.pending_amount).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          )}

          {/* New Plan Selection */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Select Renewal Plan <span className="text-rose-600">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {plans.map((p) => {
                const isSelected = selectedPlanId === p.id.toString();
                return (
                  <div
                    key={p.id}
                    onClick={() => handlePlanChange(p.id.toString())}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-emerald-50/70 border-emerald-500 shadow-sm'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-slate-900 text-xs">{p.name}</span>
                      <span className="font-bold text-emerald-600">₹{Number(p.price).toLocaleString('en-IN')}</span>
                    </div>
                    <span className="text-[11px] text-slate-500 block mt-1">{p.duration_days} Days validity</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">New Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">New Expiry Date (Auto-calculated)</label>
              <div className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-emerald-600 font-bold">
                {calculateExpiry()}
              </div>
            </div>
          </div>

          {/* Financial Breakdown */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Plan Price</span>
              <span className="font-bold text-slate-900 text-sm">₹{planPrice.toLocaleString('en-IN')}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Discount (₹)</span>
              <span className="font-bold text-emerald-600 text-sm">-₹{discountVal.toLocaleString('en-IN')}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Final Amount</span>
              <span className="font-black text-orange-600 text-sm">₹{finalPayable.toLocaleString('en-IN')}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Pending Balance</span>
              <span className={`font-black text-sm ${pendingBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                ₹{pendingBalance.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Payment Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Discount Amount (₹)</label>
              <input
                type="number"
                min="0"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:outline-none focus:border-orange-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Paid Amount Now (₹)</label>
              <input
                type="number"
                min="0"
                max={finalPayable}
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-orange-400 rounded-xl text-slate-900 font-bold font-mono focus:outline-none focus:border-orange-500 shadow-sm"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
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
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                placeholder="Optional UTR / Ref Number"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !selectedMemberId}
            className="w-full py-3.5 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm rounded-2xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>Renewing Subscription...</span>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <span>Confirm Renewal & Generate Receipt</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
