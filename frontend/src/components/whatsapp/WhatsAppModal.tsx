import React, { useState, useEffect } from 'react';
import {
  MessageSquare, Send, Copy, Check, ExternalLink,
  Gift, AlertTriangle, Sparkles, Clock, CreditCard
} from 'lucide-react';
import { MemberWhatsAppTemplates } from '../../types';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  templatesData: MemberWhatsAppTemplates | any | null;
}

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({
  isOpen,
  onClose,
  templatesData,
}) => {
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>('welcome');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const templateIcons: Record<string, any> = {
    welcome: Sparkles,
    expiry_7days: Clock,
    expiry_3days: AlertTriangle,
    expired: AlertTriangle,
    pending_payment: CreditCard,
    pending_dues: CreditCard,
    birthday: Gift,
  };

  const templateTitles: Record<string, string> = {
    welcome: 'Welcome Onboarding',
    expiry_7days: '7-Day Expiry Notice',
    expiry_3days: '3-Day Urgent Renewal',
    expired: 'Membership Expired',
    pending_payment: 'Pending Dues Reminder',
    pending_dues: 'Pending Dues Reminder',
    birthday: 'Birthday Wishes & Offer',
  };

  useEffect(() => {
    if (templatesData?.templates) {
      const keys = Object.keys(templatesData.templates);
      if (keys.length > 0 && !templatesData.templates[selectedTemplateKey]) {
        setSelectedTemplateKey(keys[0]);
      }
    }
  }, [templatesData]);

  if (!isOpen || !templatesData || !templatesData.templates) return null;

  const memberName =
    templatesData.name ||
    templatesData.member_name ||
    templatesData.full_name ||
    templatesData.member?.name ||
    'Member';

  const memberPhone =
    templatesData.phone ||
    templatesData.member_phone ||
    templatesData.member?.phone ||
    '';

  const currentTemplate =
    templatesData.templates[selectedTemplateKey] ||
    Object.values(templatesData.templates)[0] || { text: '', link: '' };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-heading font-black text-slate-900 text-base">
                WhatsApp Member Messenger
              </h3>
              <p className="text-[11px] text-slate-500">
                To: <span className="font-bold text-slate-800">{memberName}</span>
                {memberPhone && ` (+91 ${memberPhone})`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* Body Layout: Sidebar Templates list + Message preview */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Templates Selector List */}
          <div className="space-y-1.5 border-b md:border-b-0 md:border-r border-slate-100 pb-4 md:pb-0 md:pr-4">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
              Select Message Template
            </span>

            {Object.entries(templatesData.templates).map(([key, tpl]: [string, any]) => {
              const Icon = templateIcons[key] || MessageSquare;
              const isSelected = selectedTemplateKey === key;
              const title = templateTitles[key] || tpl.title || key.replace(/_/g, ' ');

              return (
                <button
                  key={key}
                  onClick={() => setSelectedTemplateKey(key)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-xs transition-all ${
                    isSelected
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 border border-transparent font-medium'
                  }`}
                >
                  <Icon
                    className={`w-3.5 h-3.5 flex-shrink-0 ${
                      isSelected ? 'text-emerald-600' : 'text-slate-400'
                    }`}
                  />
                  <span className="truncate capitalize">{title}</span>
                </button>
              );
            })}
          </div>

          {/* Message Preview & Quick Send */}
          <div className="md:col-span-2 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-slate-700">Message Preview</span>
                <span className="text-[10px] text-slate-400 font-medium">Auto-personalized</span>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/40 border border-emerald-200/80 text-xs text-slate-800 font-sans whitespace-pre-wrap leading-relaxed min-h-[150px] select-all shadow-inner">
                {currentTemplate?.text}
              </div>
            </div>

            <div className="flex gap-2.5">
              <a
                href={currentTemplate?.link}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>Open in WhatsApp</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
              </a>

              <button
                onClick={() => handleCopy(currentTemplate?.text || '', selectedTemplateKey)}
                className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition-all flex items-center gap-1.5"
                title="Copy Text to Clipboard"
              >
                {copiedKey === selectedTemplateKey ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-700 font-bold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-500" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
