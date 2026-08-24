import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, LogIn, Key, User } from 'lucide-react';
import toast from 'react-hot-toast';

interface LoginScreenProps {
  onLogin: () => void;
  onLoginWithCredentials?: (user?: string, pass?: string) => Promise<boolean>;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onLoginWithCredentials }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (onLoginWithCredentials) {
      const success = await onLoginWithCredentials(username, password);
      if (!success) {
        toast.error('Invalid username or password');
      }
    }
  };

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
        
        <p className="text-slate-400 text-sm mb-6">
          Access restricted to Taunggyi Pharmacy IT Staff. SOP-001 Protocol enabled.
        </p>

        <form onSubmit={handleManualLogin} className="space-y-4 mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-slate-500" />
            </div>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-slate-800/50 border border-slate-700/50 text-white rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all placeholder:text-slate-500"
            />
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Key className="h-5 w-5 text-slate-500" />
            </div>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-800/50 border border-slate-700/50 text-white rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all placeholder:text-slate-500"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-medium py-3 rounded-xl transition-colors cursor-pointer"
          >
            System Login
          </button>
        </form>

        <div className="flex items-center gap-4 mb-6">
          <div className="h-px bg-slate-800 flex-1"></div>
          <span className="text-xs text-slate-500 uppercase font-medium">Or continue with</span>
          <div className="h-px bg-slate-800 flex-1"></div>
        </div>

        <button
          type="button"
          onClick={onLogin}
          className="w-full bg-white dark:bg-slate-900 text-slate-950 font-medium py-3.5 rounded-xl flex items-center justify-center gap-3 hover:bg-cyan-50 transition-colors cursor-pointer border border-white/10"
        >
          <LogIn size={20} />
          Google Workspace
        </button>

        <div className="mt-8 flex items-center gap-2 justify-center">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Secure Environment
          </span>
        </div>
      </motion.div>
    </div>
  );
};
