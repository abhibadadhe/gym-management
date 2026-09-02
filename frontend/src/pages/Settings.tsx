import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon, Save, Database, Download,
  CheckCircle2, FileSpreadsheet, Printer, Dumbbell, RefreshCw,
  Receipt, Users, CreditCard, Flame
} from 'lucide-react';
import { GymSettings, Member, Payment, Expense, MembershipPlan } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const Settings: React.FC = () => {
  const { gym, refreshGymSettings } = useAuth();
  const [formData, setFormData] = useState<GymSettings>({
    name: 'Morya Fitness',
    tagline: 'Premium Gym & Fitness Center',
    address: 'Near Shiv Smarak, Sinnar, Nashik, Maharashtra 422103',
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
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      alert('Failed to update gym settings');
    } finally {
      setIsSaving(false);
    }
  };

  // 1. Generate Excel / CSV Multi-Sheet Database Backup
  const handleDownloadExcelBackup = async () => {
    setIsExportingExcel(true);
    try {
      const [members, payments, expenses, plans] = await Promise.all([
        api.getMembers(),
        api.getPayments(),
        api.getExpenses(),
        api.getPlans(),
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

      // SECTION 4: MEMBERSHIP PLANS
      csv += `--- SECTION 4: MEMBERSHIP PLANS CONFIGURATION (${plans.length} Plans) ---\n`;
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
    } catch (err) {
      alert('Failed to generate Excel database backup');
      console.error(err);
    } finally {
      setIsExportingExcel(false);
    }
  };

  // 2. Generate PDF / Print Ready Document
  const handlePrintPDFBackup = () => {
    window.print();
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

      {/* Database Backup & Export Section (Excel & PDF) */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="border-b border-slate-100 pb-4 no-print">
          <h3 className="text-base font-bold text-slate-900 font-heading flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-600" />
            System Database Backup & Export
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Download your gym database in **Excel (.xlsx / .csv)** spreadsheet format or export a print-ready **PDF report**.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs no-print">
          {/* 1. Excel Workbook Export */}
          <div className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-200 flex flex-col justify-between space-y-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
                <span className="font-bold text-slate-900 text-sm">Excel / CSV Database Sheet</span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Complete structured tables for Members Master Registry, Payments History, Expenses, and Membership Plans. Compatible with Microsoft Excel, Apple Numbers, and Google Sheets.
              </p>
            </div>

            <button
              onClick={handleDownloadExcelBackup}
              disabled={isExportingExcel}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isExportingExcel ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>{isExportingExcel ? 'Generating Sheet...' : 'Download Excel (.csv)'}</span>
            </button>
          </div>

          {/* 2. PDF Document Export */}
          <div className="p-5 rounded-2xl bg-orange-50/50 border border-orange-200 flex flex-col justify-between space-y-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-orange-700" />
                <span className="font-bold text-slate-900 text-sm">PDF Executive Backup Document</span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Full printable audit and backup summary with official Morya Fitness header, gym address, KPI breakdown, and record statements.
              </p>
            </div>

            <button
              onClick={handlePrintPDFBackup}
              className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-xl shadow-md shadow-orange-500/20 transition-all flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save as PDF</span>
            </button>
          </div>
        </div>

        {/* Printable Paper View (Appears on PDF Print) */}
        <div id="printable-receipt" className="hidden print:block p-8 bg-white text-slate-900 space-y-6">
          <div className="border-b-2 border-slate-900 pb-4">
            <h1 className="text-2xl font-black uppercase font-heading">{formData.name}</h1>
            <p className="text-sm font-semibold text-slate-600">{formData.tagline}</p>
            <p className="text-xs text-slate-500 mt-1">{formData.address} • Tel: {formData.phone} • Email: {formData.email}</p>
            <p className="text-xs text-slate-400 mt-0.5">
              System Audit Backup generated on {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">Gym Configuration Details</h2>
            <div className="grid grid-cols-2 gap-4 text-xs border border-slate-200 p-4 rounded-xl">
              <div><strong>Owner / Admin:</strong> Gokul Gugale</div>
              <div><strong>UPI Handle:</strong> {formData.upi_id}</div>
              <div><strong>Receipt Prefix:</strong> {formData.receipt_prefix}</div>
              <div><strong>System Status:</strong> Active & Live</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
