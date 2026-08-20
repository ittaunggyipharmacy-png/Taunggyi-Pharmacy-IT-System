import React, { useState } from 'react';
import { X, UploadCloud, CheckCircle, AlertTriangle, RefreshCw, FileSpreadsheet } from 'lucide-react';
import { importBatchToServer } from '../services/firestoreService';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetCollection?: string;
  onImportComplete?: () => void;
}

export function ExcelImportModal({
  isOpen,
  onClose,
  targetCollection = 'it_assets',
  onImportComplete
}: ExcelImportModalProps) {
  const [rawText, setRawText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<{ processed: number; total: number } | null>(null);
  const [report, setReport] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const parseInput = () => {
    const lines = rawText.trim().split('\n');
    if (lines.length === 0) return [];
    
    // First try JSON format
    if (rawText.trim().startsWith('[') && rawText.trim().endsWith(']')) {
      try {
        return JSON.parse(rawText);
      } catch (_) {}
    }

    // Otherwise parse TSV or CSV
    const headers = lines[0].split(/\t|,/).map(h => h.trim().replace(/^["']|["']$/g, ''));
    const records: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const values = line.split(/\t|,/).map(v => v.trim().replace(/^["']|["']$/g, ''));
      const obj: any = {};
      headers.forEach((h, idx) => {
        if (h && values[idx] !== undefined) {
          obj[h] = values[idx];
        }
      });
      records.push(obj);
    }
    return records;
  };

  const handleStartImport = async () => {
    setError(null);
    setReport([]);
    const records = parseInput();
    if (records.length === 0) {
      setError('No valid records found in the input. Please provide CSV, TSV, or JSON data.');
      return;
    }

    setIsProcessing(true);
    const BATCH_SIZE = 350; // Under the 400 batch limit
    const sessionId = `import_${Date.now()}`;
    const allResults: any[] = [];

    try {
      for (let i = 0; i < records.length; i += BATCH_SIZE) {
        const chunk = records.slice(i, i + BATCH_SIZE);
        setProgress({ processed: i + chunk.length, total: records.length });
        
        const response = await importBatchToServer(chunk, targetCollection, sessionId, Math.floor(i / BATCH_SIZE));
        if (response.results) {
          allResults.push(...response.results);
        }
      }

      setReport(allResults);
      if (onImportComplete) onImportComplete();
    } catch (err: any) {
      setError(err.message || 'Batch import failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const failedCount = report.filter(r => r.status === 'error').length;
  const successCount = report.filter(r => r.status === 'ok').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <FileSpreadsheet size={18} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white text-base">Server-Side Resumable Import</h3>
              <p className="text-xs text-slate-500">Chunked Firestore batches (max 400) with schema validation</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
              Paste Spreadsheet Data (CSV / TSV / JSON)
            </label>
            <textarea
              rows={8}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="category&#9;model&#9;serialNumber&#9;status&#10;Computer&#9;Dell OptiPlex 3080&#9;SN-88239&#9;Active"
              className="w-full p-3 font-mono text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          {progress && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl">
              <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                <span>Importing records...</span>
                <span>{progress.processed} / {progress.total}</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full transition-all duration-300"
                  style={{ width: `${(progress.processed / progress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-start gap-2.5 text-rose-700 dark:text-rose-300 text-xs">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {report.length > 0 && (
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2 text-xs">
              <div className="flex items-center justify-between font-semibold">
                <span className="text-slate-800 dark:text-slate-200">Import Results</span>
                <div className="flex gap-3">
                  <span className="text-emerald-600 font-bold">{successCount} Succeeded</span>
                  {failedCount > 0 && <span className="text-rose-600 font-bold">{failedCount} Failed</span>}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl"
          >
            Close
          </button>
          <button
            onClick={handleStartImport}
            disabled={isProcessing || !rawText.trim()}
            className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
          >
            {isProcessing ? <RefreshCw size={14} className="animate-spin" /> : <UploadCloud size={14} />}
            <span>Process Batch Import</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default ExcelImportModal;
