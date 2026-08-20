import React from 'react';
import { ITAsset } from '../types';
import { X, QrCode, Printer } from 'lucide-react';

interface AssetLabelModalProps {
  asset: ITAsset | null;
  onClose: () => void;
}

export function AssetLabelModal({ asset, onClose }: AssetLabelModalProps) {
  if (!asset) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Printable Asset QR Tag</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Label Card */}
        <div className="p-6 rounded-2xl bg-white border-2 border-dashed border-slate-300 text-slate-900 text-center space-y-4 shadow-sm">
          <div className="font-bold text-xs tracking-wider uppercase text-slate-600">
            Taunggyi Pharmacy IT Department
          </div>
          <div className="w-32 h-32 mx-auto bg-slate-950 text-white rounded-xl flex flex-col items-center justify-center p-2 shadow-inner">
            <QrCode className="w-20 h-20 text-white" />
            <span className="text-3xs font-mono mt-1 text-emerald-400">{asset.asset_code}</span>
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-sm text-slate-900">{asset.model}</h4>
            <p className="text-2xs font-mono text-slate-500">SN: {asset.serialNumber || 'N/A'}</p>
            <p className="text-2xs font-semibold text-indigo-600">Location: {asset.location} ({asset.department})</p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl font-semibold text-xs text-slate-700 dark:text-slate-300"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-semibold text-xs text-white shadow-xs flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" /> Print Tag
          </button>
        </div>

      </div>
    </div>
  );
}
