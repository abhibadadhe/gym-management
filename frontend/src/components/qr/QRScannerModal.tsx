import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import {
  QrCode, Search, CheckCircle2, AlertTriangle, XCircle,
  RefreshCw, User, Phone, Calendar, ArrowRight
} from 'lucide-react';
import { api } from '../../services/api';
import confetti from 'canvas-confetti';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRenewMember?: (memberId: number) => void;
  onSuccess?: () => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  onRenewMember,
  onSuccess,
}) => {
  const [activeMode, setActiveMode] = useState<'camera' | 'manual'>('camera');
  const [manualInput, setManualInput] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [checkInResult, setCheckInResult] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (isOpen && activeMode === 'camera') {
      const timer = setTimeout(() => {
        try {
          const scanner = new Html5QrcodeScanner(
            'qr-reader-container',
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
              aspectRatio: 1.0,
            },
            /* verbose= */ false
          );
          scannerRef.current = scanner;
          scanner.render(onScanSuccess, onScanFailure);
        } catch (e) {
          console.error('Camera QR scanner init error:', e);
        }
      }, 300);

      return () => {
        clearTimeout(timer);
        if (scannerRef.current) {
          scannerRef.current.clear().catch(console.error);
        }
      };
    }
  }, [isOpen, activeMode]);

  const onScanSuccess = (decodedText: string) => {
    if (!isProcessing) {
      handleCheckIn(decodedText, 'QR_SCAN');
    }
  };

  const onScanFailure = () => {};

  const handleCheckIn = async (identifier: string, method: 'QR_SCAN' | 'MEMBER_ID' | 'MOBILE_NUMBER') => {
    setIsProcessing(true);
    setErrorMsg(null);
    setCheckInResult(null);

    try {
      const res = await api.checkIn(identifier.trim(), method);
      setCheckInResult(res);

      if (res.status === 'ACTIVE') {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.6 },
        });
        if (onSuccess) onSuccess();
      }
    } catch (err: any) {
      const errData = err.response?.data;
      if (errData?.status === 'EXPIRED') {
        setCheckInResult({
          status: 'EXPIRED',
          message: errData.message || 'Membership Expired!',
          member: errData.member,
        });
      } else {
        setErrorMsg(errData?.message || 'Member not found or check-in failed.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    const isPhone = /^\d{10}$/.test(manualInput.trim());
    handleCheckIn(
      manualInput.trim(),
      isPhone ? 'MOBILE_NUMBER' : 'MEMBER_ID'
    );
  };

  const resetScanner = () => {
    setCheckInResult(null);
    setErrorMsg(null);
    setManualInput('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden">
        {/* Modal Top Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center font-bold">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-heading font-black text-slate-900 text-base">
                Attendance Check-In
              </h3>
              <p className="text-[11px] text-slate-500">Morya Fitness Entry Verification</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="flex border-b border-slate-100 bg-slate-50 text-xs font-bold">
          <button
            onClick={() => {
              setActiveMode('camera');
              resetScanner();
            }}
            className={`flex-1 py-2.5 flex items-center justify-center gap-2 transition-colors ${
              activeMode === 'camera'
                ? 'text-orange-600 border-b-2 border-orange-500 bg-white'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Camera QR Scanner</span>
          </button>

          <button
            onClick={() => {
              setActiveMode('manual');
              resetScanner();
            }}
            className={`flex-1 py-2.5 flex items-center justify-center gap-2 transition-colors ${
              activeMode === 'manual'
                ? 'text-orange-600 border-b-2 border-orange-500 bg-white'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Manual ID / Phone Lookup</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 space-y-4">
          {/* Result Banner (If Scanned) */}
          {checkInResult && (
            <div
              className={`p-4 rounded-2xl border text-xs space-y-3 transition-all ${
                checkInResult.status === 'ACTIVE'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              <div className="flex items-start gap-3">
                {checkInResult.status === 'ACTIVE' ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-rose-600 flex-shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <h4 className="font-black text-sm font-heading">
                    {checkInResult.status === 'ACTIVE'
                      ? '✓ ACCESS GRANTED — CHECK-IN RECORDED'
                      : '⚠ ACCESS DENIED — MEMBERSHIP EXPIRED'}
                  </h4>
                  <p className="mt-0.5 text-xs">
                    Member: <span className="font-bold">{checkInResult.member?.name}</span> (
                    {checkInResult.member?.member_id})
                  </p>
                  <p className="text-[11px] opacity-80 mt-0.5">
                    Plan: {checkInResult.member?.plan} •{' '}
                    {checkInResult.status === 'ACTIVE'
                      ? `Valid until ${checkInResult.member?.expiry_date}`
                      : `Expired on ${checkInResult.member?.expiry_date}`}
                  </p>
                </div>
              </div>

              {/* Action Buttons inside Result */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200/50">
                {checkInResult.status === 'EXPIRED' && onRenewMember && (
                  <button
                    onClick={() => {
                      onClose();
                      onRenewMember(checkInResult.member.id);
                    }}
                    className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md"
                  >
                    <span>Renew Membership Now</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  onClick={resetScanner}
                  className="px-3 py-1.5 bg-white text-slate-700 hover:bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold ml-auto"
                >
                  Scan Next Member
                </button>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <XCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Camera Scanner Container */}
          {activeMode === 'camera' && !checkInResult && (
            <div className="space-y-3">
              <div
                id="qr-reader-container"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden min-h-[260px]"
              />
              <p className="text-center text-[11px] text-slate-500">
                Point member's digital or printed QR pass at the camera
              </p>
            </div>
          )}

          {/* Manual Input Container */}
          {activeMode === 'manual' && !checkInResult && (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Enter Member ID or 10-Digit Mobile Number
                </label>
                <input
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder="e.g. MF20260001 or 9823012345"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-2xl text-slate-900 placeholder-slate-400 font-mono text-sm focus:outline-none focus:border-orange-500 focus:bg-white"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={isProcessing || !manualInput.trim()}
                className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs rounded-2xl shadow-md shadow-orange-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isProcessing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>Check-In Member</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
