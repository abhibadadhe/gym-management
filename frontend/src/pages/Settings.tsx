import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon, Save, Database, Download,
  CheckCircle2, FileSpreadsheet, Printer, Dumbbell, RefreshCw,
  Receipt, Users, CreditCard, Flame, ShieldCheck, Clock
} from 'lucide-react';
import { GymSettings, Member, Payment, Expense, MembershipPlan, SupplementSale } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const Settings: React.FC = () => {
  const { gym, refreshGymSettings, inactivityTimeoutMinutes, setInactivityTimeout } = useAuth();
  const { showToast } = useToast();
  const [formData, setFormData] = useState<GymSettings>({
    name: 'Morya Fitness',
    tagline: 'Premium Gym & Fitness Center',
    address: 'Kanadi Mala, Baragaon Pimpri Road, Sinnar - 422103',
    phone: '+91 98220 12345',
    email: 'contact@moryafitness.com',
    website: 'https://moryafitness.com',
    upi_id: 'moryafitness@okhdfcbank',
    receipt_prefix: 'MF-REC-',
    reminder_days: '7,3,0',
  });

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [isExportingExcel, setIsExportingExcel] = useState<boolean>(false);
  const [isExportingPDF, setIsExportingPDF] = useState<boolean>(false);
  const [backupData, setBackupData] = useState<{
    members: Member[];
    payments: Payment[];
    expenses: Expense[];
    plans: MembershipPlan[];
    supplementSales: SupplementSale[];
  } | null>(null);

  useEffect(() => {
    if (gym) {
      setFormData(gym);
    }
  }, [gym]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await api.updateSettings(formData);
      await refreshGymSettings();
      setSaveSuccess(true);
      showToast('Gym configuration saved successfully!', 'success');
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      showToast('Failed to update gym settings.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // 1. Generate Excel / CSV Multi-Sheet Database Backup
  const handleDownloadExcelBackup = async () => {
    setIsExportingExcel(true);
    try {
      const [members, payments, expenses, plans, supplementSales] = await Promise.all([
        api.getMembers(),
        api.getPayments(),
        api.getExpenses(),
        api.getPlans(),
        api.getSupplementSales(),
      ]);

      const todayStr = new Date().toISOString().split('T')[0];
      let csv = `MORYA FITNESS - COMPLETE DATABASE BACKUP (${todayStr})\n`;
      csv += `Gym: ${formData.name}, ${formData.address}\n\n`;

      // SECTION 1: MEMBERS REGISTRY
      csv += `--- SECTION 1: MEMBERS MASTER REGISTRY (${members.length} Members) ---\n`;
      csv += `Member ID,Full Name,Phone,Email,Gender,Current Plan,Start Date,End Date,Status,Days Left,Pending Amount (INR),Address,Emergency Contact,Emergency Phone,Joining Date\n`;
      members.forEach((m: Member) => {
        csv += `"${m.member_id}","${m.full_name}","${m.phone}","${m.email || ''}","${m.gender}","${m.current_plan || 'None'}","${m.start_date || ''}","${m.expiry_date || ''}","${m.membership_status}","${m.days_remaining}","${m.pending_amount || 0}","${(m.address || '').replace(/"/g, '""')}","${m.emergency_contact_name || ''}","${m.emergency_contact_phone || ''}","${m.joining_date}"\n`;
      });
      csv += `\n`;

      // SECTION 2: PAYMENTS LEDGER
      csv += `--- SECTION 2: PAYMENTS & RECEIPTS LEDGER (${payments.length} Records) ---\n`;
      csv += `Receipt Number,Date,Member ID,Member Name,Plan Name,Amount (INR),Payment Method,Transaction Ref,Cashier/Received By\n`;
      payments.forEach((p: Payment) => {
        csv += `"${p.receipt_number}","${p.payment_date}","${p.member_id}","${p.member_name}","${p.plan_name || ''}","${p.amount}","${p.payment_method}","${p.transaction_ref || ''}","${p.received_by_name || 'Admin'}"\n`;
      });
      csv += `\n`;

      // SECTION 3: OPERATING EXPENSES
      csv += `--- SECTION 3: OPERATING EXPENSES (${expenses.length} Records) ---\n`;
      csv += `Expense ID,Date,Category,Description,Payment Mode,Amount (INR),Notes\n`;
      expenses.forEach((e: Expense) => {
        csv += `"${e.expense_id}","${e.date}","${e.category_display || e.category}","${(e.description || '').replace(/"/g, '""')}","${e.payment_method}","${e.amount}","${(e.notes || '').replace(/"/g, '""')}"\n`;
      });
      csv += `\n`;

      // SECTION 4: SUPPLEMENTS & STORE SALES
      csv += `--- SECTION 4: SUPPLEMENTS & STORE SALES (${supplementSales.length} Records) ---\n`;
      csv += `Invoice No,Date,Customer Type,Customer Name,Phone,Items Purchased,Total Qty,Subtotal (INR),Discount (INR),Final Paid (INR),Payment Mode\n`;
      supplementSales.forEach((s: SupplementSale) => {
        const itemsStr = (s.items || []).map((it) => `${it.product_name} (x${it.quantity})`).join('; ');
        const totalQty = (s.items || []).reduce((acc, it) => acc + it.quantity, 0);
        csv += `"${s.invoice_number}","${s.sale_date}","${s.member ? 'Gym Member' : 'Walk-in'}","${s.customer_name}","${s.customer_phone || ''}","${itemsStr.replace(/"/g, '""')}","${totalQty}","${s.subtotal}","${s.discount}","${s.final_amount}","${s.payment_method}"\n`;
      });
      csv += `\n`;

      // SECTION 5: MEMBERSHIP PLANS
      csv += `--- SECTION 5: MEMBERSHIP PLANS CONFIGURATION (${plans.length} Plans) ---\n`;
      csv += `Plan ID,Plan Name,Duration (Days),Price (INR),Status,Description\n`;
      plans.forEach((pl: MembershipPlan) => {
        csv += `"${pl.id}","${pl.name}","${pl.duration_days}","${pl.price}","${pl.is_active ? 'ACTIVE' : 'INACTIVE'}","${(pl.description || '').replace(/"/g, '""')}"\n`;
      });

      // Download CSV Blob
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Morya_Fitness_Database_Backup_${todayStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Database backup generated and downloaded successfully!', 'success');
    } catch (err) {
      showToast('Failed to generate Excel database backup.', 'error');
      console.error(err);
    } finally {
      setIsExportingExcel(false);
    }
  };

  // 2. Generate PDF / Print Ready Document
  const handlePrintPDFBackup = async () => {
    setIsExportingPDF(true);
    try {
      const [members, payments, expenses, plans, supplementSales] = await Promise.all([
        api.getMembers(),
        api.getPayments(),
        api.getExpenses(),
        api.getPlans(),
        api.getSupplementSales(),
      ]);
      setBackupData({ members, payments, expenses, plans, supplementSales });
      setTimeout(() => {
        window.print();
        setIsExportingPDF(false);
      }, 400);
    } catch (err) {
      console.error(err);
      showToast('Failed to prepare PDF backup report.', 'error');
      setIsExportingPDF(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-16">
      {/* Header */}
      <div className="no-print">
        <h2 className="text-2xl font-black text-slate-900 font-heading tracking-tight">Gym & System Settings</h2>
        <p className="text-xs text-slate-500">
          Configure gym profile, UPI payment handle, receipt numbering, and database backups.
        </p>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2.5 no-print">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>Gym settings updated successfully! All receipts and passes now reflect the changes.</span>
        </div>
      )}

      {/* Gym Branding Form */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6 no-print">
        <div className="border-b border-slate-100 pb-4">
          <h3 className="text-base font-bold text-slate-900 font-heading flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-orange-600" />
            Gym Information & Branding
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            This information appears on all printed receipts, WhatsApp messages, and financial summaries.
          </p>
        </div>

        <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
          <img
            src="/logo.png"
            alt="Morya Fitness Logo"
            className="w-16 h-16 rounded-full object-cover border-2 border-orange-500 shadow-md flex-shrink-0"
          />
          <div className="space-y-0.5">
            <span className="font-bold text-slate-900 text-sm block">Official Gym Emblem</span>
            <p className="text-slate-500 text-[11px]">
              Active circular brand emblem (EST. 2024, Sinnar). Displayed across the top navigation, receipts, reports, and login screens.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Gym Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Tagline / Subtitle</label>
              <input
                type="text"
                value={formData.tagline}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-slate-700 font-semibold mb-1">Gym Address (Sinnar, Nashik)</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Contact Phone / Helpline</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:outline-none focus:border-orange-500 focus:bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Official Email Address</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Gym UPI ID (For Fee Collection)</label>
              <input
                type="text"
                value={formData.upi_id}
                onChange={(e) => setFormData({ ...formData, upi_id: e.target.value })}
                placeholder="e.g. moryafitness@okhdfcbank"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:outline-none focus:border-orange-500 focus:bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Receipt Number Prefix</label>
              <input
                type="text"
                value={formData.receipt_prefix}
                onChange={(e) => setFormData({ ...formData, receipt_prefix: e.target.value })}
                placeholder="MF-REC-"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:outline-none focus:border-orange-500 focus:bg-white"
                required
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl shadow-md shadow-orange-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                <span>Saving Changes...</span>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Gym Information</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Security & Inactivity Auto-Logout Section */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-5 no-print">
        <div className="border-b border-slate-100 pb-4 space-y-1">
          <h3 className="text-base font-bold text-slate-900 font-heading flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-orange-600" />
            Security & Session Auto-Logout
          </h3>
          <p className="text-xs text-slate-500">
            Automatically logs out inactive sessions to protect confidential member records and financial collections on shared reception computers.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50/80 border border-slate-200">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center flex-shrink-0 shadow-xs">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-900">Auto-Logout Inactivity Duration</h4>
              <p className="text-[11px] text-slate-500">
                A 2-minute warning countdown with a "Stay Logged In" button will appear before auto-logout occurs.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={inactivityTimeoutMinutes}
              onChange={(e) => {
                const mins = Number(e.target.value);
                setInactivityTimeout(mins);
                showToast(
                  mins === 0
                    ? 'Session auto-logout disabled.'
                    : `Auto-logout set to ${mins} minutes of inactivity.`,
                  'success'
                );
              }}
              className="py-2.5 px-3.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-orange-500 shadow-xs cursor-pointer"
            >
              <option value={15}>15 Minutes</option>
              <option value={30}>30 Minutes (Recommended)</option>
              <option value={60}>1 Hour</option>
              <option value={120}>2 Hours</option>
              <option value={0}>Disabled (Never Log Out)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Database Backup & Export Section (Excel & PDF) */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="border-b border-slate-100 pb-4 no-print space-y-1">
          <h3 className="text-base font-bold text-slate-900 font-heading flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-600" />
            System Database Backup & Export
          </h3>
          <p className="text-xs text-slate-500">
            Export full structured database records for Members Master Registry, Payments History, Expenses, Supplements Store Sales, and Membership Plans.
          </p>
        </div>

        {/* 2 Download Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 no-print">
          {/* Option 1: Download Excel (.csv) */}
          <button
            onClick={handleDownloadExcelBackup}
            disabled={isExportingExcel}
            className="py-3.5 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2.5 disabled:opacity-50"
          >
            {isExportingExcel ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-4 h-4" />
            )}
            <span>{isExportingExcel ? 'Generating Sheet...' : 'Download Excel (.csv)'}</span>
          </button>

          {/* Option 2: Print / Save as PDF */}
          <button
            onClick={handlePrintPDFBackup}
            disabled={isExportingPDF}
            className="py-3.5 px-5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs rounded-2xl shadow-md shadow-orange-500/20 transition-all flex items-center justify-center gap-2.5 disabled:opacity-50"
          >
            {isExportingPDF ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Printer className="w-4 h-4" />
            )}
            <span>{isExportingPDF ? 'Preparing PDF Report...' : 'Print / Save as PDF'}</span>
          </button>
        </div>

        {/* Printable Paper View (Appears on PDF Print) */}
        <div id="printable-receipt" className="hidden print:block p-4 bg-white text-slate-900 space-y-5">
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Morya Fitness" className="w-14 h-14 rounded-full object-cover border-2 border-orange-500 shadow-xs" />
              <div>
                <h1 className="text-xl font-black uppercase font-heading tracking-tight">{formData.name}</h1>
                <p className="text-xs font-semibold text-slate-700">{formData.tagline}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{formData.address} • Tel: {formData.phone} • Email: {formData.email}</p>
                <p className="text-[9px] text-slate-400 mt-0.5">
                  Executive System Audit & Complete Database Backup • Generated on {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} at {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
            <div className="text-right text-[10px] text-slate-500">
              <span className="font-black text-slate-900 uppercase text-xs block">Database Backup</span>
              <span>Audit Ledger Record</span>
            </div>
          </div>

          {/* Executive KPI Summary */}
          {backupData && (
            <div className="grid grid-cols-5 gap-2 text-center text-xs">
              <div className="p-2 border border-slate-200 rounded-lg bg-slate-50">
                <span className="text-[9px] uppercase font-bold text-slate-500 block">Total Members</span>
                <span className="text-sm font-black text-slate-900 block">{backupData.members.length}</span>
              </div>
              <div className="p-2 border border-slate-200 rounded-lg bg-slate-50">
                <span className="text-[9px] uppercase font-bold text-slate-500 block">Fee Collections</span>
                <span className="text-sm font-black text-emerald-600 block">
                  ₹{backupData.payments.reduce((acc, p) => acc + Number(p.amount || 0), 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="p-2 border border-slate-200 rounded-lg bg-slate-50">
                <span className="text-[9px] uppercase font-bold text-slate-500 block">Store Sales</span>
                <span className="text-sm font-black text-orange-600 block">
                  ₹{backupData.supplementSales.reduce((acc, s) => acc + Number(s.final_amount || 0), 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="p-2 border border-slate-200 rounded-lg bg-slate-50">
                <span className="text-[9px] uppercase font-bold text-slate-500 block">Operating Expenses</span>
                <span className="text-sm font-black text-rose-600 block">
                  ₹{backupData.expenses.reduce((acc, e) => acc + Number(e.amount || 0), 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="p-2 border border-slate-200 rounded-lg bg-slate-50">
                <span className="text-[9px] uppercase font-bold text-slate-500 block">Net Profit</span>
                <span className="text-sm font-black text-slate-900 block">
                  ₹{(
                    backupData.payments.reduce((acc, p) => acc + Number(p.amount || 0), 0) +
                    backupData.supplementSales.reduce((acc, s) => acc + Number(s.final_amount || 0), 0) -
                    backupData.expenses.reduce((acc, e) => acc + Number(e.amount || 0), 0)
                  ).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          )}

          {/* Section 1: Members Master Registry */}
          <div className="space-y-1.5">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-900 bg-slate-100 p-1.5 rounded border border-slate-200 flex justify-between">
              <span>Section 1: Members Master Registry</span>
              <span className="font-normal text-slate-600">{backupData?.members.length || 0} Members</span>
            </div>
            <table className="w-full text-left text-[10px] border-collapse border border-slate-200">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <th className="p-1 border-r border-slate-200">ID</th>
                  <th className="p-1 border-r border-slate-200">Name</th>
                  <th className="p-1 border-r border-slate-200">Phone</th>
                  <th className="p-1 border-r border-slate-200">Current Plan</th>
                  <th className="p-1 border-r border-slate-200">Start Date</th>
                  <th className="p-1 border-r border-slate-200">End Date</th>
                  <th className="p-1 border-r border-slate-200">Status</th>
                  <th className="p-1 text-right">Pending (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {backupData?.members && backupData.members.length > 0 ? (
                  backupData.members.map((m) => (
                    <tr key={m.id} className="break-inside-avoid">
                      <td className="p-1 border-r border-slate-200 font-mono font-bold">{m.member_id}</td>
                      <td className="p-1 border-r border-slate-200 font-medium">{m.full_name}</td>
                      <td className="p-1 border-r border-slate-200">{m.phone}</td>
                      <td className="p-1 border-r border-slate-200">{m.current_plan || 'None'}</td>
                      <td className="p-1 border-r border-slate-200">{m.start_date || '—'}</td>
                      <td className="p-1 border-r border-slate-200">{m.expiry_date || '—'}</td>
                      <td className="p-1 border-r border-slate-200 font-semibold">{m.membership_status}</td>
                      <td className="p-1 text-right font-bold">{Number(m.pending_amount || 0) > 0 ? `₹${Number(m.pending_amount).toLocaleString('en-IN')}` : 'Settled'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="p-2 text-center text-slate-400">No member records.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Section 2: Payments & Collection Ledger */}
          <div className="space-y-1.5">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-900 bg-slate-100 p-1.5 rounded border border-slate-200 flex justify-between">
              <span>Section 2: Payments & Collections Ledger</span>
              <span className="font-normal text-slate-600">{backupData?.payments.length || 0} Receipts</span>
            </div>
            <table className="w-full text-left text-[10px] border-collapse border border-slate-200">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <th className="p-1 border-r border-slate-200">Receipt No</th>
                  <th className="p-1 border-r border-slate-200">Date</th>
                  <th className="p-1 border-r border-slate-200">Member</th>
                  <th className="p-1 border-r border-slate-200">Plan</th>
                  <th className="p-1 border-r border-slate-200">Mode</th>
                  <th className="p-1 border-r border-slate-200">Cashier</th>
                  <th className="p-1 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {backupData?.payments && backupData.payments.length > 0 ? (
                  backupData.payments.map((p) => (
                    <tr key={p.id} className="break-inside-avoid">
                      <td className="p-1 border-r border-slate-200 font-mono font-bold">{p.receipt_number}</td>
                      <td className="p-1 border-r border-slate-200">{p.payment_date}</td>
                      <td className="p-1 border-r border-slate-200 font-medium">{p.member_name} ({p.member_id})</td>
                      <td className="p-1 border-r border-slate-200">{p.plan_name || 'Membership'}</td>
                      <td className="p-1 border-r border-slate-200">{p.payment_method}</td>
                      <td className="p-1 border-r border-slate-200">{p.received_by_name || 'Admin'}</td>
                      <td className="p-1 text-right font-bold text-emerald-700">₹{Number(p.amount).toLocaleString('en-IN')}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-2 text-center text-slate-400">No payment records.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Section 3: Operating Expenses Ledger */}
          <div className="space-y-1.5">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-900 bg-slate-100 p-1.5 rounded border border-slate-200 flex justify-between">
              <span>Section 3: Operating Expenses Ledger</span>
              <span className="font-normal text-slate-600">{backupData?.expenses.length || 0} Expenses</span>
            </div>
            <table className="w-full text-left text-[10px] border-collapse border border-slate-200">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <th className="p-1 border-r border-slate-200">ID</th>
                  <th className="p-1 border-r border-slate-200">Date</th>
                  <th className="p-1 border-r border-slate-200">Category</th>
                  <th className="p-1 border-r border-slate-200">Description / Purpose</th>
                  <th className="p-1 border-r border-slate-200">Mode</th>
                  <th className="p-1 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {backupData?.expenses && backupData.expenses.length > 0 ? (
                  backupData.expenses.map((e) => (
                    <tr key={e.id} className="break-inside-avoid">
                      <td className="p-1 border-r border-slate-200 font-mono font-bold">{e.expense_id}</td>
                      <td className="p-1 border-r border-slate-200">{e.date}</td>
                      <td className="p-1 border-r border-slate-200 font-medium">{e.category_display || e.category}</td>
                      <td className="p-1 border-r border-slate-200">{e.description || '—'}</td>
                      <td className="p-1 border-r border-slate-200">{e.payment_method}</td>
                      <td className="p-1 text-right font-bold text-rose-700">₹{Number(e.amount).toLocaleString('en-IN')}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-2 text-center text-slate-400">No expense records.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Section 4: Supplements & Store Sales */}
          <div className="space-y-1.5">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-900 bg-slate-100 p-1.5 rounded border border-slate-200 flex justify-between">
              <span>Section 4: Supplements & Store Sales</span>
              <span className="font-normal text-slate-600">{backupData?.supplementSales.length || 0} Invoices</span>
            </div>
            <table className="w-full text-left text-[10px] border-collapse border border-slate-200">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <th className="p-1 border-r border-slate-200">Invoice No</th>
                  <th className="p-1 border-r border-slate-200">Date</th>
                  <th className="p-1 border-r border-slate-200">Customer</th>
                  <th className="p-1 border-r border-slate-200">Items Purchased</th>
                  <th className="p-1 border-r border-slate-200">Qty</th>
                  <th className="p-1 border-r border-slate-200">Mode</th>
                  <th className="p-1 text-right">Final Paid (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {backupData?.supplementSales && backupData.supplementSales.length > 0 ? (
                  backupData.supplementSales.map((s) => {
                    const itemsStr = (s.items || []).map((it) => `${it.product_name} (x${it.quantity})`).join(', ');
                    const totalQty = (s.items || []).reduce((acc, it) => acc + it.quantity, 0);
                    return (
                      <tr key={s.id} className="break-inside-avoid">
                        <td className="p-1 border-r border-slate-200 font-mono font-bold">{s.invoice_number}</td>
                        <td className="p-1 border-r border-slate-200">{s.sale_date ? new Date(s.sale_date).toLocaleDateString('en-IN') : '—'}</td>
                        <td className="p-1 border-r border-slate-200 font-medium">{s.customer_name}</td>
                        <td className="p-1 border-r border-slate-200">{itemsStr || '—'}</td>
                        <td className="p-1 border-r border-slate-200">{totalQty}</td>
                        <td className="p-1 border-r border-slate-200">{s.payment_method}</td>
                        <td className="p-1 text-right font-bold text-orange-700">₹{Number(s.final_amount).toLocaleString('en-IN')}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="p-2 text-center text-slate-400">No store sales recorded.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Section 5: Membership Plans Configuration */}
          <div className="space-y-1.5">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-900 bg-slate-100 p-1.5 rounded border border-slate-200 flex justify-between">
              <span>Section 5: Membership Plans Configuration</span>
              <span className="font-normal text-slate-600">{backupData?.plans.length || 0} Plans</span>
            </div>
            <table className="w-full text-left text-[10px] border-collapse border border-slate-200">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <th className="p-1 border-r border-slate-200">Plan Name</th>
                  <th className="p-1 border-r border-slate-200">Duration (Days)</th>
                  <th className="p-1 border-r border-slate-200">Fee (₹)</th>
                  <th className="p-1 border-r border-slate-200">Status</th>
                  <th className="p-1">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {backupData?.plans && backupData.plans.length > 0 ? (
                  backupData.plans.map((pl) => (
                    <tr key={pl.id} className="break-inside-avoid">
                      <td className="p-1 border-r border-slate-200 font-bold">{pl.name}</td>
                      <td className="p-1 border-r border-slate-200">{pl.duration_days} days</td>
                      <td className="p-1 border-r border-slate-200 font-bold">₹{Number(pl.price).toLocaleString('en-IN')}</td>
                      <td className="p-1 border-r border-slate-200 font-semibold">{pl.is_active ? 'ACTIVE' : 'INACTIVE'}</td>
                      <td className="p-1 text-slate-600">{pl.description || '—'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-2 text-center text-slate-400">No plans configured.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Sign-Off Footer */}
          <div className="pt-6 mt-4 border-t border-slate-300 flex justify-between items-end text-[10px] text-slate-600">
            <div className="space-y-1">
              <p className="font-bold text-slate-900 text-xs">Morya Fitness Management System</p>
              <p className="text-[9px] text-slate-500">Official certified database audit & ledger backup export • Confidential</p>
              <p className="text-[9px] text-slate-400">Kanadi Mala, Baragaon Pimpri Road, Sinnar - 422103</p>
            </div>
            <div className="flex flex-col items-center text-center">
              {/* Official Seal Stamp (Same as Receipt) */}
              <div className="inline-flex flex-col items-center -rotate-6 mb-1">
                <div className="w-16 h-16 rounded-full border-2 border-blue-900 p-0.5 bg-white shadow-xs ring-2 ring-blue-100 flex items-center justify-center overflow-hidden">
                  <img src="/logo.png" alt="Morya Fitness Seal" className="w-full h-full object-cover rounded-full" />
                </div>
                <span className="text-[8px] font-black tracking-wider text-blue-900 uppercase mt-1 px-2 py-0.5 bg-blue-50 border border-blue-300 rounded">
                  OFFICIAL SEAL • SINNAR
                </span>
              </div>
              <div className="w-44 border-b border-slate-400 mt-2 mb-1"></div>
              <p className="font-bold text-slate-800 text-xs">Authorized Signature & Seal</p>
              <p className="text-[9px] text-slate-400">Morya Fitness, Sinnar</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
