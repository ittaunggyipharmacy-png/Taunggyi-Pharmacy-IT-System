import React from 'react';
import {
  Laptop,
  Monitor,
  Cpu,
  Printer,
  ScanLine,
  Smartphone,
  Tablet,
  Network,
  Wifi,
  Server,
  Keyboard,
  Mouse,
  Tv,
  Zap,
  Usb,
  Fan,
  AppWindow,
  HardDrive,
  Headphones,
  Speaker,
  Camera,
  Package,
  Layers,
  LucideIcon,
} from 'lucide-react';

export interface CategoryVisualConfig {
  icon: LucideIcon;
  label: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  darkBgClass: string;
  darkTextClass: string;
}

export function getCategoryVisualConfig(category?: string, model?: string, name?: string): CategoryVisualConfig {
  const cat = (category || '').trim().toLowerCase();
  const text = `${model || ''} ${name || ''}`.toLowerCase();

  // Computer / Laptop / Desktop
  if (cat.includes('computer') || cat.includes('pc') || cat.includes('desktop') || cat.includes('laptop')) {
    if (text.includes('laptop') || text.includes('notebook') || text.includes('macbook') || text.includes('thinkpad')) {
      return {
        icon: Laptop,
        label: 'Laptop',
        colorClass: 'text-blue-600',
        bgClass: 'bg-blue-50',
        borderClass: 'border-blue-200',
        darkBgClass: 'dark:bg-blue-950/50',
        darkTextClass: 'dark:text-blue-400',
      };
    }
    if (text.includes('aio') || text.includes('all-in-one') || text.includes('imac')) {
      return {
        icon: Tv,
        label: 'All-in-One PC',
        colorClass: 'text-sky-600',
        bgClass: 'bg-sky-50',
        borderClass: 'border-sky-200',
        darkBgClass: 'dark:bg-sky-950/50',
        darkTextClass: 'dark:text-sky-400',
      };
    }
    return {
      icon: Monitor,
      label: category || 'Computer',
      colorClass: 'text-blue-600',
      bgClass: 'bg-blue-50',
      borderClass: 'border-blue-200',
      darkBgClass: 'dark:bg-blue-950/50',
      darkTextClass: 'dark:text-blue-400',
    };
  }

  // Monitor / Display
  if (cat.includes('monitor') || cat.includes('display') || cat.includes('screen')) {
    return {
      icon: Tv,
      label: category || 'Monitor',
      colorClass: 'text-cyan-600',
      bgClass: 'bg-cyan-50',
      borderClass: 'border-cyan-200',
      darkBgClass: 'dark:bg-cyan-950/50',
      darkTextClass: 'dark:text-cyan-400',
    };
  }

  // Printer / Copier
  if (cat.includes('printer') || cat.includes('print') || cat.includes('copier')) {
    return {
      icon: Printer,
      label: category || 'Printer',
      colorClass: 'text-indigo-600',
      bgClass: 'bg-indigo-50',
      borderClass: 'border-indigo-200',
      darkBgClass: 'dark:bg-indigo-950/50',
      darkTextClass: 'dark:text-indigo-400',
    };
  }

  // Scanner / Barcode
  if (cat.includes('scanner') || cat.includes('barcode') || cat.includes('scan')) {
    return {
      icon: ScanLine,
      label: category || 'Scanner',
      colorClass: 'text-teal-600',
      bgClass: 'bg-teal-50',
      borderClass: 'border-teal-200',
      darkBgClass: 'dark:bg-teal-950/50',
      darkTextClass: 'dark:text-teal-400',
    };
  }

  // Mobile / Phone / Tablet
  if (cat.includes('mobile') || cat.includes('phone') || cat.includes('tablet') || cat.includes('ipad')) {
    if (cat.includes('tablet') || text.includes('tablet') || text.includes('ipad')) {
      return {
        icon: Tablet,
        label: 'Tablet',
        colorClass: 'text-violet-600',
        bgClass: 'bg-violet-50',
        borderClass: 'border-violet-200',
        darkBgClass: 'dark:bg-violet-950/50',
        darkTextClass: 'dark:text-violet-400',
      };
    }
    return {
      icon: Smartphone,
      label: category || 'Mobile',
      colorClass: 'text-violet-600',
      bgClass: 'bg-violet-50',
      borderClass: 'border-violet-200',
      darkBgClass: 'dark:bg-violet-950/50',
      darkTextClass: 'dark:text-violet-400',
    };
  }

  // Network / Router / Switch / Server
  if (cat.includes('network') || cat.includes('router') || cat.includes('switch') || cat.includes('wifi') || cat.includes('server')) {
    if (cat.includes('server') || text.includes('server')) {
      return {
        icon: Server,
        label: 'Server',
        colorClass: 'text-purple-600',
        bgClass: 'bg-purple-50',
        borderClass: 'border-purple-200',
        darkBgClass: 'dark:bg-purple-950/50',
        darkTextClass: 'dark:text-purple-400',
      };
    }
    if (cat.includes('wifi') || text.includes('access point') || text.includes('ap')) {
      return {
        icon: Wifi,
        label: 'WiFi / AP',
        colorClass: 'text-emerald-600',
        bgClass: 'bg-emerald-50',
        borderClass: 'border-emerald-200',
        darkBgClass: 'dark:bg-emerald-950/50',
        darkTextClass: 'dark:text-emerald-400',
      };
    }
    return {
      icon: Network,
      label: category || 'Network',
      colorClass: 'text-emerald-600',
      bgClass: 'bg-emerald-50',
      borderClass: 'border-emerald-200',
      darkBgClass: 'dark:bg-emerald-950/50',
      darkTextClass: 'dark:text-emerald-400',
    };
  }

  // Keyboard
  if (cat.includes('keyboard')) {
    return {
      icon: Keyboard,
      label: 'Keyboard',
      colorClass: 'text-amber-600',
      bgClass: 'bg-amber-50',
      borderClass: 'border-amber-200',
      darkBgClass: 'dark:bg-amber-950/50',
      darkTextClass: 'dark:text-amber-400',
    };
  }

  // Mouse
  if (cat.includes('mouse')) {
    return {
      icon: Mouse,
      label: 'Mouse',
      colorClass: 'text-orange-600',
      bgClass: 'bg-orange-50',
      borderClass: 'border-orange-200',
      darkBgClass: 'dark:bg-orange-950/50',
      darkTextClass: 'dark:text-orange-400',
    };
  }

  // UPS / Power / Battery
  if (cat.includes('ups') || cat.includes('power') || cat.includes('battery') || cat.includes('inverter')) {
    return {
      icon: Zap,
      label: category || 'UPS',
      colorClass: 'text-yellow-600',
      bgClass: 'bg-yellow-50',
      borderClass: 'border-yellow-200',
      darkBgClass: 'dark:bg-yellow-950/50',
      darkTextClass: 'dark:text-yellow-400',
    };
  }

  // USB Hub / Adapter / Cable
  if (cat.includes('usb') || cat.includes('hub') || cat.includes('adapter') || cat.includes('cable')) {
    return {
      icon: Usb,
      label: category || 'USB Hub',
      colorClass: 'text-blue-600',
      bgClass: 'bg-blue-50',
      borderClass: 'border-blue-200',
      darkBgClass: 'dark:bg-blue-950/50',
      darkTextClass: 'dark:text-blue-400',
    };
  }

  // Fan / Cooling
  if (cat.includes('fan') || cat.includes('cooling')) {
    return {
      icon: Fan,
      label: category || 'Fan',
      colorClass: 'text-sky-600',
      bgClass: 'bg-sky-50',
      borderClass: 'border-sky-200',
      darkBgClass: 'dark:bg-sky-950/50',
      darkTextClass: 'dark:text-sky-400',
    };
  }

  // Software / OS / License
  if (cat.includes('software') || cat.includes('app') || cat.includes('license') || cat.includes('os')) {
    return {
      icon: AppWindow,
      label: category || 'Software',
      colorClass: 'text-rose-600',
      bgClass: 'bg-rose-50',
      borderClass: 'border-rose-200',
      darkBgClass: 'dark:bg-rose-950/50',
      darkTextClass: 'dark:text-rose-400',
    };
  }

  // Storage / HardDrive / SSD
  if (cat.includes('storage') || cat.includes('drive') || cat.includes('ssd') || cat.includes('hdd') || text.includes('ssd') || text.includes('hdd')) {
    return {
      icon: HardDrive,
      label: category || 'Storage',
      colorClass: 'text-slate-600',
      bgClass: 'bg-slate-100',
      borderClass: 'border-slate-300',
      darkBgClass: 'dark:bg-slate-800',
      darkTextClass: 'dark:text-slate-300',
    };
  }

  // Audio / Headset / Speaker
  if (cat.includes('audio') || cat.includes('headphone') || cat.includes('headset') || cat.includes('speaker') || cat.includes('mic')) {
    const isSpeaker = cat.includes('speaker') || text.includes('speaker');
    return {
      icon: isSpeaker ? Speaker : Headphones,
      label: category || 'Audio',
      colorClass: 'text-pink-600',
      bgClass: 'bg-pink-50',
      borderClass: 'border-pink-200',
      darkBgClass: 'dark:bg-pink-950/50',
      darkTextClass: 'dark:text-pink-400',
    };
  }

  // Camera / CCTV / Webcam
  if (cat.includes('camera') || cat.includes('cctv') || cat.includes('webcam')) {
    return {
      icon: Camera,
      label: category || 'Camera',
      colorClass: 'text-red-600',
      bgClass: 'bg-red-50',
      borderClass: 'border-red-200',
      darkBgClass: 'dark:bg-red-950/50',
      darkTextClass: 'dark:text-red-400',
    };
  }

  // Peripherals
  if (cat.includes('peripheral')) {
    return {
      icon: Layers,
      label: 'Peripherals',
      colorClass: 'text-slate-600',
      bgClass: 'bg-slate-100',
      borderClass: 'border-slate-200',
      darkBgClass: 'dark:bg-slate-800',
      darkTextClass: 'dark:text-slate-300',
    };
  }

  // Default fallback
  return {
    icon: Package,
    label: category || 'Asset',
    colorClass: 'text-slate-600',
    bgClass: 'bg-slate-100',
    borderClass: 'border-slate-200',
    darkBgClass: 'dark:bg-slate-800',
    darkTextClass: 'dark:text-slate-300',
  };
}

