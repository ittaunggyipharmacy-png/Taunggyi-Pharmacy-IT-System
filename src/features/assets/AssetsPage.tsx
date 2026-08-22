import React, { useState, useEffect, useRef, useMemo, Fragment } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Monitor, Plus, Search, Filter, Trash2, Edit3, CheckCircle2, 
  AlertCircle, ChevronDown, ChevronUp, RefreshCw, Download, Upload, 
  FileSpreadsheet, Sparkles, Layers, Box, Cpu, HardDrive, Shield,
  ExternalLink, UserCheck, Check, Clock, Laptop, ArrowUpDown, ChevronRight, X,
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
 
 // Hierarchical Filter State
 const [filterCategory, setFilterCategory] = useState<string[]>([]);
 const [selectedCategory, setSelectedCategory] = useState('All');
 const [filterBrand, setFilterBrand] = useState<string[]>([]);
 const [filterModel, setFilterModel] = useState<string[]>([]);
 const [filterSpec, setFilterSpec] = useState<string[]>([]);
 const [filterDept, setFilterDept] = useState<string[]>([]);
 const [filterUser, setFilterUser] = useState<string[]>([]);
 const [filterStatus, setFilterStatus] = useState<string[]>([]);
 const [assetSearch, setAssetSearch] = useState("");

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
 
 const searchLower = (searchTerm || assetSearch).toLowerCase();
 const matchesSearch = searchLower === "" || 
 asset.id.toLowerCase().includes(searchLower) ||
 asset.model.toLowerCase().includes(searchLower) ||
 (asset.brand?.toLowerCase() || "").includes(searchLower) ||
 (asset.serialNumber?.toLowerCase() || "").includes(searchLower) ||
 (asset.assignedTo?.toLowerCase() || "").includes(searchLower) ||
 (asset.specs?.toLowerCase() || "").includes(searchLower);

 return matchesDept && matchesUser && matchesCategory && matchesBrand && matchesModel && matchesSpec && matchesStatus && matchesSearch;
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
 // Make updates persistent in Firestore
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
 alert("Failed to apply bulk updates to Firestore.");
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
 <div className="space-y-6">
 {/* Refined Analysis Bar */}
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
 {[
 { label: "Total Nodes", value: analysis.total, sub: "Registered", color: "text-indigo-600", icon: Package },
 { label: "Active Units", value: analysis.active, sub: "Operational", color: "text-emerald-600", icon: CheckCircle2 },
 { label: "Maintenance", value: analysis.maintenance, sub: "Action Required", color: "text-amber-600", icon: AlertTriangle },
 { label: "Est. Value", value: (analysis.totalValue / 1000000).toFixed(1) + "M", sub: "MMK Total", color: "text-indigo-600", icon: Search }
 ].map((item, idx) => (
 <div key={idx} className="enterprise-card p-5 group flex flex-col justify-between hover:border-indigo-200 transition-all">
 <div className="flex justify-between items-start">
 <span className="text-xs font-medium text-slate-400 ">{item.label}</span>
 <item.icon size={16} className={cn("opacity-40 group-hover:opacity-100 transition-opacity", item.color)} />
 </div>
 <div className="mt-3 flex items-end gap-2">
 <span className="text-2xl font-medium text-slate-800 dark:text-slate-100 leading-none">{item.value}</span>
 <span className="text-xs font-medium text-slate-400 pb-0.5">{item.sub}</span>
 </div>
 </div>
 ))}
 </div>
 
 {/* Consolidated Breakdown Bar / Category Selector */}
 <div className="flex flex-wrap gap-2 items-center">
 <button 
 onClick={() => setSelectedCategory('All')}
 className={cn(
 "px-4 py-1.5 rounded-lg text-xs font-medium text-slate-500 dark:text-slate-400 border transition-all shadow-sm",
 selectedCategory === 'All' 
 ? "bg-indigo-600 border-indigo-600 text-white" 
 : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 hover:border-indigo-300"
 )}
 >
 All Assets
 </button>
 
 <button 
 onClick={() => setSelectedCategory('Peripherals')}
 className={cn(
 "px-4 py-1.5 rounded-lg text-xs font-medium text-slate-500 dark:text-slate-400 border transition-all shadow-sm flex items-center gap-2",
 selectedCategory === 'Peripherals' 
 ? "bg-amber-600 border-amber-600 text-white" 
 : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 hover:border-amber-300"
 )}
 >
 <Layers size={12} />
 Peripherals
 </button>

 <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" />

 {['Computer', 'Monitor', 'UPS', 'Mobile', 'Printer', 'Network'].map((cat) => (
 <button 
 key={cat}
 onClick={() => setSelectedCategory(cat)}
 className={cn(
 "px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 dark:text-slate-400 border transition-all shadow-sm",
 selectedCategory === cat 
 ? "bg-slate-800 border-slate-800 text-white" 
 : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 hover:border-indigo-300"
 )}
 >
 {cat}
 <span className={cn(
 "ml-2 text-xs font-medium",
 selectedCategory === cat ? "text-indigo-300" : "text-indigo-600"
 )}>
 {assets.filter(a => a.category === cat).length}
 </span>
 </button>
 ))}
 </div>

 <div className="flex flex-col gap-6 enterprise-card p-6">
 <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
 <div>
 <h2 className="text-xl font-medium text-slate-800 dark:text-slate-100 dark:text-white tracking-tight flex items-center gap-2">
 <Database size={20} className="text-indigo-600" />
 IT Asset Inventory
 </h2>
 <p className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400 mt-1  font-medium tracking-[0.2em]">Enterprise Resource Management • SOP-001</p>
 </div>
 
 <div className="flex items-center gap-4 my-4">
 {/* Export ခလုတ် */}
 <button
 onClick={handleExportAssets}
 className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-all shadow-sm shadow-emerald-100 text-sm"
 >
 <Download size={16} />
 Excel Export ထုတ်ယူရန်
 </button>

 {/* Import / Upload ခလုတ် */}
 <label className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-all shadow-sm shadow-indigo-100 text-sm cursor-pointer">
 <Upload size={16} />
 Excel ဖိုင်တင်၍ Update/Insert လုပ်ရန်
 <input
 type="file"
 accept=".xlsx, .xls"
 onChange={handleImportAssetsFromExcel}
 className="hidden"
 />
 </label>

 {/* Manual Add ခလုတ် */}
 <button
 onClick={() => {
 setNewAsset({ category: "Computer", status: "Active" });
 setIsEditing(false);
 setIsAdding(true);
 }}
 className="flex items-center gap-2 px-5 py-2.5 bg-indigo-900 border border-slate-700 text-white font-medium rounded-xl transition-all shadow-lg hover:bg-black text-sm"
 >
 <Plus size={16} />
 Asset အသစ်ထည့်ရန် (Manual)
 </button>
