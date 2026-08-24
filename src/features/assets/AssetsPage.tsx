import { AssetStatusBadge } from "./components/AssetStatusBadge";
import { AssetEmptyState } from "./components/AssetEmptyState";
import React, { useState, useEffect, useRef, useMemo, Fragment } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Monitor, Plus, Search, Filter, Trash2, Edit3, CheckCircle2, 
  AlertCircle, ChevronDown, ChevronUp, RefreshCw, Download, Upload, 
  FileSpreadsheet, Sparkles, Layers, Box, Cpu, HardDrive, Shield,
  ExternalLink, UserCheck, UserX, Check, Clock, Laptop, ArrowUpDown, ChevronRight, X,
  Package, AlertTriangle, Database, Tag, Settings2, Usb, Link2, MinusSquare, 
  Printer, Keyboard, MousePointer2, Wind, ShieldCheck, Smartphone, Info
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { utils, writeFile, read } from 'xlsx';
import { toast } from 'react-hot-toast';
import { ITAsset, SystemSettings } from '../../types';
import { 
  saveAsset, 
  deleteAsset, 
  clearAllAssets, 
  generateNextAssetCode, 
  updateAssetAssignment, 
  importLegacyExcelData, 
  migrateAssetsToSequentialCodes 
} from '../../services/assetService';
import { saveActivity } from '../../services/kpiService';
import { isHistorical } from '../../utils/file';
import { SearchableSelect } from '../../components/common/SearchableSelect';
import { MultiSelectDropdown } from '../../components/MultiSelectDropdown';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { ResetAssetsButton } from '../../components/ResetAssetsButton';
import { cn } from '../../lib/utils';

