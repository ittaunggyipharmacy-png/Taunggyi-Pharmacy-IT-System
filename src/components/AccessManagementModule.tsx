import React, { useState, useMemo } from 'react';
import { 
  Shield, Key, Lock, CheckCircle2, XCircle, AlertTriangle, Clock, 
  UserCheck, UserX, FileText, Search, Plus, Filter, 
  Eye, RefreshCw, Layers, Calendar, ExternalLink,
  ChevronRight, Building2, User
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AccessRequest, SystemUser, UserRole } from '../types';
import { useDepartments } from '../hooks/useDepartments';

interface AccessManagementModuleProps {
  requests: AccessRequest[];
  currentUser: any;
  userRole: UserRole | string;
  onRefresh?: () => void;
  systemUsers?: SystemUser[];
}

// Pre-defined Resource Catalogue
export const RESOURCE_CATALOGUE = [
  { id: 'res-pos', name: 'Pharmacy POS Terminal', category: 'POS', sensitivity: 'Medium', desc: 'Counter billing, receipt printing, customer checkout' },
  { id: 'res-inv', name: 'ERP Inventory Management', category: 'Inventory', sensitivity: 'High', desc: 'Stock inward, batch expiry tracking, warehouse transfers' },
  { id: 'res-fin', name: 'Financial Accounting System', category: 'Finance', sensitivity: 'Restricted', desc: 'Ledgers, vendor payments, financial audits, profit-loss reports' },
  { id: 'res-email', name: 'Corporate Email (@taunggyipharmacy.com)', category: 'Email & Workspace', sensitivity: 'Medium', desc: 'Official company email inbox and internal distribution lists' },
  { id: 'res-gdrive', name: 'Google Drive Secure Shared Folders', category: 'Cloud Storage', sensitivity: 'Medium', desc: 'Departmental documents, standard operating procedures, policies' },
  { id: 'res-cctv', name: 'CCTV Surveillance Live & Playback', category: 'Security Surveillance', sensitivity: 'Restricted', desc: 'Live pharmacy & warehouse camera feeds, historical footage extraction' },
  { id: 'res-wifi', name: 'Internal Wi-Fi (Staff / Operations)', category: 'Network', sensitivity: 'Low', desc: 'WPA2/3 Enterprise 802.1X secure operational wireless access' },
  { id: 'res-print', name: 'Shared Network Printers & Labelers', category: 'Peripherals', sensitivity: 'Low', desc: 'High-speed prescription label printers and office multifunctions' },
  { id: 'res-net', name: 'Core Firewall & Site-to-Site VPN', category: 'Infrastructure', sensitivity: 'Restricted', desc: 'Remote branch interconnect, perimeter firewall configuration' },
  { id: 'res-license', name: 'Specialty Software License', category: 'Software Licenses', sensitivity: 'Low', desc: 'Antivirus endpoint protection, document PDF editors, barcode design' }
];

export const ACCESS_LEVELS = [
  { level: 'Read Only', desc: 'View dashboards and reports without modification rights' },
  { level: 'Standard User', desc: 'Normal operational entry, record creation, daily workflow' },
  { level: 'Power User', desc: 'Advanced filtering, batch export, department record adjustments' },
  { level: 'Admin / Privileged', desc: 'Full configuration, user role assignment, deletion, audit control' },
  { level: 'Security Audit', desc: 'Compliance audit trail inspection and policy review' }
];

export const SENSITIVITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Low: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  Medium: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
  High: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  Restricted: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30' }
};

export const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  Draft: { bg: 'bg-slate-500/10', text: 'text-slate-400' },
  Submitted: { bg: 'bg-sky-500/10', text: 'text-sky-400' },
  'Pending Approval': { bg: 'bg-amber-500/10', text: 'text-amber-400' },
  Approved: { bg: 'bg-indigo-500/10', text: 'text-indigo-400' },
  Provisioning: { bg: 'bg-purple-500/10', text: 'text-purple-400' },
  Active: { bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  Expiring: { bg: 'bg-orange-500/10', text: 'text-orange-400' },
  Revoked: { bg: 'bg-rose-500/10', text: 'text-rose-400' },
  Expired: { bg: 'bg-stone-500/10', text: 'text-stone-400' },
  Rejected: { bg: 'bg-red-500/10', text: 'text-red-400' },
  Cancelled: { bg: 'bg-zinc-500/10', text: 'text-zinc-400' }
};

