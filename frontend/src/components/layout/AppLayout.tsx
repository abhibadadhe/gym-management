import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { LayoutDashboard, Users, Award, CreditCard, UserPlus } from 'lucide-react';

interface AppLayoutProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  onQuickAction: (action: 'add-member' | 'renew' | 'payment', memberId?: number) => void;
  children: React.ReactNode;
  notificationsData?: {
    expiring?: any[];
    birthdays?: any[];
  };
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  currentPage,
  onNavigate,
  onQuickAction,
  children,
  notificationsData,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Sidebar */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={onNavigate}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="lg:pl-64 flex flex-col flex-1">
        {/* Top Navbar */}
        <Navbar
          onToggleMobile={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          onQuickAction={onQuickAction}
          notificationsData={notificationsData}
        />

        {/* Page Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-20 lg:pb-8">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Quick Navigation Bar (lg:hidden) */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-2 flex items-center justify-around lg:hidden shadow-lg">
        <button
          onClick={() => onNavigate('dashboard')}
          className={`flex flex-col items-center gap-1 text-[10px] font-semibold ${
            currentPage === 'dashboard' ? 'text-orange-600 font-bold' : 'text-slate-500'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Home</span>
        </button>

        <button
          onClick={() => onNavigate('members')}
          className={`flex flex-col items-center gap-1 text-[10px] font-semibold ${
            currentPage === 'members' || currentPage === 'member-details' ? 'text-orange-600 font-bold' : 'text-slate-500'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Members</span>
        </button>

        <button
          onClick={() => onQuickAction('add-member')}
          className="flex flex-col items-center gap-1 text-[10px] font-bold text-orange-600 -mt-4"
        >
          <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/30">
            <UserPlus className="w-5 h-5" />
          </div>
          <span>Enroll</span>
        </button>

        <button
          onClick={() => onNavigate('payments')}
          className={`flex flex-col items-center gap-1 text-[10px] font-semibold ${
            currentPage === 'payments' ? 'text-orange-600 font-bold' : 'text-slate-500'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Payments</span>
        </button>

        <button
          onClick={() => onNavigate('plans')}
          className={`flex flex-col items-center gap-1 text-[10px] font-semibold ${
            currentPage === 'plans' ? 'text-orange-600 font-bold' : 'text-slate-500'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Plans</span>
        </button>
      </nav>
    </div>
  );
};
