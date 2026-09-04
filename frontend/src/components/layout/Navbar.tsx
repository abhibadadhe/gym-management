import React, { useState, useEffect } from 'react';
import {
  Menu, Bell, UserPlus, RefreshCw, Trash2, X,
  Clock, AlertTriangle, Cake, CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface NavbarProps {
  onToggleMobile: () => void;
  onQuickAction: (action: 'add-member' | 'renew' | 'payment', memberId?: number) => void;
  notificationsData?: {
    expiring?: any[];
    birthdays?: any[];
  };
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleMobile,
  onQuickAction,
  notificationsData,
}) => {
  const { gym } = useAuth();
  const [time, setTime] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  // Local state to track dismissed notification IDs
  const [dismissedExpiringIds, setDismissedExpiringIds] = useState<number[]>([]);
  const [dismissedBirthdayIds, setDismissedBirthdayIds] = useState<number[]>([]);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
      setDate(
        now.toLocaleDateString('en-IN', {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const visibleExpiring = (notificationsData?.expiring || []).filter(
    (m: any) => !dismissedExpiringIds.includes(m.id)
  );

  const visibleBirthdays = (notificationsData?.birthdays || []).filter(
    (b: any) => !dismissedBirthdayIds.includes(b.id)
  );

  const totalAlerts = visibleExpiring.length + visibleBirthdays.length;

  const handleClearAll = () => {
    setDismissedExpiringIds((notificationsData?.expiring || []).map((m: any) => m.id));
    setDismissedBirthdayIds((notificationsData?.birthdays || []).map((b: any) => b.id));
  };

  const handleDismissExpiring = (id: number) => {
    setDismissedExpiringIds((prev) => [...prev, id]);
  };

  const handleDismissBirthday = (id: number) => {
    setDismissedBirthdayIds((prev) => [...prev, id]);
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 py-3">
      <div className="flex items-center justify-between gap-4">
        {/* Mobile Menu Trigger & Gym Info */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMobile}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 lg:hidden transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt="Morya Fitness"
              className="w-8 h-8 rounded-full object-cover border border-orange-500 shadow-sm flex-shrink-0 bg-black"
            />
            <div className="hidden sm:block">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800 font-heading">
                  {gym?.name || 'Morya Fitness'}
                </span>
                <span className="text-[10px] bg-orange-100 text-orange-700 font-bold px-2 py-0.5 rounded-full border border-orange-200">
                  Sinnar
                </span>
              </div>
              <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                <span>{date}</span>
                <span>•</span>
                <Clock className="w-3 h-3 text-orange-600" />
                <span className="font-mono text-slate-700 font-semibold">{time} IST</span>
              </p>
            </div>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Quick Add Member */}
          <button
            onClick={() => onQuickAction('add-member')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <UserPlus className="w-4 h-4 text-orange-600" />
            <span>Enroll Member</span>
          </button>

          {/* Quick Renew */}
          <button
            onClick={() => onQuickAction('renew')}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all"
          >
            <RefreshCw className="w-4 h-4 text-emerald-600" />
            <span>Renew</span>
          </button>

          {/* Notification Alerts Bell */}
          <div className="relative">
            <button
              onClick={() => setIsAlertOpen(!isAlertOpen)}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 relative transition-colors"
              title="Notifications & Alerts"
            >
              <Bell className="w-5 h-5" />
              {totalAlerts > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center animate-pulse">
                  {totalAlerts}
                </span>
              )}
            </button>

            {/* Notification Drawer Popover */}
            {isAlertOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Notifications ({totalAlerts})
                    </h4>
                    {totalAlerts > 0 && (
                      <button
                        onClick={handleClearAll}
                        className="flex items-center gap-1 text-[10px] text-rose-600 hover:text-rose-700 font-semibold px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200 transition-colors"
                        title="Clear all notifications"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Clear All</span>
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => setIsAlertOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                    title="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="max-h-72 overflow-y-auto space-y-2 pr-0.5">
                  {/* Expiring Members */}
                  {visibleExpiring.map((m: any) => (
                    <div
                      key={m.id}
                      className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-200 text-xs flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        <div className="min-w-0">
                          <span className="font-bold text-slate-800 block truncate">
                            {m.full_name || m.name}
                          </span>
                          <span className="text-[10px] text-amber-700 font-medium block truncate">
                            Expires in {m.days_remaining} days ({m.plan_name || m.plan})
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => {
                            setIsAlertOpen(false);
                            onQuickAction('renew', m.id);
                          }}
                          className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold rounded-lg shadow-sm"
                        >
                          Renew
                        </button>
                        <button
                          onClick={() => handleDismissExpiring(m.id)}
                          className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-amber-100"
                          title="Dismiss notification"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Birthday Greetings */}
                  {visibleBirthdays.map((b: any) => (
                    <div
                      key={b.id}
                      className="p-2.5 rounded-xl bg-orange-50/60 border border-orange-200 text-xs flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Cake className="w-4 h-4 text-orange-600 flex-shrink-0" />
                        <div className="min-w-0">
                          <span className="font-bold text-slate-800 block truncate">
                            {b.full_name || b.name}
                          </span>
                          <span className="text-[10px] text-orange-700 font-medium">
                            Birthday Today! 🎉
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDismissBirthday(b.id)}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-orange-100"
                        title="Dismiss notification"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                  {totalAlerts === 0 && (
                    <div className="text-center py-6 text-slate-400 text-xs space-y-1">
                      <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
                      <p className="font-semibold text-slate-600">All caught up!</p>
                      <p className="text-[11px] text-slate-400">No active alerts or expiring memberships.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
