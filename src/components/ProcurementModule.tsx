import React, { useState, useMemo } from 'react';
import { 
  ShoppingCart, Plus, Search, Filter, CheckCircle2, XCircle, 
  AlertTriangle, Clock, FileText, Building2, DollarSign, 
  Package, Truck, Receipt, Check, RefreshCw, ChevronRight, 
  Layers, ExternalLink, ShieldAlert, Star, ArrowRight, Eye, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  PurchaseRequisition, 
  PurchaseOrder, 
  GoodsReceiptNote, 
  Supplier, 
  DepartmentBudget, 
  InvoiceMatchRecord, 
  PRLineItem, 
  UserRole 
} from '../types';
import { useDepartments } from '../hooks/useDepartments';
import { calculatePRTotals } from '../schema/validation';

interface ProcurementModuleProps {
  requisitions: PurchaseRequisition[];
  purchaseOrders: PurchaseOrder[];
  goodsReceipts: GoodsReceiptNote[];
  suppliers: Supplier[];
  budgets: DepartmentBudget[];
  invoiceMatches: InvoiceMatchRecord[];
  currentUser: any;
  userRole: UserRole | string;
  onRefresh?: () => void;
}

export const PR_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  Draft: { bg: 'bg-slate-500/10', text: 'text-slate-400' },
  Submitted: { bg: 'bg-sky-500/10', text: 'text-sky-400' },
  'Manager Review': { bg: 'bg-amber-500/10', text: 'text-amber-400' },
  'Finance Review': { bg: 'bg-purple-500/10', text: 'text-purple-400' },
  Approved: { bg: 'bg-indigo-500/10', text: 'text-indigo-400' },
  'PO Issued': { bg: 'bg-blue-500/10', text: 'text-blue-400' },
  Ordered: { bg: 'bg-cyan-500/10', text: 'text-cyan-400' },
  'Partially Received': { bg: 'bg-orange-500/10', text: 'text-orange-400' },
  'Fully Received': { bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  'Invoice Matched': { bg: 'bg-teal-500/10', text: 'text-teal-400' },
  'Payment Pending': { bg: 'bg-yellow-500/10', text: 'text-yellow-400' },
  Paid: { bg: 'bg-emerald-600/20', text: 'text-emerald-300' },
  Closed: { bg: 'bg-stone-500/10', text: 'text-stone-400' },
  'Returned for Revision': { bg: 'bg-rose-500/10', text: 'text-rose-400' },
  Rejected: { bg: 'bg-red-500/10', text: 'text-red-400' },
  Cancelled: { bg: 'bg-zinc-500/10', text: 'text-zinc-400' }
};

