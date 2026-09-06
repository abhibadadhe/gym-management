import React, { useState, useEffect } from 'react';
import {
  MessageSquare, Send, Copy, Check, ExternalLink,
  Gift, AlertTriangle, Sparkles, Clock, CreditCard,
  Edit3, Eye, RotateCcw, Type, Info
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
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [customMessages, setCustomMessages] = useState<Record<string, string>>({});

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

  const originalTemplate =
    templatesData.templates[selectedTemplateKey] ||
    Object.values(templatesData.templates)[0] || { text: '', link: '' };

  const originalText = originalTemplate?.text || '';
  const currentText = customMessages[selectedTemplateKey] !== undefined
    ? customMessages[selectedTemplateKey]
    : originalText;

  const isCustomized = currentText !== originalText;

  const handleTextChange = (val: string) => {
    setCustomMessages((prev) => ({
      ...prev,
      [selectedTemplateKey]: val,
    }));
  };

  const handleReset = () => {
    setCustomMessages((prev) => {
      const copy = { ...prev };
      delete copy[selectedTemplateKey];
      return copy;
    });
  };

  const handleInsertFormat = (tag: string) => {
    handleTextChange(currentText ? `${currentText} ${tag}` : tag);
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleOpenWhatsApp = () => {
    const cleanPhone = (memberPhone || '').replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const encodedText = encodeURIComponent(currentText);
    const whatsappUrl = isMobile
      ? `https://api.whatsapp.com/send?phone=${phoneWithCountry}&text=${encodedText}`
      : `https://web.whatsapp.com/send?phone=${phoneWithCountry}&text=${encodedText}`;

    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shadow-sm">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-black text-slate-900 text-base flex items-center gap-2">
                WhatsApp Member Messenger
              </h3>
              <p className="text-[11px] text-slate-500">
                To: <span className="font-bold text-slate-800">{memberName}</span>
                {memberPhone ? (
                  <span className="text-emerald-700 font-semibold ml-1">(+91 {memberPhone})</span>
                ) : (
                  <span className="text-rose-500 font-semibold ml-1">(No phone registered)</span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200 flex items-center justify-center transition-colors text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* Body Layout: Sidebar Templates list + Message preview / editor */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-5 overflow-y-auto">
          {/* Templates Selector List */}
          <div className="space-y-1.5 border-b md:border-b-0 md:border-r border-slate-100 pb-4 md:pb-0 md:pr-4">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
              Select Message Template
            </span>

            {Object.entries(templatesData.templates).map(([key, tpl]: [string, any]) => {
              const Icon = templateIcons[key] || MessageSquare;
              const isSelected = selectedTemplateKey === key;
              const title = templateTitles[key] || tpl.title || key.replace(/_/g, ' ');
              const hasCustom = customMessages[key] !== undefined && customMessages[key] !== tpl.text;

              return (
                <button
                  key={key}
                  onClick={() => setSelectedTemplateKey(key)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs transition-all ${
                    isSelected
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 border border-transparent font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon
                      className={`w-3.5 h-3.5 flex-shrink-0 ${
                        isSelected ? 'text-emerald-600' : 'text-slate-400'
                      }`}
                    />
                    <span className="truncate capitalize">{title}</span>
                  </div>
                  {hasCustom && (
                    <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" title="Custom edited" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Message Preview & Editor */}
          <div className="md:col-span-2 space-y-3 flex flex-col justify-between">
            <div>
              {/* Header Bar with Mode Toggle & Reset */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800">
                    {isEditMode ? 'Edit WhatsApp Message' : 'Message Preview'}
                  </span>
                  {isCustomized ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                      Edited
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                      Template
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {isCustomized && (
                    <button
                      onClick={handleReset}
                      className="px-2 py-1 text-[11px] font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all flex items-center gap-1 border border-slate-200"
                      title="Reset back to standard template text"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset</span>
                    </button>
                  )}

                  {/* Toggle Edit / Preview Mode */}
                  <button
                    onClick={() => setIsEditMode(!isEditMode)}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1.5 border ${
                      isEditMode
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                    }`}
                  >
                    {isEditMode ? (
                      <>
                        <Eye className="w-3 h-3" />
                        <span>Preview Mode</span>
                      </>
                    ) : (
                      <>
                        <Edit3 className="w-3 h-3 text-emerald-600" />
                        <span>Edit Message</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Message Content Area: Either Textarea or Preview Card */}
              {isEditMode ? (
                <div className="space-y-2">
                  <div className="relative">
                    <textarea
                      value={currentText}
                      onChange={(e) => handleTextChange(e.target.value)}
                      rows={8}
                      className="w-full p-3.5 rounded-2xl bg-white border-2 border-emerald-400/80 focus:border-emerald-600 text-xs text-slate-900 font-sans leading-relaxed focus:outline-none focus:ring-4 focus:ring-emerald-500/10 shadow-inner resize-y min-h-[160px]"
                      placeholder="Type or customize your WhatsApp message..."
                      autoFocus
                    />
                  </div>

                  {/* Formatting Chips & Counter */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 px-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Quick Format:</span>
                      <button
                        type="button"
                        onClick={() => handleInsertFormat('*bold*')}
                        className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-[10px] font-bold text-slate-700"
                        title="Add bold text"
                      >
                        *Bold*
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInsertFormat('_italic_')}
                        className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-[10px] italic text-slate-700"
                        title="Add italic text"
                      >
                        _Italic_
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInsertFormat('~strike~')}
                        className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-[10px] line-through text-slate-700"
                        title="Add strikethrough text"
                      >
                        ~Strike~
                      </button>
                    </div>

                    <span className="font-mono text-[10px] text-slate-400">
                      {currentText.length} chars • {currentText.split('\n').filter(Boolean).length} lines
                    </span>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => setIsEditMode(true)}
                  className="group relative p-4 rounded-2xl bg-emerald-50/40 hover:bg-emerald-50/60 border border-emerald-200/80 hover:border-emerald-400 text-xs text-slate-800 font-sans whitespace-pre-wrap leading-relaxed min-h-[160px] cursor-pointer shadow-inner transition-all"
                  title="Click to edit this message"
                >
                  {currentText}

                  <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg border border-emerald-200 text-[10px] font-bold text-emerald-700 flex items-center gap-1 shadow-sm">
                    <Edit3 className="w-3 h-3" />
                    <span>Click to Edit</span>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2.5 pt-2">
              <button
                onClick={handleOpenWhatsApp}
                className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>Open in WhatsApp</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
              </button>

              <button
                onClick={() => handleCopy(currentText, selectedTemplateKey)}
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
