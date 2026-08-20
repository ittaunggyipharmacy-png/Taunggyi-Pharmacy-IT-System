import React from 'react';
import { AlertCircle, RefreshCw, Settings as SettingsIcon, Building2 } from 'lucide-react';
import { useDepartments } from '../hooks/useDepartments';
import { formatDepartmentOptions } from '../utils/departmentUtils';
import { SystemSettings } from '../types';

export interface DepartmentSelectProps {
  id?: string;
  value?: string;
  onChange: (value: string) => void;
  settings?: SystemSettings;
  existingDepartment?: string;
  onNavigateToSettings?: () => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  showIcon?: boolean;
}

export const DepartmentSelect: React.FC<DepartmentSelectProps> = ({
  id = 'department-select',
  value,
  onChange,
  settings,
  existingDepartment,
  onNavigateToSettings,
  required = false,
  disabled = false,
  className = '',
  placeholder = 'Select Department',
  showIcon = false
}) => {
  const { departments, loading, error, retry } = useDepartments(settings);

  const options = formatDepartmentOptions(departments, existingDepartment || value);

  // If loading and no cached departments
  if (loading && options.length === 0) {
    return (
      <div className="relative">
        <select
          id={id}
          disabled
          aria-busy="true"
          className={`w-full px-3 py-2 text-xs bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-400 cursor-not-allowed ${className}`}
        >
          <option value="">Loading departments…</option>
        </select>
      </div>
    );
  }

  // Error state
  if (error && options.length === 0) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between p-2 text-xs rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300">
          <div className="flex items-center gap-1.5">
            <AlertCircle size={14} className="shrink-0" />
            <span>Unable to load departments.</span>
          </div>
          <button
            type="button"
            onClick={retry}
            className="flex items-center gap-1 px-2 py-0.5 text-2xs font-medium bg-white dark:bg-slate-800 border border-rose-300 dark:border-rose-700 rounded-lg hover:bg-rose-50"
          >
            <RefreshCw size={10} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Empty state: No departments configured in Firestore
  if (!loading && options.length === 0) {
    return (
      <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 space-y-2">
        <div className="flex items-center gap-2 text-xs font-medium">
          <Building2 size={15} className="text-amber-600 dark:text-amber-400 shrink-0" />
          <span>No departments configured</span>
        </div>
        <p className="text-2xs text-amber-700 dark:text-amber-300 leading-relaxed">
          Please add departments in Settings to assign assets to departments.
        </p>
        {onNavigateToSettings && (
          <button
            type="button"
            onClick={onNavigateToSettings}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-2xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors shadow-xs"
          >
            <SettingsIcon size={12} />
            Go to Settings
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      {showIcon && (
        <Building2
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        />
      )}
      <select
        id={id}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled}
        className={`w-full ${showIcon ? 'pl-9 pr-3' : 'px-3'} py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50 transition-colors ${className}`}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option
            key={opt.value}
            value={opt.value}
            className={opt.isLegacy ? 'text-amber-600 dark:text-amber-400 font-medium italic' : ''}
          >
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
};