export const ProcurementModule: React.FC<ProcurementModuleProps> = ({
  requisitions = [],
  purchaseOrders = [],
  goodsReceipts = [],
  suppliers = [],
  budgets = [],
  invoiceMatches = [],
  currentUser,
  userRole,
  onRefresh
}) => {
  const { departments } = useDepartments();

  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'prs' | 'pos' | 'grns' | 'matching' | 'suppliers' | 'budgets'>('prs');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [deptFilter, setDeptFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals
  const [showCreatePRModal, setShowCreatePRModal] = useState<boolean>(false);
  const [showCreatePOModal, setShowCreatePOModal] = useState<PurchaseRequisition | null>(null);
  const [showCreateGRNModal, setShowCreateGRNModal] = useState<PurchaseOrder | null>(null);
  const [showMatchModal, setShowMatchModal] = useState<PurchaseOrder | null>(null);
  const [showSupplierModal, setShowSupplierModal] = useState<boolean>(false);
  const [showReviewModal, setShowReviewModal] = useState<{ pr: PurchaseRequisition; action: 'APPROVE' | 'REJECT' | 'RETURN_FOR_REVISION' } | null>(null);
  const [selectedPRDetail, setSelectedPRDetail] = useState<PurchaseRequisition | null>(null);

  // Notifications & State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form State: New Requisition (PR)
  const [prDepartment, setPrDepartment] = useState<string>(departments[0] || 'IT');
  const [prJustification, setPrJustification] = useState<string>('');
  const [prRequiredDate, setPrRequiredDate] = useState<string>(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
  const [prDeliveryLocation, setPrDeliveryLocation] = useState<string>('Main Pharmacy Store');
  const [prPreferredSupplier, setPrPreferredSupplier] = useState<string>('');
  const [prCurrency, setPrCurrency] = useState<string>('MMK');
  const [prLineItems, setPrLineItems] = useState<any[]>([
    { id: 'line-1', item: '', category: 'Computer', quantity: 1, unitPrice: 0, discount: 0, taxPercent: 0, shippingShare: 0 }
  ]);

  // Form State: Issue Purchase Order
  const [poSupplierName, setPoSupplierName] = useState<string>('');
  const [poSupplierEmail, setPoSupplierEmail] = useState<string>('');
  const [poSupplierPhone, setPoSupplierPhone] = useState<string>('');
  const [poExpectedDate, setPoExpectedDate] = useState<string>('');

  // Form State: Goods Receipt Note (GRN)
  const [grnRemarks, setGrnRemarks] = useState<string>('');
  const [grnCreateAssets, setGrnCreateAssets] = useState<boolean>(true);
  const [grnReceivedRows, setGrnReceivedRows] = useState<any[]>([]);

  // Form State: 3-Way Match & Invoice
  const [matchInvoiceNum, setMatchInvoiceNum] = useState<string>('');
  const [matchInvoiceDate, setMatchInvoiceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [matchInvoiceAmount, setMatchInvoiceAmount] = useState<number>(0);
  const [matchTolerance, setMatchTolerance] = useState<number>(0);
  const [matchApprovePayment, setMatchApprovePayment] = useState<boolean>(false);

  // Form State: Review & Approval
  const [reviewComments, setReviewComments] = useState<string>('');

  // Form State: Supplier
  const [suppName, setSuppName] = useState<string>('');
  const [suppContact, setSuppContact] = useState<string>('');
  const [suppEmail, setSuppEmail] = useState<string>('');
  const [suppPhone, setSuppPhone] = useState<string>('');
  const [suppPaymentTerms, setSuppPaymentTerms] = useState<string>('Net 30');
  const [suppScore, setSuppScore] = useState<number>(5);

  const isSuperAdmin = userRole === UserRole.SUPER_ADMIN || currentUser?.email === 'it.taunggyipharmacy@gmail.com';
  const isSupervisor = isSuperAdmin || userRole === UserRole.IT_SUPERVISOR;
  const isFinance = isSuperAdmin || userRole === 'finance_manager' || isSupervisor;

  // Live calculation of PR line items in form
  const livePRTotals = useMemo(() => {
    return calculatePRTotals(prLineItems);
  }, [prLineItems]);

  // Check budget headroom for selected department in PR form
  const currentDeptBudget = useMemo(() => {
    return budgets.find(b => b.department === prDepartment);
  }, [budgets, prDepartment]);

  const budgetWarning = useMemo(() => {
    if (!currentDeptBudget) return null;
    if (livePRTotals.grandTotal > currentDeptBudget.remainingBudget) {
      return `Warning: Grand Total (${livePRTotals.grandTotal.toLocaleString()} MMK) exceeds remaining department budget (${currentDeptBudget.remainingBudget.toLocaleString()} MMK). Super Admin approval will be mandatory.`;
    }
    return null;
  }, [currentDeptBudget, livePRTotals.grandTotal]);

  // Filtered PRs
  const filteredPRs = useMemo(() => {
    return requisitions.filter(pr => {
      if (deptFilter !== 'ALL' && pr.department !== deptFilter) return false;
      if (statusFilter !== 'ALL' && pr.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNum = pr.prNumber?.toLowerCase().includes(q);
        const matchReq = pr.requesterName?.toLowerCase().includes(q);
        const matchJust = pr.businessJustification?.toLowerCase().includes(q);
        const matchItem = pr.lineItems?.some(i => i.item.toLowerCase().includes(q));
        if (!matchNum && !matchReq && !matchJust && !matchItem) return false;
      }
      return true;
    });
  }, [requisitions, deptFilter, statusFilter, searchQuery]);

  // Handlers for PR Lines
  const handleAddPRLine = () => {
    setPrLineItems(prev => [
      ...prev,
      { id: `line-${prev.length + 1}`, item: '', category: 'Computer', quantity: 1, unitPrice: 0, discount: 0, taxPercent: 0, shippingShare: 0 }
    ]);
  };

  const handleRemovePRLine = (index: number) => {
    if (prLineItems.length <= 1) return;
    setPrLineItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdatePRLine = (index: number, field: string, value: any) => {
    setPrLineItems(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Submit Purchase Requisition
  const handleSubmitPR = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    const token = await currentUser?.getIdToken?.();
    const payload = {
      requesterUid: currentUser?.uid,
      requesterName: currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Staff',
      requesterEmail: currentUser?.email,
      department: prDepartment,
      businessJustification: prJustification,
      requiredDate: prRequiredDate,
      deliveryLocation: prDeliveryLocation,
      preferredSupplier: prPreferredSupplier || undefined,
      currency: prCurrency,
      lineItems: prLineItems,
      status: 'Submitted'
    };

    try {
      const res = await fetch('/api/procurement/requisitions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.details?.join(', ') || 'Failed to submit PR');
      }

      setSuccessMessage(`Purchase Requisition ${data.prNumber} created successfully! Total: ${data.grandTotal.toLocaleString()} MMK`);
      setShowCreatePRModal(false);
      setPrJustification('');
      setPrLineItems([{ id: 'line-1', item: '', category: 'Computer', quantity: 1, unitPrice: 0, discount: 0, taxPercent: 0, shippingShare: 0 }]);
      if (onRefresh) onRefresh();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error submitting requisition');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Review / Approve Requisition
  const handleExecuteReview = async () => {
    if (!showReviewModal) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    const { pr, action } = showReviewModal;
    const token = await currentUser?.getIdToken?.();

    try {
      const res = await fetch(`/api/procurement/requisitions/${pr.id}/review`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action,
          comments: reviewComments
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update requisition');
      }

      setSuccessMessage(`Requisition ${pr.prNumber} updated to '${data.status}'!`);
      setShowReviewModal(null);
      setReviewComments('');
      if (onRefresh) onRefresh();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error updating requisition');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Issue Purchase Order (PO)
  const handleOpenIssuePO = (pr: PurchaseRequisition) => {
    setShowCreatePOModal(pr);
    setPoSupplierName(pr.preferredSupplier || (suppliers[0]?.name || ''));
    setPoExpectedDate(pr.requiredDate || '');
  };

  const handleExecuteIssuePO = async () => {
    if (!showCreatePOModal) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    const token = await currentUser?.getIdToken?.();

    try {
      const res = await fetch('/api/procurement/purchase-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          prId: showCreatePOModal.id,
          supplierName: poSupplierName,
          supplierEmail: poSupplierEmail,
          supplierPhone: poSupplierPhone,
          expectedDeliveryDate: poExpectedDate
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to issue Purchase Order');
      }

      setSuccessMessage(`Purchase Order ${data.poNumber} issued successfully!`);
      setShowCreatePOModal(null);
      if (onRefresh) onRefresh();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error issuing purchase order');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Goods Receipt Note (GRN)
  const handleOpenGRN = (po: PurchaseOrder) => {
    setShowCreateGRNModal(po);
    setGrnRemarks('');
    setGrnCreateAssets(true);

    // Calculate previously received for each line item
    const rows = (po.lineItems || []).map(line => {
      let prevQty = 0;
      goodsReceipts.filter(g => g.poId === po.id).forEach(g => {
        const item = g.items?.find(i => i.poLineItemId === line.id || i.item === line.item);
        if (item) prevQty += Number(item.newlyReceivedQty) || 0;
      });

      const remaining = Math.max(0, line.quantity - prevQty);
      return {
        poLineItemId: line.id,
        item: line.item,
        category: line.category || 'Computer',
        orderedQty: line.quantity,
        previousReceivedQty: prevQty,
        newlyReceivedQty: remaining,
        unitPrice: line.unitPrice,
        serialNumbers: Array(remaining).fill('')
      };
    });

    setGrnReceivedRows(rows);
  };

  // Submit Goods Receipt Note
  const handleExecuteGRN = async () => {
    if (!showCreateGRNModal) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    const token = await currentUser?.getIdToken?.();

    try {
      const res = await fetch('/api/procurement/goods-receipts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          poId: showCreateGRNModal.id,
          receivedItems: grnReceivedRows,
          createAssets: grnCreateAssets,
          remarks: grnRemarks
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.details?.join(', ') || 'Failed to process goods receipt');
      }

      setSuccessMessage(`Goods Receipt ${data.grnNumber} processed! Created ${data.createdAssetsCount || 0} hardware assets in inventory.`);
      setShowCreateGRNModal(null);
      if (onRefresh) onRefresh();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error processing goods receipt');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open 3-Way Match
  const handleOpen3WayMatch = (po: PurchaseOrder) => {
    setShowMatchModal(po);
    setMatchInvoiceNum(`INV-${Date.now().toString().slice(-5)}`);
    setMatchInvoiceAmount(po.grandTotal);
    setMatchTolerance(0);
    setMatchApprovePayment(false);
  };

  // Submit 3-Way Match
  const handleExecute3WayMatch = async () => {
    if (!showMatchModal) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    const token = await currentUser?.getIdToken?.();

    try {
      const res = await fetch('/api/procurement/invoices/match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          poId: showMatchModal.id,
          invoiceNumber: matchInvoiceNum,
          invoiceDate: matchInvoiceDate,
          invoiceAmount: matchInvoiceAmount,
          tolerancePercent: matchTolerance,
          approvePayment: matchApprovePayment
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to execute 3-way match');
      }

      if (data.matchResult?.matched) {
        setSuccessMessage(`3-Way Match Successful! Line items, quantities, and amount verified.${data.paymentApproved ? ' Payment Approved & Marked Paid.' : ''}`);
      } else {
        setErrorMessage(`3-Way Match Discrepancy Found: ${data.matchResult?.discrepancyDetails}`);
      }

      setShowMatchModal(null);
      if (onRefresh) onRefresh();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error executing match');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="procurement-container" className="space-y-6">
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

      {/* Header & Main Controls */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <ShoppingCart className="w-7 h-7 text-indigo-400" />
            Procurement & Purchasing
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Enterprise PR workflow, approval threshold matrix, PO tracking, GRN auto-tagging, and 3-way invoice matching.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <button
            id="btn-create-pr"
            onClick={() => setShowCreatePRModal(true)}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Purchase Requisition
          </button>
        </div>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total PRs</span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white mt-2">{requisitions.length}</p>
          <span className="text-xs text-slate-500 mt-1 block">Active requisitions</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">POs Issued</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white mt-2">{purchaseOrders.length}</p>
          <span className="text-xs text-slate-500 mt-1 block">Formal orders placed</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">GRNs Received</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white mt-2">{goodsReceipts.length}</p>
          <span className="text-xs text-slate-500 mt-1 block">Goods verified & tagged</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">3-Way Matched</span>
            <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white mt-2">{invoiceMatches.filter(m => m.matchStatus === 'Matched').length}</p>
          <span className="text-xs text-slate-500 mt-1 block">Invoices verified</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('prs')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'prs' 
              ? 'bg-slate-800 text-white border border-slate-700' 
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
          }`}
        >
          <FileText className="w-4 h-4" />
          Requisitions ({requisitions.length})
        </button>

        <button
          onClick={() => setActiveTab('pos')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'pos' 
              ? 'bg-slate-800 text-white border border-slate-700' 
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
          }`}
        >
          <Package className="w-4 h-4" />
          Purchase Orders ({purchaseOrders.length})
        </button>

        <button
          onClick={() => setActiveTab('grns')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'grns' 
              ? 'bg-slate-800 text-white border border-slate-700' 
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
          }`}
        >
          <Truck className="w-4 h-4" />
          Goods Receipts ({goodsReceipts.length})
        </button>

        <button
          onClick={() => setActiveTab('matching')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'matching' 
              ? 'bg-slate-800 text-white border border-slate-700' 
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
          }`}
        >
          <Receipt className="w-4 h-4" />
          3-Way Invoices ({invoiceMatches.length})
        </button>

        <button
          onClick={() => setActiveTab('suppliers')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'suppliers' 
              ? 'bg-slate-800 text-white border border-slate-700' 
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Suppliers Directory ({suppliers.length})
        </button>

        <button
          onClick={() => setActiveTab('budgets')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'budgets' 
              ? 'bg-slate-800 text-white border border-slate-700' 
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          Department Budgets ({budgets.length})
        </button>
      </div>

      {/* TAB 1: PURCHASE REQUISITIONS */}
      {activeTab === 'prs' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search PR #, requester, items..."
                className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-medium text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">All PR Statuses</option>
                <option value="Submitted">Submitted</option>
                <option value="Finance Review">Finance Review</option>
                <option value="Approved">Approved</option>
                <option value="PO Issued">PO Issued</option>
                <option value="Fully Received">Fully Received</option>
                <option value="Paid">Paid</option>
                <option value="Returned for Revision">Returned for Revision</option>
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
            </div>
          </div>

          {/* PR Table */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/80 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">PR Number</th>
                    <th className="py-3.5 px-4">Requester & Dept</th>
                    <th className="py-3.5 px-4">Items Summary</th>
                    <th className="py-3.5 px-4">Grand Total</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Required Date</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredPRs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        No purchase requisitions found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredPRs.map(pr => {
                      const statusStyle = PR_STATUS_COLORS[pr.status] || PR_STATUS_COLORS.Draft;
                      const isOwn = pr.requesterUid === currentUser?.uid;

                      return (
                        <tr key={pr.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-medium text-white">
                            {pr.prNumber || pr.id.slice(0, 8)}
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-medium text-slate-200">{pr.requesterName}</div>
                            <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                              <Building2 className="w-3 h-3" />
                              {pr.department}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="text-slate-200 text-xs">
                              {pr.lineItems?.length || 0} line item(s): {pr.lineItems?.[0]?.item} {pr.lineItems && pr.lineItems.length > 1 ? `+${pr.lineItems.length - 1} more` : ''}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 font-bold text-white">
                            {pr.grandTotal?.toLocaleString()} {pr.currency || 'MMK'}
                          </td>

                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                              {pr.status}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-xs text-slate-400">
                            {pr.requiredDate}
                          </td>

                          <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                            {/* View Detail */}
                            <button
                              onClick={() => setSelectedPRDetail(pr)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Approve / Reject (Anti-self-approval rule enforced) */}
                            {(pr.status === 'Submitted' || pr.status === 'Finance Review' || pr.status === 'Manager Review') && (
                              <>
                                <button
                                  disabled={isOwn && !isSuperAdmin}
                                  onClick={() => setShowReviewModal({ pr, action: 'APPROVE' })}
                                  className={`p-1.5 rounded-lg transition-colors ${
                                    isOwn && !isSuperAdmin 
                                      ? 'bg-slate-800/40 text-slate-600 cursor-not-allowed' 
                                      : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  }`}
                                  title={isOwn && !isSuperAdmin ? 'Anti-Self-Approval: Cannot approve own requisition' : 'Approve Requisition'}
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  disabled={isOwn && !isSuperAdmin}
                                  onClick={() => setShowReviewModal({ pr, action: 'REJECT' })}
                                  className={`p-1.5 rounded-lg transition-colors ${
                                    isOwn && !isSuperAdmin 
                                      ? 'bg-slate-800/40 text-slate-600 cursor-not-allowed' 
                                      : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                  }`}
                                  title="Reject Requisition"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </>
                            )}

                            {/* Issue PO */}
                            {pr.status === 'Approved' && isSupervisor && (
                              <button
                                onClick={() => handleOpenIssuePO(pr)}
                                className="px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-medium inline-flex items-center gap-1"
                              >
                                <Package className="w-3.5 h-3.5" />
                                Issue PO
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

      {/* TAB 2: PURCHASE ORDERS (POs) */}
      {activeTab === 'pos' && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">PO Number</th>
                  <th className="py-3.5 px-4">PR Ref</th>
                  <th className="py-3.5 px-4">Supplier</th>
                  <th className="py-3.5 px-4">Grand Total</th>
                  <th className="py-3.5 px-4">Order Date</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {purchaseOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      No Purchase Orders issued yet. Approve a Requisition to issue a PO.
                    </td>
                  </tr>
                ) : (
                  purchaseOrders.map(po => {
                    const isFullyReceived = po.status === 'Fully Received';
                    return (
                      <tr key={po.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-medium text-white">{po.poNumber}</td>
                        <td className="py-3.5 px-4 text-slate-400 text-xs font-mono">{po.prNumber || po.prId}</td>
                        <td className="py-3.5 px-4 font-medium text-slate-200">{po.supplierName}</td>
                        <td className="py-3.5 px-4 font-bold text-white">{po.grandTotal?.toLocaleString()} {po.currency || 'MMK'}</td>
                        <td className="py-3.5 px-4 text-xs text-slate-400">{po.orderDate}</td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${
                            po.status === 'Fully Received' ? 'bg-emerald-500/10 text-emerald-400' :
                            po.status === 'Partially Received' ? 'bg-orange-500/10 text-orange-400' :
                            'bg-blue-500/10 text-blue-400'
                          }`}>
                            {po.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                          {/* Receive Goods GRN */}
                          {!isFullyReceived && isSupervisor && (
                            <button
                              onClick={() => handleOpenGRN(po)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-medium inline-flex items-center gap-1"
                            >
                              <Truck className="w-3.5 h-3.5" />
                              Receive (GRN)
                            </button>
                          )}

                          {/* 3-Way Match */}
                          {isFinance && (
                            <button
                              onClick={() => handleOpen3WayMatch(po)}
                              className="px-2.5 py-1 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-medium inline-flex items-center gap-1"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                              3-Way Match
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
      )}

      {/* TAB 3: GOODS RECEIPT NOTES (GRNs) */}
      {activeTab === 'grns' && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">GRN #</th>
                  <th className="py-3.5 px-4">PO Reference</th>
                  <th className="py-3.5 px-4">Received Date</th>
                  <th className="py-3.5 px-4">Receiver</th>
                  <th className="py-3.5 px-4">Items Received</th>
                  <th className="py-3.5 px-4">Asset Tagging</th>
                  <th className="py-3.5 px-4">Completion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {goodsReceipts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      <Truck className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      No Goods Receipts logged yet.
                    </td>
                  </tr>
                ) : (
                  goodsReceipts.map(grn => (
                    <tr key={grn.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-medium text-white">{grn.grnNumber}</td>
                      <td className="py-3.5 px-4 text-xs font-mono text-indigo-400">{grn.poNumber}</td>
                      <td className="py-3.5 px-4 text-xs text-slate-300">{grn.receivedDate}</td>
                      <td className="py-3.5 px-4 text-xs text-slate-300">{grn.receivedByName}</td>
                      <td className="py-3.5 px-4 text-xs">
                        {grn.items?.map((i, idx) => (
                          <div key={idx} className="text-slate-200">
                            • {i.item}: <strong>{i.newlyReceivedQty}</strong> received
                          </div>
                        ))}
                      </td>
                      <td className="py-3.5 px-4">
                        {grn.assetsCreated ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                            <Sparkles className="w-3.5 h-3.5" /> Auto-Generated Assets
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500">Manual / Consumable</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          grn.isFinalReceipt ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-orange-500/10 text-orange-400 border border-orange-500/30'
                        }`}>
                          {grn.isFinalReceipt ? 'Full Order' : 'Partial Receipt'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: 3-WAY MATCHING */}
      {activeTab === 'matching' && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Invoice #</th>
                  <th className="py-3.5 px-4">PO Ref & Dept</th>
                  <th className="py-3.5 px-4">Invoice Amount</th>
                  <th className="py-3.5 px-4">Item & Qty Match</th>
                  <th className="py-3.5 px-4">Price Match</th>
                  <th className="py-3.5 px-4">Match Status</th>
                  <th className="py-3.5 px-4">Payment Approval</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {invoiceMatches.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      No 3-Way Match records found.
                    </td>
                  </tr>
                ) : (
                  invoiceMatches.map(rec => (
                    <tr key={rec.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-medium text-white">{rec.invoiceNumber}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-mono text-xs text-indigo-400">{rec.poNumber}</div>
                        <div className="text-xs text-slate-400">{rec.department}</div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-white">
                        {rec.invoiceAmount?.toLocaleString()} {rec.currency || 'MMK'}
                      </td>
                      <td className="py-3.5 px-4">
                        {rec.quantityMatch ? (
                          <span className="text-emerald-400 text-xs flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> 100% Received</span>
                        ) : (
                          <span className="text-rose-400 text-xs flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Qty Mismatch</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {rec.amountMatch ? (
                          <span className="text-emerald-400 text-xs flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Within Tolerance</span>
                        ) : (
                          <span className="text-rose-400 text-xs flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Amount Mismatch</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          rec.matchStatus === 'Matched' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        }`}>
                          {rec.matchStatus}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        {rec.paymentApproved ? (
                          <div className="text-emerald-400 font-medium flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Paid / Approved
                          </div>
                        ) : (
                          <div className="text-amber-400 font-medium">Pending Release</div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: SUPPLIERS DIRECTORY */}
      {activeTab === 'suppliers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.length === 0 ? (
            <div className="col-span-3 py-12 text-center text-slate-500 bg-slate-900/50 rounded-xl border border-slate-800">
              <Building2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
              No verified suppliers listed yet.
            </div>
          ) : (
            suppliers.map(supp => (
              <div key={supp.id} className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-white text-base">{supp.name}</h3>
                    <div className="flex items-center gap-1 text-amber-400 text-xs font-bold">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      {supp.vendorScore || 5}.0
                    </div>
                  </div>
                  <span className="text-xs text-indigo-400 font-medium block mt-1">Contact: {supp.contactPerson}</span>
                  <div className="mt-3 space-y-1 text-xs text-slate-400">
                    <div>Email: {supp.email || 'N/A'}</div>
                    <div>Phone: {supp.phone || 'N/A'}</div>
                    <div>Payment Terms: <strong className="text-slate-300">{supp.paymentTerms}</strong></div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-500 flex items-center justify-between">
                  <span>Lead Time: ~{supp.averageLeadTimeDays || 7} days</span>
                  <span className="text-emerald-400">Verified Vendor</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 6: DEPARTMENT BUDGETS */}
      {activeTab === 'budgets' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgets.length === 0 ? (
            <div className="col-span-3 py-12 text-center text-slate-500 bg-slate-900/50 rounded-xl border border-slate-800">
              <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-40" />
              No department budgets configured for this fiscal year.
            </div>
          ) : (
            budgets.map(b => {
              const spentPct = Math.min(100, Math.round(((b.spentBudget + b.reservedBudget) / (b.totalBudget || 1)) * 100));
              return (
                <div key={b.id} className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-white text-base">{b.department}</h3>
                      <span className="text-xs text-slate-400">FY {b.fiscalYear} Budget</span>
                    </div>
                    <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                      {b.currency || 'MMK'}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Allocated Budget:</span>
                      <span className="text-white font-bold">{b.totalBudget.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Committed / Reserved:</span>
                      <span className="text-amber-400 font-medium">{b.reservedBudget.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Spent / Paid:</span>
                      <span className="text-emerald-400 font-medium">{b.spentBudget.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs pt-1 border-t border-slate-800">
                      <span className="text-slate-300 font-semibold">Remaining Headroom:</span>
                      <span className={`font-bold ${b.remainingBudget < 0 ? 'text-rose-400' : 'text-indigo-300'}`}>
                        {b.remainingBudget.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Budget bar */}
                  <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div 
                      className={`h-full rounded-full ${spentPct > 90 ? 'bg-rose-500' : spentPct > 70 ? 'bg-amber-500' : 'bg-indigo-500'}`}
                      style={{ width: `${spentPct}%` }}
                    />
                  </div>
                  <div className="text-right text-[11px] text-slate-500">{spentPct}% utilized</div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* CREATE PURCHASE REQUISITION MODAL */}
      <AnimatePresence>
        {showCreatePRModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-5"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Create Purchase Requisition (PR)</h2>
                    <p className="text-xs text-slate-400">Multi-line procurement request with automatic threshold review & budget calculation</p>
                  </div>
                </div>
                <button onClick={() => setShowCreatePRModal(false)} className="text-slate-400 hover:text-white">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitPR} className="space-y-5">
                {/* Header Information */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800/80">
                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1">Department</label>
                    <select
                      value={prDepartment}
                      onChange={e => setPrDepartment(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white focus:border-indigo-500"
                    >
                      {departments.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1">Required By Date</label>
                    <input
                      type="date"
                      required
                      value={prRequiredDate}
                      onChange={e => setPrRequiredDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1">Currency</label>
                    <select
                      value={prCurrency}
                      onChange={e => setPrCurrency(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white"
                    >
                      <option value="MMK">MMK (Myanmar Kyats)</option>
                      <option value="USD">USD (US Dollars)</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-xs font-medium text-slate-400 block mb-1">Business Justification</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Upgrading pharmacy counter POS hardware and barcode scanner..."
                      value={prJustification}
                      onChange={e => setPrJustification(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1">Delivery Location</label>
                    <input
                      type="text"
                      value={prDeliveryLocation}
                      onChange={e => setPrDeliveryLocation(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white"
                    />
                  </div>
                </div>

                {/* Line Items Table */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                      Requisition Line Items ({prLineItems.length})
                    </h3>
                    <button
                      type="button"
                      onClick={handleAddPRLine}
                      className="px-3 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white text-xs font-medium transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Item
                    </button>
                  </div>

                  <div className="space-y-2">
                    {prLineItems.map((line, idx) => (
                      <div key={line.id || idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap lg:flex-nowrap items-center gap-3">
                        <span className="text-xs font-mono text-slate-500 w-6">#{idx + 1}</span>

                        {/* Item Name */}
                        <div className="w-full lg:w-48">
                          <input
                            type="text"
                            required
                            placeholder="Item Name / Model"
                            value={line.item}
                            onChange={e => handleUpdatePRLine(idx, 'item', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                          />
                        </div>

                        {/* Category */}
                        <div className="w-32">
                          <select
                            value={line.category}
                            onChange={e => handleUpdatePRLine(idx, 'category', e.target.value)}
                            className="w-full px-2 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                          >
                            <option value="Computer">Computer</option>
                            <option value="Keyboard">Keyboard</option>
                            <option value="Mouse">Mouse</option>
                            <option value="Printer">Printer</option>
                            <option value="Scanner">Scanner</option>
                            <option value="Network">Network</option>
                            <option value="Software">Software</option>
                            <option value="Accessory">Accessory</option>
                          </select>
                        </div>

                        {/* Quantity */}
                        <div className="w-20">
                          <input
                            type="number"
                            min="1"
                            placeholder="Qty"
                            value={line.quantity}
                            onChange={e => handleUpdatePRLine(idx, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-full px-2 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                          />
                        </div>

                        {/* Unit Price */}
                        <div className="w-32">
                          <input
                            type="number"
                            min="0"
                            placeholder="Unit Price"
                            value={line.unitPrice}
                            onChange={e => handleUpdatePRLine(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                          />
                        </div>

                        {/* Discount */}
                        <div className="w-24">
                          <input
                            type="number"
                            min="0"
                            placeholder="Disc."
                            value={line.discount}
                            onChange={e => handleUpdatePRLine(idx, 'discount', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                          />
                        </div>

                        {/* Tax % */}
                        <div className="w-20">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            placeholder="Tax %"
                            value={line.taxPercent}
                            onChange={e => handleUpdatePRLine(idx, 'taxPercent', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                          />
                        </div>

                        {/* Line Total */}
                        <div className="w-28 text-right font-bold text-xs text-indigo-400 font-mono">
                          {((line.quantity * line.unitPrice - (line.discount || 0)) * (1 + (line.taxPercent || 0) / 100)).toLocaleString()}
                        </div>

                        {/* Remove */}
                        <button
                          type="button"
                          disabled={prLineItems.length <= 1}
                          onClick={() => handleRemovePRLine(idx)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 disabled:opacity-30"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Calculation Summary Card */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="space-y-1 text-xs text-slate-400">
                    <div>Subtotal: <strong className="text-white">{livePRTotals.subtotal.toLocaleString()} {prCurrency}</strong></div>
                    <div>Total Discounts: <strong className="text-emerald-400">-{livePRTotals.discountTotal.toLocaleString()} {prCurrency}</strong></div>
                    <div>Taxes: <strong className="text-slate-300">+{livePRTotals.taxTotal.toLocaleString()} {prCurrency}</strong></div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-slate-400 block uppercase">Grand Total</span>
                    <span className="text-2xl font-black text-indigo-400">
                      {livePRTotals.grandTotal.toLocaleString()} {prCurrency}
                    </span>
                  </div>
                </div>

                {/* Budget Warning Banner */}
                {budgetWarning && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{budgetWarning}</span>
                  </div>
                )}

                {/* Submit Buttons */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreatePRModal(false)}
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
                    Submit Requisition
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ISSUE PURCHASE ORDER (PO) MODAL */}
      <AnimatePresence>
        {showCreatePOModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/30">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Issue Purchase Order</h3>
                    <p className="text-xs text-slate-400">Formal order for PR {showCreatePOModal.prNumber}</p>
                  </div>
                </div>
                <button onClick={() => setShowCreatePOModal(null)} className="text-slate-400 hover:text-white">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">Supplier Company Name</label>
                  <input
                    type="text"
                    required
                    value={poSupplierName}
                    onChange={e => setPoSupplierName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1">Supplier Email</label>
                    <input
                      type="email"
                      value={poSupplierEmail}
                      onChange={e => setPoSupplierEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1">Supplier Phone</label>
                    <input
                      type="tel"
                      value={poSupplierPhone}
                      onChange={e => setPoSupplierPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">Expected Delivery Date</label>
                  <input
                    type="date"
                    value={poExpectedDate}
                    onChange={e => setPoExpectedDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreatePOModal(null)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmitting || !poSupplierName.trim()}
                  onClick={handleExecuteIssuePO}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors flex items-center gap-2"
                >
                  {isSubmitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                  Confirm Issue PO
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* GOODS RECEIPT NOTE (GRN) MODAL */}
      <AnimatePresence>
        {showCreateGRNModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Receive Goods (GRN)</h3>
                    <p className="text-xs text-slate-400">PO Ref: {showCreateGRNModal.poNumber} ({showCreateGRNModal.supplierName})</p>
                  </div>
                </div>
                <button onClick={() => setShowCreateGRNModal(null)} className="text-slate-400 hover:text-white">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Received rows */}
                <div className="space-y-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-300 block">
                    Verify Delivered Quantities & Serial Numbers
                  </span>
                  {grnReceivedRows.map((row, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-white">{row.item} ({row.category})</span>
                        <span className="text-xs text-slate-400">
                          Ordered: {row.orderedQty} | Prev: {row.previousReceivedQty}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <label className="text-xs text-slate-400">Newly Received Qty:</label>
                        <input
                          type="number"
                          min="0"
                          max={row.orderedQty - row.previousReceivedQty}
                          value={row.newlyReceivedQty}
                          onChange={e => {
                            const val = Math.max(0, parseInt(e.target.value) || 0);
                            setGrnReceivedRows(prev => {
                              const copy = [...prev];
                              copy[idx] = { ...copy[idx], newlyReceivedQty: val };
                              return copy;
                            });
                          }}
                          className="w-24 px-2 py-1 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Auto Create Assets Checkbox */}
                <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <div>
                      <span className="text-xs font-bold text-white block">Auto-Create Hardware Assets</span>
                      <span className="text-[11px] text-slate-400">Generates IT asset codes (e.g. TG-PC-XXX) in asset inventory</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={grnCreateAssets}
                    onChange={e => setGrnCreateAssets(e.target.checked)}
                    className="rounded border-slate-700 text-indigo-600 focus:ring-0 w-4 h-4"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">Receipt Remarks & Condition</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Checked all packaging, verified intact, delivery note signed."
                    value={grnRemarks}
                    onChange={e => setGrnRemarks(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateGRNModal(null)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleExecuteGRN}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors flex items-center gap-2"
                >
                  {isSubmitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                  Confirm Goods Receipt
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3-WAY MATCHING MODAL */}
      <AnimatePresence>
        {showMatchModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/30">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">3-Way Match & Invoice Verification</h3>
                    <p className="text-xs text-slate-400">PO Ref: {showMatchModal.poNumber} | Authorized: {showMatchModal.grandTotal.toLocaleString()} {showMatchModal.currency}</p>
                  </div>
                </div>
                <button onClick={() => setShowMatchModal(null)} className="text-slate-400 hover:text-white">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">Supplier Invoice Number</label>
                  <input
                    type="text"
                    required
                    value={matchInvoiceNum}
                    onChange={e => setMatchInvoiceNum(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1">Invoice Amount</label>
                    <input
                      type="number"
                      value={matchInvoiceAmount}
                      onChange={e => setMatchInvoiceAmount(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1">Tolerance Allowed (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={matchTolerance}
                      onChange={e => setMatchTolerance(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white"
                    />
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white block">Release & Approve Payment</span>
                    <span className="text-[11px] text-slate-400">If match passes, mark requisition as Paid</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={matchApprovePayment}
                    onChange={e => setMatchApprovePayment(e.target.checked)}
                    className="rounded border-slate-700 text-teal-600 focus:ring-0 w-4 h-4"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowMatchModal(null)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleExecute3WayMatch}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium transition-colors flex items-center gap-2"
                >
                  {isSubmitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                  Verify Match
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* REVIEW & APPROVAL MODAL */}
      <AnimatePresence>
        {showReviewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-bold text-white text-base">
                  {showReviewModal.action} PR {showReviewModal.pr.prNumber}
                </h3>
                <button onClick={() => setShowReviewModal(null)} className="text-slate-400 hover:text-white">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Department:</span>
                  <span className="text-white font-medium">{showReviewModal.pr.department}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Grand Total:</span>
                  <span className="text-indigo-400 font-bold">{showReviewModal.pr.grandTotal.toLocaleString()} {showReviewModal.pr.currency}</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Comments / Decision Reason
                </label>
                <textarea
                  rows={3}
                  value={reviewComments}
                  onChange={e => setReviewComments(e.target.value)}
                  placeholder="Enter decision justification or revision notes..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(null)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleExecuteReview}
                  className={`px-5 py-2 rounded-xl text-white text-sm font-medium transition-colors flex items-center gap-2 ${
                    showReviewModal.action === 'APPROVE' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
                  }`}
                >
                  {isSubmitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                  Confirm {showReviewModal.action}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DETAIL MODAL */}
      <AnimatePresence>
        {selectedPRDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="font-bold text-white text-base">Requisition: {selectedPRDetail.prNumber}</h3>
                  <p className="text-xs text-slate-400">{selectedPRDetail.requesterName} • {selectedPRDetail.department}</p>
                </div>
                <button onClick={() => setSelectedPRDetail(null)} className="text-slate-400 hover:text-white">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                  <div>Justification: <strong className="text-white">{selectedPRDetail.businessJustification}</strong></div>
                  <div>Delivery Location: <strong className="text-slate-300">{selectedPRDetail.deliveryLocation}</strong></div>
                  <div>Status: <strong className="text-indigo-400">{selectedPRDetail.status}</strong></div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs font-semibold uppercase text-slate-400">Line Items</span>
                  <div className="rounded-xl border border-slate-800 overflow-hidden">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-950 font-semibold text-slate-400">
                        <tr>
                          <th className="p-2">Item</th>
                          <th className="p-2">Category</th>
                          <th className="p-2">Qty</th>
                          <th className="p-2">Unit Price</th>
                          <th className="p-2 text-right">Line Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {selectedPRDetail.lineItems?.map((li, i) => (
                          <tr key={i}>
                            <td className="p-2 font-medium text-white">{li.item}</td>
                            <td className="p-2">{li.category}</td>
                            <td className="p-2">{li.quantity}</td>
                            <td className="p-2">{li.unitPrice.toLocaleString()}</td>
                            <td className="p-2 text-right font-bold">{li.lineTotal?.toLocaleString()} {selectedPRDetail.currency}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end">
                <button
                  onClick={() => setSelectedPRDetail(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-medium text-white"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
