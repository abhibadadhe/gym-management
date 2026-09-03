import React, { useState } from 'react';
import {
  Lock, User, ArrowRight, AlertCircle, Sparkles,
  Mail, KeyRound, CheckCircle2, Eye, EyeOff, RefreshCw, X, ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export const Login: React.FC = () => {
  const { login, gym } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Recovery Modal State ('none' | 'password' | 'username')
  const [modalType, setModalType] = useState<'none' | 'password' | 'username'>('none');

  // Forgot Password State
  const [resetStep, setResetStep] = useState<'request' | 'verify'>('request');
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState('');
  const [isResetLoading, setIsResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetDevNote, setResetDevNote] = useState<string | null>(null);

  // Forgot Username State
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [isUsernameLoading, setIsUsernameLoading] = useState(false);
  const [usernameMessage, setUsernameMessage] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please enter both username and password');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await login(username.trim(), password);
    } catch (err: any) {
      const serverMsg = err.response?.data?.detail;
      if (serverMsg === 'No active account found with the given credentials' || err.response?.status === 401) {
        setError('Invalid username or password. Please check your credentials or click "Forgot Password?" below to reset it.');
      } else {
        setError(serverMsg || 'Unable to sign in. Please check your credentials and try again.');
      }
    } finally {
      setIsLoading(false);
    }

  };

  // 1. Request Reset OTP via Gmail
  const handleRequestResetOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetIdentifier.trim()) {
      setResetError('Please enter your registered Gmail or username.');
      return;
    }

    setIsResetLoading(true);
    setResetError(null);
    setResetDevNote(null);

    try {
      const res = await api.forgotPassword(resetIdentifier.trim());
      setMaskedEmail(res.email_masked || res.username || resetIdentifier);
      if (res.username) {
        setUsername(res.username);
      }
      if (res.dev_note) {
        setResetDevNote(res.dev_note);
      }
      setResetStep('verify');
    } catch (err: any) {
      setResetError(err.response?.data?.detail || 'No account found matching this identifier.');
    } finally {
      setIsResetLoading(false);
    }
  };

  // 2. Verify OTP & Set New Password
  const handleVerifyAndResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetOtp.trim() || !newPassword || !confirmPassword) {
      setResetError('Please fill in all fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setResetError('New passwords do not match.');
      return;
    }

    if (newPassword.length < 4) {
      setResetError('Password must be at least 4 characters.');
      return;
    }

    setIsResetLoading(true);
    setResetError(null);

    try {
      const res = await api.resetPassword({
        identifier: resetIdentifier.trim(),
        otp: resetOtp.trim(),
        new_password: newPassword,
      });

      setModalType('none');
      setSuccessNotice(res.detail || 'Password reset successfully! Please sign in with your new password.');
      setPassword('');
      setTimeout(() => setSuccessNotice(null), 6000);
    } catch (err: any) {
      setResetError(err.response?.data?.detail || 'Invalid or expired OTP code.');
    } finally {
      setIsResetLoading(false);
    }
  };

  // 3. Request Username via Gmail
  const handleRecoverUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryEmail.trim()) {
      setUsernameError('Please enter your registered Gmail address.');
      return;
    }

    setIsUsernameLoading(true);
    setUsernameError(null);
    setUsernameMessage(null);

    try {
      const res = await api.forgotUsername(recoveryEmail.trim());
      setUsernameMessage(res.detail || 'Your registered username has been sent to your Gmail inbox.');
    } catch (err: any) {
      setUsernameError(err.response?.data?.detail || 'No account registered with this email address.');
    } finally {
      setIsUsernameLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* Real Gym Photo Background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105 transition-transform duration-1000 ease-out"
        style={{ backgroundImage: `url('/gym-bg.jpg')` }}
      />

      {/* Atmospheric Dark & Ambient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/90 via-slate-900/75 to-orange-950/60 backdrop-blur-[4px]" />

      {/* Subtle Glowing Accents */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Floating Glassmorphic Login Card */}
      <div className="relative w-full max-w-md bg-white/95 backdrop-blur-xl rounded-3xl border border-white/50 shadow-2xl overflow-hidden p-8 sm:p-10 space-y-6 animate-in fade-in zoom-in-95 duration-300">
        {/* Brand Header with Circular Logo */}
        <div className="text-center space-y-3">
          <div className="relative inline-block">
            <div className="absolute -inset-1.5 bg-gradient-to-tr from-orange-500 to-amber-500 rounded-full blur-sm opacity-50" />
            <img
              src="/logo.png"
              alt="Morya Fitness Logo"
              className="relative w-24 h-24 rounded-full object-cover border-2 border-white shadow-xl mx-auto"
            />
          </div>

          <div>
            <h2 className="text-2xl font-black text-slate-900 font-heading tracking-tight">
              {gym?.name || 'Morya Fitness'}
            </h2>
            <p className="text-xs text-orange-600 font-bold uppercase tracking-wider mt-0.5">
              {gym?.tagline || 'Gym Management System • Sinnar'}
            </p>
          </div>
        </div>

        {/* Global Success Notification */}
        {successNotice && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
            <span className="font-semibold">{successNotice}</span>
          </div>
        )}

        {/* Global Error Notification */}
        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5 animate-shake">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-bold mb-1.5">Username</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10 transition-all font-medium"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1.5">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10 transition-all font-medium"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Forgot Username & Password Options */}
          <div className="flex items-center justify-between text-[11px] pt-0.5 px-0.5">
            <button
              type="button"
              onClick={() => {
                setModalType('username');
                setRecoveryEmail('');
                setUsernameMessage(null);
                setUsernameError(null);
              }}
              className="text-slate-500 hover:text-orange-600 font-semibold transition-colors flex items-center gap-1"
            >
              <span>Forgot Username?</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setModalType('password');
                setResetStep('request');
                setResetIdentifier(username || '');
                setResetOtp('');
                setNewPassword('');
                setConfirmPassword('');
                setResetError(null);
                setResetDevNote(null);
              }}
              className="text-orange-600 hover:text-orange-700 font-bold transition-colors"
            >
              Forgot Password?
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-sm rounded-2xl shadow-lg shadow-orange-500/25 hover:shadow-orange-500/35 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
          >
            {isLoading ? (
              <span>Signing In...</span>
            ) : (
              <>
                <span>Sign In to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="text-center pt-2">
          <p className="text-[11px] text-slate-400 font-medium">
            Morya Fitness, Sinnar • Managed by Gokul Gugale
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. FORGOT PASSWORD MODAL (Gmail OTP Verification & Password Reset)       */}
      {/* ========================================================================= */}
      {modalType === 'password' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-5 animate-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button
              onClick={() => setModalType('none')}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="space-y-1.5">
              <div className="w-11 h-11 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center shadow-xs">
                <KeyRound className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-black text-slate-900 font-heading">
                {resetStep === 'request' ? 'Reset Your Password' : 'Enter 6-Digit OTP Code'}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {resetStep === 'request'
                  ? 'Enter your registered Gmail address or username. We will send a secure verification code directly to your inbox.'
                  : `We sent a 6-digit OTP code to your Gmail (${maskedEmail}). Enter the code and set your new password.`}
              </p>
            </div>

            {/* Error Message */}
            {resetError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{resetError}</span>
              </div>
            )}

            {/* Dev Note Helper (Shown if SMTP is unconfigured) */}
            {resetDevNote && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                <Sparkles className="w-4 h-4 flex-shrink-0 text-amber-600" />
                <span className="font-mono text-[11px] font-bold">{resetDevNote}</span>
              </div>
            )}

            {/* STEP 1: Request OTP Code */}
            {resetStep === 'request' && (
              <form onSubmit={handleRequestResetOtp} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-700 font-bold mb-1.5">Registered Gmail</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={resetIdentifier}
                      onChange={(e) => setResetIdentifier(e.target.value)}
                      placeholder="e.g. xyz@gmail.com"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white font-medium"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setModalType('none')}
                    className="px-4 py-2.5 text-slate-600 hover:text-slate-800 font-bold rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isResetLoading}
                    className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl shadow-md shadow-orange-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {isResetLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Mail className="w-4 h-4" />
                    )}
                    <span>{isResetLoading ? 'Sending Code...' : 'Send OTP to Gmail'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: Verify OTP & Choose New Password */}
            {resetStep === 'verify' && (
              <form onSubmit={handleVerifyAndResetPassword} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">6-Digit Verification Code</label>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={6}
                      value={resetOtp}
                      onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="• • • • • •"
                      className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono text-center text-lg tracking-widest font-black placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">New Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 4 characters"
                      className="w-full pl-9 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white font-medium"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Confirm New Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-type new password"
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white font-medium"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setResetStep('request')}
                    className="text-slate-500 hover:text-orange-600 font-semibold underline"
                  >
                    Resend Code
                  </button>

                  <button
                    type="submit"
                    disabled={isResetLoading}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {isResetLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <ShieldCheck className="w-4 h-4" />
                    )}
                    <span>{isResetLoading ? 'Updating Password...' : 'Verify & Reset Password'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. FORGOT USERNAME MODAL (Sends Registered Username to Gmail)             */}
      {/* ========================================================================= */}
      {modalType === 'username' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-5 animate-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button
              onClick={() => setModalType('none')}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="space-y-1.5">
              <div className="w-11 h-11 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-xs">
                <User className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-black text-slate-900 font-heading">
                Recover Your Username
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Enter your registered Gmail address. We will look up your account and send your registered username to your inbox.
              </p>
            </div>

            {/* Success Message */}
            {usernameMessage && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                <span className="font-semibold">{usernameMessage}</span>
              </div>
            )}

            {/* Error Message */}
            {usernameError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{usernameError}</span>
              </div>
            )}

            <form onSubmit={handleRecoverUsername} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1.5">Registered Gmail Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    placeholder="e.g. xyz@gmail.com"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white font-medium"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setModalType('none')}
                  className="px-4 py-2.5 text-slate-600 hover:text-slate-800 font-bold rounded-xl transition-colors"
                >
                  {usernameMessage ? 'Back to Login' : 'Cancel'}
                </button>
                {!usernameMessage && (
                  <button
                    type="submit"
                    disabled={isUsernameLoading}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md shadow-blue-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {isUsernameLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Mail className="w-4 h-4" />
                    )}
                    <span>{isUsernameLoading ? 'Sending Username...' : 'Send Username to Gmail'}</span>
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

