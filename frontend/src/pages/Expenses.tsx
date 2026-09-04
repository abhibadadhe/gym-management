import React, { useState, useEffect, useMemo } from 'react';
import {
  Receipt, Plus, Search, Filter, Trash2, Calendar,
  IndianRupee, RefreshCw, AlertCircle, CheckCircle2, AlertTriangle, X,
  Layers, Check
} from 'lucide-react';
import { Expense, ExpenseCategory } from '../types';
import { api } from '../services/api';
import { Modal } from '../components/common/Modal';
import { useToast } from '../context/ToastContext';
import { SearchableSelect, SearchableSelectOption } from '../components/common/SearchableSelect';

export const Expenses: React.FC = () => {
  const { showToast } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categoriesList, setCategoriesList] = useState<ExpenseCategory[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  // Category Management States
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState<boolean>(false);
  const [categoryName, setCategoryName] = useState<string>('');
  const [categoryDesc, setCategoryDesc] = useState<string>('');
  const [isSubmittingCategory, setIsSubmittingCategory] = useState<boolean>(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [categorySuccess, setCategorySuccess] = useState<string | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<ExpenseCategory | null>(null);
  const [isDeletingCategory, setIsDeletingCategory] = useState<boolean>(false);

  // Searchable Category Options
  const categoryOptions: SearchableSelectOption[] = useMemo(() => {
    return categoriesList.map((c) => ({
      value: c.name,
      label: c.name,
      sublabel: c.description || undefined,
      searchKey: `${c.name} ${c.description || ''}`,
    }));
  }, [categoriesList]);

  const categoryFilterOptions: SearchableSelectOption[] = useMemo(() => {
    return [
      { value: '', label: 'All Categories' },
      ...categoriesList.map((c) => ({
        value: c.name,
        label: c.name,
        searchKey: `${c.name} ${c.description || ''}`,
      })),
    ];
  }, [categoriesList]);

  const handleMonthChange = (monthStr: string) => {
    setSelectedMonth(monthStr);
    if (!monthStr) {
      setStartDate('');
      setEndDate('');
      return;
    }
    const [year, month] = monthStr.split('-').map(Number);
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    setStartDate(start);
    setEndDate(end);
  };

  const [formData, setFormData] = useState({
    category: 'Gym Maintenance & Sanitation',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    payment_method: 'UPI',
    notes: '',
  });

  const fetchCategories = async () => {
    try {
      const cats = await api.getExpenseCategories();
      setCategoriesList(cats);
    } catch (err) {
      console.error('Failed to load expense categories:', err);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) {
      setCategoryError('Category name is required.');
      return;
    }
    setIsSubmittingCategory(true);
    setCategoryError(null);
    try {
      const newCat = await api.createExpenseCategory({
        name: categoryName.trim(),
        description: categoryDesc.trim(),
      });
      await fetchCategories();
      setFormData((prev) => ({ ...prev, category: newCat.name }));
      setCategoryName('');
      setCategoryDesc('');
      setCategorySuccess(`Category "${newCat.name}" added successfully!`);
      showToast(`Category "${newCat.name}" added successfully!`, 'success');
      setTimeout(() => {
        setCategorySuccess(null);
        setIsAddCategoryOpen(false);
      }, 800);
    } catch (err: any) {
      setCategoryError(err.response?.data?.name?.[0] || err.response?.data?.detail || 'Failed to create category.');
    } finally {
      setIsSubmittingCategory(false);
    }
  };

  const handleConfirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    setIsDeletingCategory(true);
    try {
      const catName = categoryToDelete.name;
      await api.deleteExpenseCategory(categoryToDelete.id);
      setCategoryToDelete(null);
      setIsAddCategoryOpen(false);
      await fetchCategories();
      fetchExpenses();
      showToast(`Category "${catName}" was successfully deleted.`, 'success');
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to delete category.', 'error');
    } finally {
      setIsDeletingCategory(false);
    }
  };

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
    if (!formData.amount) return;

    try {
      const expDesc = formData.description.trim() || formData.category;
      await api.createExpense({
        category: formData.category,
        description: expDesc,
        amount: Number(formData.amount),
        date: formData.date,
        payment_method: formData.payment_method as any,
        notes: formData.notes.trim(),
      });
      setIsAddModalOpen(false);
      setFormData({
        category: categoriesList[0]?.name || 'Gym Maintenance & Sanitation',
        description: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        payment_method: 'UPI',
        notes: '',
      });
      fetchExpenses();
      showToast(`Expense of ₹${Number(formData.amount).toLocaleString('en-IN')} recorded successfully!`, 'success');
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to save expense record.', 'error');
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setCategoryError(null);
              setCategorySuccess(null);
              setIsAddCategoryOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-sm transition-all"
          >
            <Plus className="w-4 h-4 text-orange-600" />
            <span>Add Category</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold rounded-xl shadow-md shadow-orange-500/20 transition-all"
          >
            <Receipt className="w-4 h-4" />
            <span>Record Expense</span>
          </button>
        </div>
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
        <div className="w-56">
          <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Expense Category</label>
          <SearchableSelect
            options={categoryFilterOptions}
            value={categoryFilter}
            onChange={(val) => setCategoryFilter(String(val))}
            placeholder="All Categories"
            searchPlaceholder="Search category..."
            size="sm"
            clearable
            onClear={() => setCategoryFilter('')}
          />
        </div>

        {/* Month Selection Option */}
        <div>
          <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Select Month</label>
          <div className="flex items-center gap-1.5">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => handleMonthChange(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:border-orange-500 focus:bg-white cursor-pointer"
            />
            {selectedMonth && (
              <button
                type="button"
                onClick={() => handleMonthChange('')}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                title="Clear Month Filter"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Quick Month Preset Buttons */}
        <div className="flex items-center gap-1.5 self-end">
          <button
            type="button"
            onClick={() => {
              const now = new Date();
              const mStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
              handleMonthChange(mStr);
            }}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              selectedMonth === `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
                ? 'bg-orange-500 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            This Month
          </button>

          <button
            type="button"
            onClick={() => {
              const now = new Date();
              now.setMonth(now.getMonth() - 1);
              const mStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
              handleMonthChange(mStr);
            }}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all"
          >
            Last Month
          </button>
        </div>

        <div className="ml-auto pt-4">
          <button
            onClick={() => {
              setCategoryFilter('');
              handleMonthChange('');
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
                <th className="py-3 px-4 text-right">Amount</th>
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
                  <td className="py-3 px-4 text-right font-black text-rose-600 text-sm">
                    ₹{Number(e.amount).toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}

              {expenses.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400 text-xs">
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
            <label className="block text-slate-700 font-semibold mb-1">
              Expense Category <span className="text-rose-600">*</span>
            </label>
            <SearchableSelect
              options={categoryOptions}
              value={formData.category}
              onChange={(val) => setFormData({ ...formData, category: String(val) })}
              placeholder="-- Select Expense Category --"
              searchPlaceholder="Search category name or description..."
              required
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Description / Purpose <span className="text-slate-400 font-normal text-[11px]">(Optional)</span>
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g. MSEDCL Electricity Bill, repairs, etc. (Optional)"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
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

      {/* Manage & Add Expense Category Modal */}
      {isAddCategoryOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-orange-600" />
                <h3 className="font-bold font-heading text-slate-900 text-base">Manage Expense Categories</h3>
              </div>
              <button
                onClick={() => setIsAddCategoryOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs">
              {/* Add New Category Form */}
              <form onSubmit={handleAddCategory} className="space-y-3">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">
                  Add New Category
                </h4>

                {categoryError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                    {categoryError}
                  </div>
                )}

                {categorySuccess && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>{categorySuccess}</span>
                  </div>
                )}

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Category Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Drinking Water & Dispensers"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-orange-500 font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Description <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Short notes or purpose..."
                    value={categoryDesc}
                    onChange={(e) => setCategoryDesc(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={isSubmittingCategory || !categoryName.trim()}
                    className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold shadow-md shadow-orange-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{isSubmittingCategory ? 'Adding...' : 'Add Category'}</span>
                  </button>
                </div>
              </form>

              {/* Current Categories List */}
              <div className="pt-4 border-t border-slate-100 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">
                    Current Categories ({categoriesList.length})
                  </h4>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-50">
                  {categoriesList.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between p-2 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
                    >
                      <div className="truncate pr-2">
                        <span className="font-bold text-slate-800 text-xs block truncate">{c.name}</span>
                        {c.description && (
                          <span className="text-[10px] text-slate-400 block truncate">{c.description}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-600">
                          {c.expenses_count || 0} expenses
                        </span>
                        <button
                          type="button"
                          onClick={() => setCategoryToDelete(c)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title={`Delete ${c.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {categoriesList.length === 0 && (
                    <div className="text-center py-4 text-slate-400 text-xs">
                      No categories added yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Delete Confirmation Modal */}
      <Modal
        isOpen={!!categoryToDelete}
        onClose={() => setCategoryToDelete(null)}
        title="Confirm Category Deletion"
        subtitle="Action cannot be undone"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm text-rose-900">
              <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
              <span>Are you sure you want to delete this category?</span>
            </div>
            <p className="text-[11px] text-rose-700 pl-7">
              This will remove category <strong>{categoryToDelete?.name}</strong>. Existing expense records under this category will remain preserved.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCategoryToDelete(null)}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmDeleteCategory}
              disabled={isDeletingCategory}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-md shadow-rose-500/20 disabled:opacity-50"
            >
              {isDeletingCategory ? 'Deleting...' : 'Yes, Delete Category'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