export const AccessManagementModule: React.FC<AccessManagementModuleProps> = ({
  requests = [],
  currentUser,
  userRole,
  onRefresh,
  systemUsers = []
}) => {
  const { departments } = useDepartments();

  // Navigation & Filtering
  const [activeTab, setActiveTab] = useState<'requests' | 'catalogue' | 'offboarding'>('requests');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [deptFilter, setDeptFilter] = useState<string>('ALL');
  const [sensitivityFilter, setSensitivityFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals & Drawers
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showTimelineModal, setShowTimelineModal] = useState<AccessRequest | null>(null);
  const [showActionModal, setShowActionModal] = useState<{ request: AccessRequest; action: 'APPROVE' | 'REJECT' | 'PROVISION' | 'REVOKE'; stepId?: string } | null>(null);
  const [showOffboardModal, setShowOffboardModal] = useState<boolean>(false);

  // Form States
  const [selectedCatalogueItem, setSelectedCatalogueItem] = useState<any>(RESOURCE_CATALOGUE[0]);
  const [customResourceName, setCustomResourceName] = useState<string>('');
  const [customResourceCategory, setCustomResourceCategory] = useState<string>('Other');
  const [selectedAccessLevel, setSelectedAccessLevel] = useState<string>('Standard User');
  const [selectedSensitivity, setSelectedSensitivity] = useState<'Low' | 'Medium' | 'High' | 'Restricted'>('Medium');
  const [selectedDept, setSelectedDept] = useState<string>(departments[0] || 'Operations');
  const [reportingManagerEmail, setReportingManagerEmail] = useState<string>('');
  const [businessReason, setBusinessReason] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [hasExpiry, setHasExpiry] = useState<boolean>(false);
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [evidenceUrl, setEvidenceUrl] = useState<string>('');
  const [vaultSecretPointer, setVaultSecretPointer] = useState<string>('');

  // Action / Approval Modal Form States
  const [actionComments, setActionComments] = useState<string>('');
  const [provisionSecretPointer, setProvisionSecretPointer] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Offboarding State
  const [offboardTargetUid, setOffboardTargetUid] = useState<string>('');
  const [offboardNotes, setOffboardNotes] = useState<string>('');

  const isSuperAdmin = userRole === UserRole.SUPER_ADMIN || currentUser?.email === 'it.taunggyipharmacy@gmail.com';
  const isSupervisor = isSuperAdmin || userRole === UserRole.IT_SUPERVISOR;

  // Filtered Requests
  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      if (statusFilter === 'MY_REQUESTS') {
        if (req.requesterUid !== currentUser?.uid) return false;
      } else if (statusFilter === 'EXPIRING_SOON') {
        if (!req.expiryDate || req.status !== 'Active') return false;
        const diffDays = (new Date(req.expiryDate).getTime() - Date.now()) / (1000 * 3600 * 24);
        if (diffDays > 14 || diffDays < 0) return false;
      } else if (statusFilter !== 'ALL') {
        if (req.status !== statusFilter) return false;
      }

      if (deptFilter !== 'ALL' && req.department !== deptFilter) return false;
      if (sensitivityFilter !== 'ALL' && req.dataSensitivity !== sensitivityFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = req.requesterName?.toLowerCase().includes(q);
        const matchEmail = req.requesterEmail?.toLowerCase().includes(q);
        const matchResource = req.resourceName?.toLowerCase().includes(q);
        const matchNum = req.requestNumber?.toLowerCase().includes(q);
        const matchDept = req.department?.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchResource && !matchNum && !matchDept) return false;
      }

      return true;
    });
  }, [requests, statusFilter, deptFilter, sensitivityFilter, searchQuery, currentUser]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const active = requests.filter(r => r.status === 'Active').length;
    const pending = requests.filter(r => r.status === 'Submitted' || r.status === 'Pending Approval' || r.status === 'Provisioning').length;
    const highRestricted = requests.filter(r => (r.dataSensitivity === 'High' || r.dataSensitivity === 'Restricted') && r.status === 'Active').length;
    const expiringSoon = requests.filter(r => {
      if (!r.expiryDate || r.status !== 'Active') return false;
      const diffDays = (new Date(r.expiryDate).getTime() - Date.now()) / (1000 * 3600 * 24);
      return diffDays <= 14 && diffDays >= 0;
    }).length;
    return { active, pending, highRestricted, expiringSoon };
  }, [requests]);

  // Handlers
  const handleOpenCreateModal = (catItem?: any) => {
    if (catItem) {
      setSelectedCatalogueItem(catItem);
      setSelectedSensitivity(catItem.sensitivity);
    }
    setBusinessReason('');
    setEvidenceUrl('');
    setVaultSecretPointer('');
    setErrorMessage(null);
    setShowCreateModal(true);
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    const token = await currentUser?.getIdToken?.();
    const isCustom = selectedCatalogueItem.id === 'res-custom';
    const resourceName = isCustom ? customResourceName : selectedCatalogueItem.name;
    const resourceCategory = isCustom ? customResourceCategory : selectedCatalogueItem.category;

    const payload: any = {
      requesterUid: currentUser?.uid,
      requesterName: currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Staff User',
      requesterEmail: currentUser?.email,
      department: selectedDept,
      reportingManager: reportingManagerEmail || 'manager@taunggyipharmacy.com',
      resourceCategory,
      resourceName,
      requestedAccessLevel: selectedAccessLevel,
      dataSensitivity: selectedSensitivity,
      businessReason,
      startDate,
      expiryDate: hasExpiry ? expiryDate : undefined,
      evidenceUrl: evidenceUrl.trim() ? evidenceUrl.trim() : undefined,
      secretRef: vaultSecretPointer.trim() ? { vaultId: vaultSecretPointer.trim() } : undefined,
      status: 'Submitted'
    };

    try {
      const res = await fetch('/api/access/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.details?.join(', ') || 'Failed to submit request');
      }

      setSuccessMessage(`Access Request ${data.requestNumber} submitted successfully!`);
      setShowCreateModal(false);
      if (onRefresh) onRefresh();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error submitting access request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExecuteAction = async () => {
    if (!showActionModal) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    const { request, action, stepId } = showActionModal;
    const token = await currentUser?.getIdToken?.();

    try {
      const res = await fetch(`/api/access/requests/${request.id}/action`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action,
          stepId,
          comments: actionComments,
          secretRef: provisionSecretPointer.trim() ? { vaultId: provisionSecretPointer.trim() } : undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to process action');
      }

      setSuccessMessage(`Request ${request.requestNumber} updated to ${data.status}!`);
      setShowActionModal(null);
      setActionComments('');
      setProvisionSecretPointer('');
      if (onRefresh) onRefresh();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error executing action');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExecuteOffboarding = async () => {
    if (!offboardTargetUid) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    const token = await currentUser?.getIdToken?.();
    const targetUser = systemUsers.find(u => u.uid === offboardTargetUid);

    try {
      const res = await fetch('/api/access/lifecycle/offboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          employeeId: offboardTargetUid,
          employeeName: targetUser?.displayName || targetUser?.email || 'Staff Member',
          notes: offboardNotes
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to execute offboarding');
      }

      setSuccessMessage(`Offboarding complete! Revoked ${data.revokedCount} active access grants for ${targetUser?.email || offboardTargetUid}.`);
      setShowOffboardModal(false);
      setOffboardTargetUid('');
      setOffboardNotes('');
      if (onRefresh) onRefresh();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error during offboarding');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="access-management-container" className="space-y-6">
      {/* Notifications */}
      <AnimatePresence>
        {successMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-emerald-400 text-sm font-medium"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              <span>{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-300">
              <XCircle className="w-5 h-5" />
            </button>
          </motion.div>
        )}
        {errorMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between text-rose-400 text-sm font-medium"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-rose-300">
              <XCircle className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <Shield className="w-7 h-7 text-indigo-400" />
            IT Access Management
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Enterprise RBAC access request lifecycle, multi-tier approval matrix, and automated offboarding.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {isSupervisor && (
            <button
              id="btn-offboard-lifecycle"
              onClick={() => setShowOffboardModal(true)}
              className="px-4 py-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-sm font-medium flex items-center gap-2 transition-colors"
            >
              <UserX className="w-4 h-4" />
              Offboard Staff
            </button>
          )}

          <button
            id="btn-new-access-request"
            onClick={() => handleOpenCreateModal()}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Request IT Access
          </button>
        </div>
      </div>

      {/* Quick Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Grants</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white mt-2">{metrics.active}</p>
          <span className="text-xs text-slate-500 mt-1 block">Provisioned & operational</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Pending Approvals</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white mt-2">{metrics.pending}</p>
          <span className="text-xs text-slate-500 mt-1 block">Awaiting review / sign-off</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">High / Restricted</span>
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
              <Lock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white mt-2">{metrics.highRestricted}</p>
          <span className="text-xs text-slate-500 mt-1 block">Super Admin monitored</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Expiring in ≤14d</span>
            <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white mt-2">{metrics.expiringSoon}</p>
          <span className="text-xs text-slate-500 mt-1 block">Requires renewal review</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'requests' 
              ? 'bg-slate-800 text-white border border-slate-700' 
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
          }`}
        >
          <Key className="w-4 h-4" />
          Access Requests & Grants ({requests.length})
        </button>

        <button
          onClick={() => setActiveTab('catalogue')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'catalogue' 
              ? 'bg-slate-800 text-white border border-slate-700' 
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
          }`}
        >
          <Layers className="w-4 h-4" />
          Resource Catalogue ({RESOURCE_CATALOGUE.length})
        </button>
      </div>

      {/* TAB 1: ACCESS REQUESTS TABLE & FILTERS */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search requests, users, resources..."
                className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-medium text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="MY_REQUESTS">My Requests</option>
                <option value="Pending Approval">Pending Approval</option>
                <option value="Submitted">Submitted</option>
                <option value="Approved">Approved</option>
                <option value="Provisioning">Provisioning</option>
                <option value="Active">Active Grants</option>
                <option value="EXPIRING_SOON">Expiring Soon (≤14d)</option>
                <option value="Revoked">Revoked</option>
                <option value="Expired">Expired</option>
                <option value="Rejected">Rejected</option>
              </select>

              <select
                value={deptFilter}
                onChange={e => setDeptFilter(e.target.value)}
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-medium text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">All Departments</option>
                {departments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>

              <select
                value={sensitivityFilter}
                onChange={e => setSensitivityFilter(e.target.value)}
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-medium text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">All Sensitivities</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Restricted">Restricted</option>
              </select>
            </div>
          </div>

          {/* Requests Table */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/80 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Request #</th>
                    <th className="py-3.5 px-4">Requester</th>
                    <th className="py-3.5 px-4">Resource & Level</th>
                    <th className="py-3.5 px-4">Sensitivity</th>
                    <th className="py-3.5 px-4">Status & Pipeline</th>
                    <th className="py-3.5 px-4">Validity</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredRequests.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        <Key className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        No access requests found matching the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredRequests.map(req => {
                      const sensStyle = SENSITIVITY_COLORS[req.dataSensitivity] || SENSITIVITY_COLORS.Low;
                      const statusStyle = STATUS_COLORS[req.status] || STATUS_COLORS.Draft;
                      const isOwnRequest = req.requesterUid === currentUser?.uid;

                      // Check if pending approvals exist
                      const pendingStep = req.approvals?.find(a => a.status === 'Pending');

                      return (
                        <tr key={req.id} className="hover:bg-slate-800/30 transition-colors">
                          {/* Request # */}
                          <td className="py-3.5 px-4 font-mono font-medium text-white">
                            {req.requestNumber || req.id.slice(0, 8)}
                          </td>

                          {/* Requester & Dept */}
                          <td className="py-3.5 px-4">
                            <div className="font-medium text-slate-200">{req.requesterName}</div>
                            <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <Building2 className="w-3 h-3" />
                              {req.department}
                            </div>
                          </td>

                          {/* Resource & Level */}
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-white">{req.resourceName}</div>
                            <div className="text-xs text-indigo-400 font-mono mt-0.5">
                              {req.requestedAccessLevel}
                            </div>
                          </td>

                          {/* Sensitivity */}
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${sensStyle.bg} ${sensStyle.text} ${sensStyle.border}`}>
                              {req.dataSensitivity}
                            </span>
                          </td>

                          {/* Status & Approval Steps */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                                {req.status}
                              </span>
                            </div>
                            {req.approvals && req.approvals.length > 0 && (
                              <div className="flex items-center gap-1 mt-1.5">
                                {req.approvals.map((step, sIdx) => {
                                  const stepIcon = step.status === 'Approved' ? (
                                    <div key={sIdx} className="w-2.5 h-2.5 rounded-full bg-emerald-400" title={`${step.stepName}: Approved`} />
                                  ) : step.status === 'Rejected' ? (
                                    <div key={sIdx} className="w-2.5 h-2.5 rounded-full bg-rose-400" title={`${step.stepName}: Rejected`} />
                                  ) : (
                                    <div key={sIdx} className="w-2.5 h-2.5 rounded-full bg-amber-400" title={`${step.stepName}: Pending`} />
                                  );
                                  return stepIcon;
                                })}
                              </div>
                            )}
                          </td>

                          {/* Validity / Expiry */}
                          <td className="py-3.5 px-4 text-xs text-slate-300">
                            <div>From: {req.startDate}</div>
                            {req.expiryDate ? (
                              <div className="text-slate-400 mt-0.5">Until: {req.expiryDate}</div>
                            ) : (
                              <div className="text-emerald-400/80 mt-0.5">Indefinite</div>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                            {/* View Audit Timeline */}
                            <button
                              onClick={() => setShowTimelineModal(req)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                              title="Audit Timeline"
                            >
                              <Clock className="w-4 h-4" />
                            </button>

                            {/* Approve / Reject Actions (Subject to anti-self-approval) */}
                            {pendingStep && (
                              <>
                                <button
                                  disabled={isOwnRequest && !isSuperAdmin}
                                  onClick={() => setShowActionModal({ request: req, action: 'APPROVE', stepId: pendingStep.stepId })}
                                  className={`p-1.5 rounded-lg transition-colors ${
                                    isOwnRequest && !isSuperAdmin 
                                      ? 'bg-slate-800/40 text-slate-600 cursor-not-allowed' 
                                      : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  }`}
                                  title={isOwnRequest && !isSuperAdmin ? 'Anti-Self-Approval: You cannot approve your own request' : `Approve ${pendingStep.stepName}`}
                                >
                                  <UserCheck className="w-4 h-4" />
                                </button>
                                <button
                                  disabled={isOwnRequest && !isSuperAdmin}
                                  onClick={() => setShowActionModal({ request: req, action: 'REJECT', stepId: pendingStep.stepId })}
                                  className={`p-1.5 rounded-lg transition-colors ${
                                    isOwnRequest && !isSuperAdmin 
                                      ? 'bg-slate-800/40 text-slate-600 cursor-not-allowed' 
                                      : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                  }`}
                                  title={isOwnRequest && !isSuperAdmin ? 'Anti-Self-Approval: You cannot reject your own request' : `Reject ${pendingStep.stepName}`}
                                >
                                  <UserX className="w-4 h-4" />
                                </button>
                              </>
                            )}

                            {/* Provision Action */}
                            {(req.status === 'Approved' || req.status === 'Provisioning') && isSupervisor && (
                              <button
                                onClick={() => setShowActionModal({ request: req, action: 'PROVISION' })}
                                className="px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-medium inline-flex items-center gap-1"
                                title="Mark as Provisioned & Active"
                              >
                                <Key className="w-3.5 h-3.5" />
                                Provision
                              </button>
                            )}

                            {/* Revoke Action */}
                            {req.status === 'Active' && isSupervisor && (
                              <button
                                onClick={() => setShowActionModal({ request: req, action: 'REVOKE' })}
                                className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors"
                                title="Revoke Access Grant"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: RESOURCE CATALOGUE */}
      {activeTab === 'catalogue' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {RESOURCE_CATALOGUE.map(item => {
            const sensStyle = SENSITIVITY_COLORS[item.sensitivity] || SENSITIVITY_COLORS.Low;
            return (
              <div key={item.id} className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-colors">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold text-white text-base">{item.name}</h3>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${sensStyle.bg} ${sensStyle.text} ${sensStyle.border}`}>
                      {item.sensitivity}
                    </span>
                  </div>
                  <span className="text-xs text-indigo-400 font-medium block mt-1">{item.category}</span>
                  <p className="text-slate-400 text-xs mt-3 leading-relaxed">{item.desc}</p>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-xs text-slate-500">Standard & Admin Levels</span>
                  <button
                    onClick={() => handleOpenCreateModal(item)}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white text-xs font-medium transition-colors flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Request Access
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE ACCESS REQUEST MODAL */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-5"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                    <Key className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Request IT Access</h2>
                    <p className="text-xs text-slate-400">Formal IT Access Request with Multi-Tier Approval Workflow</p>
                  </div>
                </div>
                <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitRequest} className="space-y-4">
                {/* Requester Details (Auto-detected) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3.5 rounded-xl bg-slate-950 border border-slate-800/80">
                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1">Requester Name</label>
                    <input
                      type="text"
                      disabled
                      value={currentUser?.displayName || currentUser?.email || 'Logged In User'}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-300"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1">Department</label>
                    <select
                      value={selectedDept}
                      onChange={e => setSelectedDept(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white focus:border-indigo-500"
                    >
                      {departments.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Resource Selection */}
                <div className="space-y-3">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                    Resource / Target System
                  </label>
                  <select
                    value={selectedCatalogueItem.id}
                    onChange={e => {
                      const item = RESOURCE_CATALOGUE.find(c => c.id === e.target.value);
                      if (item) {
                        setSelectedCatalogueItem(item);
                        setSelectedSensitivity(item.sensitivity as any);
                      } else {
                        setSelectedCatalogueItem({ id: 'res-custom', name: '', category: 'Other', sensitivity: 'Medium' });
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-indigo-500"
                  >
                    {RESOURCE_CATALOGUE.map(r => (
                      <option key={r.id} value={r.id}>{r.name} ({r.category}) - {r.sensitivity} Sensitivity</option>
                    ))}
                    <option value="res-custom">Custom / Other Unlisted Resource</option>
                  </select>

                  {selectedCatalogueItem.id === 'res-custom' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                      <input
                        type="text"
                        required
                        placeholder="Resource / Device Name"
                        value={customResourceName}
                        onChange={e => setCustomResourceName(e.target.value)}
                        className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white"
                      />
                      <input
                        type="text"
                        required
                        placeholder="Category (e.g. Database, Cloud Tool)"
                        value={customResourceCategory}
                        onChange={e => setCustomResourceCategory(e.target.value)}
                        className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white"
                      />
                    </div>
                  )}
                </div>

                {/* Requested Level & Sensitivity */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1">Requested Access Level</label>
                    <select
                      value={selectedAccessLevel}
                      onChange={e => setSelectedAccessLevel(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-indigo-500"
                    >
                      {ACCESS_LEVELS.map(l => (
                        <option key={l.level} value={l.level}>{l.level}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1">Data Sensitivity</label>
                    <select
                      value={selectedSensitivity}
                      onChange={e => setSelectedSensitivity(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-indigo-500"
                    >
                      <option value="Low">Low - Public / General operational</option>
                      <option value="Medium">Medium - Department internal</option>
                      <option value="High">High - Customer PII / Medical inventory</option>
                      <option value="Restricted">Restricted - Finance, Executive & Security</option>
                    </select>
                  </div>
                </div>

                {/* Reporting Manager */}
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">Line Manager Email / Approver</label>
                  <input
                    type="email"
                    required
                    placeholder="manager@taunggyipharmacy.com"
                    value={reportingManagerEmail}
                    onChange={e => setReportingManagerEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-indigo-500"
                  />
                </div>

                {/* Business Justification */}
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">Business Reason & Scope (Mandatory)</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Describe why this access is required for your pharmacy operational duties..."
                    value={businessReason}
                    onChange={e => setBusinessReason(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-indigo-500"
                  />
                </div>

                {/* Date & Expiry */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1">Start Date</label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-slate-400">Temporary Access / Expiry Date</label>
                      <label className="flex items-center gap-1.5 text-xs text-indigo-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={hasExpiry}
                          onChange={e => setHasExpiry(e.target.checked)}
                          className="rounded border-slate-700 text-indigo-600 focus:ring-0"
                        />
                        Set Expiry
                      </label>
                    </div>
                    {hasExpiry && (
                      <input
                        type="date"
                        required={hasExpiry}
                        value={expiryDate}
                        onChange={e => setExpiryDate(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white"
                      />
                    )}
                  </div>
                </div>

                {/* Evidence link & Vault Secret Reference */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1">Supporting Evidence Link (Optional)</label>
                    <input
                      type="url"
                      placeholder="https://drive.google.com/..."
                      value={evidenceUrl}
                      onChange={e => setEvidenceUrl(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1">Secret Ref / Vault Key ID (No plaintext)</label>
                    <input
                      type="text"
                      placeholder="e.g. vault-pos-pass-ref"
                      value={vaultSecretPointer}
                      onChange={e => setVaultSecretPointer(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white font-mono"
                    />
                  </div>
                </div>

                {/* Submit Buttons */}
                <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    {isSubmitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                    Submit Request
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* APPROVAL / REJECTION / PROVISION ACTION MODAL */}
      <AnimatePresence>
        {showActionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  {showActionModal.action === 'APPROVE' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                  {showActionModal.action === 'REJECT' && <XCircle className="w-5 h-5 text-rose-400" />}
                  {showActionModal.action === 'PROVISION' && <Key className="w-5 h-5 text-purple-400" />}
                  {showActionModal.action === 'REVOKE' && <XCircle className="w-5 h-5 text-red-400" />}
                  {showActionModal.action} Access Request {showActionModal.request.requestNumber}
                </h3>
                <button onClick={() => setShowActionModal(null)} className="text-slate-400 hover:text-white">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Request Summary Card */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Requester:</span>
                  <span className="text-white font-medium">{showActionModal.request.requesterName} ({showActionModal.request.department})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Resource:</span>
                  <span className="text-indigo-400 font-semibold">{showActionModal.request.resourceName} ({showActionModal.request.requestedAccessLevel})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Sensitivity:</span>
                  <span className="text-amber-400 font-medium">{showActionModal.request.dataSensitivity}</span>
                </div>
              </div>

              {/* Action specific inputs */}
              <div className="space-y-3">
                <label className="text-xs font-medium text-slate-300 block">
                  Comments / Decision Justification {showActionModal.action === 'REJECT' && '(Required)'}
                </label>
                <textarea
                  rows={3}
                  value={actionComments}
                  onChange={e => setActionComments(e.target.value)}
                  placeholder={`Enter ${showActionModal.action.toLowerCase()} remarks and audit comments...`}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-indigo-500"
                />

                {showActionModal.action === 'PROVISION' && (
                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1">
                      Vault Secret Key ID (Optional pointer - NO plaintext passwords)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. vault-account-token-id"
                      value={provisionSecretPointer}
                      onChange={e => setProvisionSecretPointer(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white font-mono"
                    />
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowActionModal(null)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteAction}
                  disabled={isSubmitting || (showActionModal.action === 'REJECT' && !actionComments.trim())}
                  className={`px-5 py-2 rounded-xl text-white text-sm font-medium transition-colors flex items-center gap-2 ${
                    showActionModal.action === 'APPROVE' ? 'bg-emerald-600 hover:bg-emerald-500' :
                    showActionModal.action === 'REJECT' ? 'bg-rose-600 hover:bg-rose-500' :
                    showActionModal.action === 'PROVISION' ? 'bg-purple-600 hover:bg-purple-500' :
                    'bg-red-600 hover:bg-red-500'
                  }`}
                >
                  {isSubmitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                  Confirm {showActionModal.action}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* IMMUTABLE AUDIT TIMELINE MODAL */}
      <AnimatePresence>
        {showTimelineModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl max-h-[85vh] overflow-y-auto shadow-2xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="font-bold text-white text-base flex items-center gap-2">
                    <Shield className="w-5 h-5 text-indigo-400" />
                    Audit Timeline: {showTimelineModal.requestNumber}
                  </h3>
                  <p className="text-xs text-slate-400">{showTimelineModal.resourceName} ({showTimelineModal.requestedAccessLevel})</p>
                </div>
                <button onClick={() => setShowTimelineModal(null)} className="text-slate-400 hover:text-white">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Timeline Items */}
              <div className="space-y-4 pt-2">
                {(!showTimelineModal.auditTimeline || showTimelineModal.auditTimeline.length === 0) ? (
                  <div className="py-6 text-center text-slate-500 text-sm">
                    No timeline records available for this request.
                  </div>
                ) : (
                  showTimelineModal.auditTimeline.map((item, idx) => (
                    <div key={item.id || idx} className="relative pl-6 pb-4 border-l border-slate-800 last:border-0">
                      <div className="absolute -left-1.5 top-0 w-3 h-3 rounded-full bg-indigo-500 ring-4 ring-slate-900" />
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white uppercase tracking-wider">{item.action}</span>
                        <span className="text-xs text-slate-500">{new Date(item.timestamp).toLocaleString()}</span>
                      </div>
                      <div className="text-xs text-indigo-400 mt-0.5">
                        Actor: {item.actorName || item.actorEmail} ({item.actorRole || 'User'})
                      </div>
                      {item.comments && (
                        <p className="text-xs text-slate-300 bg-slate-950/80 p-2.5 rounded-lg mt-2 border border-slate-800/80">
                          {item.comments}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end">
                <button
                  onClick={() => setShowTimelineModal(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-medium text-white"
                >
                  Close Timeline
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* OFFBOARDING BATCH REVOCATION MODAL */}
      <AnimatePresence>
        {showOffboardModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/30">
                    <UserX className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Employee Offboarding Revocation</h3>
                    <p className="text-xs text-slate-400">Automated batch revocation across all systems & audit logging</p>
                  </div>
                </div>
                <button onClick={() => setShowOffboardModal(false)} className="text-slate-400 hover:text-white">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">Select Employee to Offboard</label>
                  <select
                    value={offboardTargetUid}
                    onChange={e => setOffboardTargetUid(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-rose-500"
                  >
                    <option value="">-- Choose Employee --</option>
                    {systemUsers.map(u => (
                      <option key={u.uid} value={u.uid}>
                        {u.displayName || u.email} ({u.role || 'Staff'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">Offboarding Notes & Departure Reason</label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Resignation effective immediately. Revoke POS, ERP, and Wi-Fi access."
                    value={offboardNotes}
                    onChange={e => setOffboardNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-rose-500"
                  />
                </div>

                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    This action will immediately set all Active and Pending access grants for this employee to <strong>Revoked</strong> and log immutable security audit entries.
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowOffboardModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteOffboarding}
                  disabled={isSubmitting || !offboardTargetUid}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-medium transition-colors flex items-center gap-2"
                >
                  {isSubmitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                  Execute Offboarding Revocation
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
