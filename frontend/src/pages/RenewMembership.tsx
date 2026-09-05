import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, ArrowLeft, CheckCircle2, AlertCircle, Search, X, ChevronDown, Dumbbell, Flame } from 'lucide-react';
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
  const [paymentDate, setPaymentDate] = useState<string>('');
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [notes, setNotes] = useState<string>('Membership Renewal');

  // Searchable Member Dropdown State
  const [memberSearchQuery, setMemberSearchQuery] = useState<string>('');
  const [isMemberDropdownOpen, setIsMemberDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
          } else {
            setStartDate(new Date().toISOString().split('T')[0]);
          }
        } else {
          setSelectedMember(null);
          setSelectedMemberId('');
          setMemberSearchQuery('');
          setStartDate(new Date().toISOString().split('T')[0]);
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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsMemberDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredMembers = members.filter((m) => {
    if (!memberSearchQuery.trim()) return true;
    const q = memberSearchQuery.toLowerCase().trim();
    return (
      m.full_name?.toLowerCase().includes(q) ||
      m.phone?.includes(q) ||
      m.member_id?.toLowerCase().includes(q)
    );
  });

  const selectedPlan = plans.find((p) => p.id.toString() === selectedPlanId);
  const planPrice = Number(selectedPlan?.price || 0);
  const discountVal = Number(discount || 0);
  const finalPayable = Math.max(0, planPrice - discountVal);
  const paidVal = Number(paidAmount || 0);
  const pendingBalance = Math.max(0, finalPayable - paidVal);

  const weightTrainingPlans = plans.filter((p) =>
    p.plan_type === 'WEIGHT_TRAINING' || (!p.plan_type && !p.name.toLowerCase().includes('cardio'))
  ).sort((a, b) => a.duration_days - b.duration_days);

  const cardioPlans = plans.filter((p) =>
    p.plan_type === 'CARDIO' || p.name.toLowerCase().includes('cardio')
  ).sort((a, b) => a.duration_days - b.duration_days);

  const otherPlans = plans.filter((p) =>
    !weightTrainingPlans.some((w) => w.id === p.id) &&
    !cardioPlans.some((c) => c.id === p.id)
  ).sort((a, b) => a.duration_days - b.duration_days);

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
        payment_date: paymentDate || startDate,
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
        } catch (e) { }
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
        {/* <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
          Non-Destructive Subscription Extension
        </span> */}
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
          {/* Searchable Member Selection */}
          <div className="relative" ref={dropdownRef}>
            <label className="block text-slate-700 font-semibold mb-1">
              Select Member <span className="text-rose-600">*</span>
            </label>

            {selectedMember ? (
              /* Selected Member Card View */
              <div className="flex items-center justify-between p-3.5 bg-orange-50/70 border border-orange-200 rounded-2xl shadow-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-orange-500 text-white font-black flex items-center justify-center text-sm shadow-sm flex-shrink-0">
                    {selectedMember.first_name?.charAt(0) || 'M'}
                  </div>
                  <div className="truncate">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 text-xs">{selectedMember.full_name}</span>
                      <span className="font-mono text-[10px] font-bold text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded border border-orange-200">
                        {selectedMember.member_id}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 block truncate">
                      +91 {selectedMember.phone} • Status:{' '}
                      <span className="font-bold text-slate-700">{selectedMember.membership_status}</span>
                    </span>
                  </div>
                </div>

                {/* Change button is ONLY rendered if accessed from Top Bar (!memberId) */}
                {!memberId && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMemberId('');
                      setSelectedMember(null);
                      setMemberSearchQuery('');
                      setIsMemberDropdownOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-600 hover:text-rose-600 text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-sm flex-shrink-0 ml-2"
                    title="Change Selected Member"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Change</span>
                  </button>
                )}
              </div>
            ) : (
              /* Search Input & Dropdown */
              <div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Search className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={memberSearchQuery}
                    onChange={(e) => {
                      setMemberSearchQuery(e.target.value);
                      setIsMemberDropdownOpen(true);
                    }}
                    onFocus={() => setIsMemberDropdownOpen(true)}
                    placeholder="Search by member name, phone number (+91), or Member ID (e.g. MF20260001)..."
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white transition-colors"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isMemberDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>
                </div>

                {/* Dropdown Menu */}
                {isMemberDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 z-30 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-64 overflow-y-auto divide-y divide-slate-100 animate-in fade-in slide-in-from-top-2 duration-150">
                    {filteredMembers.length > 0 ? (
                      filteredMembers.map((m) => {
                        const statusColors: Record<string, string> = {
                          ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                          EXPIRING_SOON: 'bg-amber-50 text-amber-700 border-amber-200',
                          EXPIRED: 'bg-rose-50 text-rose-700 border-rose-200',
                          NO_MEMBERSHIP: 'bg-slate-100 text-slate-600 border-slate-200',
                        };
                        const badgeStyle = statusColors[m.membership_status] || statusColors.ACTIVE;

                        return (
                          <div
                            key={m.id}
                            onClick={() => {
                              handleMemberSelect(m.id.toString());
                              setIsMemberDropdownOpen(false);
                            }}
                            className="p-3 hover:bg-orange-50/70 cursor-pointer flex items-center justify-between transition-colors group"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-xl bg-orange-100 group-hover:bg-orange-200 text-orange-700 font-bold flex items-center justify-center text-xs flex-shrink-0 transition-colors">
                                {m.first_name?.charAt(0) || 'M'}
                              </div>
                              <div className="truncate">
                                <span className="font-bold text-slate-900 text-xs block group-hover:text-orange-600 transition-colors truncate">
                                  {m.full_name}
                                </span>
                                <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
                                  <span className="font-mono text-orange-600 font-semibold">{m.member_id}</span>
                                  <span>•</span>
                                  <span>+91 {m.phone}</span>
                                </span>
                              </div>
                            </div>

                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ml-2 ${badgeStyle}`}>
                              {m.membership_status}
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-4 text-center text-slate-400 text-xs">
                        No members found matching &ldquo;{memberSearchQuery}&rdquo;.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Hidden field for HTML5 form validation */}
            <input
              type="text"
              value={selectedMemberId}
              required
              readOnly
              onChange={() => { }}
              className="sr-only"
              tabIndex={-1}
            />
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
          <div className="space-y-2">
            <label className="block text-slate-700 font-semibold mb-1">
              Select Renewal Plan <span className="text-rose-600">*</span>
            </label>

            {/* 2 Columns: Weight Training & Weight Training + Cardio */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Column 1: Weight Training */}
              <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center font-bold">
                      <Dumbbell className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 text-xs uppercase tracking-wide">
                        Weight Training
                      </h4>
                      <p className="text-[10px] text-slate-500">Gym floor & strength training</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700">
                    {weightTrainingPlans.length} Plans
                  </span>
                </div>

                <div className="space-y-2">
                  {weightTrainingPlans.map((p) => {
                    const isSelected = selectedPlanId === p.id.toString();
                    return (
                      <div
                        key={p.id}
                        onClick={() => handlePlanChange(p.id.toString())}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-orange-50/90 border-orange-500 shadow-xs ring-1 ring-orange-500/50'
                            : 'bg-white border-slate-200 hover:border-orange-300 hover:bg-orange-50/20'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                              isSelected ? 'border-orange-500 bg-orange-500' : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-xs">
                                {p.duration_days === 30
                                  ? '1 Month'
                                  : p.duration_days === 180
                                  ? '6 Months'
                                  : p.duration_days === 365
                                  ? '1 Year'
                                  : p.name}
                              </span>
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                {p.duration_days} Days
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 block mt-0.5">{p.name}</span>
                          </div>
                        </div>
                        <span className={`font-black text-sm ${isSelected ? 'text-orange-600' : 'text-slate-900'}`}>
                          ₹{Number(p.price).toLocaleString('en-IN')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Column 2: Weight Training + Cardio */}
              <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                      <Flame className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 text-xs uppercase tracking-wide">
                        Weight Training + Cardio
                      </h4>
                      <p className="text-[10px] text-slate-500">Weight training + dedicated cardio floor</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700">
                    {cardioPlans.length} Plans
                  </span>
                </div>

                <div className="space-y-2">
                  {cardioPlans.map((p) => {
                    const isSelected = selectedPlanId === p.id.toString();
                    return (
                      <div
                        key={p.id}
                        onClick={() => handlePlanChange(p.id.toString())}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-amber-50/90 border-amber-500 shadow-xs ring-1 ring-amber-500/50'
                            : 'bg-white border-slate-200 hover:border-amber-300 hover:bg-amber-50/20'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                              isSelected ? 'border-amber-500 bg-amber-500' : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-xs">
                                {p.duration_days === 30
                                  ? '1 Month'
                                  : p.duration_days === 180
                                  ? '6 Months'
                                  : p.duration_days === 365
                                  ? '1 Year'
                                  : p.name}
                              </span>
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                {p.duration_days} Days
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 block mt-0.5">{p.name}</span>
                          </div>
                        </div>
                        <span className={`font-black text-sm ${isSelected ? 'text-amber-600' : 'text-slate-900'}`}>
                          ₹{Number(p.price).toLocaleString('en-IN')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* If any other general plans exist */}
            {otherPlans.length > 0 && (
              <div className="pt-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Other Special Plans
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {otherPlans.map((p) => {
                    const isSelected = selectedPlanId === p.id.toString();
                    return (
                      <div
                        key={p.id}
                        onClick={() => handlePlanChange(p.id.toString())}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-orange-50/70 border-orange-500 shadow-sm'
                            : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <span className="font-bold text-slate-900 text-xs">{p.name}</span>
                          <span className="font-bold text-orange-600">₹{Number(p.price).toLocaleString('en-IN')}</span>
                        </div>
                        <span className="text-[11px] text-slate-500 block mt-1">{p.duration_days} Days validity</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
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
              <label className="block text-slate-700 font-semibold mb-1">
                Payment Date <span className="text-slate-400 font-normal">(Auto-matches Start Date)</span>
              </label>
              <input
                type="date"
                value={paymentDate || startDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white font-semibold"
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