export function AssetsModule({ assets, setAssets, searchTerm, isAdmin, settings }: { assets: ITAsset[], setAssets: React.Dispatch<React.SetStateAction<ITAsset[]>>, searchTerm: string, isAdmin: boolean, settings: SystemSettings }) {
 const [isAdding, setIsAdding] = useState(false);
 const [isEditing, setIsEditing] = useState(false);
 const [isDeleting, setIsDeleting] = useState(false);
 const [deleteTarget, setDeleteTarget] = useState<{ id: string | string[]; type: 'asset' | 'bulk-asset' } | null>(null);
 const [selectedAsset, setSelectedAsset] = useState<ITAsset | null>(null);
 const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
 const [newAsset, setNewAsset] = useState<Partial<ITAsset>>({ category: "Computer", status: "Active" });
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  const handleRetry = () => {
    setIsLoading(true);
    setIsError(false);
    setTimeout(() => setIsLoading(false), 600);
  };

 // Hierarchical Filter State
 const [filterCategory, setFilterCategory] = useState<string[]>([]);
 const [selectedCategory, setSelectedCategory] = useState('All');
 const [filterBrand, setFilterBrand] = useState<string[]>([]);
 const [filterModel, setFilterModel] = useState<string[]>([]);
 const [filterSpec, setFilterSpec] = useState<string[]>([]);
 const [filterDept, setFilterDept] = useState<string[]>([]);
 const [filterUser, setFilterUser] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [filterLocation, setFilterLocation] = useState<string[]>([]);
  const [assetSearch, setAssetSearch] = useState("");

  const locations = useMemo(() => Array.from(new Set([...(settings.locations || []), ...assets.map(a => a.location).filter(Boolean)])).sort(), [assets, settings]);

 // Options memoized per level
 const categories = useMemo(() => {
 const baseCategories = ["Computer", "Monitor", "UPS", "Keyboard", "Mouse", "Printer", "Scanner", "Network", "Mobile", "USB Hub", "Fan", "Peripherals", "Other"];
 const foundCategories = assets.map(a => a.category).filter(Boolean);
 return Array.from(new Set([...baseCategories, ...foundCategories])).sort();
 }, [assets]);
 
 const brands = useMemo(() => {
 const filtered = filterCategory.length === 0 ? assets : assets.filter(a => filterCategory.includes(a.category));
 return Array.from(new Set(filtered.map(a => a.brand).filter(Boolean))).sort();
 }, [assets, filterCategory]);

 const models = useMemo(() => {
 let filtered = filterCategory.length === 0 ? assets : assets.filter(a => filterCategory.includes(a.category));
 if (filterBrand.length > 0) filtered = filtered.filter(a => filterBrand.includes(a.brand));
 return Array.from(new Set(filtered.map(a => a.model).filter(Boolean))).sort();
 }, [assets, filterCategory, filterBrand]);

 const specs = useMemo(() => {
 let filtered = filterCategory.length === 0 ? assets : assets.filter(a => filterCategory.includes(a.category));
 if (filterBrand.length > 0) filtered = filtered.filter(a => filterBrand.includes(a.brand));
 if (filterModel.length > 0) filtered = filtered.filter(a => filterModel.includes(a.model));
 return Array.from(new Set(filtered.map(a => a.specs).filter(Boolean))).sort();
 }, [assets, filterCategory, filterBrand, filterModel]);

 const departments = useMemo(() => Array.from(new Set(assets.map(a => a.department || a.location).filter(Boolean))).sort(), [assets]);
 const users = useMemo(() => Array.from(new Set(assets.map(a => a.assignedTo).filter(Boolean))).sort(), [assets]);
 const statuses = useMemo(() => Array.from(new Set(assets.map(a => a.status).filter(Boolean))).sort(), [assets]);

 const displayedAssets = useMemo(() => {
 if (selectedCategory === 'All') return assets;
 
 if (selectedCategory === 'Peripherals') {
 return assets.filter(asset => ['Keyboard', 'Mouse', 'Fan', 'USB Hub'].includes(asset.category));
 }
 
 return assets.filter(asset => asset.category === selectedCategory);
 }, [assets, selectedCategory]);

 const calculateTotalWorkstationValue = (asset: ITAsset) => {
 const basePrice = Number(asset.purchasePrice) || asset.itemPrice || 0;
 const linkedPeripherals = assets.filter(a => a.parentId === asset.id);
 const peripheralsTotal = linkedPeripherals.reduce((sum, p) => sum + (p.itemPrice || Number(p.purchasePrice) || 0), 0);
 return basePrice + peripheralsTotal;
 };

 const handleUnlink = async (childAsset: ITAsset) => {
 try {
 await saveAsset({ ...childAsset, parentId: null, status: "Standalone / Spare" });
 saveActivity({
 action: `Unlinked ${childAsset.model} from parent workstation`,
 details: `Asset ID: ${childAsset.id}`
 });
 } catch (error) {
 console.error("Failed to unlink asset", error);
 }
 };

 const handleLink = async (childId: string, parentId: string) => {
 try {
 const child = assets.find(a => a.id === childId);
 const parent = assets.find(a => a.id === parentId);
 if (child && parent) {
 await saveAsset({ 
 ...child, 
 parentId, 
 status: "Active",
 assignedTo: parent.assignedTo || "Unassigned",
 location: parent.location || "Warehouse",
 department: parent.department || ""
 });
 saveActivity({
 action: `Linked ${child.model} to ${parent.model}`,
 details: `Hierarchy update: ${child.id} -> ${parent.id}`
 });
 }
 } catch (error) {
 console.error("Failed to link asset", error);
 alert("Relational Linkage Failed. Check SOP-001 integrity.");
 }
 };

 const handleDeleteAsset = (docId: string, e: React.MouseEvent) => {
 e.stopPropagation();
 setDeleteTarget({ id: docId, type: 'asset' });
 };

 const executeDelete = async () => {
 if (!deleteTarget) return;
 
 setIsDeleting(true);
 
 if (deleteTarget.type === 'asset' && typeof deleteTarget.id === 'string') {
 const docId = deleteTarget.id;
 const tid = toast.loading("Executing hardware purge...");
 try {
 const linkedPeripherals = assets.filter(a => a.parentId === docId);
 for (const p of linkedPeripherals) {
 await saveAsset({ ...p, parentId: null, status: "Standalone / Spare" });
 }

 await deleteAsset(docId);
 setAssets(prev => prev.filter(item => item.id !== docId));
 toast.success("Asset configuration purged successfully.", { id: tid });
 saveActivity({
 action: `Purged Asset: ${docId}`,
 details: "Security-cleared manual hardware removal"
 });
 } catch (error) {
 console.error("Delete failed", error);
 toast.error("Protocol Violation: Deletion request rejected.", { id: tid });
 }
 } else if (deleteTarget.type === 'bulk-asset' && Array.isArray(deleteTarget.id)) {
 const ids = deleteTarget.id;
 const tid = toast.loading(`Purging ${ids.length} nodes...`);
 try {
 for (const id of ids) {
 await deleteAsset(id);
 }
 setAssets(prev => prev.filter(a => !ids.includes(a.id)));
 setSelectedAssetIds([]);
 toast.success("Bulk purge complete.", { id: tid });
 } catch (error) {
 toast.error("Bulk operation failed.", { id: tid });
 }
 }
 
 setIsDeleting(false);
 setDeleteTarget(null);
 };

 // Auto-reset dependent filters
 useEffect(() => { setFilterBrand([]); setFilterModel([]); setFilterSpec([]); }, [filterCategory]);
 useEffect(() => { setFilterModel([]); setFilterSpec([]); }, [filterBrand]);
 useEffect(() => { setFilterSpec([]); }, [filterModel]);

 const filteredAssets = displayedAssets.filter(asset => {
 const assetDept = asset.department || asset.location;
 const matchesDept = filterDept.length === 0 || filterDept.includes(assetDept);
 const matchesUser = filterUser.length === 0 || filterUser.includes(asset.assignedTo || "");
 const matchesCategory = filterCategory.length === 0 || filterCategory.includes(asset.category);
 const matchesBrand = filterBrand.length === 0 || filterBrand.includes(asset.brand || "");
 const matchesModel = filterModel.length === 0 || filterModel.includes(asset.model);
 const matchesSpec = filterSpec.length === 0 || filterSpec.includes(asset.specs || "");
 const matchesStatus = filterStatus.length === 0 || filterStatus.includes(asset.status);
 const matchesLocation = filterLocation.length === 0 || filterLocation.includes(asset.location || "");
 
 const searchLower = (searchTerm || assetSearch).toLowerCase();
 const matchesSearch = searchLower === "" || 
 asset.id.toLowerCase().includes(searchLower) ||
 asset.model.toLowerCase().includes(searchLower) ||
 (asset.brand?.toLowerCase() || "").includes(searchLower) ||
 (asset.serialNumber?.toLowerCase() || "").includes(searchLower) ||
 (asset.assignedTo?.toLowerCase() || "").includes(searchLower) ||
 (asset.specs?.toLowerCase() || "").includes(searchLower);

 return matchesDept && matchesUser && matchesCategory && matchesBrand && matchesModel && matchesSpec && matchesStatus && matchesLocation && matchesSearch;
 });

 const currentAssets = filteredAssets.filter(a => !isHistorical(a.purchaseDate));
 const historicalAssets = filteredAssets.filter(a => isHistorical(a.purchaseDate));

 const analysis = {
 total: filteredAssets.length,
 active: filteredAssets.filter(a => a.status === "Active").length,
 maintenance: filteredAssets.filter(a => a.status === "Maintenance").length,
 totalValue: filteredAssets.reduce((acc, curr) => acc + (Number(curr.purchasePrice) || 0), 0),
 categories: filteredAssets.reduce((acc, a) => {
 acc[a.category] = (acc[a.category] || 0) + 1;
 return acc;
 }, {} as Record<string, number>),
 peripherals: {
 keyboards: filteredAssets.filter(a => a.peripherals?.keyboard).length,
 mice: filteredAssets.filter(a => a.peripherals?.mouse).length,
 usbHubs: filteredAssets.filter(a => a.peripherals?.usb).length,
 fans: filteredAssets.filter(a => a.peripherals?.fan).length
 }
 };

 const handleAddAsset = async () => {
 // --- Validation with clear user feedback ---
 if (!newAsset.model || !newAsset.model.trim()) {
 toast.error("Model / Name ဖြည့်ပေးပါ။");
 return;
 }
 if (!newAsset.serialNumber || !newAsset.serialNumber.trim()) {
 toast.error("Serial Number ဖြည့်ပေးပါ။ (မရှိရင် N/A လို့ထည့်ပေးပါ)");
 return;
 }
 if (newAsset.specs && newAsset.specs.length > 6000) {
 toast.error("Specs field သည် 6000 characters ကျော်မရပါ။");
 return;
 }

 // Validation: Only assign if status is 'In Stock', 'Active', or 'New'
 const isAssigned = newAsset.assignedTo && newAsset.assignedTo.trim() !== "" && newAsset.assignedTo !== "Unassigned";
 const targetStatus = newAsset.status || (isEditing ? selectedAsset?.status : "Active");
 const allowedStatuses = ["Active", "In Stock", "New"];

 if (isAssigned && !allowedStatuses.includes(targetStatus as string)) {
 toast.error(`SOP-001: '${targetStatus}' status ရှိ asset ကို လူတစ်ယောက်ကို assign မလုပ်နိုင်ပါ။ Status ကို Active / In Stock / New ပြောင်းပေးပါ။`);
 return;
 }

 if (isEditing && (selectedAsset || newAsset.id)) {
 const tid = toast.loading("Asset ကို update လုပ်နေသည်...");
 try {
 await updateAssetAssignment(
 (selectedAsset?.id || newAsset.id)!,
 newAsset.assignedTo || "Unassigned",
 newAsset.location || "Central Storage",
 newAsset.department || "",
 newAsset.status || "Active",
 {
 purchasePrice: newAsset.purchasePrice,
 itemPrice: newAsset.itemPrice,
 parentId: newAsset.parentId,
 purchaseDate: newAsset.purchaseDate,
 maintenanceDueDate: newAsset.maintenanceDueDate,
 uom: newAsset.uom,
 brand: newAsset.brand,
 specs: newAsset.specs,
 remarks: newAsset.remarks,
 remark2: newAsset.remark2,
 purchaseRecordId: newAsset.purchaseRecordId,
 supplier: newAsset.supplier,
 category: newAsset.category,
 model: newAsset.model,
 serialNumber: newAsset.serialNumber,
 peripherals: newAsset.peripherals
 }
 );
 toast.success("Asset ကို သိမ်းဆည်းပြီးပါပြီ။", { id: tid });
 setIsEditing(false);
 setSelectedAsset(null);
 setIsAdding(false);
 setNewAsset({ category: "Computer", status: "Active" });
 } catch (error: any) {
 console.error("Failed to update asset", error);
 const msg = error?.code === 'permission-denied'
 ? "Permission မရှိပါ။ Admin ကို ဆက်သွယ်ပါ။"
 : `Update မအောင်မြင်ပါ — ${error?.message || 'Unknown error'}`;
 toast.error(msg, { id: tid });
 }
 } else {
 const tid = toast.loading("Asset သစ် မှတ်ပုံတင်နေသည်...");
 try {
 const asset: Partial<ITAsset> = {
 category: newAsset.category as any,
 model: newAsset.model!.trim(),
 serialNumber: newAsset.serialNumber!.trim(),
 purchaseDate: newAsset.purchaseDate || new Date().toISOString().split('T')[0],
 maintenanceDueDate: newAsset.maintenanceDueDate,
 location: newAsset.location || "Central Storage",
 department: newAsset.department || "",
 uom: newAsset.uom || "",
 assignedTo: newAsset.assignedTo || "Unassigned",
 status: newAsset.status || "Active",
 brand: newAsset.brand || "",
 specs: newAsset.specs || "",
 remarks: newAsset.remarks,
 remark2: newAsset.remark2,
 purchasePrice: newAsset.purchasePrice || "0",
 itemPrice: newAsset.itemPrice,
 parentId: newAsset.parentId || null,
 peripherals: newAsset.peripherals
 };

 // Only auto-set Standalone/Spare if user has NOT explicitly chosen a status
 // and the asset is non-Computer with no parent linked
 if (asset.category !== "Computer" && !asset.parentId && !newAsset.status) {
 asset.status = "Standalone / Spare";
 }

 const savedId = await saveAsset(asset);
 // Optimistic update — don't wait for onSnapshot, show it immediately
 setAssets(prev => {
 const exists = prev.find(a => a.id === savedId);
 if (exists) return prev;
 return [...prev, { ...asset, id: savedId } as ITAsset];
 });
 toast.success(`Asset "${asset.model}" မှတ်ပုံတင်ပြီးပါပြီ။`, { id: tid });
 setIsAdding(false);
 setNewAsset({ category: "Computer", status: "Active" });
 } catch (error: any) {
 console.error("Add failed", error);
 const msg = error?.code === 'permission-denied'
 ? "Permission မရှိပါ။ Admin account ဖြင့် ဝင်ပါ။"
 : `Asset မသိမ်းနိုင်ပါ — ${error?.message || 'Unknown error'}`;
 toast.error(msg, { id: tid });
 }
 }
 };

 const isMaintenanceNear = (dueDate?: string) => {
 if (!dueDate) return false;
 const now = new Date();
 const due = new Date(dueDate);
 const diffTime = due.getTime() - now.getTime();
 const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
 return diffDays >= 0 && diffDays <= 30;
 };

 const isMaintenanceOverdue = (dueDate?: string) => {
 if (!dueDate) return false;
 const now = new Date();
 now.setHours(0, 0, 0, 0);
 const due = new Date(dueDate);
 due.setHours(0, 0, 0, 0);
 return due < now;
 };

 const toggleSelectAsset = (id: string, e: React.MouseEvent) => {
 e.stopPropagation();
 setSelectedAssetIds(prev => 
 prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
 );
 };

 const toggleSelectAll = () => {
 if (selectedAssetIds.length === filteredAssets.length) {
 setSelectedAssetIds([]);
 } else {
 setSelectedAssetIds(filteredAssets.map(a => a.id));
 }
 };

 const handleBulkUpdate = async (updates: Partial<ITAsset>) => {
 const allowedStatuses = ["Active", "In Stock", "New"];
 
 if (updates.assignedTo && updates.assignedTo !== "Unassigned") {
 const invalidAssets = assets.filter(a => selectedAssetIds.includes(a.id) && !allowedStatuses.includes(a.status));
 
 if (invalidAssets.length > 0) {
 alert(`⚠️ Bulk Assignment Blocked: ${invalidAssets.length} selected assets are in invalid status (Maintenance/Retired/Disposed) and cannot be assigned.`);
 return;
 }
 }

 try {
 // Make updates persistent in database
 const updatePromises = selectedAssetIds.map(id => {
 const asset = assets.find(a => a.id === id);
 if (asset) {
 return saveAsset({ ...asset, ...updates });
 }
 return Promise.resolve();
 });

 await Promise.all(updatePromises);
 
 const updatedAssets = assets.map(asset => 
 selectedAssetIds.includes(asset.id) ? { ...asset, ...updates } as ITAsset : asset
 );
 setAssets(updatedAssets);
 setSelectedAssetIds([]);
 } catch (error) {
 console.error("Bulk update failed", error);
 alert("Failed to apply bulk updates to database.");
 }
 };

 // အမျိုးအစားအလိုက် Next Sequence Number (TG-Prefix-001) ကို လက်ရှိ Array ထဲကနေ ရှာပေးမည့် Helper Function
 const getNextAssetCodeFromState = (category: string, currentAssets: any[]) => {
 let prefix = "TG-ACC-";
 if (category === "Computer") prefix = "TG-PC-";
 else if (category === "Keyboard") prefix = "TG-KB-";
 else if (category === "Mouse") prefix = "TG-MS-";
 else if (category === "Fan") prefix = "TG-FN-";
 else if (category === "Mobile") prefix = "TG-PH-";
 else if (category === "Printer") prefix = "TG-PR-";
 else if (category === "Scanner") prefix = "TG-SC-";

 // လက်ရှိ ရှိပြီးသား ကုဒ်တွေထဲက နောက်ဆုံး နံပါတ်အကြီးဆုံးကို ရှာခြင်း
 const codes = currentAssets
 .filter(a => a.category === category && a.asset_code?.startsWith(prefix))
 .map(a => {
 const parts = a.asset_code.split('-');
 const num = parseInt(parts[parts.length - 1], 10);
 return isNaN(num) ? 0 : num;
 });

 // အဟောင်း Legacy Format (TG001, PH-TG002) များရှိပါက ၎င်းတို့ထဲမှ နံပါတ်ကိုပါ ရောစစ်ပေးခြင်း
 const legacyCodes = currentAssets
 .filter(a => a.category === category && !a.asset_code?.startsWith(prefix))
 .map(a => {
 const num = parseInt((a.asset_code || a.id || "").replace(/[^0-9]/g, ""), 10);
 return isNaN(num) ? 0 : num;
 });

 const allNumbers = [...codes, ...legacyCodes];
 const maxNum = allNumbers.length > 0 ? Math.max(...allNumbers) : 0;
 return `${prefix}${(maxNum + 1).toString().padStart(3, '0')}`;
 };

 // 1. EXCEL EXPORT FUNCTION (၇ ကော်လံ Layout စစ်စစ် ထုတ်ပေးမည့်စနစ်)
 const handleExportAssets = () => {
 try {
 const data = assets.map((a: any) => {
 const currentParentId = a.parent_asset_id || a.parent_id || a.parentId || "";
 const parentPC = assets.find(p => p.id === currentParentId || p.asset_code === currentParentId);
 
 return {
 "Asset Code": a.asset_code || a.id || "",
 "Category": a.category || "",
 "Brand/Model": a.model || a.brand || a.brand_model || "-",
 "Serial Number": a.serialNumber || a.serial_number || a.serial || "-",
 "Specs": a.specs || "",
 "Purchase Date": a.purchaseDate || a.purchase_date || "",
 "Price": Number(a.purchasePrice || a.price || a.itemPrice || 0),
 "Status": a.status || "Active",
 "Parent Asset Code": parentPC ? (parentPC.asset_code || parentPC.id) : currentParentId,
 "Assigned User": a.assignedTo || a.assigned_user || "",
 "Department": a.department || "",
 "Location": a.location || "",
 "Section": a.section || "",
 "UOM": a.uom || "Set",
 "Maintenance Due": a.maintenanceDueDate || a.maintenance_due || "Not set"
 };
 });

 const worksheet = utils.json_to_sheet(data);
 const workbook = utils.book_new();
 utils.book_append_sheet(workbook, worksheet, "Assets");
 
 // Adjusted column widths for 15 columns
 worksheet["!cols"] = Array(15).fill({ wch: 15 });

 writeFile(workbook, "Taunggyi_Pharmacy_IT_Inventory.xlsx");
 toast.success("Excel Export အောင်မြင်စွာ ထုတ်ယူပြီးပါပြီဗျာ။");
 } catch (error) {
 console.error("Export error:", error);
 toast.error("Excel ထုတ်ယူမှု မအောင်မြင်ပါ။");
 }
 };


 // 2. EXCEL IMPORT FUNCTION (Bulk Upsert: ရှိပြီးသားပြင်မည် / အသစ်ဆိုလျှင် Auto ကုဒ်တိုးသွင်းမည်)
 const handleImportAssetsFromExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (!file) return;

 const reader = new FileReader();
 toast.loading("ဒေတာများကို Database ထဲသို့ ထည့်သွင်းနေပါသည်...", { id: "import-loading" });

 reader.onload = async (evt) => {
 try {
 const ab = evt.target?.result;
 const wb = read(ab, { type: "array" });
 const wsname = wb.SheetNames[0];
 const ws = wb.Sheets[wsname];
 const rows: any[] = utils.sheet_to_json(ws);

 const res = await importLegacyExcelData(rows);
 if (res.success && res.assets) {
 // Update React state
 const updatedAssets = [...assets];
 res.assets.forEach((newAsset: any) => {
 const index = updatedAssets.findIndex(a => a.id === newAsset.id);
 if (index > -1) {
 updatedAssets[index] = newAsset;
 } else {
 updatedAssets.push(newAsset);
 }
 });
 setAssets(updatedAssets);
 }
 
 toast.dismiss("import-loading");
 toast.success(res.message);
 } catch (error) {
 console.error("Import processing error:", error);
 toast.dismiss("import-loading");
 toast.error("Excel Import လုပ်ဆောင်မှု မအောင်မြင်ပါ။ ဒေတာပုံစံကို ပြန်စစ်ပါ။");
 }
 };

 reader.readAsArrayBuffer(file);
 e.target.value = ""; // Input ခလုတ်ကို Reset ပြန်လုပ်ခြင်း
 };



 const handlePrintAsset = (asset: ITAsset) => {
 const printWindow = window.open("", "_blank");
 if (!printWindow) return;

 const html = `
 <html>
 <head>
 <title>Asset Tag - ${asset.id}</title>
 <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800&display=swap" rel="stylesheet">
 <style>
 @page {
 size: A6;
 margin: 0;
 }
 body {
 width: 105mm;
 height: 148mm;
 font-family: 'Inter', sans-serif;
 padding: 0;
 margin: 0;
 display: flex;
 align-items: center;
 justify-content: center;
 background: #fff;
 }
 .sticker {
 width: 100mm;
 height: 140mm;
 background: #fff;
 border: 1.5mm solid #1e293b;
 padding: 6mm;
 box-sizing: border-box;
 display: flex;
 flex-direction: column;
 position: relative;
 }
 .header {
 border-bottom: 3px solid #1e293b;
 padding-bottom: 4mm;
 margin-bottom: 6mm;
 display: flex;
 justify-content: space-between;
 align-items: center;
 }
 .logo {
 font-weight: 800;
 font-size: 16pt;
 color: #1e293b;
 text-transform: ;
 letter-spacing: 1mm;
 }
 .asset-id {
 font-family: monospace;
 font-size: 14pt;
 font-weight: 800;
 color: #fff;
 background: #1e293b;
 padding: 1mm 3mm;
 border-radius: 1mm;
 }
 .content {
 flex-grow: 1;
 display: grid;
 grid-template-columns: 1fr;
 gap: 0;
 }
 .field-box {
 border: 0.4mm solid #1e293b;
 margin-bottom: -0.4mm;
 padding: 2.5mm 3.5mm;
 display: flex;
 flex-direction: column;
 }
 .label {
 color: #64748b;
 font-size: 7.5pt;
 font-weight: 800;
 text-transform: ;
 letter-spacing: 0.5mm;
 margin-bottom: 1mm;
 }
 .value {
 color: #0f172a;
 font-size: 11pt;
 font-weight: 800;
 text-transform: ;
 }
 .specs {
 font-size: 10pt;
 color: #4f46e5;
 font-style: italic;
 }
 .peripherals {
 margin-top: 5mm;
 border: 0.4mm solid #1e293b;
 padding: 3mm;
 }
 .peripheral-title {
 font-size: 7.5pt;
 font-weight: 800;
 text-transform: ;
 color: #1e293b;
 margin-bottom: 2mm;
 display: block;
 text-align: center;
 border-bottom: 0.2mm solid #1e293b;
 padding-bottom: 1mm;
 }
 .peripheral-grid {
 display: grid;
 grid-template-columns: 1fr 1fr;
 gap: 2mm;
 }
 .peripheral-item {
 font-size: 8pt;
 color: #334155;
 font-weight: 700;
 display: flex;
 align-items: center;
 gap: 1.5mm;
 }
 .dot {
 width: 1.5mm;
 height: 1.5mm;
 background: #1e293b;
 border-radius: 50%;
 }
 .footer {
 margin-top: auto;
 padding-top: 4mm;
 text-align: center;
 font-size: 8pt;
 color: #1e293b;
 font-weight: 800;
 text-transform: ;
 letter-spacing: 0.5mm;
 }
 .print-info {
 display: flex;
 justify-content: space-between;
 font-size: 6.5pt;
 color: #94a3b8;
 font-weight: 700;
 margin-top: 2mm;
 text-transform: ;
 }
 </style>
 </head>
 <body>
 <div class="sticker">
 <div class="header">
 <div class="logo">TG PHARMACY IT</div>
 <div class="asset-id">${asset.id}</div>
 </div>
 <div class="content">
 <div class="field-box">
 <span class="label">Category</span>
 <span class="value">${asset.category}</span>
 </div>
 <div class="field-box">
 <span class="label">Brand & Model</span>
 <span class="value">${asset.brand || ""} ${asset.model}</span>
 </div>
 <div class="field-box">
 <span class="label">Serial Number</span>
 <span class="value">${asset.serialNumber}</span>
 </div>
 <div class="field-box">
 <span class="label">Specifications</span>
 <span class="value specs">${asset.specs || "Standard Build"}</span>
 </div>
 <div class="field-box">
 <span class="label">Structure (Dept / Loc)</span>
 <span class="value">${asset.department || "-"} / ${asset.location}</span>
 </div>
 <div class="field-box">
 <span class="label">Purchase Date</span>
 <span class="value">${asset.purchaseDate || "N/A"}</span>
 </div>

 ${asset.category !== "Software" ? `
 <div class="peripherals">
 <span class="peripheral-title">Hardware Peripherals</span>
 <div class="peripheral-grid">
 ${asset.peripherals?.keyboard ? `<div class="peripheral-item"><div class="dot"></div> KB: ${asset.peripherals.keyboard}</div>` : ''}
 ${asset.peripherals?.mouse ? `<div class="peripheral-item"><div class="dot"></div> MS: ${asset.peripherals.mouse}</div>` : ''}
 ${asset.peripherals?.usb ? `<div class="peripheral-item"><div class="dot"></div> USB: ${asset.peripherals.usb}</div>` : ''}
 ${asset.peripherals?.fan ? `<div class="peripheral-item"><div class="dot"></div> FAN: ${asset.peripherals.fan}</div>` : ''}
 </div>
 </div>
 ` : ''}
 </div>
 <div class="footer">
 IT ASSET IDENTITY • SOP-001
 </div>
 <div class="print-info">
 <span>Security Verified</span>
 <span>Last Print: ${new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
 </div>
 </div>
 <script>
 window.onload = () => {
 window.print();
 setTimeout(() => { window.close(); }, 750);
 };
 </script>
 </body>
 </html>
 `;

 printWindow.document.write(html);
 printWindow.document.close();
 };

 return (
  <div className="space-y-6 bg-[#F8FAFC] min-h-screen p-4 sm:p-6 text-[#0F172A]" style={{ fontFamily: "Inter, sans-serif" }}>
    {/* Page Header */}
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm">
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">Asset Management</h1>
        <p className="text-sm text-[#64748B] mt-1">Manage and track company assets, assignments, locations and equipment.</p>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <label className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#0F172A] font-medium rounded-xl transition-all text-sm cursor-pointer shadow-sm">
          <Upload size={16} className="text-[#64748B]" />
          <span>Import</span>
          <input type="file" accept=".xlsx, .xls" onChange={handleImportAssetsFromExcel} className="hidden" />
        </label>
        <button
          onClick={handleExportAssets}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#0F172A] font-medium rounded-xl transition-all text-sm shadow-sm"
        >
          <Download size={16} className="text-[#64748B]" />
          <span>Export</span>
        </button>
        <button
          onClick={() => {
            setNewAsset({ category: "Computer", status: "Active" });
            setIsEditing(false);
            setIsAdding(true);
          }}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-medium rounded-xl transition-all text-sm shadow-sm shadow-blue-500/20"
        >
          <Plus size={16} />
          <span>+ Add Asset</span>
        </button>
      </div>
    </div>

    {/* Summary Cards */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[
        { label: "Total Assets", value: assets.length, sub: "Registered", color: "text-[#2563EB]", bg: "bg-[#EFF6FF]", icon: Package },
        { label: "Available", value: assets.filter(a => ["In Stock", "New", "Standalone / Spare"].includes(a.status) || (!a.assignedTo || a.assignedTo === "Unassigned")).length, sub: "In Inventory", color: "text-emerald-600", bg: "bg-emerald-50", icon: CheckCircle2 },
        { label: "Assigned", value: assets.filter(a => a.assignedTo && a.assignedTo.trim() !== "" && a.assignedTo !== "Unassigned").length, sub: "In Service", color: "text-indigo-600", bg: "bg-indigo-50", icon: UserCheck },
        { label: "Maintenance", value: assets.filter(a => ["Maintenance", "Under Repair"].includes(a.status)).length, sub: "Requires Action", color: "text-amber-600", bg: "bg-amber-50", icon: AlertTriangle }
      ].map((card, idx) => (
        <div key={idx} className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-[#64748B]">{card.label}</p>
            <p className="text-2xl font-bold text-[#0F172A] mt-1">{card.value}</p>
            <p className="text-xs text-[#64748B] mt-0.5">{card.sub}</p>
          </div>
          <div className={`w-12 h-12 rounded-xl ${card.bg} flex items-center justify-center ${card.color}`}>
            <card.icon size={22} />
          </div>
        </div>
      ))}
    </div>

    {/* Search / Filter Toolbar */}
    <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm space-y-4">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B]" size={18} />
          <input
            type="text"
            placeholder="Search asset, serial, employee..."
            value={assetSearch}
            onChange={e => setAssetSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm text-[#0F172A] placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] transition-all"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              setFilterCategory([]);
              setFilterStatus([]);
              setFilterDept([]);
              setFilterLocation([]);
              setFilterBrand([]);
              setFilterModel([]);
              setFilterSpec([]);
              setFilterUser([]);
              setAssetSearch("");
            }}
            className="px-4 py-3 bg-white border border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] rounded-xl text-sm font-medium transition-colors"
          >
            Clear Filters
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-[#E2E8F0]">
        <MultiSelectDropdown
          label="All Categories"
          placeholder="All Categories"
          options={categories}
          selected={filterCategory}
          onChange={setFilterCategory}
          icon={Layers}
        />
        <MultiSelectDropdown
          label="All Status"
          placeholder="All Status"
          options={statuses}
          selected={filterStatus}
          onChange={setFilterStatus}
          icon={CheckCircle2}
        />
        <MultiSelectDropdown
          label="All Departments"
          placeholder="All Departments"
          options={departments}
          selected={filterDept}
          onChange={setFilterDept}
          icon={Database}
        />
        <MultiSelectDropdown
          label="All Locations"
          placeholder="All Locations"
          options={locations}
          selected={filterLocation}
          onChange={setFilterLocation}
          icon={Tag}
        />
      </div>

      {/* Active Filters Display */}
      {(filterCategory.length > 0 || filterBrand.length > 0 || filterModel.length > 0 || filterSpec.length > 0 || filterDept.length > 0 || filterLocation.length > 0 || filterUser.length > 0 || filterStatus.length > 0 || assetSearch) && (
        <div className="flex flex-wrap gap-2 items-center text-xs pt-3 border-t border-[#E2E8F0]">
          <span className="text-[#64748B] font-medium mr-1">Active Clusters:</span>
          {filterCategory.map(cat => (
            <span key={cat} className="bg-[#EFF6FF] text-[#2563EB] px-2.5 py-1 rounded-lg border border-blue-100 flex items-center gap-1.5 font-medium">
              Category: {cat} <X size={12} className="cursor-pointer hover:text-rose-600" onClick={() => setFilterCategory(filterCategory.filter(c => c !== cat))} />
            </span>
          ))}
          {filterStatus.map(st => (
            <span key={st} className="bg-[#EFF6FF] text-[#2563EB] px-2.5 py-1 rounded-lg border border-blue-100 flex items-center gap-1.5 font-medium">
              Status: {st} <X size={12} className="cursor-pointer hover:text-rose-600" onClick={() => setFilterStatus(filterStatus.filter(s => s !== st))} />
            </span>
          ))}
          {filterDept.map(dp => (
            <span key={dp} className="bg-[#EFF6FF] text-[#2563EB] px-2.5 py-1 rounded-lg border border-blue-100 flex items-center gap-1.5 font-medium">
              Dept: {dp} <X size={12} className="cursor-pointer hover:text-rose-600" onClick={() => setFilterDept(filterDept.filter(d => d !== dp))} />
            </span>
          ))}
          {filterLocation.map(loc => (
            <span key={loc} className="bg-[#EFF6FF] text-[#2563EB] px-2.5 py-1 rounded-lg border border-blue-100 flex items-center gap-1.5 font-medium">
              Location: {loc} <X size={12} className="cursor-pointer hover:text-rose-600" onClick={() => setFilterLocation(filterLocation.filter(l => l !== loc))} />
            </span>
          ))}
        </div>
      )}
    </div>

    {/* Table Container Start */}
    <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
      {isError ? (
        <div className="p-12 text-center">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={24} />
          </div>
          <h3 className="text-base font-semibold text-[#0F172A] mb-1">Unable to load assets</h3>
          <p className="text-sm text-[#64748B] mb-6 max-w-sm mx-auto">Please check your connection and try again.</p>
          <button
            onClick={handleRetry}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-medium rounded-xl transition-all text-sm shadow-sm"
          >
            <RefreshCw size={16} />
            <span>Retry</span>
          </button>
        </div>
      ) : isLoading ? (
        <div className="p-8 space-y-4">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="flex items-center justify-between gap-4 py-3 border-b border-slate-100 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-slate-200 rounded" />
                <div className="w-32 h-4 bg-slate-200 rounded" />
              </div>
              <div className="w-24 h-4 bg-slate-200 rounded hidden sm:block" />
              <div className="w-28 h-4 bg-slate-200 rounded hidden md:block" />
              <div className="w-20 h-6 bg-slate-200 rounded-full" />
            </div>
          ))}
        </div>
      ) : assets.length === 0 ? (
        <AssetEmptyState 
          type="no-assets" 
          onAddAsset={() => {
            setNewAsset({ category: "Computer", status: "Active" });
            setIsEditing(false);
            setIsAdding(true);
          }} 
        />
      ) : filteredAssets.length === 0 ? (
        <AssetEmptyState 
          type="no-results" 
          onClearFilters={() => {
            setFilterCategory([]);
            setFilterStatus([]);
            setFilterDept([]);
            setFilterLocation([]);
            setFilterBrand([]);
            setFilterModel([]);
            setFilterSpec([]);
            setFilterUser([]);
            setAssetSearch("");
          }} 
        />
      ) : (
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
              <tr className="text-[#64748B] font-semibold text-xs tracking-wider">
                <th className="px-4 py-3.5 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={selectedAssetIds.length > 0 && selectedAssetIds.length === filteredAssets.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-[#E2E8F0] bg-white text-[#2563EB] focus:ring-blue-500/20 cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3.5">ASSET</th>
                <th className="px-4 py-3.5">CATEGORY</th>
                <th className="px-4 py-3.5">ASSIGNED TO</th>
                <th className="px-4 py-3.5">DEPARTMENT</th>
                <th className="px-4 py-3.5">LOCATION</th>
                <th className="px-4 py-3.5">STATUS</th>
                <th className="px-4 py-3.5 text-right">PURCHASE DATE</th>
                {isAdmin && <th className="px-4 py-3.5 text-center">ACTIONS</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-sm">
              {[
                { label: "Current Assets", items: currentAssets },
                { label: "Historical Records (>30 days)", items: historicalAssets }
              ].map((group) => (
                <React.Fragment key={group.label}>
                  {group.items.length > 0 && (
                    <tr className="bg-[#F8FAFC]/60">
                      <td colSpan={isAdmin ? 9 : 8} className="px-4 py-2 text-xs font-semibold text-[#64748B] tracking-wide uppercase">
                        {group.label} ({group.items.length})
                      </td>
                    </tr>
                  )}
                  {group.items.map((asset) => (
                    <tr
                      key={asset.id}
                      onClick={() => setSelectedAsset(asset)}
                      className={cn(
                        "hover:bg-[#F8FAFC] transition-colors cursor-pointer group text-[#0F172A]",
                        selectedAssetIds.includes(asset.id) && "bg-blue-50/50"
                      )}
                    >
                      <td className="px-4 py-3.5 text-center" onClick={(e) => toggleSelectAsset(asset.id, e)}>
                        <input
                          type="checkbox"
                          checked={selectedAssetIds.includes(asset.id)}
                          onChange={() => {}}
                          className="w-4 h-4 rounded border-[#E2E8F0] bg-white text-[#2563EB] focus:ring-blue-500/20 cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center shrink-0">
                            {asset.category === "Computer" ? <Monitor size={16} /> : <HardDrive size={16} />}
                          </div>
                          <div>
                            <div className="font-semibold text-[#0F172A] flex items-center gap-2">
                              <span>{asset.brand ? `[${asset.brand}]` : ""} {asset.model}</span>
                            </div>
                            <div className="text-xs font-mono text-[#64748B] mt-0.5 flex items-center gap-2 flex-wrap">
                              <span>{asset.asset_code || asset.id}</span>
                              {asset.parentId && (
                                <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-medium">
                                  └─ Child of {assets.find(p => p.id === asset.parentId)?.model || asset.parentId}
                                </span>
                              )}
                              {assets.some(c => c.parentId === asset.id) && (
                                <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-medium">
                                  {assets.filter(c => c.parentId === asset.id).length} Peripherals
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs font-medium text-[#64748B]">
                        <span className="px-2 py-1 bg-slate-100 rounded-md text-slate-700">{asset.category}</span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-[#0F172A] font-medium">
                        {asset.assignedTo && asset.assignedTo !== "Unassigned" ? (
                          <span className="flex items-center gap-1.5 text-[#0F172A]">
                            <UserCheck size={14} className="text-[#2563EB]" />
                            {asset.assignedTo}
                          </span>
                        ) : (
                          <span className="text-[#64748B] italic">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-[#64748B]">
                        {asset.department || "-"}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-[#64748B]">
                        {asset.location || "-"}
                      </td>
                      <td className="px-4 py-3.5">
                        <AssetStatusBadge status={asset.status} />
                      </td>
                      <td className="px-4 py-3.5 text-xs font-mono text-[#64748B] text-right">
                        {asset.purchaseDate || "N/A"}
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3.5 text-center" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handlePrintAsset(asset)}
                              className="p-1.5 text-[#64748B] hover:text-[#2563EB] hover:bg-blue-50 rounded-lg transition-colors"
                              title="Print Tag"
                            >
                              <Printer size={15} />
                            </button>
                            <button
                              disabled={isDeleting}
                              onClick={(e) => handleDeleteAsset(asset.id, e)}
                              className="p-1.5 text-[#64748B] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Delete Asset"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
    
 {/* Bulk Action Bar */}
 <AnimatePresence>
 {selectedAssetIds.length > 0 && (
 <motion.div 
 initial={{ y: 100, opacity: 0 }}
 animate={{ y: 0, opacity: 1 }}
 exit={{ y: 100, opacity: 0 }}
 className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-slate-900 border border-cyan-500/30 rounded-2xl p-4 shadow-2xl shadow-cyan-950/40 z-40 w-max max-w-full overflow-x-auto no-scrollbar"
 >
 <div className="flex items-center gap-3 border-r border-white/10 pr-4">
 <span className="flex items-center justify-center w-6 h-6 bg-cyan-600 rounded-full text-xs font-medium text-white">
 {selectedAssetIds.length}
 </span>
 <span className="text-xs font-medium text-slate-400 whitespace-nowrap">Selected</span>
 <button 
 onClick={() => setSelectedAssetIds([])}
 className="text-xs font-medium text-cyan-400  hover:text-white transition-colors"
 >
 Clear
 </button>
 </div>
 
 <div className="flex items-center gap-3 pr-4 border-r border-white/10">
 <span className="text-xs font-medium text-slate-500 dark:text-slate-400 ">Bulk Action</span>
 <select 
 onChange={(e) => handleBulkUpdate({ status: e.target.value as any })}
 className="bg-white dark:bg-slate-900/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500/50 transition-all font-medium"
 value=""
 >
 <option value="" disabled>Change Status</option>
 <option value="Active">Set Active</option>
 <option value="Maintenance">Set Maintenance</option>
 <option value="Disposed">Set Disposed</option>
 </select>
 
 <select 
 onChange={(e) => handleBulkUpdate({ assignedTo: e.target.value })}
 className="bg-white dark:bg-slate-900/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500/50 transition-all font-medium"
 value=""
 >
 <option value="" disabled>Assign User</option>
 {users.filter(u => u !== "All").map(user => (
 <option key={user} value={user}>{user}</option>
 ))}
 <option value="Unassigned">Unassigned</option>
 </select>
 </div>

 <button 
 onClick={() => {
 setDeleteTarget({ id: selectedAssetIds, type: 'bulk-asset' });
 }}
 className="flex items-center gap-2 px-3 py-1.5 bg-rose-600/20 text-rose-400 rounded-lg text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-rose-600 hover:text-white transition-all border border-rose-500/30"
 >
 <ShieldCheck size={14} /> Bulk Delete
 </button>
 </motion.div>
 )}
 </AnimatePresence>

 <AnimatePresence>
    {selectedAsset && (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setSelectedAsset(null)} />
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="w-screen max-w-xl bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800"
        >
          {/* Drawer Header */}
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center font-bold">
                <Monitor size={20} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-[#0F172A] dark:text-slate-100">Asset Details</h3>
                <p className="text-xs font-mono text-slate-500">{selectedAsset.asset_code || selectedAsset.id}</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedAsset(null)}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Action Toolbar */}
          <div className="px-6 py-3 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 flex-wrap">
            {isAdmin && (
              <button
                onClick={() => {
                  setNewAsset({ ...selectedAsset });
                  setIsEditing(true);
                  setIsAdding(true);
                  setSelectedAsset(null);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-[#2563EB] rounded-xl text-xs font-medium transition-colors"
              >
                <Edit3 size={14} />
                <span>Edit Asset</span>
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => {
                  const nextUser = prompt("Enter employee/user name to assign:", selectedAsset.assignedTo || "");
                  if (nextUser !== null) {
                    handleBulkUpdate({ assignedTo: nextUser, status: "Active" });
                    setSelectedAsset({ ...selectedAsset, assignedTo: nextUser, status: "Active" });
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-medium transition-colors"
              >
                <UserCheck size={14} />
                <span>Assign</span>
              </button>
            )}
            {isAdmin && selectedAsset.assignedTo && selectedAsset.assignedTo !== "Unassigned" && (
              <button
                onClick={() => {
                  handleBulkUpdate({ assignedTo: "Unassigned", status: "In Stock" });
                  setSelectedAsset({ ...selectedAsset, assignedTo: "Unassigned", status: "In Stock" });
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl text-xs font-medium transition-colors"
              >
                <UserX size={14} />
                <span>Unassign</span>
              </button>
            )}
            <button
              onClick={() => handlePrintAsset(selectedAsset)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition-colors"
            >
              <Printer size={14} />
              <span>Print Tag</span>
            </button>
            {isAdmin && (
              <button
                onClick={() => {
                  setDeleteTarget({ id: selectedAsset.id, type: "asset" });
                  setSelectedAsset(null);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-medium transition-colors ml-auto"
              >
                <Trash2 size={14} />
                <span>Delete</span>
              </button>
            )}
          </div>

          {/* Drawer Body - 5 Sections */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Section 1: Asset Details */}
            <div className="bg-slate-50/50 dark:bg-slate-800/40 rounded-2xl p-5 border border-slate-200/60 dark:border-slate-800">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Monitor size={14} className="text-[#2563EB]" />
                Section 1: Basic Information
              </h4>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block mb-1">Asset Code</span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-100">{selectedAsset.asset_code || "PENDING"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Category</span>
                  <span className="font-medium text-slate-800 dark:text-slate-100">{selectedAsset.category}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Brand</span>
                  <span className="font-medium text-slate-800 dark:text-slate-100">{selectedAsset.brand || "-"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Model</span>
                  <span className="font-medium text-slate-800 dark:text-slate-100">{selectedAsset.model}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 block mb-1">Serial Number</span>
                  <span className="font-mono text-slate-800 dark:text-slate-100">{selectedAsset.serialNumber || "No serial number recorded"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Status</span>
                  <div><AssetStatusBadge status={selectedAsset.status} /></div>
                </div>
              </div>
            </div>

            {/* Section 2: Assignment */}
            <div className="bg-slate-50/50 dark:bg-slate-800/40 rounded-2xl p-5 border border-slate-200/60 dark:border-slate-800">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                <UserCheck size={14} className="text-[#2563EB]" />
                Section 2: Assignment
              </h4>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="col-span-2">
                  <span className="text-slate-400 block mb-1">Assigned To</span>
                  <span className="font-medium text-[#2563EB] text-sm">{selectedAsset.assignedTo || "Unassigned"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Department</span>
                  <span className="font-medium text-slate-800 dark:text-slate-100">{selectedAsset.department || "-"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Location</span>
                  <span className="font-medium text-slate-800 dark:text-slate-100">{selectedAsset.location || "-"}</span>
                </div>
              </div>
            </div>

            {/* Section 3: Purchase */}
            <div className="bg-slate-50/50 dark:bg-slate-800/40 rounded-2xl p-5 border border-slate-200/60 dark:border-slate-800">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Package size={14} className="text-[#2563EB]" />
                Section 3: Purchase & Procurement
              </h4>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block mb-1">Supplier</span>
                  <span className="font-medium text-slate-800 dark:text-slate-100">{selectedAsset.supplier || "-"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Purchase Date</span>
                  <span className="font-mono text-slate-800 dark:text-slate-100">{selectedAsset.purchaseDate || "N/A"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Purchase Price</span>
                  <span className="font-mono font-semibold text-emerald-600">
                    {(selectedAsset.itemPrice || Number(selectedAsset.purchasePrice) || 0).toLocaleString()} MMK
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Purchase Record / Invoice</span>
                  <span className="font-mono text-slate-800 dark:text-slate-100">{selectedAsset.purchaseRecord || "-"}</span>
                </div>
              </div>
            </div>

            {/* Section 4: Maintenance */}
            <div className="bg-slate-50/50 dark:bg-slate-800/40 rounded-2xl p-5 border border-slate-200/60 dark:border-slate-800">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                <AlertTriangle size={14} className="text-[#2563EB]" />
                Section 4: Maintenance & Compliance
              </h4>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Maintenance Due Date</span>
                  <span className="font-mono font-medium text-slate-800 dark:text-slate-100">{selectedAsset.maintenanceDueDate || "Not scheduled"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Remarks & SOP Notes</span>
                  <p className="text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                    {selectedAsset.remarks || selectedAsset.remark2 || "No remarks recorded."}
                  </p>
                </div>
              </div>
            </div>

            {/* Section 5: Related Assets */}
            <div className="bg-slate-50/50 dark:bg-slate-800/40 rounded-2xl p-5 border border-slate-200/60 dark:border-slate-800">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Layers size={14} className="text-[#2563EB]" />
                5. Relationships & Peripherals
              </h4>
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block mb-1">Parent Asset / Host</span>
                  <span className="font-medium text-indigo-600">
                    {selectedAsset.parentId ? (assets.find(a => a.id === selectedAsset.parentId)?.model || selectedAsset.parentId) : "Standalone / Direct Unit"}
                  </span>
                </div>
                {selectedAsset.category === "Computer" && (
                  <div>
                    <span className="text-slate-400 block mb-2">Linked Child Peripherals</span>
                    <div className="space-y-2">
                      {assets.filter(a => a.parentId === selectedAsset.id).length === 0 ? (
                        <p className="text-slate-400 italic">No peripherals linked.</p>
                      ) : (
                        assets.filter(a => a.parentId === selectedAsset.id).map(child => (
                          <div key={child.id} className="flex justify-between items-center bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                            <div>
                              <span className="font-semibold text-slate-800 dark:text-slate-100 block">{child.category}: {child.model}</span>
                              <span className="text-[10px] font-mono text-slate-400">{child.asset_code || child.id}</span>
                            </div>
                            <span className="font-mono text-emerald-600">{(child.itemPrice || Number(child.purchasePrice) || 0).toLocaleString()} MMK</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )}
  </AnimatePresence>

  <AnimatePresence>
    {isAdding && (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-0 sm:p-4">
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        className="bg-white dark:bg-slate-900 w-full h-full sm:h-auto sm:max-w-2xl rounded-none sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col sm:max-h-[90vh] border border-slate-200 dark:border-slate-800"
      >
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
          <div>
            <h3 className="text-base font-semibold text-[#0F172A] dark:text-slate-100">
              {isEditing ? `Edit Asset: ${newAsset.asset_code || newAsset.id}` : "Register New IT Asset"}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Fill in the hardware specification and procurement records.</p>
          </div>
          <button 
            onClick={() => {
              setIsAdding(false);
              setIsEditing(false);
              setNewAsset({ category: "Computer", status: "Active" });
            }}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* SECTION 1: Basic Information */}
          <div className="bg-slate-50/50 dark:bg-slate-800/40 rounded-2xl p-5 border border-slate-200/60 dark:border-slate-800 space-y-4">
            <h4 className="font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Monitor size={14} className="text-[#2563EB]" />
              Section 1: Basic Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-500 font-medium mb-1.5">Asset Code</label>
                <input 
                  type="text" 
                  value={newAsset.asset_code || ""} 
                  onChange={e => setNewAsset({...newAsset, asset_code: e.target.value})} 
                  placeholder="e.g., TG-PC-001" 
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-500 font-medium mb-1.5">Category</label>
                <select 
                  value={newAsset.category || "Computer"} 
                  onChange={e => setNewAsset({...newAsset, category: e.target.value as any})}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="Computer">Computer</option>
                  <option value="Monitor">Monitor</option>
                  <option value="UPS">UPS</option>
                  <option value="Keyboard">Keyboard</option>
                  <option value="Mouse">Mouse</option>
                  <option value="Printer">Printer</option>
                  <option value="Scanner">Scanner</option>
                  <option value="Network">Network</option>
                  <option value="Mobile">Mobile</option>
                  <option value="USB Hub">USB Hub</option>
                  <option value="Fan">Cooling Fan</option>
                  <option value="Peripherals">General Peripherals</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-500 font-medium mb-1.5">Brand</label>
                <input 
                  type="text" 
                  value={newAsset.brand || ""} 
                  onChange={e => setNewAsset({...newAsset, brand: e.target.value})} 
                  placeholder="e.g., Dell, HP, Lenovo" 
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="block text-slate-500 font-medium mb-1.5">Model</label>
                <input 
                  type="text" 
                  value={newAsset.model || ""} 
                  onChange={e => setNewAsset({...newAsset, model: e.target.value})} 
                  placeholder="e.g., OptiPlex 7090" 
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-slate-500 font-medium mb-1.5">Serial Number</label>
                <input 
                  type="text" 
                  value={newAsset.serialNumber || ""} 
                  onChange={e => setNewAsset({...newAsset, serialNumber: e.target.value})} 
                  placeholder="e.g., SN-9843271092" 
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: Assignment */}
          <div className="bg-slate-50/50 dark:bg-slate-800/40 rounded-2xl p-5 border border-slate-200/60 dark:border-slate-800 space-y-4">
            <h4 className="font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <UserCheck size={14} className="text-[#2563EB]" />
              Section 2: Assignment
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-slate-500 font-medium mb-1.5">Assigned To</label>
                <input 
                  type="text" 
                  value={newAsset.assignedTo || ""} 
                  onChange={e => setNewAsset({...newAsset, assignedTo: e.target.value})} 
                  placeholder="e.g., Mg Mg" 
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="block text-slate-500 font-medium mb-1.5">Department</label>
                <input 
                  type="text" 
                  value={newAsset.department || ""} 
                  onChange={e => setNewAsset({...newAsset, department: e.target.value})} 
                  placeholder="e.g., IT, Pharmacy" 
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="block text-slate-500 font-medium mb-1.5">Location</label>
                <input 
                  type="text" 
                  value={newAsset.location || ""} 
                  onChange={e => setNewAsset({...newAsset, location: e.target.value})} 
                  placeholder="e.g., Counter 1" 
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: Purchase */}
          <div className="bg-slate-50/50 dark:bg-slate-800/40 rounded-2xl p-5 border border-slate-200/60 dark:border-slate-800 space-y-4">
            <h4 className="font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Package size={14} className="text-[#2563EB]" />
              Section 3: Purchase & Procurement
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-500 font-medium mb-1.5">Supplier</label>
                <input 
                  type="text" 
                  value={newAsset.supplier || ""} 
                  onChange={e => setNewAsset({...newAsset, supplier: e.target.value})} 
                  placeholder="e.g., Apex Tech" 
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="block text-slate-500 font-medium mb-1.5">Purchase Date</label>
                <input 
                  type="date" 
                  value={newAsset.purchaseDate || ""} 
                  onChange={e => setNewAsset({...newAsset, purchaseDate: e.target.value})} 
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-500 font-medium mb-1.5">Purchase Price (MMK)</label>
                <input 
                  type="number" 
                  value={newAsset.purchasePrice || newAsset.itemPrice || ""} 
                  onChange={e => setNewAsset({...newAsset, purchasePrice: Number(e.target.value), itemPrice: Number(e.target.value)})} 
                  placeholder="e.g., 1500000" 
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-500 font-medium mb-1.5">Purchase Record / Invoice</label>
                <input 
                  type="text" 
                  value={newAsset.purchaseRecord || ""} 
                  onChange={e => setNewAsset({...newAsset, purchaseRecord: e.target.value})} 
                  placeholder="e.g., INV-2026-0042" 
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono"
                />
              </div>
            </div>
          </div>

          {/* SECTION 4: Maintenance */}
          <div className="bg-slate-50/50 dark:bg-slate-800/40 rounded-2xl p-5 border border-slate-200/60 dark:border-slate-800 space-y-4">
            <h4 className="font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle size={14} className="text-[#2563EB]" />
              Section 4: Maintenance & Status
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-500 font-medium mb-1.5">Status</label>
                <select 
                  value={newAsset.status || "Active"} 
                  onChange={e => setNewAsset({...newAsset, status: e.target.value})}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="Active">Active</option>
                  <option value="In Stock">Available</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Damaged">Damaged</option>
                  <option value="Retired">Retired</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-500 font-medium mb-1.5">Maintenance Due Date</label>
                <input 
                  type="date" 
                  value={newAsset.maintenanceDueDate || ""} 
                  onChange={e => setNewAsset({...newAsset, maintenanceDueDate: e.target.value})} 
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-slate-500 font-medium mb-1.5">Remarks / SOP Notes</label>
                <textarea 
                  rows={2}
                  value={newAsset.remarks || ""} 
                  onChange={e => setNewAsset({...newAsset, remarks: e.target.value})} 
                  placeholder="e.g., Annual preventive maintenance required" 
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
          </div>

          {/* SECTION 5: Relationships */}
          <div className="bg-slate-50/50 dark:bg-slate-800/40 rounded-2xl p-5 border border-slate-200/60 dark:border-slate-800 space-y-4">
            <h4 className="font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Layers size={14} className="text-[#2563EB]" />
              Section 5: Relationships & Hierarchy
            </h4>
            <div>
              <label className="block text-slate-500 font-medium mb-1.5">Parent Asset / Host (if accessory)</label>
              <select
                value={newAsset.parentId || ""}
                onChange={e => setNewAsset({...newAsset, parentId: e.target.value || undefined})}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">None (Standalone / Host Node)</option>
                {assets.filter(a => a.category === "Computer" && a.id !== newAsset.id).map(comp => (
                  <option key={comp.id} value={comp.id}>
                    {comp.asset_code || comp.id} - {comp.brand} {comp.model}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50/50 dark:bg-slate-800/50">
          <button 
            onClick={() => {
              setIsAdding(false);
              setIsEditing(false);
              setNewAsset({ category: "Computer", status: "Active" });
            }}
            className="px-5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 rounded-xl font-medium hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleAddAsset}
            className="px-6 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl font-medium shadow-sm shadow-blue-500/20 transition-all"
          >
            {isEditing ? "Save Changes" : "Register Node"}
          </button>
        </div>
      </motion.div>
    </div>
  )}
  </AnimatePresence>

  <ConfirmationModal 
    isOpen={deleteTarget !== null}
    onClose={() => setDeleteTarget(null)}
    onConfirm={executeDelete}
    isLoading={isDeleting}
    title="Delete Asset?"
    message={
      deleteTarget?.type === 'bulk-asset' && Array.isArray(deleteTarget.id)
        ? `You are about to delete ${deleteTarget.id.length} selected assets.

This action cannot be undone.`
        : (() => {
            const target = assets.find(a => a.id === deleteTarget?.id);
            const code = target?.asset_code || deleteTarget?.id;
            const modelName = target ? (target.brand ? target.brand + " " : "") + target.model : "";
            return `You are about to delete:

${code}
${modelName}

This action cannot be undone.`;
          })()
    }
    confirmText="Delete Asset"
    confirmColor="bg-rose-600"
  />
  </div>
  );
}
