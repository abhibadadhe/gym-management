import React, { useState, useEffect } from 'react';
import {
  UserPlus, ArrowLeft, Dumbbell, Shield, CreditCard,
  CheckCircle2, Sparkles, AlertCircle, RefreshCw, Flame
} from 'lucide-react';
import { MembershipPlan, Trainer, ReceiptData } from '../types';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import confetti from 'canvas-confetti';

interface AddMemberProps {
  onBack: () => void;
  onSuccess: (newMember: any, receipt: ReceiptData | null) => void;
}

export const AddMember: React.FC<AddMemberProps> = ({ onBack, onSuccess }) => {
  const { showToast } = useToast();
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [isLoadingInit, setIsLoadingInit] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    gender: 'MALE',
    dob: '',
    address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    aadhar_number: '',
    source: 'WALK_IN',
    joining_date: new Date().toISOString().split('T')[0],
    assigned_trainer_id: '',
    notes: '',

    // Plan & Payment
    plan_id: '',
    start_date: new Date().toISOString().split('T')[0],
    discount: '0',
    paid_amount: '',
    payment_method: 'UPI',
    payment_date: '',
    transaction_ref: '',
  });

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const plansRes = await api.getPlans();
        setPlans(plansRes.filter((p) => p.is_active));
        if (plansRes.length > 0) {
          const defaultPlan = plansRes[0];
          setFormData((prev) => ({
            ...prev,
            plan_id: defaultPlan.id.toString(),
            paid_amount: defaultPlan.price.toString(),
          }));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoadingInit(false);
      }
    };
    loadInitialData();
  }, []);

  const selectedPlan = plans.find((p) => p.id.toString() === formData.plan_id);
  const planPrice = Number(selectedPlan?.price || 0);
  const discountVal = Number(formData.discount || 0);
  const finalPayable = Math.max(0, planPrice - discountVal);
  const paidVal = Number(formData.paid_amount || 0);
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
    if (!selectedPlan || !formData.start_date) return 'N/A';
    const st = new Date(formData.start_date);
    st.setDate(st.getDate() + selectedPlan.duration_days);
    return st.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const handlePlanChange = (planId: string) => {
    const p = plans.find((x) => x.id.toString() === planId);
    setFormData((prev) => ({
      ...prev,
      plan_id: planId,
      paid_amount: p ? (Number(p.price) - Number(prev.discount || 0)).toString() : '0',
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name.trim() || !formData.phone.trim() || !formData.dob || !formData.gender || !formData.address.trim() || !formData.plan_id) {
      setErrorMsg('Please fill in all mandatory fields: Full Name, Phone number, DOB, Gender, Address, and Plan.');
      return;
    }

    if (formData.phone.trim().length < 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (formData.emergency_contact_phone.trim() && formData.emergency_contact_phone.trim().length < 10) {
      setErrorMsg('Please enter a valid 10-digit emergency contact phone number.');
      return;
    }

    const rawAadhar = formData.aadhar_number.replace(/\s/g, '');
    if (rawAadhar && rawAadhar.length !== 12) {
      setErrorMsg('Please enter a valid 12-digit Aadhaar number, or leave it blank.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const payload = {
        full_name: formData.full_name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || undefined,
        gender: formData.gender,
        dob: formData.dob,
        address: formData.address.trim(),
        aadhar_number: formData.aadhar_number.trim(),
        emergency_contact_name: formData.emergency_contact_name.trim() || 'Emergency Contact',
        emergency_contact_phone: formData.emergency_contact_phone.trim(),
        source: formData.source,
        joining_date: formData.joining_date || formData.start_date,
        assigned_trainer_id: formData.assigned_trainer_id ? Number(formData.assigned_trainer_id) : null,
        notes: formData.notes.trim(),

        plan_id: Number(formData.plan_id),
        start_date: formData.start_date,
        discount: Number(formData.discount || 0),
        paid_amount: Number(formData.paid_amount || 0),
        payment_method: formData.payment_method,
        payment_date: formData.payment_date || formData.start_date || formData.joining_date,
        transaction_ref: formData.transaction_ref.trim(),
      };

      const res = await api.onboardMember(payload);
      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.6 },
      });

      let fullReceiptData: ReceiptData | null = null;
      if (res.receipt?.id) {
        try {
          fullReceiptData = await api.getReceipt(res.receipt.id);
        } catch (e) { }
      }

      onSuccess(res.member, fullReceiptData);
    } catch (err: any) {
      console.error(err);
      const data = err.response?.data;
      let msg = 'Failed to onboard member. Please check details.';
      if (typeof data === 'object' && data !== null) {
        if (data.phone) {
          msg = Array.isArray(data.phone) ? data.phone[0] : String(data.phone);
        } else if (data.email) {
          msg = Array.isArray(data.email) ? data.email[0] : String(data.email);
        } else if (data.detail) {
          msg = String(data.detail);
        } else if (data.message) {
          msg = String(data.message);
        } else {
          const firstKey = Object.keys(data)[0];
          if (firstKey && data[firstKey]) {
            const val = data[firstKey];
            msg = `${firstKey.replace(/_/g, ' ')}: ${Array.isArray(val) ? val[0] : String(val)}`;
          }
        }
      }
      setErrorMsg(msg);
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter') {
      const target = e.target as HTMLElement;
      // Allow normal Enter behavior in textarea
      if (target.tagName === 'TEXTAREA') {
        return;
      }

      // If already focused on submit button, let default submit occur
      if (target.tagName === 'BUTTON' && (target as HTMLButtonElement).type === 'submit') {
        return;
      }

      e.preventDefault();

      // Find all focusable inputs, selects, textareas, and submit buttons in form order
      const form = e.currentTarget;
      const focusable = Array.from(
        form.querySelectorAll<HTMLElement>(
          'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button[type="submit"]:not([disabled])'
        )
      );

      const currentIndex = focusable.indexOf(target);
      if (currentIndex > -1 && currentIndex < focusable.length - 1) {
        const next = focusable[currentIndex + 1];
        next.focus();
        if (next instanceof HTMLInputElement && next.type !== 'date') {
          next.select?.();
        }
      } else {
        // Last element -> trigger submit
        handleSubmit(e as any);
      }
    }
  };

  if (isLoadingInit) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-orange-600">
        <RefreshCw className="w-8 h-8 animate-spin" />
        <span className="text-sm font-semibold">Preparing Registration Form...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Cancel & Back</span>
        </button>
        {/* <span className="text-[11px] font-bold text-orange-700 bg-orange-50 px-3 py-1 rounded-full border border-orange-200">
          Fast Single-Screen Registration
        </span> */}
      </div>

      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm">
        <div className="border-b border-slate-100 pb-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-2xl font-black text-slate-900 font-heading tracking-tight flex items-center gap-2.5">
              <UserPlus className="w-6 h-6 text-orange-600" />
              New Member Onboarding
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Register member profile, assign membership plan, record upfront/partial fees.
            </p>
          </div>
          {/* <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 self-start sm:self-auto">
            <span>Press</span>
            <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono text-[10px] font-bold text-slate-700 shadow-2xs">Enter ↵</kbd>
            <span>for next field</span>
          </span> */}
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} className="space-y-8">
          {/* Section 1: Personal Details */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-orange-700 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-800 flex items-center justify-center text-[10px]">
                1
              </span>
              Personal & Contact Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="sm:col-span-2">
                <label className="block text-slate-700 font-semibold mb-1">
                  Full Name <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="e.g. Sachin Ramesh Jadhav"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Mobile Number (10 Digits) <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 font-mono text-xs font-bold">
                    +91
                  </span>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="9823012345"
                    maxLength={10}
                    className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Email Address <span className="text-slate-400 font-normal text-xs">(Optional)</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="sachin.j@gmail.com"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Date of Birth <span className="text-rose-600">*</span>
                </label>
                <input
                  type="date"
                  value={formData.dob}
                  onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Admission / Joining Date <span className="text-rose-600">*</span>
                </label>
                <input
                  type="date"
                  value={formData.joining_date}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData(prev => ({
                      ...prev,
                      joining_date: val,
                      start_date: prev.start_date === prev.joining_date ? val : prev.start_date,
                      payment_date: (!prev.payment_date || prev.payment_date === prev.joining_date) ? val : prev.payment_date,
                    }));
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Gender <span className="text-rose-600">*</span>
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
                  required
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Aadhaar Card No. <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={formData.aadhar_number}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^\d]/g, '').slice(0, 12);
                    const formatted = raw.replace(/(\d{4})(?=\d)/g, '$1 ');
                    setFormData({ ...formData, aadhar_number: formatted });
                  }}
                  placeholder="1234 5678 9012"
                  maxLength={14}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-700 font-semibold mb-1">
                  Residential Address (Sinnar / Area) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="e.g. Near Shiv Smarak, Sinnar"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Emergency Contact Phone <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="tel"
                  value={formData.emergency_contact_phone}
                  onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                  placeholder="9822000000"
                  maxLength={10}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Emergency Contact Name / Relation <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={formData.emergency_contact_name}
                  onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                  placeholder="Father / Spouse / Friend"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Membership Plan */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-orange-700 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-800 flex items-center justify-center text-[10px]">
                2
              </span>
              Membership Plan Selection
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="sm:col-span-2 space-y-2">
                <label className="block text-slate-700 font-semibold mb-1">
                  Select Membership Plan <span className="text-rose-600">*</span>
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
                        const isSelected = formData.plan_id === p.id.toString();
                        return (
                          <div
                            key={p.id}
                            onClick={() => handlePlanChange(p.id.toString())}
                            className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${isSelected
                              ? 'bg-orange-50/90 border-orange-500 shadow-xs ring-1 ring-orange-500/50'
                              : 'bg-white border-slate-200 hover:border-orange-300 hover:bg-orange-50/20'
                              }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'border-orange-500 bg-orange-500' : 'border-slate-300 bg-white'}`}>
                                {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900 text-xs">
                                    {p.duration_days === 30 ? '1 Month' : p.duration_days === 180 ? '6 Months' : p.duration_days === 365 ? '1 Year' : p.name}
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
                        const isSelected = formData.plan_id === p.id.toString();
                        return (
                          <div
                            key={p.id}
                            onClick={() => handlePlanChange(p.id.toString())}
                            className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${isSelected
                              ? 'bg-amber-50/90 border-amber-500 shadow-xs ring-1 ring-amber-500/50'
                              : 'bg-white border-slate-200 hover:border-amber-300 hover:bg-amber-50/20'
                              }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'border-amber-500 bg-amber-500' : 'border-slate-300 bg-white'}`}>
                                {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900 text-xs">
                                    {p.duration_days === 30 ? '1 Month' : p.duration_days === 180 ? '6 Months' : p.duration_days === 365 ? '1 Year' : p.name}
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
                        const isSelected = formData.plan_id === p.id.toString();
                        return (
                          <div
                            key={p.id}
                            onClick={() => handlePlanChange(p.id.toString())}
                            className={`p-3 rounded-xl border cursor-pointer transition-all ${isSelected
                              ? 'bg-orange-50 border-orange-500 shadow-xs'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                              }`}
                          >
                            <div className="flex justify-between items-start">
                              <span className="font-bold text-slate-900 text-xs">{p.name}</span>
                              <span className="font-bold text-orange-600">₹{Number(p.price).toLocaleString('en-IN')}</span>
                            </div>
                            <span className="text-[10px] text-slate-500 block mt-1">{p.duration_days} Days</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Membership Start Date</label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData(prev => ({
                      ...prev,
                      start_date: val,
                      joining_date: (prev.joining_date === new Date().toISOString().split('T')[0] || prev.joining_date === prev.start_date) ? val : prev.joining_date,
                      payment_date: (!prev.payment_date || prev.payment_date === prev.start_date) ? val : prev.payment_date,
                    }));
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Calculated Expiry Date</label>
                <div className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-emerald-600 font-bold">
                  {calculateExpiry()}
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-700 font-semibold mb-1">Lead Source</label>
                <select
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
                >
                  <option value="WALK_IN">Walk-in Inquiry</option>
                  <option value="FRIEND">Friend / Member Referral</option>
                  <option value="SOCIAL_MEDIA">Instagram / Social Media</option>
                  <option value="POSTER">Flex Banner / Board</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Payment & Fee Collection */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-orange-700 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-800 flex items-center justify-center text-[10px]">
                3
              </span>
              Payment & Fee Collection (Instant Receipt)
            </h3>

            {/* Calculations Breakdown Bar */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Plan Price</span>
                <span className="font-bold text-slate-900 text-base">₹{planPrice.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Discount (₹)</span>
                <span className="font-bold text-emerald-600 text-base">-₹{discountVal.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Final Payable</span>
                <span className="font-black text-orange-600 text-base">₹{finalPayable.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Pending Balance</span>
                <span className={`font-black text-base ${pendingBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  ₹{pendingBalance.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Discount Amount (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.discount}
                  onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:outline-none focus:border-orange-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Amount Paying Now (₹) <span className="text-slate-400 font-normal">(Can be partial)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max={finalPayable}
                  value={formData.paid_amount}
                  onChange={(e) => setFormData({ ...formData, paid_amount: e.target.value })}
                  placeholder="e.g. 1500"
                  className="w-full px-3.5 py-2.5 bg-white border border-orange-400 rounded-xl text-slate-900 font-bold font-mono focus:outline-none focus:border-orange-500 text-sm shadow-sm"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Payment Date <span className="text-slate-400 font-normal">(Auto-matches Start Date)</span>
                </label>
                <input
                  type="date"
                  value={formData.payment_date || formData.start_date}
                  onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white font-semibold"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Payment Method</label>
                <select
                  value={formData.payment_method}
                  onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
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
                  value={formData.transaction_ref}
                  onChange={(e) => setFormData({ ...formData, transaction_ref: e.target.value })}
                  placeholder="Optional UTR / Cash voucher #"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-6 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-sm rounded-2xl shadow-md shadow-orange-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Generating Member Profile & Receipt...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Complete Registration & Generate Receipt</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
