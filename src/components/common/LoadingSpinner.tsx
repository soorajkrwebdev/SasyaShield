import React from 'react';

export const LoadingSpinner: React.FC<{ message?: string }> = ({ message = 'Loading farm data...' }) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <div className="relative flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-emerald-100 border-t-emerald-600 rounded-full animate-spin" />
        <div className="absolute w-5 h-5 bg-emerald-50 rounded-full flex items-center justify-center">
          <div className="w-2 h-2 bg-emerald-600 rounded-full animate-ping" />
        </div>
      </div>
      <p className="mt-4 text-xs font-medium text-slate-500 tracking-wide dark:text-slate-400">{message}</p>
    </div>
  );
};
