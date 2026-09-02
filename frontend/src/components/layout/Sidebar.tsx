import React from 'react';
import {
  LayoutDashboard, Users, CreditCard, CalendarCheck, Award,
  Dumbbell, Receipt, BarChart3, Settings, ShieldAlert,
  LogOut, Flame, ChevronRight, UserPlus
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  isOpenMobile,
  onCloseMobile,
}) => {
  const { user, gym, logout } = useAuth();

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['OWNER', 'MANAGER', 'TRAINER'],
    },
    {
      id: 'members',
      label: 'Members Registry',
      icon: Users,
      roles: ['OWNER', 'MANAGER', 'TRAINER'],
    },
    {
      id: 'payments',
      label: 'Fee & Payments',
      icon: CreditCard,
      roles: ['OWNER', 'MANAGER'],
    },
    {
      id: 'plans',
      label: 'Membership Plans',
      icon: Award,
      roles: ['OWNER', 'MANAGER'],
    },
    {
      id: 'expenses',
      label: 'Expenses & Bills',
      icon: Receipt,
      roles: ['OWNER'],
    },
    {
      id: 'financials',
      label: 'Financial P&L',
      icon: BarChart3,
      roles: ['OWNER'],
    },
    {
      id: 'reports',
      label: 'Reports & Export',
      icon: BarChart3,
      roles: ['OWNER', 'MANAGER'],
    },
    {
      id: 'settings',
      label: 'Gym & Backups',
      icon: Settings,
      roles: ['OWNER'],
    },
  ];

  const allowedNavItems = navItems.filter((item) =>
    user ? item.roles.includes(user.role) : false
  );

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 shadow-sm ${isOpenMobile ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        {/* Gym Brand Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Morya Fitness Logo"
              className="w-11 h-11 rounded-full object-cover border-2 border-orange-500 shadow-md shadow-orange-500/20 flex-shrink-0"
            />
            <div>
              <h1 className="font-heading font-black text-slate-900 text-base tracking-tight leading-tight">
                {gym?.name || 'Morya Fitness'}
              </h1>
              <span className="text-[10px] font-semibold tracking-wider text-orange-600 uppercase block">
                Sinnar • Est. 2024
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Main Navigation
          </div>

          {allowedNavItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              currentPage === item.id ||
              (item.id === 'members' && currentPage === 'member-details');

            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group ${isActive
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-orange-600'
                      }`}
                  />
                  <span>{item.label}</span>
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-white" />}
              </button>
            );
          })}
        </div>

        {/* Quick Enroll Button */}
        <div className="px-4 py-2">
          <button
            onClick={() => {
              onNavigate('add-member');
              onCloseMobile();
            }}
            className="w-full py-2.5 px-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span> Enroll Member</span>
          </button>
        </div>

        {/* Current Staff User Card & Logout */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/70">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-700 font-black text-xs flex items-center justify-center border border-orange-200">
                {user?.full_name?.charAt(0) || user?.first_name?.charAt(0) || user?.username?.charAt(0) || 'U'}
              </div>
              <div className="truncate">
                <span className="text-xs font-bold text-slate-800 block truncate">
                  {user?.full_name || (user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.username)}
                </span>
                <span className="text-[10px] text-orange-700 font-semibold">
                  👑 Gym Owner / Admin
                </span>
              </div>
            </div>

            <button
              onClick={logout}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
