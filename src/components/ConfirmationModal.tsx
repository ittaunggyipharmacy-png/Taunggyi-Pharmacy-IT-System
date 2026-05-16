import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmText?: string;
  confirmColor?: string;
  isLoading?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Are you sure?",
  message = "This action cannot be undone. Please confirm to proceed.",
  confirmText = "Delete Permanently",
  confirmColor = "bg-rose-600",
  isLoading = false
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200"
        >
          <div className="flex justify-between items-center p-6 border-b border-slate-50 bg-slate-50/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600">
                <AlertTriangle size={20} />
              </div>
              <h3 className="font-bold text-slate-800">{title}</h3>
            </div>
            <button 
              onClick={onClose}
              disabled={isLoading}
              className="p-2 hover:bg-slate-200/50 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="p-8">
            <p className="text-slate-600 text-sm leading-relaxed">
              {message}
            </p>
          </div>

          <div className="p-6 bg-slate-50/50 flex gap-3">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 py-3.5 px-4 bg-white border border-slate-200 hover:bg-slate-100 rounded-2xl text-xs font-bold text-slate-600 transition-all uppercase tracking-widest disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className={`flex-1 py-3.5 px-4 ${confirmColor} hover:opacity-90 text-white rounded-2xl text-xs font-black transition-all shadow-lg active:scale-95 uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50`}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                confirmText
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
