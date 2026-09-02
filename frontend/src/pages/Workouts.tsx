import React, { useState, useEffect } from 'react';
import {
  Dumbbell, Plus, Flame, Clock, CheckCircle2, User, RefreshCw
} from 'lucide-react';
import { WorkoutPlan, Member } from '../types';
import { api } from '../services/api';
import { Modal } from '../components/common/Modal';

export const Workouts: React.FC = () => {
  const [workouts, setWorkouts] = useState<WorkoutPlan[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAddPlanModal, setIsAddPlanModal] = useState<boolean>(false);
  const [isAddExerciseModal, setIsAddExerciseModal] = useState<boolean>(false);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);

  const [planForm, setPlanForm] = useState({
    member_id: '',
    title: 'Hypertrophy & Strength 6-Day Split',
    goal: 'Muscle Gain & Core Fitness',
    notes: 'Compound focus. Rest 90s between sets.',
  });

  const [exerciseForm, setExerciseForm] = useState({
    day_of_week: 'MON',
    exercise_name: '',
    sets: 4,
    reps: '10-12',
    target_weight_kg: '20',
    duration_min: 15,
    notes: '',
  });

  const fetchWorkoutsData = async () => {
    setIsLoading(true);
    try {
      const [workoutsRes, membersRes] = await Promise.all([
        api.getWorkouts(),
        api.getMembers(),
      ]);
      setWorkouts(workoutsRes);
      setMembers(membersRes);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkoutsData();
  }, []);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planForm.member_id || !planForm.title) return;

    try {
      await api.createWorkout({
        member: Number(planForm.member_id),
        title: planForm.title.trim(),
        goal: planForm.goal.trim(),
        notes: planForm.notes.trim(),
      });
      setIsAddPlanModal(false);
      fetchWorkoutsData();
    } catch (e) {
      alert('Failed to create workout routine');
    }
  };

  const handleAddExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanId || !exerciseForm.exercise_name) return;

    try {
      await api.addExercise(selectedPlanId, {
        day_of_week: exerciseForm.day_of_week,
        exercise_name: exerciseForm.exercise_name.trim(),
        sets: Number(exerciseForm.sets),
        reps: exerciseForm.reps.trim(),
        target_weight_kg: Number(exerciseForm.target_weight_kg || 0),
        duration_min: Number(exerciseForm.duration_min || 0),
        notes: exerciseForm.notes.trim(),
      });
      setIsAddExerciseModal(false);
      fetchWorkoutsData();
    } catch (e) {
      alert('Failed to add exercise');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 font-heading tracking-tight">Member Workout Routines</h2>
          <p className="text-xs text-slate-500">
            Design and assign customized workout split schedules, exercise sets, reps, and target weights.
          </p>
        </div>
        <button
          onClick={() => setIsAddPlanModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold rounded-xl shadow-md shadow-orange-500/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>+ Create Workout Routine</span>
        </button>
      </div>

      {/* Workouts Grid */}
      <div className="space-y-6">
        {workouts.map((plan) => (
          <div key={plan.id} className="glass-panel p-6 rounded-3xl border border-slate-200 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-orange-100 text-orange-700 border border-orange-200 flex items-center justify-center font-bold">
                  <Dumbbell className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-heading">{plan.title}</h3>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-semibold text-orange-600">Member: {plan.member_name}</span>
                    <span>•</span>
                    <span>Goal: {plan.goal}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedPlanId(plan.id);
                  setIsAddExerciseModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5 text-orange-600" />
                <span>Add Exercise</span>
              </button>
            </div>

            {/* Exercises Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {plan.exercises?.map((ex) => (
                <div
                  key={ex.id}
                  className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-2 text-xs"
                >
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-slate-900 text-xs">{ex.exercise_name}</span>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-orange-100 text-orange-800 uppercase">
                      {ex.day_of_week}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600 font-mono text-[11px] pt-1 border-t border-slate-200">
                    <span>
                      {ex.sets} Sets × {ex.reps} Reps
                    </span>
                    {Number(ex.target_weight_kg) > 0 && (
                      <span className="text-emerald-600 font-bold">
                        {ex.target_weight_kg} kg
                      </span>
                    )}
                  </div>

                  {ex.notes && (
                    <p className="text-[10px] text-slate-500 italic truncate">{ex.notes}</p>
                  )}
                </div>
              ))}

              {(!plan.exercises || plan.exercises.length === 0) && (
                <div className="col-span-full text-center py-6 text-slate-400 text-xs">
                  No exercises added yet. Click "+ Add Exercise" to build this workout.
                </div>
              )}
            </div>
          </div>
        ))}

        {workouts.length === 0 && !isLoading && (
          <div className="text-center py-16 glass-panel rounded-3xl text-slate-400 text-xs">
            <Dumbbell className="w-10 h-10 mx-auto mb-2 text-slate-400" />
            No workout routines created yet. Click "+ Create Workout Routine" above to begin.
          </div>
        )}
      </div>

      {/* Modal: Create Workout Plan */}
      <Modal
        isOpen={isAddPlanModal}
        onClose={() => setIsAddPlanModal(false)}
        title="Create New Workout Routine"
        subtitle="Assign workout goals to a member"
        maxWidth="md"
      >
        <form onSubmit={handleCreatePlan} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Select Member</label>
            <select
              value={planForm.member_id}
              onChange={(e) => setPlanForm({ ...planForm, member_id: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
              required
            >
              <option value="">-- Choose Member --</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name} ({m.member_id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Routine Title</label>
            <input
              type="text"
              value={planForm.title}
              onChange={(e) => setPlanForm({ ...planForm, title: e.target.value })}
              placeholder="e.g. 6-Day Push Pull Legs Routine"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
              required
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Fitness Goal</label>
            <input
              type="text"
              value={planForm.goal}
              onChange={(e) => setPlanForm({ ...planForm, goal: e.target.value })}
              placeholder="e.g. Muscle Hypertrophy & Fat Loss"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">General Instructions / Notes</label>
            <textarea
              value={planForm.notes}
              onChange={(e) => setPlanForm({ ...planForm, notes: e.target.value })}
              placeholder="Maintain 90s rest, drink 4L water daily..."
              rows={3}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow-md shadow-orange-500/20 transition-all mt-2"
          >
            Save Workout Plan
          </button>
        </form>
      </Modal>

      {/* Modal: Add Exercise */}
      <Modal
        isOpen={isAddExerciseModal}
        onClose={() => setIsAddExerciseModal(false)}
        title="Add Exercise to Workout"
        subtitle="Specify sets, reps, and weights"
        maxWidth="md"
      >
        <form onSubmit={handleAddExercise} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Day of Week</label>
            <select
              value={exerciseForm.day_of_week}
              onChange={(e) => setExerciseForm({ ...exerciseForm, day_of_week: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
            >
              <option value="MON">Monday - Chest & Triceps</option>
              <option value="TUE">Tuesday - Back & Biceps</option>
              <option value="WED">Wednesday - Legs & Core</option>
              <option value="THU">Thursday - Shoulders & Traps</option>
              <option value="FRI">Friday - Arms & Cardio</option>
              <option value="SAT">Saturday - Full Body / Functional</option>
              <option value="DAILY">Everyday / General</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Exercise Name</label>
            <input
              type="text"
              value={exerciseForm.exercise_name}
              onChange={(e) => setExerciseForm({ ...exerciseForm, exercise_name: e.target.value })}
              placeholder="e.g. Barbell Incline Bench Press"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Sets</label>
              <input
                type="number"
                min="1"
                value={exerciseForm.sets}
                onChange={(e) => setExerciseForm({ ...exerciseForm, sets: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:outline-none focus:border-orange-500 focus:bg-white"
                required
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Reps</label>
              <input
                type="text"
                value={exerciseForm.reps}
                onChange={(e) => setExerciseForm({ ...exerciseForm, reps: e.target.value })}
                placeholder="10-12"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:outline-none focus:border-orange-500 focus:bg-white"
                required
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Target Wt (kg)</label>
              <input
                type="number"
                step="0.5"
                value={exerciseForm.target_weight_kg}
                onChange={(e) => setExerciseForm({ ...exerciseForm, target_weight_kg: e.target.value })}
                placeholder="60"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:outline-none focus:border-orange-500 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Form Notes / Cue</label>
            <input
              type="text"
              value={exerciseForm.notes}
              onChange={(e) => setExerciseForm({ ...exerciseForm, notes: e.target.value })}
              placeholder="e.g. Squeeze lats at bottom, 1s pause"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow-md shadow-orange-500/20 transition-all mt-2"
          >
            Add Exercise
          </button>
        </form>
      </Modal>
    </div>
  );
};