</div>
 </div>

 {/* Dynamic Multi-level Filter System */}
 <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
 <MultiSelectDropdown 
 label="Category"
 placeholder="All Categories"
 options={categories}
 selected={filterCategory}
 onChange={setFilterCategory}
 icon={Layers}
 />
 <MultiSelectDropdown 
 label="Brand"
 placeholder="Select Brands"
 options={brands}
 selected={filterBrand}
 onChange={setFilterBrand}
 icon={Tag}
 />
 <MultiSelectDropdown 
 label="Model"
 placeholder="Select Models"
 options={models}
 selected={filterModel}
 onChange={setFilterModel}
 icon={Cpu}
 />
 <MultiSelectDropdown 
 label="Specification"
 placeholder="Select Specs"
 options={specs}
 selected={filterSpec}
 onChange={setFilterSpec}
 icon={Settings2}
 />
 <MultiSelectDropdown 
 label="Status"
 placeholder="Select Status"
 options={statuses}
 selected={filterStatus}
 onChange={setFilterStatus}
 icon={CheckCircle2}
 />
 <div className="relative group">
 <label className="block text-xs font-medium text-slate-400 dark:text-slate-500 dark:text-slate-400 mb-1.5 ml-1">Universal Search</label>
 <div className="relative">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={14} />
 <input 
 type="text" 
 placeholder="ID, Serial, User..."
 value={assetSearch}
 onChange={e => setAssetSearch(e.target.value)}
 className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all placeholder:text-slate-400/50"
 />
 </div>
 </div>
 </div>

 {/* Active Filters Display */}
 {(filterCategory.length > 0 || filterBrand.length > 0 || filterModel.length > 0 || filterSpec.length > 0 || filterDept.length > 0 || filterUser.length > 0 || filterStatus.length > 0 || assetSearch) && (
 <div className="flex flex-wrap gap-2 items-center text-xs p-4 border-t border-slate-100 dark:border-slate-800">
 <span className="text-slate-400 font-medium  mr-1">Active Clusters:</span>
 {filterCategory.map(cat => (
 <span key={cat} className="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded-lg border border-indigo-100 dark:border-indigo-800 flex items-center gap-1">
 Category: {cat} <X size={10} className="cursor-pointer" onClick={() => setFilterCategory(filterCategory.filter(c => c !== cat))} />
 </span>
 ))}
 {filterBrand.map(brand => (
 <span key={brand} className="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded-lg border border-indigo-100 dark:border-indigo-800 flex items-center gap-1">
 Brand: {brand} <X size={10} className="cursor-pointer" onClick={() => setFilterBrand(filterBrand.filter(b => b !== brand))} />
 </span>
 ))}
 {filterModel.map(model => (
 <span key={model} className="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded-lg border border-indigo-100 dark:border-indigo-800 flex items-center gap-1">
 Model: {model} <X size={10} className="cursor-pointer" onClick={() => setFilterModel(filterModel.filter(m => m !== model))} />
 </span>
 ))}
 <button 
 onClick={() => { setFilterCategory([]); setFilterBrand([]); setFilterModel([]); setFilterSpec([]); setFilterStatus([]); setFilterDept([]); setFilterUser([]); setAssetSearch(""); }}
 className="text-slate-400 hover:text-rose-500 font-medium text-slate-500 dark:text-slate-400 transition-colors ml-2 underline decoration-dotted"
 >
 Clear All Segments
 </button>
 </div>
 )}
 </div>

 <div className="enterprise-card overflow-hidden">
 {/* Desktop Table View */}
 <div className="hidden lg:block overflow-x-auto">
 <table className="w-full text-left">
 <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
 <tr className=" text-[#475569] dark:text-slate-300 font-medium text-xs hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
 <th className="px-4 py-3.5 whitespace-nowrap">
 <input 
 type="checkbox" 
 checked={selectedAssetIds.length > 0 && selectedAssetIds.length === filteredAssets.length}
 onChange={toggleSelectAll}
 className="w-3 h-3 rounded border-slate-300 bg-white dark:bg-slate-900 accent-indigo-600 cursor-pointer"
 />
 </th>
 <th className="px-4 py-5">HARDWARE</th>
 <th className="px-4 py-3.5">ASSIGNED USER</th>
 <th className="px-4 py-3.5">LOCATION</th>
 <th className="px-4 py-3.5">STATUS</th>
 <th className="px-4 py-3.5 text-right">PURCHASE DATE</th>
 {isAdmin && <th className="px-4 py-3.5 text-center">ACTIONS</th>}
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100">
 {filteredAssets.length === 0 ? (
 <tr>
 <td colSpan={6} className="px-6 py-12 text-center">
 <div className="flex flex-col items-center gap-3">
 <HardDrive className="text-slate-300" size={32} />
 <p className="text-sm text-slate-400 font-medium text-slate-500 dark:text-slate-400">Inventory Tracker Empty</p>
 <p className="text-xs text-indigo-600 font-medium text-slate-500 dark:text-slate-400 leading-loose text-center px-4">
 Please upload data export or check SOP-001 Sync logs.<br/>
 (ဒေတာများထည့်သွင်းရန် လိုအပ်နေပါသည်။)
 </p>
 </div>
 </td>
 </tr>
 ) : [
 { label: "Current Assets", items: currentAssets },
 { label: "Historical Records (>30 days)", items: historicalAssets }
 ].map((group) => (
 <React.Fragment key={group.label}>
 {group.items.length > 0 && (
 <tr className="bg-slate-50/30 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
 <td colSpan={isAdmin ? 7 : 6} className="px-6 py-2 text-xs font-medium text-indigo-600 ">{group.label}</td>
 </tr>
 )}
 {group.items.map((asset) => (
 <tr 
 key={asset.id} 
 onClick={() => setSelectedAsset(asset)}
 className={cn(
 "hover:bg-slate-50 transition-colors group cursor-pointer text-slate-600 dark:text-slate-300",
 selectedAssetIds.includes(asset.id) && "bg-indigo-50/50"
 )}
 >
 <td className="px-4 py-3.5" onClick={(e) => toggleSelectAsset(asset.id, e)}>
 <input 
 type="checkbox" 
 checked={selectedAssetIds.includes(asset.id)}
 onChange={() => {}} 
 className="w-3 h-3 rounded border-slate-300 bg-white dark:bg-slate-900 accent-indigo-600 cursor-pointer"
 />
 </td>
 <td className="px-4 py-3.5">
 <div className="flex items-center gap-3 text-slate-700 dark:text-slate-200">
 <div className="p-1.5 bg-slate-100 rounded-lg text-slate-400">
 {asset.category === "Computer" && <Monitor size={14} />}
 {asset.category === "Software" ? <RefreshCw size={14} /> : <HardDrive size={14} />}
 </div>
 <div>
 <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
 {asset.brand && <span className="text-indigo-600 font-medium mr-2">[{asset.brand}]</span>}
 {asset.model}
 </p>
 {asset.specs && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1 italic">{asset.specs}</p>}
 {asset.category === "Computer" ? (
 <div className="flex flex-wrap gap-2 mt-1">
 <span className="text-xs bg-indigo-50 text-indigo-600 px-1 rounded border border-indigo-100 flex items-center gap-1 font-medium italic ">
 <Layers size={8} /> Worth: {calculateTotalWorkstationValue(asset).toLocaleString()} MMK
 </span>
 {assets.filter(a => a.parentId === asset.id).length > 0 && (
 <span className="text-xs bg-slate-50 text-slate-500 dark:text-slate-400 px-1 rounded border border-slate-200 dark:border-slate-800 flex items-center gap-1 font-medium italic ">
 <Usb size={8} /> {assets.filter(a => a.parentId === asset.id).length} Connected
 </span>
 )}
 </div>
 ) : asset.parentId ? (
 <div className="flex flex-wrap gap-2 mt-1">
 <span className="text-xs bg-emerald-50 text-emerald-600 px-1 rounded border border-emerald-100 flex items-center gap-1 font-medium italic ">
 <Link2 size={8} /> Linked to: {assets.find(parent => parent.id === asset.parentId)?.model || asset.parentId}
 </span>
 </div>
 ) : (
 <div className="flex flex-wrap gap-2 mt-1">
 <span className="text-xs bg-amber-50 text-amber-600 px-1 rounded border border-amber-100 flex items-center gap-1 font-medium italic ">
 <MinusSquare size={8} /> Unassigned / Spare
 </span>
 </div>
 )}
 <p className="text-xs text-indigo-600 font-mono font-medium tracking-wider">{asset.asset_code || asset.id}</p>
 </div>
 </div>
 </td>
 <td className="px-4 py-3.5 text-xs text-indigo-600 font-medium text-slate-500 dark:text-slate-400">{asset.assignedTo}</td>
 <td className="px-4 py-3.5 text-xs text-slate-500 dark:text-slate-400 font-medium ">{(asset.department || asset.location) || "-"}</td>
 <td className="px-4 py-3.5">
 <span className={cn(
 "text-xs font-medium text-slate-500 dark:text-slate-400 px-2.5 py-1 rounded-full border",
 asset.status === "Active" ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
 asset.status === "New" ? "bg-indigo-50 text-indigo-600 border-indigo-100" :
 "bg-rose-50 text-rose-600 border-rose-100"
 )}>
 {asset.status}
 </span>
 </td>
 <td className="px-4 py-3.5 text-right">
 <span className="text-xs font-mono text-slate-400 font-medium">{asset.purchaseDate || "N/A"}</span>
 </td>
 {isAdmin && (
 <td className="px-4 py-3.5 text-center">
 <div className="flex items-center justify-center gap-1">
 <button 
 onClick={(e) => {
 e.stopPropagation();
 handlePrintAsset(asset);
 }}
 className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
 title="Print A6 Tag"
 >
 <Printer size={14} />
 </button>
 <button 
 disabled={isDeleting}
 onClick={(e) => handleDeleteAsset(asset.id, e)}
 className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
 title="Delete Asset"
 >
 <Trash2 size={14} />
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

 {/* Mobile Card View */}
 <div className="lg:hidden divide-y divide-slate-100">
 {filteredAssets.map((asset) => (
 <div key={asset.id} className={cn("relative", selectedAssetIds.includes(asset.id) && "bg-indigo-50/50")}>
 <div className="absolute left-4 top-4">
 <input 
 type="checkbox" 
 checked={selectedAssetIds.includes(asset.id)}
 onChange={(e) => {
 e.stopPropagation();
 setSelectedAssetIds(prev => 
 prev.includes(asset.id) ? prev.filter(a => a !== asset.id) : [...prev, asset.id]
 );
 }}
 className="w-4 h-4 rounded border-slate-300 bg-white dark:bg-slate-900 accent-indigo-600 cursor-pointer"
 />
 </div>
 <div 
 onClick={() => setSelectedAsset(asset)}
 className="w-full text-left p-4 pl-12 hover:bg-slate-50 transition-colors active:bg-slate-100 cursor-pointer"
 >
 <div className="flex justify-between items-start mb-3">
 <div className="flex items-center gap-2">
 <span className="text-xs font-mono font-medium text-indigo-600 tracking-wider">[{asset.asset_code || asset.id}]</span>
 <span className="text-xs px-1.5 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded font-medium text-slate-500 dark:text-slate-400">
 {asset.category}
 </span>
 {(isMaintenanceNear(asset.maintenanceDueDate) || isMaintenanceOverdue(asset.maintenanceDueDate)) && (
 <AlertTriangle size={10} className={cn("animate-pulse", isMaintenanceOverdue(asset.maintenanceDueDate) ? "text-rose-600" : "text-amber-600")} />
 )}
 </div>
 <div className="flex items-center gap-1">
 <div className={cn(
 "px-2 py-0.5 rounded-full text-xs font-medium",
 asset.status === "Active" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
 )}>
 {asset.status}
 </div>
 <button 
 onClick={(e) => {
 e.stopPropagation();
 handlePrintAsset(asset);
 }}
 className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors"
 >
 <Printer size={12} />
 </button>
 {isAdmin && (
 <button 
 disabled={isDeleting}
 onClick={(e) => handleDeleteAsset(asset.id, e)}
 className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
 >
 <Trash2 size={12} />
 </button>
 )}
 </div>
 </div>
 
 <div className="mb-4">
 <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-tight">
 <span className="text-slate-400 mr-1 font-medium">{asset.brand}</span>
 {asset.model}
 </p>
 {asset.specs && <p className="text-xs text-slate-400 mt-1 italic leading-relaxed">{asset.specs}</p>}
 {asset.peripherals && (
 <div className="flex flex-wrap gap-1.5 mt-2">
 {asset.peripherals.keyboard && (
 <div className="flex items-center gap-1 bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded text-xs border border-amber-100 italic">
 <Keyboard size={8} /> {asset.peripherals.keyboard}
 </div>
 )}
 {asset.peripherals.mouse && (
 <div className="flex items-center gap-1 bg-slate-50 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded text-xs border border-slate-200 dark:border-slate-800 italic">
 <MousePointer2 size={8} /> {asset.peripherals.mouse}
 </div>
 )}
 {asset.peripherals.usb && (
 <div className="flex items-center gap-1 bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded text-xs border border-indigo-100 italic">
 <Usb size={8} /> {asset.peripherals.usb}
 </div>
 )}
 {asset.peripherals.fan && (
 <div className="flex items-center gap-1 bg-cyan-50 text-cyan-600 px-1.5 py-0.5 rounded text-xs border border-cyan-100 italic">
 <Wind size={8} /> {asset.peripherals.fan}
 </div>
 )}
 </div>
 )}
 </div>

 <div className="grid grid-cols-3 gap-2 p-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 rounded-lg">
 <div className="flex flex-col">
 <span className="text-xs text-slate-400  font-medium tracking-widest">Dept</span>
 <span className="text-xs text-slate-600 dark:text-slate-300 font-medium  truncate">{(asset.department || asset.location) || "-"}</span>
 </div>
 <div className="flex flex-col border-l border-slate-200 dark:border-slate-800 pl-2">
 <span className="text-xs text-slate-400  font-medium tracking-widest">User</span>
 <span className="text-xs text-indigo-600 font-medium  truncate">{asset.assignedTo || "Unassigned"}</span>
 </div>
 <div className="flex flex-col border-l border-slate-200 dark:border-slate-800 pl-2 text-right">
 <span className="text-xs text-slate-400  font-medium tracking-widest">Price</span>
 <span className="text-xs text-emerald-600 font-medium font-mono">
 {asset.purchasePrice ? Number(asset.purchasePrice).toLocaleString() : "0"} <span className="text-xs opacity-60">MMK</span>
 </span>
 </div>
 </div>
 </div>
 </div>
 ))}
 </div>
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
 <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
 <motion.div 
 initial={{ scale: 0.95, opacity: 0 }}
 animate={{ scale: 1, opacity: 1 }}
 exit={{ scale: 0.95, opacity: 0 }}
 className="enterprise-modal p-8 w-full max-w-2xl"
 >
 <div className="flex justify-between items-start mb-8">
 <div>
 <h3 className="text-xl font-medium text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
 <Monitor className="text-indigo-600" size={20} />
 Asset Details: {selectedAsset.asset_code || selectedAsset.id}
 </h3>
 <p className="text-xs text-slate-400  font-medium tracking-widest mt-1">Full hardware audit specification</p>
 </div>
 <button onClick={() => setSelectedAsset(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
 <X size={20} />
 </button>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
 <div className="space-y-6">
 <div>
 <h4 className="text-xs font-medium text-slate-400 mb-3">Core Configuration</h4>
 <div className="space-y-3">
 <div className="flex justify-between border-b border-slate-100 pb-2">
 <span className="text-xs text-slate-500 dark:text-slate-400">Asset Code</span>
 <span className="text-xs font-medium text-indigo-600">{selectedAsset.asset_code || "PENDING"}</span>
 </div>
 <div className="flex justify-between border-b border-slate-100 pb-2">
 <span className="text-xs text-slate-500 dark:text-slate-400">Internal ID</span>
 <span className="text-xs font-mono text-slate-400">{selectedAsset.id}</span>
 </div>
 <div className="flex justify-between border-b border-slate-100 pb-2">
 <span className="text-xs text-slate-500 dark:text-slate-400">Model</span>
 <span className="text-xs font-medium text-slate-800 dark:text-slate-100">{selectedAsset.model}</span>
 </div>
 <div className="flex justify-between border-b border-slate-100 pb-2">
 <span className="text-xs text-slate-500 dark:text-slate-400">Serial</span>
 <span className="text-xs font-mono text-slate-600 dark:text-slate-300">{selectedAsset.serialNumber}</span>
 </div>
 <div className="flex justify-between border-b border-slate-100 pb-2">
 <span className="text-xs text-slate-500 dark:text-slate-400">Specs</span>
 <span className="text-xs text-indigo-600 font-medium">{selectedAsset.specs || "Standard Build"}</span>
 </div>
 <div className="flex justify-between border-b border-slate-100 pb-2">
 <span className="text-xs text-slate-500 dark:text-slate-400">Purchase Date</span>
 <span className="text-xs font-medium text-slate-800 dark:text-slate-100">{selectedAsset.purchaseDate}</span>
 </div>
 <div className="flex justify-between border-b border-slate-100 pb-2">
 <span className="text-xs text-slate-500 dark:text-slate-400">Unit Price</span>
 <span className="text-xs text-emerald-600 font-medium font-mono">{(selectedAsset.itemPrice || Number(selectedAsset.purchasePrice) || 0).toLocaleString()} MMK</span>
 </div>
 {selectedAsset.category === "Computer" && (
 <div className="flex justify-between border-b-2 border-indigo-100 pb-2 bg-indigo-50/30 px-2 -mx-2 rounded-lg">
 <span className="text-xs text-indigo-600 font-medium flex items-center gap-1"><Layers size={10} /> Workstation Value</span>
 <span className="text-xs text-indigo-700 font-medium font-mono">{calculateTotalWorkstationValue(selectedAsset).toLocaleString()} MMK</span>
 </div>
 )}
 <div className="flex justify-between border-b border-slate-100 pb-2 items-center">
 <span className="text-xs text-slate-500 dark:text-slate-400">Maintenance Due</span>
 <div className="flex flex-col items-end">
 <span className={cn(
 "text-xs font-medium",
 isMaintenanceOverdue(selectedAsset.maintenanceDueDate) ? "text-rose-600" :
 isMaintenanceNear(selectedAsset.maintenanceDueDate) ? "text-amber-600" : "text-slate-800 dark:text-slate-100"
 )}>
 {selectedAsset.maintenanceDueDate || "Not set"}
 </span>
 {(isMaintenanceNear(selectedAsset.maintenanceDueDate) || isMaintenanceOverdue(selectedAsset.maintenanceDueDate)) && (
 <span className="text-xs font-medium  text-amber-500 animate-pulse">
 {isMaintenanceOverdue(selectedAsset.maintenanceDueDate) ? "Overdue" : "Due Soon"}
 </span>
 )}
 </div>
 </div>
 <div className="flex justify-between border-b border-slate-100 pb-2">
 <span className="text-xs text-slate-400">UOM</span>
 <span className="text-xs font-medium text-slate-800 dark:text-slate-100">{selectedAsset.uom || "Unit"}</span>
 </div>
 <div className="flex justify-between border-b border-slate-100 pb-2">
 <span className="text-xs text-slate-400">Section</span>
 <span className="text-xs font-medium text-slate-800 dark:text-slate-100">{selectedAsset.remark2 || "-"}</span>
 </div>
 </div>
 </div>

 <div>
 <h4 className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-3">Assignment Data</h4>
 <div className="space-y-3">
 <div className="flex justify-between border-b border-slate-100 pb-2">
 <span className="text-xs text-slate-500 dark:text-slate-400">Assigned User</span>
 <span className="text-xs font-medium text-slate-800 dark:text-slate-100">{selectedAsset.assignedTo}</span>
 </div>
 <div className="flex justify-between border-b border-slate-100 pb-2">
 <span className="text-xs text-slate-500 dark:text-slate-400">Department</span>
 <span className="text-xs font-medium text-slate-800 dark:text-slate-100">{selectedAsset.department || "-"}</span>
 </div>
 <div className="flex justify-between border-b border-slate-100 pb-2">
 <span className="text-xs text-slate-500 dark:text-slate-400">Location</span>
 <span className="text-xs font-medium text-slate-800 dark:text-slate-100">{selectedAsset.location}</span>
 </div>
 </div>
 </div>
 </div>

 <div className="space-y-6">
 <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
 <h4 className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2">
 {selectedAsset.category === "Mobile" ? (
 <>
 <Smartphone size={14} className="text-indigo-600" />
 Cellular Network & IMEI
 </>
 ) : ["Keyboard", "Mouse", "Monitor", "UPS", "USB Hub", "Fan", "Peripherals"].includes(selectedAsset.category) ? (
 <>
 <Usb size={14} className="text-indigo-600" />
 Linkage & Hierarchy
 </>
 ) : (
 <>
 <Package size={14} className="text-indigo-600" />
 Peripheral Bundle
 </>
 )}
 </h4>
 <div className="space-y-4">
 {selectedAsset.category === "Mobile" ? (
 <>
 <div className="flex items-start gap-3">
 <div className="w-1 h-1 bg-indigo-600 rounded-full mt-2" />
 <div>
 <p className="text-xs font-medium text-slate-500 dark:text-slate-400 ">SIM Card / Number</p>
 <p className="text-xs text-slate-800 dark:text-slate-100 font-medium">{selectedAsset.remarks || "No SIM Data"}</p>
 </div>
 </div>
 </>
 ) : ["Keyboard", "Mouse", "Monitor", "UPS", "USB Hub", "Fan", "Peripherals"].includes(selectedAsset.category) ? (
 <>
 <div className="flex items-start gap-3">
 <div className="w-1 h-1 bg-indigo-600 rounded-full mt-2" />
 <div>
 <p className="text-xs font-medium text-slate-500 dark:text-slate-400 ">Linkage Status</p>
 <p className={cn(
 "text-xs font-medium",
 selectedAsset.parentId ? "text-indigo-600" : "text-amber-600"
 )}>
 {selectedAsset.parentId 
 ? `Assigned to ${assets.find(a => a.id === selectedAsset.parentId)?.model || selectedAsset.parentId}`
 : "Standalone / Spare"}
 </p>
 </div>
 </div>
 <div className="flex items-start gap-3">
 <div className="w-1 h-1 bg-indigo-600 rounded-full mt-2" />
 <div>
 <p className="text-xs font-medium text-slate-500 dark:text-slate-400 ">Hardware Parent ID</p>
 <div className="flex items-center gap-2">
 <p className="text-xs text-slate-800 dark:text-slate-100 font-medium">{selectedAsset.parentId || "NO PARENT"}</p>
 {selectedAsset.parentId && isAdmin && (
 <button 
 onClick={() => handleUnlink(selectedAsset)}
 className="px-2 py-0.5 bg-rose-50 text-rose-600 rounded text-xs font-medium hover:bg-rose-100 transition-colors"
 >
 Unlink
 </button>
 )}
 </div>
 </div>
 </div>
 </>
 ) : selectedAsset.category === "Computer" ? (
 <>
 <div className="flex items-start gap-3">
 <div className="w-1 h-1 bg-indigo-600 rounded-full mt-2" />
 <div className="flex-1">
 <div className="flex justify-between items-center mb-2">
 <p className="text-xs font-medium text-slate-500 dark:text-slate-400 ">Connected Peripherals</p>
 {isAdmin && (
 <div className="w-48 scale-90 origin-right">
 <SearchableSelect 
 label=""
 placeholder="Link accessory..."
 value=""
 onChange={(childId) => handleLink(childId, selectedAsset.id)}
 options={assets.filter(a => !a.parentId && ["Keyboard", "Mouse", "Monitor", "UPS", "USB Hub", "Fan", "Peripherals"].includes(a.category)).map(a => ({
 id: a.id,
 label: `${a.category}: ${a.model}`
 }))}
 />
 </div>
 )}
 </div>
 <div className="space-y-2">
 {assets.filter(a => a.parentId === selectedAsset.id).length === 0 ? (
 <p className="text-xs text-slate-400 font-medium  italic p-2 bg-slate-50 rounded-lg">No active linkages</p>
 ) : assets.filter(a => a.parentId === selectedAsset.id).map(p => (
 <div key={p.id} className="flex justify-between items-center bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm group">
 <div className="flex flex-col">
 <span className="text-xs font-medium text-slate-400  leading-none mb-1">{p.category}</span>
 <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{p.model}</span>
 </div>
 <div className="flex items-center gap-3">
 <span className="text-xs font-medium font-mono text-emerald-600">{(p.itemPrice || Number(p.purchasePrice) || 0).toLocaleString()} MMK</span>
 {isAdmin && (
 <button 
 onClick={() => handleUnlink(p)}
 className="text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
 >
 <X size={12} />
 </button>
 )}
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>
 <div className="flex items-start gap-3 mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
 <div className="w-1 h-1 bg-indigo-600 rounded-full mt-2" />
 <div>
 <p className="text-xs font-medium text-slate-500 dark:text-slate-400 ">Inventory Quick-Details</p>
 <div className="grid grid-cols-2 gap-2 mt-2">
 <div className="p-2 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800">
 <p className="text-xs font-medium text-slate-400 ">KB</p>
 <p className="text-xs font-medium truncate">{selectedAsset.peripherals?.keyboard || "-"}</p>
 </div>
 <div className="p-2 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800">
 <p className="text-xs font-medium text-slate-400 ">Mouse</p>
 <p className="text-xs font-medium truncate">{selectedAsset.peripherals?.mouse || "-"}</p>
 </div>
 </div>
 </div>
 </div>
 </>
 ) : (
 <div className="flex items-center justify-center py-8">
 <p className="text-xs text-slate-400 font-medium  italic tracking-widest text-center">No specialized data for this category</p>
 </div>
 )}
 </div>
 </div>
 </div>
 </div>
 
 <div className="mt-8 pt-6 border-t border-white/10 flex justify-end gap-3">
 <button 
 onClick={() => handlePrintAsset(selectedAsset)}
 className="px-6 py-2 bg-slate-100 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium  hover:bg-slate-200 transition-all flex items-center gap-2"
 >
 <Printer size={14} /> Print A6 Tag
 </button>
 <button 
 onClick={() => {
 setNewAsset({ ...selectedAsset });
 setIsEditing(true);
 setIsAdding(true);
 setSelectedAsset(null);
 }}
 className="px-6 py-2 bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 rounded-xl text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-cyan-600 hover:text-white transition-all"
 >
 Edit Asset
 </button>
 <button 
 onClick={() => setSelectedAsset(null)}
 className="px-6 py-2 bg-white dark:bg-slate-900/10 text-white rounded-xl text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-white dark:bg-slate-900/20 transition-all"
 >
 Close Specification
 </button>
 </div>
 </motion.div>
 </div>
 )}

 {isAdding && (
 <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-0 sm:p-4">
 <motion.div 
 initial={{ y: 20, opacity: 0 }}
 animate={{ y: 0, opacity: 1 }}
 exit={{ y: 20, opacity: 0 }}
 className="enterprise-modal w-full h-full sm:h-auto sm:max-w-lg rounded-none sm:rounded-3xl overflow-hidden flex flex-col sm:max-h-[90vh]"
 >
 <div className="p-6 sm:p-8 border-b border-slate-100 shrink-0 bg-white dark:bg-slate-900">
 <h3 className="text-lg sm:text-xl font-medium text-slate-800 dark:text-slate-100 tracking-tight">
 {isEditing ? `Edit Asset: ${newAsset.id}` : "Infrastructure Node Registration"}
 </h3>
 </div>
 
 <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar space-y-6 flex-1 bg-white dark:bg-slate-900">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
 <div>
 <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Category</label>
 <select 
 value={newAsset.category}
 onChange={e => setNewAsset({...newAsset, category: e.target.value as any})}
 className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
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
 <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">UOM</label>
 <input 
 type="text" 
 value={newAsset.uom || ""}
 onChange={e => setNewAsset({...newAsset, uom: e.target.value})}
 placeholder="e.g., Unit, Set" 
 className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
 />
 </div>
 </div>
 
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
 <div>
 <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Brand</label>
 <input 
 type="text" 
 value={newAsset.brand || ""}
 onChange={e => setNewAsset({...newAsset, brand: e.target.value})}
 placeholder="e.g., HP, Dell, Huawei" 
 className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
 />
 </div>
 <div>
 <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Model</label>
 <input 
 type="text" 
 value={newAsset.model || ""}
 onChange={e => setNewAsset({...newAsset, model: e.target.value})}
 placeholder="e.g., Latitude 5420" 
 className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
 <div>
 <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Specs (CPU/RAM/SSD)</label>
 <input 
 type="text" 
 value={newAsset.specs || ""}
 onChange={e => setNewAsset({...newAsset, specs: e.target.value})}
 placeholder="e.g., i5/8GB/256GB" 
 className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
 />
 </div>
 <div>
 <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Serial Number</label>
 <input 
 type="text" 
 value={newAsset.serialNumber || ""}
 onChange={e => setNewAsset({...newAsset, serialNumber: e.target.value})}
 placeholder="Unique identifier" 
 className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
 <div>
 <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Item Price (MMK)</label>
 <input 
 type="number" 
 value={newAsset.itemPrice || newAsset.purchasePrice || ""}
 onChange={e => setNewAsset({...newAsset, itemPrice: Number(e.target.value), purchasePrice: e.target.value})}
 placeholder="e.g., 400000" 
 className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
 />
 </div>
 <div>
 <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Procure Date</label>
 <input 
 type="date"
 value={newAsset.purchaseDate || ""}
 onChange={e => setNewAsset({...newAsset, purchaseDate: e.target.value})}
 className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
 />
 </div>
 <div>
 <label className="block text-xs font-medium text-amber-600 mb-2">Maintenance Due</label>
 <input 
 type="date"
 value={newAsset.maintenanceDueDate || ""}
 onChange={e => setNewAsset({...newAsset, maintenanceDueDate: e.target.value})}
 className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-amber-200 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
 />
 </div>
 </div>

 {newAsset.category !== "Computer" && (
 <div className="p-6 bg-indigo-50/50 border border-indigo-100 rounded-2xl space-y-4">
 <div className="flex items-center justify-between mb-2">
 <h4 className="text-xs font-medium text-indigo-600 flex items-center gap-2">
 <Usb size={12} /> Hardware Linkage System
 </h4>
 <button 
 onClick={() => setNewAsset({...newAsset, parentId: newAsset.parentId ? null : ""})}
 className={cn(
 "px-3 py-1 rounded-full text-xs font-medium text-slate-500 dark:text-slate-400 border transition-all",
 newAsset.parentId === null 
 ? "bg-amber-100/50 text-amber-700 border-amber-200" 
 : "bg-indigo-100/50 text-indigo-700 border-indigo-200"
 )}
 >
 {newAsset.parentId === null ? "Standalone Mode" : "Assign Mode"}
 </button>
 </div>

 {newAsset.parentId !== null && (
 <SearchableSelect 
 label="Parent Workstation"
 placeholder="Search Active PCs..."
 value={newAsset.parentId || ""}
 onChange={(val) => setNewAsset({...newAsset, parentId: val})}
 options={assets.filter(a => a.category === "Computer" && a.id !== newAsset.id).map(a => ({
 id: a.id,
 label: `${a.brand || ""} ${a.model}`.trim()
 }))}
 />
 )}

 <div className="flex items-start gap-3 p-3 bg-white dark:bg-slate-900/60 rounded-xl border border-indigo-100/50">
 <Info size={14} className="text-indigo-400 shrink-0 mt-0.5" />
 <p className="text-xs text-indigo-700/70 font-semibold leading-relaxed">
 {newAsset.parentId 
 ? `This ${newAsset.model || "item"} will be linked to the selected Workstation's total value & audit logs.`
 : "This item will be marked as 'Standalone / Spare' and stored in central inventory."}
 </p>
 </div>
 </div>
 )}

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
 <div>
 <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Status</label>
 <select 
 value={newAsset.status || "Active"}
 onChange={e => setNewAsset({...newAsset, status: e.target.value as any})}
 className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
 >
 <option value="Active">Active</option>
 <option value="In Stock">In Stock</option>
 <option value="New">New</option>
 <option value="Maintenance">Maintenance</option>
 <option value="Under Repair">Under Repair</option>
 <option value="Pending / New Arrival">Pending / New Arrival</option>
 <option value="Standalone / Spare">Standalone / Spare</option>
 <option value="Retired">Retired</option>
 <option value="Disposed">Disposed</option>
 </select>
 </div>
 <div>
 <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Assigned To</label>
 <input 
 type="text" 
 value={newAsset.assignedTo || ""}
 onChange={e => setNewAsset({...newAsset, assignedTo: e.target.value})}
 placeholder="Staff Name" 
 className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
 <div>
 <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Department</label>
 <select 
 value={newAsset.department || ""}
 onChange={e => setNewAsset({...newAsset, department: e.target.value})}
 className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
 >
 <option value="">Select Department</option>
 {settings.departments.map(dept => (
 <option key={dept} value={dept}>{dept}</option>
 ))}
 </select>
 </div>
 <div>
 <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Location</label>
 <select 
 value={newAsset.location || ""}
 onChange={e => setNewAsset({...newAsset, location: e.target.value})}
 className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
 >
 <option value="">Select Location</option>
 {settings.locations.map(loc => (
 <option key={loc} value={loc}>{loc}</option>
 ))}
 </select>
 </div>
 </div>

 <div>
 <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Remark2 (Section)</label>
 <input 
 type="text" 
 value={newAsset.remark2 || ""}
 onChange={e => setNewAsset({...newAsset, remark2: e.target.value})}
 placeholder="Additional notes" 
 className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
 />
 </div>

 <div className="pt-4 border-t border-slate-100">
 <h4 className="text-xs font-medium text-indigo-600 mb-4 flex items-center gap-2">
 <Package size={14} />
 Peripheral Details (Optional)
 </h4>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
 <div>
 <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Keyboard</label>
 <input 
 type="text" 
 value={newAsset.peripherals?.keyboard || ""}
 onChange={e => setNewAsset({...newAsset, peripherals: { ...newAsset.peripherals, keyboard: e.target.value }})}
 placeholder="Model / Serial" 
 className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
 />
 </div>
 <div>
 <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Mouse</label>
 <input 
 type="text" 
 value={newAsset.peripherals?.mouse || ""}
 onChange={e => setNewAsset({...newAsset, peripherals: { ...newAsset.peripherals, mouse: e.target.value }})}
 placeholder="Model / Serial" 
 className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
 />
 </div>
 <div>
 <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">USB Ports</label>
 <input 
 type="text" 
 value={newAsset.peripherals?.usb || ""}
 onChange={e => setNewAsset({...newAsset, peripherals: { ...newAsset.peripherals, usb: e.target.value }})}
 placeholder="e.g., 4 Ports, USB-C Hub" 
 className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
 />
 </div>
 <div>
 <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Cooling Fan</label>
 <input 
 type="text" 
 value={newAsset.peripherals?.fan || ""}
 onChange={e => setNewAsset({...newAsset, peripherals: { ...newAsset.peripherals, fan: e.target.value }})}
 placeholder="Model / Quantity" 
 className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
 />
 </div>
 </div>
 </div>
 </div>

 <div className="p-6 sm:p-8 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row gap-3 sm:gap-4 shrink-0">
 <button 
 onClick={() => {
 setIsAdding(false);
 setIsEditing(false);
 setNewAsset({ category: "Computer", status: "Active" });
 }}
 className="w-full sm:flex-1 py-4 sm:py-3 px-4 bg-slate-200 text-slate-600 dark:text-slate-300 rounded-xl font-medium text-xs hover:bg-slate-300 transition-colors order-2 sm:order-1"
 >
 Terminate
 </button>
 <button 
 onClick={handleAddAsset}
 className="w-full sm:flex-1 py-4 sm:py-3 px-4 bg-indigo-600 text-white rounded-xl font-medium text-xs shadow-lg shadow-indigo-900/40 hover:bg-indigo-700 transition-colors order-1 sm:order-2"
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
 title="Hardware Purge Confirmation"
 message={
 deleteTarget?.type === 'bulk-asset' && Array.isArray(deleteTarget.id)
 ? `SOP-001 Risk Alert: Bulk delete ${deleteTarget.id.length} assets permanently? This cannot be undone.`
 : `SOP-001 Security Alert: Are you sure you want to purge asset ${deleteTarget?.id} from the active inventory? This operation is irreversible and will unlink any connected peripherals.`
 }
 confirmText="Confirm Purge"
 />
 </div>
 );
}
