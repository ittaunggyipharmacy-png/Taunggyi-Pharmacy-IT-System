import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, LogIn } from 'lucide-react';

interface LoginScreenProps {
  onLogin: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 bg-[radial-gradient(circle_at_50%_50%,rgba(6,182,212,0.1),transparent_70%)]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md md:max-w-lg bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 text-center"
      >
        <div className="w-20 h-20 bg-cyan-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-cyan-500/30">
          <ShieldCheck className="text-cyan-400" size={40} />
        </div>
        <h1 className="text-2xl font-medium text-white mb-2">IT Operations Login</h1>
        <p className="text-slate-400 text-sm mb-8">
          Access restricted to Taunggyi Pharmacy IT Staff. SOP-001 Protocol enabled.
        </p>

        <button
          onClick={onLogin}
          className="w-full bg-white dark:bg-slate-900 text-slate-950 font-medium py-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-cyan-50 transition-colors cursor-pointer"
        >
          <LogIn size={20} />
          Sign in with Google
        </button>

        <div className="mt-8 flex items-center gap-2 justify-center">
          <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Secure Environment
          </span>
        </div>
      </motion.div>
    </div>
  );
};
