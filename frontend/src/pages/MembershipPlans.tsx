import React, { useState, useEffect } from 'react';
import { Award, Plus, Edit2, Trash2, CheckCircle2, RefreshCw, Clock, AlertTriangle, Dumbbell, Flame } from 'lucide-react';
import { MembershipPlan } from '../types';
import { api } from '../services/api';
import { Modal } from '../components/common/Modal';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const MembershipPlans: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const isAdmin = user?.role === 'OWNER';

  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null);
  const [planToDelete, setPlanToDelete] = useState<MembershipPlan | null>(null);
  const [isDeletingPlan, setIsDeletingPlan] = useState<boolean>(false);

  const [formData, setFormData] = useState({
    name: '',
    duration_days: '30',
    price: '',
    description: '',
    plan_type: 'WEIGHT_TRAINING' as 'WEIGHT_TRAINING' | 'CARDIO' | 'GENERAL',
    is_active: true,
  });

  const fetchPlans = async () => {
    setIsLoading(true);
    try {
      const res = await api.getPlans();
      setPlans(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleOpenAdd = () => {
    setEditingPlan(null);
    setFormData({
      name: '',
      duration_days: '30',
      price: '',
      description: '',
      plan_type: 'WEIGHT_TRAINING',
      is_active: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (plan: MembershipPlan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      duration_days: plan.duration_days.toString(),
      price: plan.price.toString(),
      description: plan.description || '',
      plan_type: plan.plan_type || (plan.name.toLowerCase().includes('cardio') ? 'CARDIO' : 'WEIGHT_TRAINING'),
      is_active: plan.is_active,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.price || !formData.duration_days) return;

    try {
      const payload = {
        name: formData.name.trim(),
        duration_days: Number(formData.duration_days),
        price: Number(formData.price),
        description: formData.description.trim(),
        plan_type: formData.plan_type,
        is_active: formData.is_active,
      };

      if (editingPlan) {
        await api.updatePlan(editingPlan.id, payload);
        showToast(`Membership plan "${payload.name}" was successfully updated!`, 'success');
      } else {
        await api.createPlan(payload);
        showToast(`Membership plan "${payload.name}" was successfully created!`, 'success');
      }
      setIsModalOpen(false);
      fetchPlans();
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to save membership plan.', 'error');
    }
  };

  const handleConfirmDeletePlan = async () => {
    if (!planToDelete) return;
    setIsDeletingPlan(true);
    try {
      const planName = planToDelete.name;
      await api.deletePlan(planToDelete.id);
      setPlanToDelete(null);
      fetchPlans();
      showToast(`Membership plan "${planName}" was successfully deleted.`, 'success');
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Cannot delete plan with active member subscriptions.', 'error');
    } finally {
      setIsDeletingPlan(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 font-heading tracking-tight">Membership Plans</h2>
          <p className="text-xs text-slate-500">
            Configure flexible subscription tiers, durations, and dynamic pricing for Morya Fitness.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold rounded-xl shadow-md shadow-orange-500/20 transition-all"
          >
            <Award className="w-4 h-4" />
            <span>Create New Plan</span>
          </button>
        )}
      </div>

      {/* Plan Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className="glass-panel glass-panel-hover p-6 rounded-3xl relative overflow-hidden flex flex-col justify-between space-y-4 shadow-sm"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-700 border border-orange-200 flex items-center justify-center font-bold">
                  <Award className="w-5 h-5" />
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                      plan.plan_type === 'CARDIO' || plan.name.toLowerCase().includes('cardio')
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-orange-50 text-orange-700 border-orange-200'
                    }`}
                  >
                    {plan.plan_type === 'CARDIO' || plan.name.toLowerCase().includes('cardio') ? (
                      <>
                        <Flame className="w-3 h-3 text-amber-600" />
                        Cardio + Weights
                      </>
                    ) : (
                      <>
                        <Dumbbell className="w-3 h-3 text-orange-600" />
                        Weight Training
                      </>
                    )}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      plan.is_active
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {plan.is_active ? 'Active' : 'Disabled'}
                  </span>
                  {isAdmin && (
                    <button
                      onClick={() => handleOpenEdit(plan)}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
                      title="Edit Plan"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900 font-heading">{plan.name}</h3>
                <p className="text-xs text-slate-500 mt-1 min-h-[36px]">
                  {plan.description || 'Full gym facility access, equipment & cardio zone.'}
                </p>
              </div>

              <div className="flex items-baseline gap-1 pt-2">
                <span className="text-3xl font-black text-orange-600 font-heading">
                  ₹{Number(plan.price).toLocaleString('en-IN')}
                </span>
                <span className="text-xs text-slate-400">/ {plan.duration_days} Days</span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1 font-medium">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Validity: {plan.duration_days} Days
              </span>
              {isAdmin && (
                <button
                  onClick={() => setPlanToDelete(plan)}
                  className="text-slate-400 hover:text-rose-600 text-xs transition-colors font-medium"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Plan Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPlan ? 'Edit Membership Plan' : 'Create New Membership Plan'}
        subtitle="Manage dynamic pricing and subscription terms"
        maxWidth="md"
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Plan Category / Floor</label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                  formData.plan_type === 'WEIGHT_TRAINING'
                    ? 'bg-orange-50/90 border-orange-500 text-orange-950 font-bold shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <input
                  type="radio"
                  name="plan_type"
                  checked={formData.plan_type === 'WEIGHT_TRAINING'}
                  onChange={() => setFormData({ ...formData, plan_type: 'WEIGHT_TRAINING' })}
                  className="text-orange-600 focus:ring-orange-500"
                />
                <Dumbbell className="w-4 h-4 text-orange-600 flex-shrink-0" />
                <span className="text-xs">Weight Training</span>
              </label>

              <label
                className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                  formData.plan_type === 'CARDIO'
                    ? 'bg-amber-50/90 border-amber-500 text-amber-950 font-bold shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <input
                  type="radio"
                  name="plan_type"
                  checked={formData.plan_type === 'CARDIO'}
                  onChange={() => setFormData({ ...formData, plan_type: 'CARDIO' })}
                  className="text-amber-600 focus:ring-amber-500"
                />
                <Flame className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span className="text-xs">Weight + Cardio</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Plan Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Quarterly Plan (3 Months)"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Duration (Days)</label>
              <input
                type="number"
                min="1"
                value={formData.duration_days}
                onChange={(e) => setFormData({ ...formData, duration_days: e.target.value })}
                placeholder="e.g. 90"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:outline-none focus:border-orange-500 focus:bg-white"
                required
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Price (₹ INR)</label>
              <input
                type="number"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="e.g. 2500"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold font-mono focus:outline-none focus:border-orange-500 focus:bg-white"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Plan Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Full access to equipment, lockers, and cardio floor..."
              rows={3}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="rounded bg-slate-100 border-slate-300 text-orange-600 focus:ring-0"
            />
            <label htmlFor="is_active" className="text-slate-700 font-semibold cursor-pointer">
              Active plan available for member registration
            </label>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow-md shadow-orange-500/20 transition-all mt-2"
          >
            {editingPlan ? 'Update Plan' : 'Create Plan'}
          </button>
        </form>
      </Modal>

      {/* Plan Delete Confirmation Modal */}
      <Modal
        isOpen={!!planToDelete}
        onClose={() => setPlanToDelete(null)}
        title="Confirm Plan Deletion"
        subtitle="Action cannot be undone"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm text-rose-900">
              <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
              <span>Are you sure you want to delete this plan?</span>
            </div>
            <p className="text-[11px] text-rose-700 pl-7">
              This will permanently remove <strong>{planToDelete?.name}</strong> (₹{planToDelete?.price} / {planToDelete?.duration_days} days). Plans with active member subscriptions cannot be deleted.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setPlanToDelete(null)}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmDeletePlan}
              disabled={isDeletingPlan}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-md shadow-rose-500/20 disabled:opacity-50"
            >
              {isDeletingPlan ? 'Deleting...' : 'Yes, Delete Plan'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
