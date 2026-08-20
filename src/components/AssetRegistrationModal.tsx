import React, { useState, useEffect } from 'react';
import { ITAsset } from '../types';
import { X, Tag, Plus, Check, Edit3 } from 'lucide-react';

interface AssetRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (assetData: Partial<ITAsset>) => Promise<void>;
  departments: string[];
  locations: string[];
  suppliers?: string[];
  assetToEdit?: ITAsset | null;
}

export function AssetRegistrationModal({
  isOpen,
  onClose,
  onSave,
  departments,
  locations,
  suppliers = ['KMD Computer Taunggyi', 'Apex IT Solutions', 'Royal Myanmar Tech', 'Local Supplier'],
  assetToEdit = null
}: AssetRegistrationModalProps) {
  if (!isOpen) return null;

  const [category, setCategory] = useState<ITAsset['category']>('Computer');
  const [model, setModel] = useState('');
  const [brand, setBrand] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [department, setDepartment] = useState(departments[0] || 'IT');
  const [location, setLocation] = useState(locations[0] || 'Central Storage');
  const [assignedTo, setAssignedTo] = useState('Unassigned');
  const [condition, setCondition] = useState<ITAsset['condition']>('Brand New');
  const [purchasePrice, setPurchasePrice] = useState<number>(500000);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [warrantyEndDate, setWarrantyEndDate] = useState('');
  const [supplier, setSupplier] = useState(suppliers[0] || '');

  // Category-specific specs
  const [cpu, setCpu] = useState('');
  const [ram, setRam] = useState('');
  const [storage, setStorage] = useState('');
  const [os, setOs] = useState('');
  const [imei1, setImei1] = useState('');
  const [imei2, setImei2] = useState('');
  const [networkIp, setNetworkIp] = useState('');
  const [macAddress, setMacAddress] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (assetToEdit) {
      setCategory(assetToEdit.category || 'Computer');
      setModel(assetToEdit.model || '');
      setBrand(assetToEdit.brand || '');
      setSerialNumber(assetToEdit.serialNumber || '');
      setDepartment(assetToEdit.department || departments[0] || 'IT');
      setLocation(assetToEdit.location || locations[0] || 'Central Storage');
      setAssignedTo(assetToEdit.assignedTo || 'Unassigned');
      setCondition(assetToEdit.condition || 'Good');
      setPurchasePrice(assetToEdit.purchasePrice || assetToEdit.itemPrice || 500000);
      setInvoiceNumber(assetToEdit.invoiceNumber || '');
      setPurchaseDate(assetToEdit.purchaseDate || new Date().toISOString().split('T')[0]);
      setWarrantyEndDate(assetToEdit.warrantyEndDate || '');
      setSupplier(assetToEdit.supplier || suppliers[0] || '');
      
      const specs = assetToEdit.detailedSpecs || {};
      setCpu(specs.cpu || '');
      setRam(specs.ram || '');
      setStorage(specs.storage || '');
      setOs(specs.os || '');
      setImei1(specs.imei1 || '');
      setImei2(specs.imei2 || '');
      setNetworkIp(specs.networkIp || '');
      setMacAddress(specs.macAddress || '');
    } else {
      setCategory('Computer');
      setModel('');
      setBrand('');
      setSerialNumber('');
      setDepartment(departments[0] || 'IT');
      setLocation(locations[0] || 'Central Storage');
      setAssignedTo('Unassigned');
      setCondition('Brand New');
      setPurchasePrice(500000);
      setInvoiceNumber('');
      setPurchaseDate(new Date().toISOString().split('T')[0]);
      setWarrantyEndDate('');
      setSupplier(suppliers[0] || '');
      setCpu(''); setRam(''); setStorage(''); setOs('');
      setImei1(''); setImei2(''); setNetworkIp(''); setMacAddress('');
    }
  }, [assetToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!model.trim()) {
      alert('Model name is required.');
      return;
    }
    setIsSubmitting(true);
    try {
      const detailedSpecs: any = {};
      if (category === 'Computer') {
        detailedSpecs.cpu = cpu;
        detailedSpecs.ram = ram;
        detailedSpecs.storage = storage;
        detailedSpecs.os = os;
      } else if (category === 'Mobile') {
        detailedSpecs.imei1 = imei1;
        detailedSpecs.imei2 = imei2;
      } else if (category === 'Network' || category === 'Printer') {
        detailedSpecs.networkIp = networkIp;
        detailedSpecs.macAddress = macAddress;
      }

      await onSave({
        ...(assetToEdit ? { id: assetToEdit.id, asset_code: assetToEdit.asset_code } : {}),
        category,
        model: model.trim(),
        brand: brand.trim(),
        serialNumber: serialNumber.trim(),
        department,
        location,
        assignedTo: assignedTo.trim() || 'Unassigned',
        status: assignedTo && assignedTo !== 'Unassigned' ? 'Assigned' : 'In Stock',
        condition,
        purchasePrice: Number(purchasePrice) || 0,
        currency: 'MMK',
        invoiceNumber: invoiceNumber.trim(),
        purchaseDate,
        warrantyEndDate,
        supplier,
        detailedSpecs
      });
      onClose();
    } catch (err) {
      console.error("Failed to save asset:", err);
      alert('Error saving asset.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center font-bold">
              {assetToEdit ? <Edit3 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {assetToEdit ? `Edit Asset (${assetToEdit.asset_code || assetToEdit.model})` : 'Smart IT Asset Registration'}
              </h2>
              <p className="text-xs text-slate-500">Manage hardware specifications, department assignment, and lifecycle metadata</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Asset Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200"
              >
                <option value="Computer">Computer / Laptop</option>
                <option value="Printer">Printer / Scanner</option>
                <option value="Network">Network Equipment</option>
                <option value="Mobile">Phone / Tablet</option>
                <option value="CCTV">CCTV Camera</option>
                <option value="Peripherals">Peripherals</option>
                <option value="UPS">UPS / Power</option>
                <option value="Other">Other Equipment</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Brand / Manufacturer</label>
              <input
                type="text"
                placeholder="e.g. Dell, Lenovo, HP, Cisco"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Model Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. ThinkPad L14 Gen 3"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Serial Number</label>
              <input
                type="text"
                placeholder="e.g. SN-99823411"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Department</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200"
              >
                {departments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Physical Location</label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200"
              >
                {locations.map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Assigned Custodian</label>
              <input
                type="text"
                placeholder="Employee name or 'Unassigned'"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Condition</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200"
              >
                <option value="Brand New">Brand New</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
                <option value="Needs Repair">Needs Repair</option>
                <option value="Damaged">Damaged</option>
              </select>
            </div>
          </div>

          {/* Category specific fields */}
          {category === 'Computer' && (
            <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 space-y-3">
              <h4 className="font-bold text-indigo-900 dark:text-indigo-300">Computer Hardware Specs</h4>
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="CPU (e.g. Intel Core i5)" value={cpu} onChange={e => setCpu(e.target.value)} className="px-3 py-2 bg-white dark:bg-slate-900 border rounded-xl" />
                <input type="text" placeholder="RAM (e.g. 16GB DDR4)" value={ram} onChange={e => setRam(e.target.value)} className="px-3 py-2 bg-white dark:bg-slate-900 border rounded-xl" />
                <input type="text" placeholder="Storage (e.g. 512GB NVMe SSD)" value={storage} onChange={e => setStorage(e.target.value)} className="px-3 py-2 bg-white dark:bg-slate-900 border rounded-xl" />
                <input type="text" placeholder="OS (e.g. Windows 11 Pro)" value={os} onChange={e => setOs(e.target.value)} className="px-3 py-2 bg-white dark:bg-slate-900 border rounded-xl" />
              </div>
            </div>
          )}

          {category === 'Mobile' && (
            <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/25 border border-indigo-100 dark:border-indigo-900/50 space-y-3">
              <h4 className="font-bold text-indigo-900 dark:text-indigo-300">Phone / Mobile Specs</h4>
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="IMEI 1" value={imei1} onChange={e => setImei1(e.target.value)} className="px-3 py-2 bg-white dark:bg-slate-900 border rounded-xl" />
                <input type="text" placeholder="IMEI 2" value={imei2} onChange={e => setImei2(e.target.value)} className="px-3 py-2 bg-white dark:bg-slate-900 border rounded-xl" />
              </div>
            </div>
          )}

          {(category === 'Network' || category === 'Printer') && (
            <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/25 border border-indigo-100 dark:border-indigo-900/50 space-y-3">
              <h4 className="font-bold text-indigo-900 dark:text-indigo-300">Network / Connectivity Specs</h4>
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="IP Address (e.g. 192.168.1.50)" value={networkIp} onChange={e => setNetworkIp(e.target.value)} className="px-3 py-2 bg-white dark:bg-slate-900 border rounded-xl" />
                <input type="text" placeholder="MAC Address (e.g. A4:BB:6D:...)" value={macAddress} onChange={e => setMacAddress(e.target.value)} className="px-3 py-2 bg-white dark:bg-slate-900 border rounded-xl" />
              </div>
            </div>
          )}

          {/* Financial details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Purchase Price (MMK)</label>
              <input
                type="number"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Supplier / Vendor</label>
              <select
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
              >
                {suppliers.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Warranty Expiry</label>
              <input
                type="date"
                value={warrantyEndDate}
                onChange={(e) => setWarrantyEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 font-semibold text-slate-700 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-semibold text-white shadow-xs disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSubmitting ? 'Registering...' : 'Save & Generate Code'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
