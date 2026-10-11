import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  description: string;
  onRetry?: () => void;
  retryText?: string;
  details?: string | null;
}

/**
 * Consistent error presentation so a failed query never leaves a blank screen.
 */
export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  description,
  onRetry,
  retryText = 'Try again',
  details,
}) => {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center p-8 sm:p-10 text-center bg-white rounded-2xl border border-rose-200/80 dark:bg-slate-900 dark:border-rose-900"
    >
      <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100 mb-4 dark:text-rose-300 dark:border-rose-900">
        <AlertTriangle className="w-7 h-7" />
      </div>
      <h3 className="text-base font-bold text-slate-800 tracking-tight dark:text-slate-100">{title}</h3>
      <p className="text-xs sm:text-sm text-slate-500 max-w-md mt-1 dark:text-slate-400">{description}</p>
      {details && (
        <p className="text-[11px] text-rose-600/90 bg-rose-50/70 border border-rose-100 rounded-lg px-3 py-1.5 mt-3 max-w-md break-words dark:text-rose-200 dark:border-rose-900">
          {details}
        </p>
      )}
      {onRetry && (
        <div className="mt-5">
          <Button variant="outline" size="sm" onClick={onRetry} icon={<RefreshCw className="w-3.5 h-3.5" />}>
            {retryText}
          </Button>
        </div>
      )}
    </div>
  );
};
