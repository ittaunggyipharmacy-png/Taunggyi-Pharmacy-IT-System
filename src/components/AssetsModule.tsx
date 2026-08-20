import React, { useState, useMemo } from 'react';
import { ITAsset, SystemSettings } from '../types';
import { saveAsset, deleteAsset } from '../services/firestoreService';
import { useDepartments } from '../hooks/useDepartments';
import { AssetDashboard } from './AssetDashboard';
import { AssetRegistryTable } from './AssetRegistryTable';
import { AssetDetailModal } from './AssetDetailModal';
import { AssetRegistrationModal } from './AssetRegistrationModal';
import { AssetLifecycleModal } from './AssetLifecycleModal';
import { AssetLabelModal } from './AssetLabelModal';
import { DepartmentSelect } from './DepartmentSelect';
import { LayoutDashboard, Table, Plus } from 'lucide-react';

interface AssetsModuleProps {
  assets: ITAsset[];
  searchTerm?: string;
  isAdmin: boolean;
  settings?: SystemSettings;
  onNavigateToSettings?: () => void;
}

export function AssetsModule({
  assets,
  searchTerm = "",
  isAdmin,
  settings,
  onNavigateToSettings
}: AssetsModuleProps) {
  const { departments: configuredDepts } = useDepartments(settings);
  const locations = settings?.locations || ['Central Storage', 'Branch 1 Head Office', 'Branch 2 Market St', 'Server Room'];

  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'registry'>('dashboard');
  const [selectedAsset, setSelectedAsset] = useState<ITAsset | null>(null);
  const [isAddingModalOpen, setIsAddingModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<ITAsset | null>(null);

  // Lifecycle modal state
  const [lifecycleAsset, setLifecycleAsset] = useState<ITAsset | null>(null);
  const [lifecycleMode, setLifecycleMode] = useState<'assign' | 'transfer' | 'return' | 'repair' | null>(null);

  // Label modal state
  const [labelAsset, setLabelAsset] = useState<ITAsset | null>(null);

  const handleSaveAsset = async (assetData: Partial<ITAsset>) => {
    await saveAsset(assetData);
  };

  const handleOpenAdd = () => {
    setEditingAsset(null);
    setIsAddingModalOpen(true);
  };

  const handleOpenEdit = (asset: ITAsset) => {
    setEditingAsset(asset);
    setIsAddingModalOpen(true);
  };

  const handleDeleteAsset = async (assetId: string) => {
    try {
      await deleteAsset(assetId);
      if (selectedAsset && selectedAsset.id === assetId) {
        setSelectedAsset(null);
      }
    } catch (err) {
      console.error("Failed to delete asset:", err);
      alert("Failed to delete asset.");
    }
  };

  const handleLifecycleAction = async (actionType: string, payload: any) => {
    if (!lifecycleAsset) return;
    const updatedAsset: Partial<ITAsset> = { ...lifecycleAsset };

    if (actionType === 'assign') {
      updatedAsset.status = 'Assigned';
      updatedAsset.assignedTo = payload.newAssignee;
      updatedAsset.department = payload.newDepartment;
      updatedAsset.location = payload.newLocation;
      updatedAsset.condition = payload.handoverCondition;
      
      const historyItem = {
        id: 'hist_' + Date.now(),
        assetId: lifecycleAsset.id,
        action: 'Issue' as const,
        newAssignee: payload.newAssignee,
        newDepartment: payload.newDepartment,
        newLocation: payload.newLocation,
        handoverCondition: payload.handoverCondition,
        reason: payload.reason,
        issuedByUid: 'admin',
        issuedByName: 'IT System Admin',
        timestamp: new Date().toISOString()
      };
      updatedAsset.assignmentHistory = [historyItem, ...(lifecycleAsset.assignmentHistory || [])];
    } else if (actionType === 'transfer') {
      updatedAsset.assignedTo = payload.newAssignee;
      updatedAsset.department = payload.newDepartment;
      updatedAsset.location = payload.newLocation;

      const historyItem = {
        id: 'hist_' + Date.now(),
        assetId: lifecycleAsset.id,
        action: 'Transfer' as const,
        previousAssignee: payload.previousAssignee,
        newAssignee: payload.newAssignee,
        previousDepartment: payload.previousDepartment,
        newDepartment: payload.newDepartment,
        newLocation: payload.newLocation,
        handoverCondition: lifecycleAsset.condition,
        reason: payload.reason,
        issuedByUid: 'admin',
        issuedByName: 'IT System Admin',
        timestamp: new Date().toISOString()
      };
      updatedAsset.assignmentHistory = [historyItem, ...(lifecycleAsset.assignmentHistory || [])];
    } else if (actionType === 'return') {
      updatedAsset.status = 'In Stock';
      updatedAsset.assignedTo = 'Unassigned';
      updatedAsset.condition = payload.returnCondition;

      const historyItem = {
        id: 'hist_' + Date.now(),
        assetId: lifecycleAsset.id,
        action: 'Return' as const,
        previousAssignee: lifecycleAsset.assignedTo,
        newAssignee: 'Unassigned',
        newDepartment: lifecycleAsset.department || 'IT',
        newLocation: lifecycleAsset.location || 'Central Storage',
        handoverCondition: lifecycleAsset.condition,
        returnCondition: payload.returnCondition,
        reason: payload.reason,
        issuedByUid: 'admin',
        issuedByName: 'IT System Admin',
        timestamp: new Date().toISOString()
      };
      updatedAsset.assignmentHistory = [historyItem, ...(lifecycleAsset.assignmentHistory || [])];
    } else if (actionType === 'repair') {
      updatedAsset.status = 'Under Repair';
      const repairItem = {
        id: 'rep_' + Date.now(),
        assetId: lifecycleAsset.id,
        reportedDate: new Date().toISOString().split('T')[0],
        issueDescription: payload.issueDescription,
        vendorName: payload.vendorName,
        repairCost: payload.repairCost,
        currency: 'MMK',
        status: 'Reported' as const,
        reportedBy: 'IT Admin'
      };
      updatedAsset.repairRecords = [repairItem, ...(lifecycleAsset.repairRecords || [])];
      updatedAsset.totalRepairCost = (lifecycleAsset.totalRepairCost || 0) + payload.repairCost;
    }

    const auditEvent = {
      id: 'ev_' + Date.now(),
      assetId: lifecycleAsset.id,
      timestamp: new Date().toISOString(),
      actorUid: 'admin',
      actorName: 'IT System Admin',
      action: `Lifecycle Action: ${actionType.toUpperCase()}`,
      details: JSON.stringify(payload)
    };
    updatedAsset.activityTimeline = [auditEvent, ...(lifecycleAsset.activityTimeline || [])];

    await saveAsset(updatedAsset);
    setLifecycleAsset(null);
    setLifecycleMode(null);
    if (selectedAsset && selectedAsset.id === lifecycleAsset.id) {
      setSelectedAsset({ ...selectedAsset, ...updatedAsset });
    }
  };

  const handleDispose = async (assetId: string) => {
    if (!confirm('Are you sure you want to dispose / retire this IT asset?')) return;
    try {
      const target = assets.find(a => a.id === assetId);
      if (target) {
        await saveAsset({
          ...target,
          status: 'Disposed',
          condition: 'Retired'
        });
      }
      setSelectedAsset(null);
    } catch (err) {
      alert('Failed to dispose asset.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Sub-Tab Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Enterprise IT Asset Management</h2>
          <p className="text-xs text-slate-500">Pharmacy infrastructure registry, tracking, lifecycle workflows, and audits</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex items-center gap-1">
            <button
              onClick={() => setActiveSubTab('dashboard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeSubTab === 'dashboard' 
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" /> Overview Dashboard
            </button>
            <button
              onClick={() => setActiveSubTab('registry')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeSubTab === 'registry' 
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Table className="w-4 h-4" /> Asset Registry ({assets.length})
            </button>
          </div>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
          >
            <Plus className="w-4 h-4" /> Register Asset
          </button>
        </div>
      </div>

      {/* Main Sub-Tab View */}
      {activeSubTab === 'dashboard' ? (
        <AssetDashboard
          assets={assets}
          onSelectAsset={(asset) => setSelectedAsset(asset)}
          onNavigateTab={(tab) => setActiveSubTab(tab as any)}
        />
      ) : (
        <AssetRegistryTable
          assets={assets}
          onSelectAsset={(asset) => setSelectedAsset(asset)}
          onOpenAddModal={handleOpenAdd}
          onOpenEdit={handleOpenEdit}
          onDeleteAsset={handleDeleteAsset}
          onOpenAssign={(asset) => { setLifecycleAsset(asset); setLifecycleMode('assign'); }}
          onOpenTransfer={(asset) => { setLifecycleAsset(asset); setLifecycleMode('transfer'); }}
          onOpenRepair={(asset) => { setLifecycleAsset(asset); setLifecycleMode('repair'); }}
          onOpenLabels={(asset) => setLabelAsset(asset)}
          onDispose={handleDispose}
          isAdmin={isAdmin}
          departments={configuredDepts}
        />
      )}

      {/* Modals */}
      {selectedAsset && (
        <AssetDetailModal
          asset={selectedAsset}
          onClose={() => setSelectedAsset(null)}
          onOpenEdit={handleOpenEdit}
          onDeleteAsset={handleDeleteAsset}
          onOpenAssign={(asset) => { setLifecycleAsset(asset); setLifecycleMode('assign'); }}
          onOpenTransfer={(asset) => { setLifecycleAsset(asset); setLifecycleMode('transfer'); }}
          onOpenReturn={(asset) => { setLifecycleAsset(asset); setLifecycleMode('return'); }}
          onOpenRepair={(asset) => { setLifecycleAsset(asset); setLifecycleMode('repair'); }}
          onOpenLabels={(asset) => setLabelAsset(asset)}
          onDispose={handleDispose}
          isAdmin={isAdmin}
        />
      )}

      <AssetRegistrationModal
        isOpen={isAddingModalOpen}
        onClose={() => setIsAddingModalOpen(false)}
        onSave={handleSaveAsset}
        departments={configuredDepts}
        locations={locations}
        assetToEdit={editingAsset}
      />

      <AssetLifecycleModal
        asset={lifecycleAsset}
        mode={lifecycleMode}
        onClose={() => { setLifecycleAsset(null); setLifecycleMode(null); }}
        onSubmitAction={handleLifecycleAction}
        departments={configuredDepts}
        locations={locations}
      />

      <AssetLabelModal
        asset={labelAsset}
        onClose={() => setLabelAsset(null)}
      />
    </div>
  );
}
