import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
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

import { Modal } from './components/common/Modal';
import { PaymentReceipt } from './components/receipts/PaymentReceipt';
import { WhatsAppModal } from './components/whatsapp/WhatsAppModal';
import { ReceiptData, MemberWhatsAppTemplates } from './types';
import { api } from './services/api';

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentPage, setCurrentPage] = useState<string>('dashboard');
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);

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
          className="w-16 h-16 rounded-full object-cover border-2 border-orange-500 shadow-lg animate-pulse"
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

  const handleNavigate = (page: string) => {
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
      alert('Could not generate WhatsApp templates');
    }
  };

  const handleQuickAction = (action: 'add-member' | 'renew' | 'payment', memberId?: number) => {
    if (action === 'add-member') {
      setCurrentPage('add-member');
    } else if (action === 'renew') {
      if (memberId) setSelectedMemberId(memberId);
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
          onSelectMember={handleSelectMember}
          onAddMember={() => handleNavigate('add-member')}
          onRenewMember={(id) => {
            setSelectedMemberId(id);
            handleNavigate('renew');
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
            setSelectedMemberId(id);
            handleNavigate('renew');
          }}
          onTakePayment={(id) => {
            setSelectedMemberId(id);
            handleNavigate('payments');
          }}
          onOpenWhatsApp={handleOpenWhatsApp}
          onViewReceipt={(receipt) => setActiveReceipt(receipt)}
        />
      )}

      {currentPage === 'add-member' && (
        <AddMember
          onBack={() => handleNavigate('members')}
          onSuccess={(member, receipt) => {
            if (receipt) setActiveReceipt(receipt);
            handleSelectMember(member.id);
          }}
        />
      )}

      {currentPage === 'renew' && (
        <RenewMembership
          memberId={selectedMemberId || undefined}
          onBack={() => handleNavigate('members')}
          onSuccess={(member, receipt) => {
            if (receipt) setActiveReceipt(receipt);
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
      <AppContent />
    </AuthProvider>
  );
}

export default App;
