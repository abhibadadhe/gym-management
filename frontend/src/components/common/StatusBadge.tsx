import React from 'react';
import { MembershipStatus, PaymentStatus } from '../../types';

interface StatusBadgeProps {
  status: MembershipStatus | PaymentStatus | string;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md', showDot = true }) => {
  const getBadgeStyle = () => {
    switch (status) {
      case 'ACTIVE':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dot: 'bg-emerald-500 shadow-[0_0_6px_#10b981]',
          label: 'Active',
        };
      case 'EXPIRING_SOON':
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          dot: 'bg-amber-500 shadow-[0_0_6px_#f59e0b]',
          label: 'Expiring Soon',
        };
      case 'EXPIRED':
        return {
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
          dot: 'bg-rose-500 shadow-[0_0_6px_#f43f5e]',
          label: 'Expired',
        };
      case 'NO_MEMBERSHIP':
        return {
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          dot: 'bg-slate-400',
          label: 'No Plan',
        };
      case 'PAID':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dot: 'bg-emerald-500',
          label: 'Fully Paid',
        };
      case 'PARTIAL':
        return {
          bg: 'bg-orange-50 text-orange-800 border-orange-200',
          dot: 'bg-orange-500',
          label: 'Partial Due',
        };
      case 'PENDING':
        return {
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
          dot: 'bg-rose-500',
          label: 'Pending',
        };
      default:
        return {
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          dot: 'bg-slate-400',
          label: status,
        };
    }
  };

  const style = getBadgeStyle();
  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 font-semibold',
    md: 'text-xs px-2.5 py-1 font-semibold',
    lg: 'text-sm px-3.5 py-1.5 font-bold',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${style.bg} ${sizeClasses[size]} transition-all tracking-wide shadow-sm`}
    >
      {showDot && <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />}
      <span>{style.label}</span>
    </span>
  );
};
