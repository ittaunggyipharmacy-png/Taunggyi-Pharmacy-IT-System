import React, { useState } from 'react';
import { Plus, ShoppingCart } from 'lucide-react';
import { PurchaseRecord } from '../types';
import { savePurchaseRecord } from '../services/firestoreService';

interface PurchasesModuleProps {
  purchases: PurchaseRecord[];
  searchTerm?: string;
  isAdmin: boolean;
}

export function PurchasesModule({ purchases, searchTerm = "", isAdmin }: PurchasesModuleProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [filterStatus, setFilterStatus] = useState("All");
  const [newPurchase, setNewPurchase] = useState<Partial<PurchaseRecord>>({
    status: 'Ordered',
    currency: 'MMK',
    date: new Date().toISOString().split('T')[0],
    price: 0,
    quantity: 1,
    category: 'Hardware'
  });

  const filteredPurchases = purchases.filter(p => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm ||
      p.item?.toLowerCase().includes(term) ||
      p.supplier?.toLowerCase().includes(term) ||
      p.category?.toLowerCase().includes(term);
    const matchesStatus = filterStatus === "All" || p.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleSave = async () => {
    if (!newPurchase.item || !newPurchase.supplier) return;
    try {
      await savePurchaseRecord(newPurchase);
      setIsAdding(false);
      setNewPurchase({
        status: 'Ordered',
        currency: 'MMK',
        date: new Date().toISOString().split('T')[0],
        price: 0,
        quantity: 1,
        category: 'Hardware'
      });
    } catch (err) {
      console.error("Failed to save purchase record", err);
    }
  };

  const handleStatusUpdate = async (record: PurchaseRecord, newStatus: "Ordered" | "Transit" | "Received") => {
    try {
      await savePurchaseRecord({
        ...record,
        status: newStatus
      });
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Procurement & Purchases</h1>
          <p className="text-xs text-slate-500 mt-1">IT hardware acquisitions, supplier tracking, and orders</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors self-start sm:self-auto"
        >
          <Plus size={16} />
          <span>New Requisition</span>
        </button>
      </div>

      <div className="flex gap-3">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none"
        >
          <option value="All">All Statuses</option>
          <option value="Ordered">Ordered</option>
          <option value="Transit">Transit</option>
          <option value="Received">Received</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPurchases.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
            <ShoppingCart size={32} className="mx-auto text-slate-400 mb-2" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No purchase records found</p>
          </div>
        ) : (
          filteredPurchases.map((item) => (
            <div key={item.id} className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3 shadow-xs">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-2xs font-mono text-slate-400 block">{item.date}</span>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{item.item}</h4>
                </div>
                <span className="px-2.5 py-1 rounded-full text-2xs font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300">
                  {item.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-2xs text-slate-400 block">Supplier</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{item.supplier || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-2xs text-slate-400 block">Price / Qty</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{item.price} {item.currency} (x{item.quantity})</span>
                </div>
              </div>

              {isAdmin && item.status !== "Received" && (
                <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => handleStatusUpdate(item, "Received")}
                    className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-2xs font-semibold"
                  >
                    Mark Received
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">New Purchase Requisition</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-2xs font-semibold text-slate-500 uppercase mb-1">Item Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kingston 16GB RAM"
                  value={newPurchase.item || ""}
                  onChange={(e) => setNewPurchase({ ...newPurchase, item: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-2xs font-semibold text-slate-500 uppercase mb-1">Supplier *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Royal Computer"
                    value={newPurchase.supplier || ""}
                    onChange={(e) => setNewPurchase({ ...newPurchase, supplier: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-semibold text-slate-500 uppercase mb-1">Price</label>
                  <input
                    type="number"
                    value={newPurchase.price || 0}
                    onChange={(e) => setNewPurchase({ ...newPurchase, price: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!newPurchase.item || !newPurchase.supplier}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-xs"
              >
                Submit Requisition
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PurchasesModule;
