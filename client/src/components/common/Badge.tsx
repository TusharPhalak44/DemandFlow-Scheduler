import React from 'react';

interface BadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ status, size = 'md' }) => {
  const getStyles = () => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-600/10';
      case 'CANCELLED_BY_ADMIN':
        return 'bg-rose-50 text-rose-700 border-rose-200 ring-rose-600/10';
      case 'CANCELLED_BY_AGENT':
        return 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-600/10';
      case 'RESCHEDULED':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200 ring-indigo-600/10';
      case 'COMPLETED':
        return 'bg-blue-50 text-blue-700 border-blue-200 ring-blue-600/10';
      case 'NO_SHOW':
        return 'bg-slate-100 text-slate-700 border-slate-300 ring-slate-600/10';
      case 'ACTIVE':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-600/10';
      case 'INACTIVE':
        return 'bg-slate-100 text-slate-600 border-slate-200 ring-slate-600/10';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200 ring-slate-600/10';
    }
  };

  const formatText = (txt: string) => {
    return txt.replace(/_/g, ' ');
  };

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ring-1 ring-inset tracking-wide ${sizeClasses} ${getStyles()}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
          status === 'CONFIRMED' || status === 'ACTIVE'
            ? 'bg-emerald-500'
            : status.startsWith('CANCELLED')
            ? 'bg-rose-500'
            : status === 'RESCHEDULED'
            ? 'bg-indigo-500'
            : status === 'COMPLETED'
            ? 'bg-blue-500'
            : 'bg-slate-400'
        }`}
      />
      {formatText(status)}
    </span>
  );
};
