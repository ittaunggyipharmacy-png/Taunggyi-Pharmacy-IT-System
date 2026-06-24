import React from "react";
import { FileText } from "lucide-react";

export function HelpSupportModule() {
  return (
    <div className="space-y-8 pb-20 lg:pb-0">
      <div className="enterprise-card p-6 lg:p-10">
        <h2 className="text-xl lg:text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight uppercase">Knowledge Base & Support</h2>
        <p className="text-[10px] lg:text-xs text-slate-400 dark:text-slate-500 mt-2 lg:mt-3 leading-relaxed font-bold tracking-widest uppercase">
          Standard Operating Procedures & Support Channels
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="enterprise-card p-8">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6 uppercase tracking-tight flex items-center gap-3">
              <FileText className="text-indigo-600 dark:text-indigo-400" size={24} />
              IT-SOP-001 Protocol
            </h3>
            <div className="prose prose-slate prose-sm max-w-none space-y-4 text-slate-600">
              <p className="font-bold text-slate-800">1. Lifecycle Management</p>
              <p>Every asset (Hardware/Software) must be registered in the Asset Inventory upon arrival. Purchase records must be synced with the inventory ID.</p>
              
              <p className="font-bold text-slate-800">2. Security Compliance</p>
              <p>CCTV footage requests require management approval. Personnel access must be revoked within 2 hours of resignation.</p>

              <p className="font-bold text-slate-800">3. Backup & Recovery</p>
              <p>Critical data must be backed up daily to both Cloud and Physical nodes. Performance logs are reviewed weekly.</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="enterprise-card p-6">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4 uppercase tracking-tight">IT Hotlines</h3>
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Technical Support</p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1">09-940-931-313</p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Urgent Escalation</p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1">09-XXX-XXX-XXX</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