interface AssetCategoryIconProps {
  category?: string;
  model?: string;
  name?: string;
  size?: number;
  className?: string;
  withContainer?: boolean;
  containerSize?: 'sm' | 'md' | 'lg';
}

export function AssetCategoryIcon({
  category,
  model,
  name,
  size = 16,
  className = '',
  withContainer = false,
  containerSize = 'md',
}: AssetCategoryIconProps) {
  const config = getCategoryVisualConfig(category, model, name);
  const Icon = config.icon;

  if (!withContainer) {
    return <Icon size={size} className={`${config.colorClass} ${config.darkTextClass} ${className}`} />;
  }

  const containerSizes = {
    sm: 'w-7 h-7 rounded-lg',
    md: 'w-9 h-9 rounded-xl',
    lg: 'w-11 h-11 rounded-2xl',
  };

  return (
    <div
      className={`${containerSizes[containerSize]} ${config.bgClass} ${config.darkBgClass} ${config.colorClass} ${config.darkTextClass} flex items-center justify-center shrink-0 border ${config.borderClass} dark:border-slate-800/60 shadow-xs ${className}`}
      title={config.label}
    >
      <Icon size={size} />
    </div>
  );
}

interface AssetCategoryBadgeProps {
  category?: string;
  model?: string;
  name?: string;
  size?: 'sm' | 'md';
  showIcon?: boolean;
  className?: string;
}

export function AssetCategoryBadge({
  category,
  model,
  name,
  size = 'md',
  showIcon = true,
  className = '',
}: AssetCategoryBadgeProps) {
  const config = getCategoryVisualConfig(category, model, name);
  const Icon = config.icon;

  const sizeClasses = size === 'sm' 
    ? 'px-2 py-0.5 text-[11px] gap-1' 
    : 'px-2.5 py-1 text-xs gap-1.5';
  const iconSize = size === 'sm' ? 12 : 13;

  return (
    <span
      className={`inline-flex items-center font-medium rounded-lg border ${config.bgClass} ${config.darkBgClass} ${config.colorClass} ${config.darkTextClass} ${config.borderClass} dark:border-slate-800/70 shadow-2xs whitespace-nowrap ${sizeClasses} ${className}`}
    >
      {showIcon && <Icon size={iconSize} className="shrink-0" />}
      <span>{category || 'Asset'}</span>
    </span>
  );
}
