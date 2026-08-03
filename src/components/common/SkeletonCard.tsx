import React from 'react';

export const SkeletonCard = () => {
  return (
    <div className="premium-card p-5 space-y-4 relative overflow-hidden">
      <div className="animate-pulse flex space-x-4">
        <div className="flex-1 space-y-4 py-1">
          <div className="h-4 bg-slate-200 rounded w-3/4"></div>
          <div className="space-y-2">
            <div className="h-3 bg-slate-200 rounded w-5/6"></div>
            <div className="h-3 bg-slate-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    </div>
  );
};
