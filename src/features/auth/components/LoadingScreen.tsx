import React from 'react';
import { RefreshCw } from 'lucide-react';

export const LoadingScreen: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <RefreshCw className="text-cyan-500 animate-spin" size={32} />
        <p className="text-slate-500 dark:text-slate-400 font-mono text-sm tracking-widest animate-pulse">
          BOOTING IT SYSTEMS...
        </p>
      </div>
    </div>
  );
};
