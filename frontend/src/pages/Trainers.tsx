import React, { useState, useEffect } from 'react';
import {
  UserCheck, Plus, Edit2, Trash2, Phone, Mail,
  Calendar, Award, Users, RefreshCw
} from 'lucide-react';
import { Trainer } from '../types';
import { api } from '../services/api';
import { Modal } from '../components/common/Modal';
import { useAuth } from '../context/AuthContext';

export const Trainers: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'OWNER';

  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingTrainer, setEditingTrainer] = useState<Trainer | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    specialization: 'Strength & Conditioning',
    salary: '25000',
    joining_date: new Date().toISOString().split('T')[0],
    status: 'ACTIVE',
    bio: '',
  });

  const fetchTrainers = async () => {
    setIsLoading(true);
    try {
      const res = await api.getTrainers();
      setTrainers(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTrainers();
  }, []);

  const handleOpenAdd = () => {
    setEditingTrainer(null);
    setFormData({
      name: '',
      phone: '',
      email: '',
      specialization: 'Strength & Conditioning',
      salary: '25000',
      joining_date: new Date().toISOString().split('T')[0],
      status: 'ACTIVE',
      bio: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (t: Trainer) => {
    setEditingTrainer(t);
    setFormData({
      name: t.name,
      phone: t.phone,
      email: t.email || '',
      specialization: t.specialization,
      salary: t.salary.toString(),
      joining_date: t.joining_date,
      status: t.status,
      bio: t.bio || '',
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) return;

    try {
      const payload = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        specialization: formData.specialization.trim(),
        salary: Number(formData.salary || 0),
        joining_date: formData.joining_date,
        status: formData.status as any,
        bio: formData.bio.trim(),
      };

      if (editingTrainer) {
        await api.updateTrainer(editingTrainer.id, payload);
      } else {
        await api.createTrainer(payload);
      }
      setIsModalOpen(false);
      fetchTrainers();
    } catch (err) {
      alert('Failed to save trainer profile');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 font-heading tracking-tight">Fitness Trainers & Staff</h2>
          <p className="text-xs text-slate-500">
            Manage fitness coaches, workout specializations, salaries, and member assignments.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold rounded-xl shadow-md shadow-orange-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Trainer</span>
          </button>
        )}
      </div>

      {/* Trainers Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {trainers.map((t) => (
          <div
            key={t.id}
            className="glass-panel glass-panel-hover p-6 rounded-3xl relative overflow-hidden flex flex-col justify-between space-y-4 shadow-sm"
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white font-black text-lg flex items-center justify-center shadow-md">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 font-heading">{t.name}</h3>
                    <span className="text-[11px] font-bold text-orange-600 block">{t.specialization}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                      t.status === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {t.status}
                  </span>
                  {isAdmin && (
                    <button
                      onClick={() => handleOpenEdit(t)}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900"
                      title="Edit Trainer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-slate-700 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <p className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-mono font-medium">+91 {t.phone}</span>
                </p>
                {t.email && (
                  <p className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{t.email}</span>
                  </p>
                )}
                <p className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Joined {new Date(t.joining_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</span>
                </p>
              </div>

              {t.bio && (
                <p className="text-xs text-slate-500 leading-relaxed italic">
                  "{t.bio}"
                </p>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-600 flex items-center gap-1.5 font-semibold">
                <Users className="w-4 h-4 text-orange-600" />
                {t.active_members_count || 0} Assigned Members
              </span>
              {isAdmin && (
                <span className="font-bold text-emerald-600">
                  Salary: ₹{Number(t.salary).toLocaleString('en-IN')}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Trainer Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTrainer ? 'Edit Trainer Profile' : 'Add New Trainer'}
        subtitle="Manage fitness trainer details and monthly compensation"
        maxWidth="md"
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Trainer Full Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Omkar Deshmukh"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">10-Digit Mobile</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="9823011223"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:outline-none focus:border-orange-500 focus:bg-white"
                required
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="trainer@moryafitness.com"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Specialization</label>
              <input
                type="text"
                value={formData.specialization}
                onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                placeholder="Bodybuilding / CrossFit / Weight Loss"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Monthly Salary (₹)</label>
              <input
                type="number"
                value={formData.salary}
                onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:outline-none focus:border-orange-500 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Trainer Bio / Achievements</label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Certified fitness coach with 5+ years experience..."
              rows={3}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow-md shadow-orange-500/20 transition-all mt-2"
          >
            {editingTrainer ? 'Update Trainer' : 'Add Trainer'}
          </button>
        </form>
      </Modal>
    </div>
  );
};
