import React, { useState } from 'react';
import { Share2, Plus } from 'lucide-react';
import { ContentPlan } from '../types';
import { saveContentPlan } from '../services/firestoreService';

interface MarketingModuleProps {
  contentPlans: ContentPlan[];
  isAdmin: boolean;
}

export function MarketingModule({ contentPlans, isAdmin }: MarketingModuleProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newPlan, setNewPlan] = useState<Partial<ContentPlan>>({
    productName: '',
    platform: 'Facebook',
    price: '',
    promotionPeriod: '',
    content: '',
    status: 'Draft'
  });

  const handleSave = async () => {
    if (!newPlan.productName) return;
    try {
      await saveContentPlan(newPlan);
      setIsAdding(false);
      setNewPlan({
        productName: '',
        platform: 'Facebook',
        price: '',
        promotionPeriod: '',
        content: '',
        status: 'Draft'
      });
    } catch (err) {
      console.error("Failed to save content plan", err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Marketing & Content Operations</h1>
          <p className="text-xs text-slate-500 mt-1">Social media schedules, promotional campaign deliverables, and creative assets</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors self-start sm:self-auto"
        >
          <Plus size={16} />
          <span>New Content Plan</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {contentPlans.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
            <Share2 size={32} className="mx-auto text-slate-400 mb-2" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No content plans scheduled</p>
          </div>
        ) : (
          contentPlans.map((plan) => (
            <div key={plan.id} className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3 shadow-xs">
              <div className="flex items-start justify-between">
                <span className="px-2 py-0.5 rounded text-2xs font-bold bg-indigo-50 text-indigo-700">
                  {plan.platform}
                </span>
                <span className="text-2xs text-slate-400 font-mono">{plan.promotionPeriod}</span>
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">{plan.productName}</h4>
              <p className="text-xs text-slate-500 line-clamp-2">{plan.content}</p>
            </div>
          ))
        )}
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Create Content Plan</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-2xs font-semibold text-slate-500 uppercase mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Multivitamin Syrup"
                  value={newPlan.productName || ""}
                  onChange={(e) => setNewPlan({ ...newPlan, productName: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-2xs font-semibold text-slate-500 uppercase mb-1">Platform</label>
                  <select
                    value={newPlan.platform}
                    onChange={(e) => setNewPlan({ ...newPlan, platform: e.target.value as "Facebook" | "Viber" | "TikTok" })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  >
                    <option value="Facebook">Facebook</option>
                    <option value="TikTok">TikTok</option>
                    <option value="Viber">Viber</option>
                  </select>
                </div>
                <div>
                  <label className="block text-2xs font-semibold text-slate-500 uppercase mb-1">Price</label>
                  <input
                    type="text"
                    value={newPlan.price || ""}
                    onChange={(e) => setNewPlan({ ...newPlan, price: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-2xs font-semibold text-slate-500 uppercase mb-1">Content Copy</label>
                <textarea
                  rows={3}
                  value={newPlan.content || ""}
                  onChange={(e) => setNewPlan({ ...newPlan, content: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
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
                disabled={!newPlan.productName}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl"
              >
                Save Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MarketingModule;
