import React, { useState } from 'react';
import { FileText, Download, BarChart3, PieChart as PieIcon, CheckSquare } from 'lucide-react';
import { ITAsset, ITTicket, PurchaseRecord } from '../types';

interface ReportsModuleProps {
  assets: ITAsset[];
  tickets: ITTicket[];
  purchases: PurchaseRecord[];
}

export function ReportsModule({ assets, tickets, purchases }: ReportsModuleProps) {
  const [selectedReport, setSelectedReport] = useState<'inventory' | 'tickets' | 'purchases'>('inventory');

  const exportCSV = () => {
    let headers: string[] = [];
    let rows: string[][] = [];
    let filename = `${selectedReport}_report_${Date.now()}.csv`;

    if (selectedReport === 'inventory') {
      headers = ['Asset Code', 'Category', 'Brand', 'Model', 'Serial Number', 'Assigned To', 'Status', 'Location'];
      rows = assets.map(a => [
        a.asset_code || a.id || '',
        a.category || '',
        a.brand || '',
        a.model || '',
        a.serialNumber || '',
        a.assignedTo || '',
        a.status || '',
        a.location || ''
      ]);
    } else if (selectedReport === 'tickets') {
      headers = ['ID', 'Problem Type', 'Requester', 'Department', 'Priority', 'Status', 'Request Date'];
      rows = tickets.map(t => [
        t.id || '',
        t.problemType || '',
        t.requesterName || '',
        t.department || '',
        t.priority || '',
        t.status || '',
        t.requestTime || ''
      ]);
    } else {
      headers = ['ID', 'Item', 'Supplier', 'Status', 'Price', 'Currency', 'Date'];
      rows = purchases.map(p => [
        p.id || '',
        p.item || '',
        p.supplier || '',
        p.status || '',
        String(p.price || 0),
        p.currency || 'MMK',
        p.date || ''
      ]);
    }

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reporting & Exports</h1>
          <p className="text-xs text-slate-500 mt-1">Audit-ready inventory summaries, ticket velocity reports, and ledger exports</p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors self-start sm:self-auto"
        >
          <Download size={15} />
          <span>Export CSV</span>
        </button>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setSelectedReport('inventory')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
            selectedReport === 'inventory' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
          }`}
        >
          Asset Inventory ({assets.length})
        </button>
        <button
          onClick={() => setSelectedReport('tickets')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
            selectedReport === 'tickets' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
          }`}
        >
          Support Tickets ({tickets.length})
        </button>
        <button
          onClick={() => setSelectedReport('purchases')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
            selectedReport === 'purchases' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
          }`}
        >
          Procurement ({purchases.length})
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">
          Report Preview: {selectedReport.toUpperCase()}
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Showing top items formatted for audit logs and executive review.
        </p>

        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold sticky top-0">
              <tr>
                <th className="p-3">Reference / Code</th>
                <th className="p-3">Summary</th>
                <th className="p-3">Status</th>
                <th className="p-3">Department / Supplier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {selectedReport === 'inventory' && assets.slice(0, 20).map(a => (
                <tr key={a.id}>
                  <td className="p-3 font-mono font-semibold text-slate-800 dark:text-slate-200">{a.asset_code || a.id}</td>
                  <td className="p-3">{a.brand} {a.model}</td>
                  <td className="p-3">{a.status}</td>
                  <td className="p-3">{a.location}</td>
                </tr>
              ))}
              {selectedReport === 'tickets' && tickets.slice(0, 20).map(t => (
                <tr key={t.id}>
                  <td className="p-3 font-mono font-semibold text-slate-800 dark:text-slate-200">#{t.id.slice(0, 8)}</td>
                  <td className="p-3">{t.problemType}</td>
                  <td className="p-3">{t.status}</td>
                  <td className="p-3">{t.department}</td>
                </tr>
              ))}
              {selectedReport === 'purchases' && purchases.slice(0, 20).map(p => (
                <tr key={p.id}>
                  <td className="p-3 font-mono font-semibold text-slate-800 dark:text-slate-200">{p.id}</td>
                  <td className="p-3">{p.item}</td>
                  <td className="p-3">{p.status}</td>
                  <td className="p-3">{p.supplier}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default ReportsModule;
