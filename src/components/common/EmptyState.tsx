import React from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  actionIcon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionText,
  onAction,
  actionIcon,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-white rounded-2xl border border-dashed border-slate-200 dark:bg-slate-900 dark:border-slate-700">
      <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100/80 mb-4 dark:text-emerald-300 dark:border-emerald-900">
        {icon}
      </div>
      <h3 className="text-base font-bold text-slate-800 tracking-tight dark:text-slate-100">{title}</h3>
      <p className="text-xs sm:text-sm text-slate-500 max-w-sm mt-1 mb-5 dark:text-slate-400">{description}</p>
      {actionText && onAction && (
        <Button variant="primary" size="sm" onClick={onAction} icon={actionIcon}>
          {actionText}
        </Button>
      )}
    </div>
  );
};
