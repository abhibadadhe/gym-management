import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { Login } from './pages/Login';
import { AppLayout } from './components/layout/AppLayout';
import { Dashboard } from './pages/Dashboard';
import { Members } from './pages/Members';
import { MemberDetails } from './pages/MemberDetails';
import { AddMember } from './pages/AddMember';
import { RenewMembership } from './pages/RenewMembership';
import { MembershipPlans } from './pages/MembershipPlans';
import { Payments } from './pages/Payments';
import { Expenses } from './pages/Expenses';
import { Financials } from './pages/Financials';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { Supplements } from './pages/Supplements';

import { Modal } from './components/common/Modal';
import { PaymentReceipt } from './components/receipts/PaymentReceipt';
import { WhatsAppModal } from './components/whatsapp/WhatsAppModal';
import { ReceiptData, MemberWhatsAppTemplates } from './types';
import { api } from './services/api';

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const { showToast } = useToast();
  const [currentPage, setCurrentPage] = useState<string>('dashboard');
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
  const [renewMemberId, setRenewMemberId] = useState<number | null>(null);
  const [membersTab, setMembersTab] = useState<string>('ALL');

  // Global Modals State
  const [activeReceipt, setActiveReceipt] = useState<ReceiptData | null>(null);
  const [whatsAppTemplates, setWhatsAppTemplates] = useState<MemberWhatsAppTemplates | null>(null);
  const [notificationsData, setNotificationsData] = useState<{ expiring?: any[]; birthdays?: any[] }>({});

  useEffect(() => {
    if (isAuthenticated) {
      // Fetch initial alerts
      api.getDashboardStats().then((res) => {
        setNotificationsData({
          expiring: res.expiring_members,
          birthdays: res.today_birthdays,
        });
      }).catch(console.error);
    }
  }, [isAuthenticated, currentPage]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-500 gap-3">
        <img
          src="/logo.png"
          alt="Morya Fitness"
          className="w-16 h-16 rounded-full object-cover border-2 border-orange-500 shadow-lg animate-pulse bg-black"
        />
        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
          Starting Morya Fitness System...
        </span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  const handleNavigate = (page: string, tab?: string) => {
    if (page === 'renew') {
      setRenewMemberId(null);
    }
    if (page === 'members') {
      setMembersTab(tab || 'ALL');
    }
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectMember = (memberId: number) => {
    setSelectedMemberId(memberId);
    setCurrentPage('member-details');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenWhatsApp = async (memberId: number) => {
    try {
      const res = await api.getWhatsAppTemplates(memberId);
      setWhatsAppTemplates(res);
    } catch (e) {
      showToast('Could not generate WhatsApp templates.', 'error');
    }
  };

  const handleQuickAction = (action: 'add-member' | 'renew' | 'payment', memberId?: number) => {
    if (action === 'add-member') {
      setCurrentPage('add-member');
    } else if (action === 'renew') {
      setRenewMemberId(memberId || null);
      setCurrentPage('renew');
    } else if (action === 'payment') {
      setCurrentPage('payments');
    }
  };

  return (
    <AppLayout
      currentPage={currentPage}
      onNavigate={handleNavigate}
      onQuickAction={handleQuickAction}
      notificationsData={notificationsData}
    >
      {/* Route Views */}
      {currentPage === 'dashboard' && (
        <Dashboard
          onNavigate={handleNavigate}
          onQuickAction={handleQuickAction}
          onOpenWhatsApp={handleOpenWhatsApp}
        />
      )}

      {currentPage === 'members' && (
        <Members
          initialTab={membersTab}
          onSelectMember={handleSelectMember}
          onAddMember={() => handleNavigate('add-member')}
          onRenewMember={(id) => {
            setRenewMemberId(id);
            setCurrentPage('renew');
          }}
          onTakePayment={(id) => {
            setSelectedMemberId(id);
            handleNavigate('payments');
          }}
          onOpenWhatsApp={handleOpenWhatsApp}
        />
      )}

      {currentPage === 'member-details' && selectedMemberId && (
        <MemberDetails
          memberId={selectedMemberId}
          onBack={() => handleNavigate('members')}
          onRenew={(id) => {
            setRenewMemberId(id);
            setCurrentPage('renew');
          }}
          onTakePayment={(id) => {
            setSelectedMemberId(id);
            handleNavigate('payments');
          }}
          onOpenWhatsApp={handleOpenWhatsApp}
          onViewReceipt={(receipt) => setActiveReceipt(receipt)}
          onDeleteSuccess={(name, code) => {
            showToast(`Member "${name}" (${code}) was successfully deleted.`, 'success');
            handleNavigate('members');
          }}
        />
      )}

      {currentPage === 'add-member' && (
        <AddMember
          onBack={() => handleNavigate('members')}
          onSuccess={(member, receipt) => {
            showToast(`Member "${member.full_name}" (${member.member_id}) was successfully added!`, 'success');
            if (receipt) setActiveReceipt(receipt);
            handleSelectMember(member.id);
          }}
        />
      )}

      {currentPage === 'renew' && (
        <RenewMembership
          key={renewMemberId ? `renew-${renewMemberId}` : 'renew-blank'}
          memberId={renewMemberId || undefined}
          onBack={() => handleNavigate('members')}
          onSuccess={(member, receipt) => {
            showToast(`Membership for "${member.full_name}" renewed successfully!`, 'success');
            if (receipt) setActiveReceipt(receipt);
            setRenewMemberId(null);
            handleSelectMember(member.id);
          }}
        />
      )}

      {currentPage === 'plans' && <MembershipPlans />}

      {currentPage === 'payments' && (
        <Payments
          onViewReceipt={(receipt) => setActiveReceipt(receipt)}
          onOpenQuickPayment={(memberId) => {
            if (memberId) setSelectedMemberId(memberId);
          }}
        />
      )}

      {currentPage === 'supplements' && <Supplements />}

      {currentPage === 'expenses' && <Expenses />}

      {currentPage === 'financials' && <Financials />}

      {currentPage === 'reports' && <Reports />}

      {currentPage === 'settings' && <Settings />}

      {/* Global Receipt Modal */}
      {activeReceipt && (
        <Modal
          isOpen={!!activeReceipt}
          onClose={() => setActiveReceipt(null)}
          title="Payment & Tax Receipt"
          subtitle={`Receipt #${activeReceipt.receipt_number}`}
          maxWidth="3xl"
        >
          <PaymentReceipt
            receipt={activeReceipt}
            onClose={() => setActiveReceipt(null)}
          />
        </Modal>
      )}

      {/* Global WhatsApp Message Modal */}
      <WhatsAppModal
        isOpen={!!whatsAppTemplates}
        onClose={() => setWhatsAppTemplates(null)}
        templatesData={whatsAppTemplates}
      />

    </AppLayout>
  );
};

export function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
