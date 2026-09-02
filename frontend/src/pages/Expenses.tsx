import React, { useState, useEffect } from 'react';
import {
  Receipt, Plus, Search, Filter, Trash2, Calendar,
  IndianRupee, RefreshCw, AlertCircle, CheckCircle2
} from 'lucide-react';
import { Expense } from '../types';
import { api } from '../services/api';
import { Modal } from '../components/common/Modal';

export const Expenses: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  const [formData, setFormData] = useState({
    category: 'MAINTENANCE',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    payment_method: 'UPI',
    notes: '',
  });

  const categories = [
    { id: 'RENT', label: 'Rent & Property' },
    { id: 'ELECTRICITY', label: 'Electricity Bills' },
    { id: 'EQUIPMENT', label: 'Equipment & Repairs' },
    { id: 'MAINTENANCE', label: 'Gym Maintenance' },
    { id: 'SALARY', label: 'Staff & Helper Salaries' },
    { id: 'CLEANING', label: 'Cleaning & Housekeeping' },
    { id: 'MARKETING', label: 'Marketing & Banners' },
    { id: 'SUPPLEMENTS', label: 'Supplements Stock' },
    { id: 'OTHER', label: 'General / Misc' },
  ];

  const fetchExpenses = async () => {
    setIsLoading(true);
    try {
      const res = await api.getExpenses({
        category: categoryFilter || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });
      setExpenses(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [categoryFilter, startDate, endDate]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description || !formData.amount) return;

    try {
      await api.createExpense({
        category: formData.category,
        description: formData.description.trim(),
        amount: Number(formData.amount),
        date: formData.date,
        payment_method: formData.payment_method as any,
        notes: formData.notes.trim(),
      });
      setIsAddModalOpen(false);
      setFormData({
        category: 'MAINTENANCE',
        description: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        payment_method: 'UPI',
        notes: '',
      });
      fetchExpenses();
    } catch (err) {
      alert('Failed to save expense');
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Delete this expense record?')) {
      try {
        await api.deleteExpense(id);
        fetchExpenses();
      } catch (e) {
        alert('Failed to delete expense');
      }
    }
  };

  const totalExpense = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 font-heading tracking-tight">Gym Operating Expenses</h2>
          <p className="text-xs text-slate-500">
            Log bills, staff salaries, rent, maintenance, and equipment purchases for Morya Fitness.
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold rounded-xl shadow-md shadow-orange-500/20 transition-all"
        >
          <Receipt className="w-4 h-4" />
          <span>Record Expense</span>
        </button>
      </div>

      {/* Summary Stat Card */}
      <div className="glass-panel p-5 rounded-2xl flex items-center justify-between shadow-sm">
        <div>
          <span className="text-xs font-semibold text-slate-500 block">Total Filtered Operating Expenses</span>
          <span className="text-3xl font-black text-rose-600 font-heading mt-1 block">
            ₹{totalExpense.toLocaleString('en-IN')}
          </span>
        </div>
        <span className="text-xs text-slate-600 bg-slate-100 font-semibold px-3 py-1.5 rounded-xl border border-slate-200">
          {expenses.length} Records
        </span>
      </div>

      {/* Filters */}
      <div className="glass-panel p-4 rounded-2xl flex flex-wrap items-center gap-3 text-xs">
        <div>
          <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Expense Category</label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
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
              setCategoryFilter('');
              setStartDate('');
              setEndDate('');
            }}
            className="text-xs text-slate-500 hover:text-slate-900 underline font-medium"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Expense List Table */}
      <div className="glass-panel rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                <th className="py-3 px-4">Expense ID</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Mode</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {expenses.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-orange-600">{e.expense_id}</td>
                  <td className="py-3 px-4 text-slate-600">
                    {new Date(e.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                      {e.category_display || e.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-900">{e.description}</td>
                  <td className="py-3 px-4 text-slate-500">{e.payment_method}</td>
                  <td className="py-3 px-4 font-black text-rose-600 text-sm">
                    ₹{Number(e.amount).toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleDelete(e.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                      title="Delete Entry"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}

              {expenses.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 text-xs">
                    No expense records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Record Operating Expense"
        subtitle="Log gym expenditure for accurate P&L calculation"
        maxWidth="md"
      >
        <form onSubmit={handleCreate} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Expense Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Description / Purpose</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g. MSEDCL Electricity Bill for August"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Amount (₹ INR)</label>
              <input
                type="number"
                min="1"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="e.g. 6450"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold font-mono focus:outline-none focus:border-orange-500 focus:bg-white"
                required
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Expense Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Payment Method</label>
            <select
              value={formData.payment_method}
              onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
            >
              <option value="UPI">UPI</option>
              <option value="CASH">Cash</option>
              <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
              <option value="CARD">Card</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Notes / Vendor Name</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Vendor details, bill number, etc..."
              rows={2}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow-md shadow-orange-500/20 transition-all mt-2"
          >
            Save Expense
          </button>
        </form>
      </Modal>
    </div>
  );
};
