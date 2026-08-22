import { supabase } from "./lib/supabase";
import { formatStorage } from "./utils/file";
import { Dashboard } from "./features/dashboard/Dashboard";
import { AssetsModule } from "./features/assets";
import { SettingsModule } from './features/settings';
import { SkillsModule } from './features/skills';
import { ReportsModule } from './features/reports';
import { SecurityModule } from './features/security';
import { PurchasesModule } from './features/purchases';
import { MarketingModule } from './features/marketing';
import { FileManagerModule } from './features/file-manager';

// If this window is a popup and has an access token in the URL, close it after Supabase processes it
if (typeof window !== 'undefined' && window.opener && window.location.hash.includes('access_token')) {
  // Wait for Supabase to process the token, then notify the opener and close
  setTimeout(() => {
    window.opener.postMessage({ 
      type: 'SUPABASE_AUTH_COMPLETED', 
      hash: window.location.hash 
    }, '*');
    window.close();
  }, 1500);
}

// In the main window, listen for the popup closing
if (typeof window !== 'undefined' && !window.opener) {
  window.addEventListener('message', async (event) => {
    if (event.data && event.data.type === 'SUPABASE_AUTH_COMPLETED') {
      const hash = event.data.hash;
      if (hash) {
        // Parse tokens from hash
        const hashParams = new URLSearchParams(hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        
        if (accessToken && refreshToken) {
          // Manually set session in this window's partitioned storage
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
        }
      }
      
      // Avoid reloading the window here! 
      // In the AI Studio preview iframe, localStorage is often blocked.
      // If Supabase falls back to in-memory storage, reloading the page destroys the session.
      // Setting the session above will automatically trigger onAuthStateChange in React.
    } else if (event.data === 'SUPABASE_AUTH_COMPLETED') { // backward compatibility
      await supabase.auth.getSession();
    }
  });
}

import React, { useState, useEffect, useRef, Fragment, useMemo } from "react";
import { 
 LayoutDashboard, 
 Ticket, 
 Monitor, 
 ShieldCheck, 
 Megaphone, 
 Package, 
 Smartphone,
 Send, 
 Bot, 
 Plus, 
 CheckCircle2, 
 XCircle, 
 AlertTriangle, 
 Calendar,
 Clock,
 User,
 History,
 HardDrive,
 Camera,
 ChevronRight,
 ChevronDown,
 Download,
 X,
 Search,
 Printer,
 Menu,
 RefreshCw,
 ShoppingCart,
 LogIn,
 LogOut,
 Trash2,
 Folder,
 ArrowLeft,
 ArrowUp,
 ArrowDown,
 Edit,
 Edit2,
 Check,
 MoreVertical,
 Activity,
 Layers,
 Link2,
 MinusSquare,
 PieChart,
 Tag,
 Settings2,
 Database,
 ClipboardList,
 AlertCircle,
 FileText,
 Upload,
 Bell,
 BellOff,
 Settings,
 HelpCircle,
 MessageSquare,
 BarChart2,
 Globe,
 Lock,
 Box,
 MapPin,
 Cpu,
 Trello,
 Keyboard,
 MousePointer2,
 Usb,
 Wind,
 Info,
 ExternalLink,
 Phone,
 CreditCard,
 Users,
 Wrench,
 Sun,
 Moon,
 ShieldOff,
 Ban
} from "lucide-react";
import { utils, writeFile, read } from "xlsx";
import { motion, AnimatePresence } from "motion/react";

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, subDays, parseISO } from "date-fns";
import { cn } from "./lib/utils";
import { 
 BarChart, 
 Bar, 
 XAxis, 
 YAxis, 
 CartesianGrid, 
 Tooltip, 
 ResponsiveContainer, 
 PieChart as RePieChart, 
 Pie, 
 Cell 
} from "recharts";

import { 
 subscribeToSync, 
 savePurchaseRecord, 
 updateAssetAssignment,
 checkAdminStatus,
 deleteAsset,
 deletePurchaseRecord,
 saveAsset,
 saveBackup,
 saveCCTVRequest,
 saveContentPlan,
 saveRenewal,
 saveActivity,
 clearAllAssets,
 subscribeToSupervisorFeatures,
 
 
 
 
 saveDailyLog,
 getDailyLog,
 fetchStorageFiles,
 fetchStorageQuota,
 deleteStorageFile,
 syncSystemUser,
 updateSystemUserRole,
 saveSettings,
 getSettings,
 savePasswordEntry,
 getPasswordEntries,
 deletePasswordEntry,
 deleteRenewal,
 migrateExistingUsersToAdmins,
 importLegacyExcelData
} from "./services/firestoreService";


import { Toaster, toast } from "react-hot-toast";
import { ConfirmationModal } from "./components/ConfirmationModal";
import { 
 Priority, 
 Status, 
 ITTicket, 
 ActionEntry,
 ITAsset, 
 BackupLog, 
 BackupSchedule,
 ContentPlan, 
 CCTVRequest,
 RenewalRecord,
 PurchaseRecord,
 DriveFile,
 SystemSettings,
 ActivityEntry,
 TaskEvidence,
 DailyLog,
 EmployeeProfile,
 SystemUser,
 UserRole,
 PasswordVaultEntry
} from "./types";
import { KPITracker } from "./components/KPITracker";
import { HelpSupportModule } from "./components/HelpSupportModule";
import { ResetAssetsButton } from "./components/ResetAssetsButton";
import { SearchableDropdown } from "./components/SearchableDropdown";
import { MultiSelectDropdown } from "./components/MultiSelectDropdown";
import KPIDashboard from "./components/KPIDashboard";
import { useAccessControl } from './contexts/AccessControlContext';
import SkillMatrix from "./components/SkillMatrix";
import { UserManagement } from "./components/UserManagement";
import MeetingMinutesModule from "./components/MeetingMinutesModule";
import { RenewalsModule } from "./components/RenewalsModule";
import { IdLayoutGenerator } from "./components/IdLayoutGenerator";
import { TicketsModule } from "./features/tickets";
import { subscribeToTickets } from "./services/ticketService";


const safeFormat = (date: any, formatStr: string, fallback: string = "--") => {
 if (!date) return fallback;
 try {
 const d = new Date(date);
 if (isNaN(d.getTime())) return fallback;
 return format(d, formatStr);
 } catch (e) {
 return fallback;
 }
};


const isHistorical = (dateStr: string) => {
 if (!dateStr) return false;
 const date = new Date(dateStr);
 if (isNaN(date.getTime())) return false;
 const now = new Date();
 const diffTime = Math.abs(now.getTime() - date.getTime());
 const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
 return diffDays > 30;
};


const formatId = (id: string) => {
 if (!id) return "";
 if (id.length > 12) {
 return id.slice(0, 8).toUpperCase();
 }
 return id;
};

// Mock initial data
const INITIAL_TICKETS: ITTicket[] = [];

const INITIAL_SETTINGS: SystemSettings = {
 departments: ["Admin", "HR", "IT", "Finance", "Purchase", "Wholesale", "CMD", "Retail", "GM", "Marketing"],
 locations: ["Taunggyi HO", "Warehouse", "Shop 1", "Shop 2", "Shop 3", "Shop 4", "Shop 5", "Shop 6"],
 itContacts: [
 { name: "IT Team", role: "Support", phone: "09-XXX-XXX-XXX" },
 { name: "System Admin", role: "Admin", phone: "09-YYY-YYY-YYY" }
 ]
};

const INITIAL_ASSETS: ITAsset[] = [
 { id: "TG001", category: "Computer", model: "HP Laptop L53-f95xxx", serialNumber: "SN T969R43", purchaseDate: "2023-08-17", location: "Admin", assignedTo: "Daw Mar Lwin", status: "Active", brand: "HP", specs: "i3 12th/8GB/512GB", maintenanceDueDate: "2026-05-15", peripherals: { keyboard: "Delux [SN KOM-0221F000027]", mouse: "Optical Mouse [Gaming Mouse (FOC)]", usb: "USB 4 port (Qty: 1)", fan: "B9 (Qty: 1)" } },
 { id: "TG002", category: "Computer", model: "Lenovo BOHB-WAX9", serialNumber: "SN 7WFPM21A28000629", purchaseDate: "2025-12-08", location: "HR", assignedTo: "U Lin Lin Tun", status: "Active", brand: "Lenovo", specs: "i7 13th/16GB/512GB", maintenanceDueDate: "2026-06-20", peripherals: { mouse: "Logicom M 136 [SN M 136]", usb: "USB 4 port (Qty: 1)", fan: "B9 (Qty: 1)" } },
 { id: "TG003", category: "Computer", model: "DELL Vostro 3405", serialNumber: "SN 1JF8983", purchaseDate: "2021-06-01", location: "Admin", assignedTo: "Aye Chan Maung", status: "Active", brand: "DELL", specs: "Ryzen 3/8GB/128GB+1TB", maintenanceDueDate: "2026-05-10", peripherals: { keyboard: "Delux [M33250U SN K600523J001400]", mouse: "Logicom M138", fan: "Colling Pad (Qty: 1)" } },
 { id: "TG004", category: "Computer", model: "Acer Acer E1-471G", serialNumber: "SN NXM59CN01132607F087600", purchaseDate: "2018-01-18", location: "HR", assignedTo: "Training", status: "Active", brand: "Acer", specs: "i5 3th/4GB/512GB", peripherals: { keyboard: "Delux [SN K681023J001508]", mouse: "ASUS (FOC)", fan: "B8 (Qty: 1)" } },
 { id: "TG005", category: "Computer", model: "Acer Acer Asire E5 - 571G", serialNumber: "SN NXMLBST0024281F5B23400", purchaseDate: "2022-07-01", location: "HR", assignedTo: "Training", status: "Active", brand: "Acer", specs: "i3 4th/4GB/512GB", peripherals: { keyboard: "Delux [SN K601121F007421]", mouse: "Dell (FOC)", fan: "A8 (Qty: 1)" } },
 { id: "TG006", category: "Computer", model: "MSI MSI GP62M7REX", serialNumber: "9S716J9E21253ZH5000028", purchaseDate: "2021-10-01", location: "IT", assignedTo: "U Khun Thwin Oo", status: "Active", brand: "MSI", specs: "i7 7th/16GB/128GB+1TB", peripherals: { keyboard: "Crome [SN CK150U20G000194]", mouse: "Optical Mouse N 1700", usb: "USB 4 Port (Qty: 1)", fan: "Laptop Fan" } },
 { id: "TG007", category: "Computer", model: "Desktop MSI", serialNumber: "SN S716J9E21253ZH5000028", purchaseDate: "2022-09-30", location: "IT", assignedTo: "U Kaung Sat Won", status: "Active", brand: "Desktop", specs: "i7 6th/16GB/256GB", peripherals: { keyboard: "Delux [SN KA15022A002918]", mouse: "Delux [SN M32020D002680]" } },
 { id: "TG008", category: "Computer", model: "Desktop MS-724", serialNumber: "Desktop SN 7B24", purchaseDate: "2021-11-01", location: "Finance", assignedTo: "Daw Win Hus Mon", status: "Active", brand: "Desktop", specs: "i7 9th/32GB/768GB+1TB", peripherals: { keyboard: "Logitech [SN K1202038SC31S7C8]", mouse: "Logitech [SN 810002182]" } },
 { id: "TG009", category: "Computer", model: "Asus Desktop Asus Motherboard", serialNumber: "Desktop", purchaseDate: "2021-06-01", location: "Purchase", assignedTo: "Daw Pan War", status: "Active", brand: "Asus", specs: "i3 10th/8GB/1TB", peripherals: { keyboard: "Logicom [SN KA15021L001442]", mouse: "Logicom M 136" } },
 { id: "TG010", category: "Computer", model: "Acer Aspire 5 A315-55G-25PS", serialNumber: "SN NXHEDCN00292529D987600", purchaseDate: "2023-07-21", location: "Purchase", assignedTo: "Daw Thu Zar Hlaing", status: "Active", brand: "Acer", specs: "i5 8th/8GB/128GB+1TB", peripherals: { keyboard: "Delux [SN KA15022A002504]", mouse: "Delux M 516 [M10720K000870]", fan: "Colling Pad (Qty: 1)" } },
 { id: "TG011", category: "Computer", model: "DELL Dell Inspiron 3501", serialNumber: "SN CB50HB3", purchaseDate: "2021-09-01", location: "Finance", assignedTo: "Daw Ei May Thy Phyoe", status: "Active", brand: "DELL", specs: "i3 11th/4GB/256GB", peripherals: { keyboard: "Delux [SN K601122A002041]", mouse: "Artwork", fan: "B8 (Qty: 1)" } },
 { id: "TG012", category: "Computer", model: "Asus Auss Vivo Book", serialNumber: "SN L3N0CV05Y24012H", purchaseDate: "2024-01-06", location: "Finance", assignedTo: "U Yan Myo Aung", status: "Active", brand: "Asus", specs: "Ryzen 3/8GB/512GB", peripherals: { keyboard: "Logicom [SN KA15021L000054]", mouse: "Delux M 516", fan: "Y8 (Qty: 1)" } },
 { id: "TG013", category: "Computer", model: "DELL Dell Inspiron 3576", serialNumber: "SN 9k11yn2", purchaseDate: "2021-06-04", location: "Purchase", assignedTo: "Thet Thet Mon", status: "Active", brand: "DELL", specs: "i3 7th/4GB/128GB+1TB", peripherals: { keyboard: "Logicom [SN KA150211000057]", mouse: "Logicom M 136", fan: "Colling Pad (Qty: 1)" } },
 { id: "TG014", category: "Computer", model: "Acer Aspire A515-54G", serialNumber: "SN NXHN5ST0019380905D7600", purchaseDate: "2023-02-02", location: "IT", assignedTo: "Aung Kaung Myat", status: "Active", brand: "Acer", specs: "i5 10th/20GB/256GB", peripherals: { keyboard: "Crome [SN CK1901123C001339]", mouse: "A4 Tech [SN MS 2010008546]", fan: "A9 (Qty: 1)" } },
 { id: "TG015", category: "Computer", model: "Acer Aspire A 515-56 G", serialNumber: "SN NXA1CST00L10EA63400", purchaseDate: "2024-01-06", location: "Purchase", assignedTo: "Daw Kham P", status: "Active", brand: "Acer", specs: "i3 11th/8GB/512GB", peripherals: { keyboard: "Delux [SN KA15020K002605]", mouse: "Logicom M 136", fan: "B8 (Qty: 1)" } },
 { id: "TG016", category: "Computer", model: "DELL Dell Vostro 3500", serialNumber: "SN 1VXSRF3", purchaseDate: "2024-12-17", location: "Purchase", assignedTo: "Shwe Yoon Wah", status: "Active", brand: "DELL", specs: "i3 11th/8GB/256GB", peripherals: { keyboard: "Logicom [SN KA15021L001443]", mouse: "Delux M355231000168", fan: "B8 (Qty: 1)" } },
 { id: "TG017", category: "Computer", model: "HP HP 15 S -DU1xxx", serialNumber: "SN CND11015NT", purchaseDate: "2024-03-20", location: "Purchase", assignedTo: "Su Su Htwe", status: "Active", brand: "HP", specs: "i3 10th/4GB/128GB+1TB", peripherals: { keyboard: "Delux [SN KA15022A003188]", mouse: "Logicom M 136", fan: "Colling Pad (Qty: 1)" } },
 { id: "TG018", category: "Computer", model: "Asus Asus VivoBook 15 X512DA", serialNumber: "SN K8N0CV11963034C", purchaseDate: "2022-07-11", location: "Wholesale", assignedTo: "Myint Myint Aye", status: "Active", brand: "Asus", specs: "Ryzen 5/8GB/128GB+512GB", peripherals: { keyboard: "Delux [SN KA15021F003269]", mouse: "Logitech [SN 2224HS06Z448]", usb: "USB 4 ports / usb to lan", fan: "A2 (Qty: 1)" } },
 { id: "TG019", category: "Computer", model: "Acer Aspire A315-57G", serialNumber: "SN NXHZRST0041041D5A37600", purchaseDate: "2023-12-18", location: "Wholesale", assignedTo: "Theingi Shwe", status: "Active", brand: "Acer", specs: "i5 10th/8GB/512GB", peripherals: { keyboard: "Logicom [SN KA15021L000055]", mouse: "Delux M 136", usb: "USB 4 ports", fan: "Colling Pad (Qty: 1)" } },
 { id: "TG020", category: "Computer", model: "Acer Aspire 3 A315-54", serialNumber: "SN NXHM2ST0019420CC443400", purchaseDate: "2023-09-01", location: "Wholesale", assignedTo: "Kay Khaing", status: "Active", brand: "Acer", specs: "i3 10th/8GB/256GB", peripherals: { keyboard: "Logicom [SN KA15021L000042]", mouse: "Logicom M 136", usb: "USB 4 ports", fan: "B8 (Qty: 1)" } },
 { id: "TG021", category: "Computer", model: "Acer Aspire A315-53G", serialNumber: "SN NXH1AST00790907B39400", purchaseDate: "2022-08-17", location: "Wholesale", assignedTo: "Mon Mon Thet Khaing", status: "Active", brand: "Acer", specs: "i3 8th/8GB/128GB", peripherals: { keyboard: "Delux [SN KA15022A003187]", mouse: "Delux [SN M39120K000388]", usb: "USB 3 ports/ usb to lan", fan: "B8 (Qty: 1)" } },
 { id: "TG022", category: "Computer", model: "DELL Inspiron 3505", serialNumber: "SN BRDRH93", purchaseDate: "2021-10-13", location: "Wholesale", assignedTo: "Yati Zin Linn", status: "Active", brand: "DELL", specs: "Ryzen 5/8GB/256GB", peripherals: { keyboard: "Delux [SN KA15021F007897]", mouse: "Delux [SN M10720K000864]", usb: "USB 4 ports", fan: "Laptop Fan" } },
 { id: "TG023", category: "Computer", model: "DELL Inspiron 3501", serialNumber: "SN 2830HB3", purchaseDate: "2021-07-01", location: "Wholesale", assignedTo: "Yee Mon Thet", status: "Active", brand: "DELL", specs: "i3 11th/4GB/128GB+1TB", peripherals: { keyboard: "Crome [SN CK 150020B001040]", mouse: "A4 Tech OP620D", usb: "USB 4 ports", fan: "B8 (Qty: 1)" } },
 { id: "TG024", category: "Computer", model: "Asus X540UP", serialNumber: "SN H1NOCX12R733032", purchaseDate: "2022-07-28", location: "Wholesale", assignedTo: "Nwe Nwe Aung", status: "Active", brand: "Asus", specs: "i5 7th/8GB/256GB", peripherals: { keyboard: "Logicom [SN KA15021L000605]", mouse: "A4 Tech M S20LQ", fan: "B8 (Qty: 1)" } },
 { id: "TG025", category: "Computer", model: "Lenovo Lenovo Ideapad 330-1514b", serialNumber: "SN PFLEPXXB3", purchaseDate: "2023-06-28", location: "Wholesale", assignedTo: "Kham Oo", status: "Active", brand: "Lenovo", specs: "i7 8th/8GB/512GB", peripherals: { keyboard: "Artwork [SN KM988]", mouse: "Delux M 136", fan: "Colling Pad (Qty: 1)" } },
 { id: "TG026", category: "Computer", model: "Huawei BOHB-WAX89", serialNumber: "SN IMFJPM217130000L0", purchaseDate: "2023-11-16", location: "Wholesale", assignedTo: "Ingyin Phawy", status: "Active", brand: "Huawei", specs: "i3 10th/8GB/256GB", peripherals: { keyboard: "Delux [SN KA15020K002214]", mouse: "Delux M 136", usb: "USB to Lan", fan: "B8 (Qty: 1)" } },
 { id: "TG027", category: "Computer", model: "DELL Inspiron 3501", serialNumber: "SN JBNZXF3", purchaseDate: "2023-12-02", location: "Wholesale", assignedTo: "Thant Win Zaw", status: "Active", brand: "DELL", specs: "i3 11th/8GB/512GB", peripherals: { keyboard: "Logicom [SN KA15021L000050]", mouse: "Artwork FOC", usb: "USB 4 ports", fan: "B8 (Qty: 1)" } },
 { id: "TG028", category: "Computer", model: "DELL Inspiron 3505", serialNumber: "SN CGNK393", purchaseDate: "2023-12-11", location: "CMD", assignedTo: "Su Su Hlaing", status: "Active", brand: "DELL", specs: "Ryzen 3/8GB/256GB", peripherals: { keyboard: "Logicom [SN K15021L000046]", mouse: "Logicom M 136", fan: "Laptop Fan" } },
 { id: "TG029", category: "Computer", model: "Asus H10M S2", serialNumber: "N/A", purchaseDate: "Unknown", location: "CMD", assignedTo: "Seinn Pyae Pyae Maung", status: "Active", brand: "Asus", specs: "i3 10th/8GB/256GB+1TB", peripherals: { keyboard: "Delux [SN KA15021F002689]", mouse: "Logicom M 136", fan: "Laptop Fan" } },
 { id: "TG030", category: "Computer", model: "Asus Asus", serialNumber: "N/A", purchaseDate: "Unknown", location: "CMD", assignedTo: "Hini Htet Htet Lain", status: "Active", brand: "Asus", specs: "i3 10th/8GB/256GB+1TB", peripherals: { keyboard: "A4 Tech [SN 22LIU00]", mouse: "A4 Tech [SN 2LIU01]", fan: "Laptop Fan" } },
 { id: "TG031", category: "Computer", model: "DELL Inspiron 3576", serialNumber: "SN 8K11YN", purchaseDate: "Unknown", location: "CMD", assignedTo: "Ye Tar Phoo Phoo", status: "Active", brand: "DELL", specs: "i3 7th/4GB/128GB", peripherals: { keyboard: "Delux [KA 15021F002689]", mouse: "Dell (FOC)", fan: "Laptop Fan" } },
 { id: "TG032", category: "Computer", model: "Asus X441UVK", serialNumber: "SN H6N0CVOIZ668229", purchaseDate: "Unknown", location: "CMD", assignedTo: "Zin Mar Htwe", status: "Active", brand: "Asus", specs: "i3 7th/4GB/256GB", peripherals: { keyboard: "A4 Tech [SN MS1702KRS850]", mouse: "Delux", fan: "Colling Pad" } },
 { id: "TG033", category: "Computer", model: "Acer Aspire A514-51", serialNumber: "SN NXH6USTO2930035E96600", purchaseDate: "2023-11-02", location: "Finance", assignedTo: "Daw Hus Yadanar", status: "Active", brand: "Acer", specs: "i3 8th/8GB/256GB", peripherals: { keyboard: "Prolink [SN 627801193101777]", mouse: "Logicom M 136", usb: "Card Reader Hub", fan: "Colling Pad" } },
 { id: "TG034", category: "Computer", model: "Dell Inspiron 15 3530", serialNumber: "SN 68LXPZ3", purchaseDate: "Unknown", location: "CMD", assignedTo: "Nyi Nyi Htute Lwin", status: "Active", brand: "Dell", specs: "i3 13th/8GB/256GB+1TB", peripherals: { keyboard: "Crome [SN CK150U22L000587]", mouse: "Delux M 136", usb: "4 port", fan: "B9" } },
 { id: "TG035", category: "Computer", model: "DELL Dell Inspiron 3505", serialNumber: "SN 8T3SH93", purchaseDate: "2023-06-05", location: "CMD (KT)", assignedTo: "Aung Myint Soe", status: "Active", brand: "DELL", specs: "Ryzen 5/8GB/256GB", peripherals: { keyboard: "Delux [SN KA15022A001296]", mouse: "Delux [SN M13820K000532]", fan: "Laptop Fan" } },
 { id: "TG036", category: "Computer", model: "Lenovo 81HN", serialNumber: "SN R90VFGS8", purchaseDate: "2023-06-05", location: "CMD (KT)", assignedTo: "Accountant", status: "Active", brand: "Lenovo", specs: "i5 7th/8GB/256GB+512GB", peripherals: { keyboard: "Delux [SN KA15022A001293]", mouse: "Delux [SN M13820k000501]", fan: "Laptop Fan" } },
 { id: "TG037", category: "Computer", model: "HP HP Elite Book 840r G4", serialNumber: "SN 5CG8281KHL", purchaseDate: "2023-06-05", location: "CMD (KT)", assignedTo: "Aye Aye Aung", status: "Active", brand: "HP", specs: "i7 8th/8GB/128GB+512GB", peripherals: { keyboard: "Delux [SN KA15022A001292]", mouse: "Delux [SN M13820k000528]", fan: "Laptop Fan" } },
 { id: "TG038", category: "Computer", model: "HP HP 15-DAOXXX", serialNumber: "SN CND82340B8", purchaseDate: "Unknown", location: "Retail", assignedTo: "Shop-1", status: "Active", brand: "HP", specs: "i3 7th/4GB/256GB+1TB", peripherals: { keyboard: "Delux [SN KA15022A007417]", mouse: "Logicom M 136", usb: "USB 4 ports", fan: "Laptop Fan" } },
 { id: "TG039", category: "Computer", model: "DELL Dell Inspiron 3505", serialNumber: "SN 8J7VGB3", purchaseDate: "Unknown", location: "Retail", assignedTo: "Shop-2 Backup", status: "Active", brand: "DELL", specs: "i3 11th/4GB/256GB+512GB", peripherals: { keyboard: "Other (FOC)", mouse: "Delux M320231000294", usb: "SSK 4 Port", fan: "A2" } },
 { id: "TG040", category: "Computer", model: "DELL Dell Inspiron15 3505", serialNumber: "SN GB41RM3", purchaseDate: "2022-07-10", location: "Retail", assignedTo: "Shop 4 Backup", status: "Active", brand: "DELL", specs: "Pendium Sliver/4GB/256GB", peripherals: { fan: "Laptop Fan" } },
 { id: "TG041", category: "Computer", model: "HP HP Elite Book 840G3", serialNumber: "SN 5CG712300R", purchaseDate: "2023-03-22", location: "Retail", assignedTo: "Shop-2 (Hello service)", status: "Active", brand: "HP", specs: "i7 6th/8GB/256GB+512GB", peripherals: { keyboard: "Delux [SN K630020K001453]", mouse: "Delux [SN M35531000982]", usb: "USN 4 port", fan: "B8" } },
 { id: "TG042", category: "Computer", model: "Huawei BOHB WAX9", serialNumber: "SN 7WFPM21A28000905", purchaseDate: "2023-06-05", location: "Retail", assignedTo: "Shop-3", status: "Active", brand: "Huawei", specs: "i3 10th/8GB/256GB", peripherals: { keyboard: "Crome [SN CK150U20B001048]", mouse: "Delux M1 138", usb: "USB 4 port", fan: "Laptop Fan" } },
 { id: "TG043", category: "Computer", model: "Lenovo 81X8", serialNumber: "SN PF31ZVJZ", purchaseDate: "2024-08-23", location: "Retail", assignedTo: "Shop-3 Backup", status: "Active", brand: "Lenovo", specs: "i3 11th/12GB/512GB", peripherals: { keyboard: "Crome [SN CK150U20B000158]", mouse: "Optical Mouse Sony Mouse", fan: "Laptop Fan" } },
 { id: "TG044", category: "Computer", model: "HP Hp Probook", serialNumber: "SN 5CD146F3WR", purchaseDate: "2021-05-20", location: "Retail", assignedTo: "Shop-4", status: "Active", brand: "HP", specs: "i3 11th/4GB/256GB", peripherals: { keyboard: "Delux [KA15022A010003]", mouse: "Logicom M 136", usb: "USB 7 port, usb to lan", fan: "Laptop Fan" } },
 { id: "TG045", category: "Computer", model: "DELL Vostro 15 3510", serialNumber: "SN 7ZFY4L3", purchaseDate: "Unknown", location: "Retail", assignedTo: "Shop-5", status: "Active", brand: "DELL", specs: "i3 11th/8GB/256GB", peripherals: { keyboard: "Logicom [SN AK15021L000053]", mouse: "Delux [SN M39120K000398]", fan: "Laptop Fan" } },
 { id: "TG046", category: "Computer", model: "DELL Vostro 3590", serialNumber: "SN 59S8B53", purchaseDate: "2024-08-28", location: "Retail", assignedTo: "Shop-5 Wholesale", status: "Active", brand: "DELL", specs: "i5 10th/8GB/512GB", peripherals: { keyboard: "Delux [SN KA150022B000075]", mouse: "Logicom M 136", fan: "Laptop Fan" } },
 { id: "TG047", category: "Computer", model: "HP Hp Probook", serialNumber: "SN 5CG8352T98", purchaseDate: "2023-06-28", location: "Retail", assignedTo: "Shop-6", status: "Active", brand: "HP", specs: "i5 7th/8GB/256GB", peripherals: { keyboard: "Delux [SN KA15022A003181]", mouse: "Logicom M 136", fan: "Laptop Fan" } },
 { id: "TG048", category: "Computer", model: "Pos 550 i5 5 Double Screen", serialNumber: "POS-SCREEN", purchaseDate: "2024-06-12", location: "Retail", assignedTo: "Shop 2POS Computer", status: "Active", brand: "Desktop", specs: "i5 2th/8GB/256GB", peripherals: { keyboard: "Delux [SN KA15020K004450]", mouse: "Delux [SN M39120K000400]", usb: "USB 4 ports", fan: "Laptop Fan" } },
 { id: "TG049", category: "Computer", model: "Huawei BOHB WAX9", serialNumber: "SN 7WFPM21A4000304", purchaseDate: "2023-06-01", location: "HR", assignedTo: "Ye Min Thant", status: "Active", brand: "Huawei", specs: "i3 10th/8GB/256GB", peripherals: { keyboard: "Prolink [SN 6121401235103292]", mouse: "Prolink [SN 612607235100354]", fan: "B9" } },
 { id: "TG050", category: "Computer", model: "DELL Dell Inspiron 3501", serialNumber: "SN 8M8WGB3", purchaseDate: "2022-07-23", location: "HR", assignedTo: "Training", status: "Active", brand: "DELL", specs: "i3 11th/8GB/128GB+1TB", peripherals: { keyboard: "Delux [SN K701023100030]", mouse: "Delux [SN M33223J000078]", fan: "638A" } },
 { id: "TG051", category: "Computer", model: "Lenovo Lenovo 82YU", serialNumber: "SN PF4W7V55", purchaseDate: "2024-06-15", location: "GM", assignedTo: "GM", status: "Active", brand: "Lenovo", specs: "Ryzen 3 7320U/8GB/512GB", peripherals: { keyboard: "Logicom [SN KA15021L0002375]", mouse: "logicom M 136", usb: "4 Port", fan: "Laptop Fan" } },
 { id: "TG052", category: "Computer", model: "Lenovo Levovo V15 G1-IML", serialNumber: "SN PF33E7J2", purchaseDate: "2024-11-03", location: "Purchase", assignedTo: "Daw Thandar Htwe", status: "Active", brand: "Lenovo", specs: "i5 10th/12GB/256GB", peripherals: { keyboard: "DM [SN K 6810 SN K681023J001512]", mouse: "DM", usb: "4 Port", fan: "Laptop Fan" } },
 { id: "TG053", category: "Computer", model: "DELL Inspiron 5480", serialNumber: "SN 7L4GDT2", purchaseDate: "2021-10-01", location: "HR", assignedTo: "Training", status: "Active", brand: "DELL", specs: "i7 8th/8GB/128GB+1TB", peripherals: { keyboard: "Delux [SN K681023J001746]", mouse: "Delux [SN M355231000168]", fan: "NoteBook Coller" } },
 { id: "TG054", category: "Computer", model: "DELL Dell inspiron 15 3511", serialNumber: "SN 3YWFYM3", purchaseDate: "2024-01-15", location: "Purchase", assignedTo: "Aung Myo Naing", status: "Active", brand: "DELL", specs: "i3 11th/8GB/256GB", peripherals: { keyboard: "Delux [SN K600523J001824]", mouse: "Delux [SN M35523I000147]", usb: "4 port + Ethernet", fan: "B8" } },
 { id: "TG055", category: "Computer", model: "Acer Aspire A315 A215-55G", serialNumber: "SN NXHNSCN00100404C8C7600", purchaseDate: "2025-08-09", location: "Finance", assignedTo: "Daw Khaing Zin Yu", status: "Active", brand: "Acer", specs: "i5 10th/8GB/256GB", peripherals: { keyboard: "Delux [SN K681023J001855]", mouse: "Delux [SN M51923I000622]", usb: "Hoco USB 4 port", fan: "B8" } },
 { id: "TG056", category: "Computer", model: "Lenovo 82C5", serialNumber: "SN PF2HWHSY", purchaseDate: "2025-08-09", location: "Finance", assignedTo: "Daw Wutt Hmone Oo", status: "Active", brand: "Lenovo", specs: "i5 10th/8GB/512GB", peripherals: { keyboard: "Delux [SN K681023J000591]", mouse: "Delux [SN M51923I000621]", usb: "Hoco USB 4 port", fan: "B8" } },
 { id: "TG057", category: "Computer", model: "HP Elitebook 840G3", serialNumber: "SN 50G73954YH", purchaseDate: "Unknown", location: "HR", assignedTo: "Training", status: "Active", brand: "HP", specs: "i7 6th/8GB/256GB+512GB", peripherals: { keyboard: "Delux [SN K6011 21F007422]", mouse: "Delux [SN M355231000991]", fan: "A8" } },
 { id: "TG058", category: "Computer", model: "Lenovo 80NJ", serialNumber: "SN MP099Q5K", purchaseDate: "2017-01-01", location: "Admin", assignedTo: "That Paing Htoo", status: "Active", brand: "Lenovo", specs: "i7 5th/8GB/1TB", peripherals: { keyboard: "Delux [SN CK150U2L000586]", mouse: "Dell MS116T", usb: "USB 4 Port Hoco", fan: "B61" } },
 { id: "TG059", category: "Computer", model: "-", serialNumber: "-", purchaseDate: "-", location: "Wholesale", assignedTo: "-", status: "Active", brand: "-", specs: "-" },
 { id: "TG060", category: "Computer", model: "BOHB-WAX9", serialNumber: "SN 7WFPM21A28000629", purchaseDate: "2023-03-26", location: "Training", assignedTo: "-", status: "Active", brand: "Huawei", specs: "i3 10th/8GB/256GB" },
 { id: "PH-TG002", category: "Mobile", model: "Hot 40I", serialNumber: "353363606835820", purchaseDate: "2024-03-22", location: "HR", assignedTo: "U Lin Lin Tun", status: "Active", brand: "Infinix", specs: "8GB/256GB", remarks: "09255414499", purchasePrice: "406000" },
 { id: "PH-TG003", category: "Mobile", model: "Vivo 1820", serialNumber: "865979045965471", purchaseDate: "Unknown", location: "Admin", assignedTo: "Aye Chan Maung", status: "Active", brand: "Vivo", specs: "2GB/32GB", remarks: "09883452755" },
 { id: "PH-TG006", category: "Mobile", model: "Vivo 2015", serialNumber: "864739042819738", purchaseDate: "Unknown", location: "IT", assignedTo: "U Khun Thwin Oo", status: "Active", brand: "Vivo", specs: "2GB/32GB", remarks: "09886336336", purchasePrice: "350000" },
 { id: "PH-TG008", category: "Mobile", model: "Huawei Y6s / Spark 30C", serialNumber: "Multiple", purchaseDate: "2025-09-01", location: "Finance", assignedTo: "Daw Win Hus Mon", status: "Active", brand: "Huawei/Techno", specs: "3GB/64GB, 4GB/128GB", remarks: "09886776776", purchasePrice: "900000" },
 { id: "PH-TG010", category: "Mobile", model: "Vivo 1820", serialNumber: "865979045966230", purchaseDate: "2021-07-01", location: "Purchase", assignedTo: "Daw Thu Zar Hlaing", status: "Active", brand: "Vivo", specs: "2GB/32GB", remarks: "09450550004" },
 { id: "PH-TG014", category: "Mobile", model: "Redmi Note 12", serialNumber: "864190063011682", purchaseDate: "2025-01-02", location: "IT", assignedTo: "Aung Kaung Myat", status: "Active", brand: "Redmi", specs: "8GB/128GB", remarks: "09881310907", purchasePrice: "495000" },
 { id: "PH-TG015", category: "Mobile", model: "Hot 30Play", serialNumber: "355185696261886", purchaseDate: "2023-12-11", location: "Purchase", assignedTo: "Daw Kham P", status: "Active", brand: "Infinix", specs: "8GB/128GB", remarks: "09409585533" },
 { id: "PH-TG016", category: "Mobile", model: "Redmi 10C", serialNumber: "861954067288189", purchaseDate: "2023-04-23", location: "Purchase", assignedTo: "Shwe Yoon Wah", status: "Active", brand: "Redmi", specs: "4GB/64GB", remarks: "09456785407", purchasePrice: "329000" },
 { id: "PH-TG017", category: "Mobile", model: "CPH1923", serialNumber: "862762044405472", purchaseDate: "Unknown", location: "Purchase", assignedTo: "Su Su Htwe", status: "Active", brand: "Oppo", specs: "2GB/32GB", remarks: "09882211730" },
 { id: "PH-TG019", category: "Mobile", model: "Hot 40i", serialNumber: "353363609876268", purchaseDate: "2024-02-05", location: "Wholesale", assignedTo: "Theingi Shwe", status: "Active", brand: "Infinix", specs: "6GB/128GB", remarks: "09440060148", purchasePrice: "300000" },
 { id: "PH-TG020", category: "Mobile", model: "Redmi 10A", serialNumber: "867934061730364", purchaseDate: "2023-03-03", location: "Wholesale", assignedTo: "Kay Khaing", status: "Active", brand: "Redmi", specs: "4GB/64GB", remarks: "09404026217", purchasePrice: "273000" },
 { id: "PH-TG021", category: "Mobile", model: "Hot 30 play", serialNumber: "355185698480845", purchaseDate: "2023-11-22", location: "Wholesale", assignedTo: "Mon Mon Thet Khaing", status: "Active", brand: "Infinix", specs: "8GB/128GB", remarks: "09409922422", purchasePrice: "350000" },
 { id: "PH-TG022", category: "Mobile", model: "Hot 40i", serialNumber: "355668423133300", purchaseDate: "2024-02-09", location: "Wholesale", assignedTo: "Yati Zin Linn", status: "Active", brand: "Infinix", specs: "4GB/128GB", remarks: "09785214988", purchasePrice: "300000" },
 { id: "PH-TG023", category: "Mobile", model: "Hot 30i", serialNumber: "351040367898807", purchaseDate: "2023-08-19", location: "Wholesale", assignedTo: "Yee Mon Thet", status: "Active", brand: "Infinix", specs: "4GB/128GB", remarks: "09973311885", purchasePrice: "390000" },
 { id: "PH-TG024", category: "Mobile", model: "Vivo 1820", serialNumber: "865979045965752", purchaseDate: "2020-06-26", location: "Wholesale", assignedTo: "Nwe Nwe Aung", status: "Active", brand: "Vivo", specs: "2GB/32GB", remarks: "09450550006", purchasePrice: "350000" },
 { id: "PH-TG025", category: "Mobile", model: "Redmi 10A", serialNumber: "860171062859465", purchaseDate: "2023-03-03", location: "Wholesale", assignedTo: "Kham Oo", status: "Active", brand: "Redmi", specs: "4GB/64GB", remarks: "09886226226", purchasePrice: "273000" },
 { id: "PH-TG027", category: "Mobile", model: "Hot 30 Play", serialNumber: "355185696262120", purchaseDate: "Unknown", location: "Wholesale", assignedTo: "Thant Win Zaw", status: "Active", brand: "Infinix", specs: "8GB/128GB", remarks: "09404404673" },
 { id: "PH-TG030", category: "Mobile", model: "Redmi Note 12", serialNumber: "863780062106821", purchaseDate: "2023-06-03", location: "CMD", assignedTo: "Hini Htet Htet Lain", status: "Active", brand: "Redmi", specs: "6GB/128GB", remarks: "09883452324", purchasePrice: "450000" },
 { id: "PH-TG031", category: "Mobile", model: "Samaung", serialNumber: "Unknown", purchaseDate: "Unknown", location: "CMD", assignedTo: "Ye Tar Phoo Phoo", status: "Active", brand: "Samaung", specs: "2GB/16GB", remarks: "09443334439" },
 { id: "PH-TG036", category: "Mobile", model: "Hot 30i", serialNumber: "357285555556224", purchaseDate: "2023-06-19", location: "CMD (KT)", assignedTo: "Accountant", status: "Active", brand: "Infinix", specs: "8GB/128GB", remarks: "094093163133", purchasePrice: "300000" },
 { id: "PH-TG037", category: "Mobile", model: "Hot 30i", serialNumber: "357285218691729", purchaseDate: "2023-06-19", location: "CMD (KT)", assignedTo: "Aye Aye Aung", status: "Active", brand: "Infinix", specs: "8GB/128GB", remarks: "09409313122", purchasePrice: "300000" },
 { id: "PH-TG038", category: "Mobile", model: "Viv0 2015", serialNumber: "867842050205639", purchaseDate: "Unknown", location: "Retail", assignedTo: "Shop-1", status: "Active", brand: "Vivo", specs: "2GB/32GB", remarks: "09886771771" },
 { id: "PH-TG039", category: "Mobile", model: "Hot 30i", serialNumber: "350940898189728", purchaseDate: "2023-09-20", location: "Retail", assignedTo: "Shop-2 Backup", status: "Active", brand: "Infinix", specs: "8GB/128GB", remarks: "09886772772", purchasePrice: "340000" },
 { id: "PH-TG042", category: "Mobile", model: "Hot 40i", serialNumber: "355668429011369", purchaseDate: "2024-08-31", location: "Retail", assignedTo: "Shop-3", status: "Active", brand: "Infinix", specs: "4GB/128GB", remarks: "09886773773", purchasePrice: "360000" },
 { id: "PH-TG045", category: "Mobile", model: "Smart 10", serialNumber: "353182811593127", purchaseDate: "2025-10-24", location: "Retail", assignedTo: "Shop-5", status: "Active", brand: "Infinx", specs: "4GB/128GB", remarks: "09883452728", purchasePrice: "420000" },
 { id: "PH-TG047", category: "Mobile", model: "Redmi Note 11", serialNumber: "868134064732306", purchaseDate: "2023-07-01", location: "Retail", assignedTo: "Shop-6", status: "Active", brand: "Redmi", specs: "6GB/128GB", remarks: "09409313166", purchasePrice: "399000" },
 { id: "PH-TG054", category: "Mobile", model: "Hot 30i", serialNumber: "350940895122623", purchaseDate: "2023-09-25", location: "Purchase", assignedTo: "Aung Myo Naing", status: "Active", brand: "Infinix", specs: "8GB/128GB", remarks: "09885214988" },
 { id: "PH-TG059", category: "Mobile", model: "Spark 30c", serialNumber: "354171500931374", purchaseDate: "2025-09-01", location: "Wholesale", assignedTo: "Unknown", status: "Active", brand: "Tecno", specs: "4GB/128GB", remarks: "09882211731", purchasePrice: "400000" },
 { id: "PRN-TG001", category: "Printer", model: "MF235", serialNumber: "SN WQZ42724", purchaseDate: "2022-06-01", location: "Admin", assignedTo: "Daw Mar Lwin", status: "Active", brand: "Canon", specs: "Laser Printer", purchasePrice: "0" },
 { id: "PRN-TG006", category: "Printer", model: "G2010", serialNumber: "SN KNMG32498", purchaseDate: "Unknown", location: "IT", assignedTo: "U Khun Thwin Oo", status: "Active", brand: "Canon", specs: "Inject Printer", remarks: "Damage", purchasePrice: "0" },
 { id: "PRN-TG019", category: "Printer", model: "Lbp6030", serialNumber: "SN NBHA302633", purchaseDate: "Unknown", location: "Wholesale", assignedTo: "Theingi Shwe", status: "Active", brand: "Canon", specs: "Laser Printer", purchasePrice: "0" },
 { id: "PRN-TG022", category: "Printer", model: "G2010", serialNumber: "SN KNMG58165", purchaseDate: "2023-11-05", location: "Wholesale", assignedTo: "Yati Zin Linn", status: "Active", brand: "Canon", specs: "Inject Printer", purchasePrice: "360000" },
 { id: "PRN-TG023", category: "Printer", model: "G2010", serialNumber: "N/A", purchaseDate: "Unknown", location: "Wholesale", assignedTo: "Yee Mon Thet", status: "Active", brand: "Canon", specs: "Inject Printer", purchasePrice: "0" },
 { id: "PRN-TG027", category: "Printer", model: "G2010 / Polaroid Barcode", serialNumber: "KPGK45164", purchaseDate: "Unknown", location: "Wholesale", assignedTo: "Thant Win Zaw", status: "Active", brand: "Canon/Polaroid", specs: "Inject/Barcode Printer", purchasePrice: "0" },
 { id: "PRN-TG029", category: "Printer", model: "L3250", serialNumber: "N/A", purchaseDate: "2023-10-18", location: "CMD", assignedTo: "Seinn Pyae Pyae Maung", status: "Active", brand: "Epson", specs: "Inject Printer", purchasePrice: "470000" },
 { id: "PRN-TG030", category: "Printer", model: "G2010", serialNumber: "N/A", purchaseDate: "2023-11-05", location: "CMD", assignedTo: "Hini Htet Htet Lain", status: "Active", brand: "Canon", specs: "Inject Printer", purchasePrice: "360000" },
 { id: "PRN-TG035", category: "Printer", model: "Lbp6030", serialNumber: "NTMA 620882", purchaseDate: "2023-06-05", location: "CMD (KT)", assignedTo: "Aung Myint Soe", status: "Active", brand: "Canon", specs: "Laser Printer", purchasePrice: "330000" },
 { id: "PRN-TG038", category: "Printer", model: "XPV330N", serialNumber: "SN BM2201150001", purchaseDate: "2022-08-03", location: "Retail", assignedTo: "Shop-1", status: "Active", brand: "X Printer", specs: "Slip Printer", purchasePrice: "200000" },
 { id: "PRN-TG039", category: "Printer", model: "NP 306USEW / Lbp 6030", serialNumber: "Multiple", purchaseDate: "2021-02-20", location: "Retail", assignedTo: "Shop-2 Backup", status: "Active", brand: "Nippon/Canon", specs: "Slip/Laser Printer", purchasePrice: "0" },
 { id: "PRN-TG041", category: "Printer", model: "NP 306USEW", serialNumber: "SN ZY17090300034", purchaseDate: "Unknown", location: "Retail", assignedTo: "Shop-2 (Hello service)", status: "Active", brand: "Nippon", specs: "Slip Printer", purchasePrice: "0" },
 { id: "PRN-TG042", category: "Printer", model: "XPV330N", serialNumber: "SN BM2204130135", purchaseDate: "2023-03-26", location: "Retail", assignedTo: "Shop-3", status: "Active", brand: "X Printer", specs: "Slip Printer", purchasePrice: "195000" },
 { id: "PRN-TG043", category: "Printer", model: "NP 306USEW", serialNumber: "SN ZY17090300029", purchaseDate: "2021-09-06", location: "Retail", assignedTo: "Shop-3 Backup", status: "Active", brand: "Nippon", specs: "Slip Printer", purchasePrice: "0" },
 { id: "PRN-TG044", category: "Printer", model: "XPV330N", serialNumber: "SN BM2201150014", purchaseDate: "2022-05-05", location: "Retail", assignedTo: "Shop-4", status: "Active", brand: "X Printer", specs: "Slip Printer", purchasePrice: "175000" },
 { id: "PRN-TG045", category: "Printer", model: "XPV330N", serialNumber: "SN BM2201150021", purchaseDate: "2022-07-16", location: "Retail", assignedTo: "Shop-5", status: "Active", brand: "X Printer", specs: "Slip Printer", purchasePrice: "147000" },
 { id: "PRN-TG046", category: "Printer", model: "G2010", serialNumber: "N/A", purchaseDate: "2022-05-01", location: "Retail", assignedTo: "Shop-5 Wholesale", status: "Active", brand: "Canon", specs: "Inject Printer", purchasePrice: "175000" },
 { id: "PRN-TG047", category: "Printer", model: "XPV330N", serialNumber: "SN BM2302270025", purchaseDate: "2023-07-01", location: "Retail", assignedTo: "Shop-6", status: "Active", brand: "X Printer", specs: "Slip Printer", purchasePrice: "200000" },
 { id: "PRN-TG048", category: "Printer", model: "NP 306USEW", serialNumber: "SN ZY17090300035", purchaseDate: "2021-10-03", location: "Retail", assignedTo: "Shop 2POS Computer", status: "Active", brand: "Nippon", specs: "Slip Printer", purchasePrice: "0" },
 { id: "PRN-TG051", category: "Printer", model: "Lbp6030", serialNumber: "N/A", purchaseDate: "2022-09-05", location: "GM", assignedTo: "GM", status: "Active", brand: "Canon", specs: "Laser Printer", purchasePrice: "420000" },
 { id: "PRN-TG058", category: "Printer", model: "L3250", serialNumber: "SN XAGH322075", purchaseDate: "2025-08-01", location: "Admin", assignedTo: "That Paing Htoo", status: "Active", brand: "Epson", specs: "Inject Printer", purchasePrice: "670000" },
 { id: "SCN-TG020", category: "Scanner", model: "Barcode Scanner", serialNumber: "SN 21175B9389", purchaseDate: "2022-08-06", location: "Wholesale", assignedTo: "Kay Khaing", status: "Active", brand: "Honeywell", specs: "Laser Scanner", purchasePrice: "400000" },
 { id: "SCN-TG027", category: "Scanner", model: "Hand Scanner", serialNumber: "Unknown", purchaseDate: "Unknown", location: "Wholesale", assignedTo: "Thant Win Zaw", status: "Active", brand: "Other", specs: "Handheld", remarks: "MIT purchase" },
 { id: "SCN-TG038", category: "Scanner", model: "Barcode Scanner", serialNumber: "SN 210848280B", purchaseDate: "2022-06-18", location: "Retail", assignedTo: "Shop-1", status: "Active", brand: "Honeywell", specs: "Laser Scanner", purchasePrice: "380000" },
 { id: "SCN-TG039", category: "Scanner", model: "Orbit", serialNumber: "SN 2S21101618", purchaseDate: "Unknown", location: "Retail", assignedTo: "Shop-2 Backup", status: "Active", brand: "Honeywell", specs: "Barcode Scanner" },
 { id: "SCN-TG042", category: "Scanner", model: "Scanner", serialNumber: "SN 20349B0C69", purchaseDate: "2022-05-02", location: "Retail", assignedTo: "Shop-3", status: "Active", brand: "Honeywell", specs: "Barcode Scanner", purchasePrice: "320000" },
 { id: "SCN-TG044", category: "Scanner", model: "Orbit", serialNumber: "SN 20349B0C93", purchaseDate: "2022-05-01", location: "Retail", assignedTo: "Shop-4", status: "Active", brand: "Honeywell", specs: "Barcode Scanner", purchasePrice: "320000" },
 { id: "SCN-TG045", category: "Scanner", model: "Orbit", serialNumber: "SN 20346B3DF9", purchaseDate: "2022-07-16", location: "Retail", assignedTo: "Shop-5", status: "Active", brand: "Honeywell", specs: "Barcode Scanner", purchasePrice: "380000" },
 { id: "SCN-TG047", category: "Scanner", model: "Orbit", serialNumber: "SN 22138B387A", purchaseDate: "2023-07-28", location: "Retail", assignedTo: "Shop-6", status: "Active", brand: "Honeywell", specs: "Barcode Scanner", purchasePrice: "550000" },
 { id: "SCN-TG048", category: "Scanner", model: "Orbit", serialNumber: "SN 23081B0BE7", purchaseDate: "2024-11-14", location: "Retail", assignedTo: "Shop 2POS Computer", status: "Active", brand: "Honeywell", specs: "Barcode Scanner", purchasePrice: "670000", remarks: "SN 21084B143D IC Burned" },
 { id: "SCN-TG052", category: "Scanner", model: "Orbit", serialNumber: "SN 23081B0C47", purchaseDate: "2024-11-14", location: "Purchase", assignedTo: "Daw Thandar Htwe", status: "Active", brand: "Honeywell", specs: "Barcode Scanner", purchasePrice: "670000" },
 { id: "PH-TG063", category: "Mobile", model: "iPhone 15 Pro", serialNumber: "SN IP15P256", purchaseDate: "2024-12-01", location: "Marketing", assignedTo: "Su Su Htwe", status: "Active", brand: "Apple", specs: "256GB/Titanium", purchasePrice: "3800000" },
 { id: "PRN-TG064", category: "Printer", model: "LaserJet Pro M404n", serialNumber: "SN HPLJ404", purchaseDate: "2024-10-12", location: "Admin", assignedTo: "Daw Mar Lwin", status: "Active", brand: "HP", specs: "Monochrome Laser", purchasePrice: "850000" },
];

const INITIAL_BACKUPS: BackupLog[] = [];

const INITIAL_CCTV_REQS: CCTVRequest[] = [];

const INITIAL_RENEWALS: RenewalRecord[] = [
 { id: "REN-001", serviceName: "Internet (Welink)", shopName: "CMD", expireDate: "2026-06-22", price: 25000, currency: "MMK", billingCycle: "Monthly", status: "Active", wifiId: "6094", mb: "25 MB", ispName: "Welink", phoneNumber: "95214988", location: "PyiTawThar" },
 { id: "REN-002", serviceName: "Internet (Welink)", shopName: "Wholesale Welink", expireDate: "2027-02-24", price: 25000, currency: "MMK", billingCycle: "Monthly", status: "Active", wifiId: "586", mb: "58 MB", ispName: "Welink", phoneNumber: "95214988", location: "TGP Wholesale Welink", credentials: "TGP Wholesale Welink - pw :-Tgp@wholesale@ws", twelveMonthPrice: 378000 },
 { id: "REN-003", serviceName: "Internet (Infinite)", shopName: "Wholesale Infinite", expireDate: "2026-05-11", price: 25000, currency: "MMK", billingCycle: "Monthly", status: "Active", wifiId: "665550 2208", ispName: "Infinite", credentials: "TGP Wholesale Phone - pw : Tgp@wholesale@ph", twelveMonthPrice: 300000 },
 { id: "REN-004", serviceName: "Internet (Infinite)", shopName: "HO Infinite", expireDate: "2026-01-11", price: 39000, currency: "MMK", billingCycle: "Monthly", status: "Expired", wifiId: "665550 14 80", ispName: "Infinite", phoneNumber: "9886336336", location: "Main Office +5 month", credentials: "TGP HO - pw : Tgp@wholesale@ph / Tgp@ho@tpl", twelveMonthPrice: 468000 },
 { id: "REN-005", serviceName: "Internet (MBT)", shopName: "HO MBT", expireDate: "2026-04-15", price: 41400, currency: "MMK", billingCycle: "Monthly", status: "Expired", wifiId: "tgic2308044", mb: "25 MB", ispName: "MBT", location: "Promotin 120 days", credentials: "TGP HO MBT - tgp@office@mbt", twelveMonthPrice: 496800 },
 { id: "REN-006", serviceName: "Internet (Infinite)", shopName: "Shop - 1", expireDate: "2027-01-23", price: 29000, currency: "MMK", billingCycle: "Monthly", status: "Active", wifiId: "66 555 014 58", mb: "20 MB", ispName: "Infinite", phoneNumber: "9886336336", location: "Retail +3month", credentials: "Taunggyi Pharmacy Shop 1 - pw : Tgp@shop1@1", twelveMonthPrice: 348000 },
 { id: "REN-007", serviceName: "Internet (Welink)", shopName: "Shop - 2", expireDate: "2027-04-02", price: 25000, currency: "MMK", billingCycle: "Monthly", status: "Active", wifiId: "5561", mb: "25 MB", ispName: "Welink", phoneNumber: "9886336336", location: "Retail", twelveMonthPrice: 300000 },
 { id: "REN-008", serviceName: "Internet (Welink)", shopName: "Shop - 3", expireDate: "2026-12-30", price: 25000, currency: "MMK", billingCycle: "Monthly", status: "Active", wifiId: "7758", mb: "25 MB", ispName: "Welink", phoneNumber: "95214988", location: "Retail", twelveMonthPrice: 300000 },
 { id: "REN-009", serviceName: "Internet (Infinite)", shopName: "Shop - 4", expireDate: "2026-08-21", price: 29000, currency: "MMK", billingCycle: "Monthly", status: "Active", wifiId: "66 555 013 57", mb: "20 MB", ispName: "Infinite", location: "Retail 10% Dis +3moth", twelveMonthPrice: 348000 },
 { id: "REN-010", serviceName: "Internet (Star Net)", shopName: "Shop - 5 (Aung Ban Branch )", expireDate: "2025-05-25", price: 32000, currency: "MMK", billingCycle: "Monthly", status: "Expired", wifiId: "5093", mb: "20 MB", ispName: "Star Net", phoneNumber: "9886336336", location: "Aung Ban Retail +1month", twelveMonthPrice: 384000 },
 { id: "REN-011", serviceName: "Internet (Welink)", shopName: "Shop 6", expireDate: "2026-12-28", price: 25000, currency: "MMK", billingCycle: "Monthly", status: "Active", wifiId: "TGI 0908", mb: "25 MB", ispName: "Welink", credentials: "Wifi အပေါ်ရုံး 09 761193770 (promotion 2 months)", twelveMonthPrice: 300000 },
 { id: "REN-012", serviceName: "Internet (Infinite)", shopName: "ကျိုင်းတုံ wifi", expireDate: "2027-08-30", price: 25000, currency: "MMK", billingCycle: "Monthly", status: "Active", wifiId: "665550 2208", mb: "14 MB", ispName: "Infinite", twelveMonthPrice: 300000 },
 { id: "REN-013", serviceName: "Internet (Link Star)", shopName: "BO Home", expireDate: "2027-02-17", price: 39000, currency: "MMK", billingCycle: "Monthly", status: "Active", wifiId: "TGI 1019", mb: "40", ispName: "Link Star", credentials: "Wifi အပေါ်ရုံး 09 761193770 (promotion 2 months)", twelveMonthPrice: 468000 },
 { id: "REN-014", serviceName: "GOOGLE Drive (2 TB)", shopName: "Corporate", expireDate: "2026-12-11", price: 350000, currency: "MMK", billingCycle: "Yearly", status: "Active", mb: "2 TB" },
 { id: "REN-015", serviceName: "Microsoft Mail", shopName: "Corporate", expireDate: "2027-05-09", price: 0, currency: "MMK", billingCycle: "Yearly", status: "Active", credentials: "Tgp@admin123" },
];

const INITIAL_PURCHASES: PurchaseRecord[] = [];

const INITIAL_SCHEDULE: BackupSchedule[] = [
 { id: "SCH-001", time: "09:00", type: "Cloud Storage", label: "Morning Cloud Sync" },
 { id: "SCH-002", time: "22:00", type: "External Drive", label: "Nightly Physical Backup" },
];

export default function App() {
 const { canAccess, loading: accessLoading } = useAccessControl();
 const [currentUser, setCurrentUser] = useState<any>(null);
 const [userProfile, setUserProfile] = useState<SystemUser | null>(null);
 const [isAdmin, setIsAdmin] = useState(false);
 const [authReady, setAuthReady] = useState(false);
 const [migrationRunning, setMigrationRunning] = useState(false);
 const [migrationResult, setMigrationResult] = useState<string | null>(null);

 const runFullMigration = async () => {
   setMigrationRunning(true);
   setMigrationResult(null);
   try {
     const res = await migrateExistingUsersToAdmins();
     if (res.success) {
       setMigrationResult(`Successfully migrated ${res.count} records from Firebase to Supabase!`);
       toast.success(`Successfully migrated ${res.count} records from Firebase to Supabase!`);
     } else {
       setMigrationResult(`Migration failed: ${res.error || 'Unknown error'}`);
       toast.error(`Migration failed: ${res.error || 'Unknown error'}`);
     }
   } catch (err: any) {
     setMigrationResult(`Error: ${err.message || String(err)}`);
     toast.error(`Error during migration`);
   } finally {
     setMigrationRunning(false);
   }
 };

 const [confirmTarget, setConfirmTarget] = useState<{ id: string, onConfirm: () => void, message: string, title?: string, confirmText?: string } | null>(null);
 const [activeTab, setActiveTab] = useState<"dashboard" | "tickets" | "assets" | "security" | "marketing" | "renewals" | "purchases" | "files" | "settings" | "help" | "kpi" | "daily-kpi" | "reports" | "skills" | "users" | "meetings" | "id-layout">("dashboard");
 const [activities, setActivities] = useState<ActivityEntry[]>([]);
 const [evidence, setEvidence] = useState<TaskEvidence[]>([]);
 const [allDailyLogs, setAllDailyLogs] = useState<DailyLog[]>([]);
 const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
 const [tickets, setTickets] = useState<ITTicket[]>([]);
 const [quota, setQuota] = useState<{limit: string, usage: string} | null>(null);
 const [assets, setAssets] = useState<ITAsset[]>([]);
 const [backups, setBackups] = useState<BackupLog[]>([]);
 const [contentPlans, setContentPlans] = useState<ContentPlan[]>([]);
 const [cctvRequests, setCctvRequests] = useState<CCTVRequest[]>([]);
 const [renewals, setRenewals] = useState<RenewalRecord[]>([]);
 const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
 const [settings, setSettings] = useState<SystemSettings>(INITIAL_SETTINGS);
 const [reminders, setReminders] = useState<{id: string, message: string, type: 'urgent' | 'info'}[]>([]);
 
 const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
 const [isSidebarOpen, setIsSidebarOpen] = useState(true);
 const [isMobile, setIsMobile] = useState(false);

 useEffect(() => {
 const handleResize = () => {
 setIsMobile(window.innerWidth < 1024);
 };
 handleResize();
 window.addEventListener('resize', handleResize);
 return () => window.removeEventListener('resize', handleResize);
 }, []);

 const [isDarkMode, setIsDarkMode] = useState(() => {
 if (typeof window !== 'undefined') {
 const saved = localStorage.getItem("theme");
 return saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches);
 }
 return false;
 });
 const [searchTerm, setSearchTerm] = useState("");

 // Theme management logic
 useEffect(() => {
 if (isDarkMode) {
 document.documentElement.classList.add('dark');
 localStorage.setItem("theme", "dark");
 } else {
 document.documentElement.classList.remove('dark');
 localStorage.setItem("theme", "light");
 }
 }, [isDarkMode]);
 const scrollRef = useRef<HTMLDivElement>(null);

 const pendingTicketsCount = tickets.filter(t => t.status === Status.PENDING || t.status === Status.IN_PROGRESS).length;
 
 const pendingDailyKpiCount = useMemo(() => {
 if (!currentUser) return 0;
 const today = format(new Date(), "yyyy-MM-dd");
 const todayLog = allDailyLogs.find(l => l.date === today && l.userId === currentUser.uid);
 
 const dailyTaskIds = [
 "it_uptime", "it_maint", "it_support", "it_backup", "it_access", "it_asset",
 "merch_stock", "merch_promo", "merch_visit",
 "mkt_photos", "mkt_drive", "mkt_inquiry"
 ];
 
 if (!todayLog) return dailyTaskIds.length;
 
 let incomplete = 0;
 dailyTaskIds.forEach(id => {
 const completion = todayLog.tasks[id];
 if (id === "mkt_photos") {
 if ((Number(completion) || 0) < 20) incomplete++;
 } else {
 if (!completion) incomplete++;
 }
 });
 return incomplete;
 }, [allDailyLogs, currentUser]);

 useEffect(() => {
 let unsubUserDoc: (() => void) | null = null;

 const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
 if (unsubUserDoc) {
 unsubUserDoc();
 unsubUserDoc = null;
 }

 const user = session?.user || null;
 setCurrentUser(user as any); // Type assertion for now to avoid cascading type errors
 if (user) {
 try {
 const dbSettings = await getSettings();
 if (dbSettings) {
 setSettings(dbSettings);
 }
 } catch (settingsError) {
 console.error("Error loading settings on auth change:", settingsError);
 }

 // Passing Supabase user instead of Firebase user
 const profile = await syncSystemUser(user);
 setUserProfile(profile);

 // Try catching firestore issues if dummy key fails
  try {
    const userChannel = supabase.channel(`user-profile-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_users', filter: `id=eq.${user.id}` }, (payload) => {
        if (payload.new) {
          const updatedProfile = payload.new as SystemUser;
          setUserProfile(updatedProfile);
          const isSuperAdmin = [
            UserRole.ADMIN, 
            UserRole.ADMIN_CAPS, 
            UserRole.IT_SUPERVISOR, 
            UserRole.IT_SUPERVISOR_CAPS,
            UserRole.MERCHANDISING_SUPERVISOR,
            UserRole.IT_DIGITAL_MARKETING
          ].includes(updatedProfile.role as UserRole);
          setIsAdmin(isSuperAdmin);
        }
      }).subscribe();
    unsubUserDoc = () => { supabase.removeChannel(userChannel); };
  } catch (e) {
    console.error('User profile subscription failed', e);
  }

 const isSuperAdmin = [
 UserRole.ADMIN, 
 UserRole.ADMIN_CAPS, 
 UserRole.IT_SUPERVISOR, 
 UserRole.IT_SUPERVISOR_CAPS,
 UserRole.MERCHANDISING_SUPERVISOR,
 UserRole.IT_DIGITAL_MARKETING
 ].includes(profile?.role as UserRole);
 setIsAdmin(isSuperAdmin);
 } else {
 setUserProfile(null);
 setIsAdmin(false);
 }
 setAuthReady(true);
 });

 return () => {
 subscription.unsubscribe();
 if (unsubUserDoc) {
 unsubUserDoc();
 }
 };
 }, []);

 useEffect(() => {
 if (currentUser) {
 const fetchQuota = async () => {
 try {
 const quotaData = await fetchStorageQuota();
 setQuota(quotaData);
 } catch (err) {
 console.error("Failed to fetch initial quota", err);
 // Fallback handled by service
 }
 };
 fetchQuota();

 const unsubTickets = subscribeToTickets((updatedTickets) => {
   setTickets(updatedTickets);
 });

 const unsubSync = subscribeToSync({
 // ... existing sync handlers ...
 onPurchases: (updatedPurchases) => {
 setPurchases(updatedPurchases);
 },
 onAssets: (updatedAssets) => {
 setAssets(updatedAssets);
 },
 onBackups: (updatedBackups) => {
 setBackups(updatedBackups);
 },
 onCCTV: (updatedCCTV) => {
 setCctvRequests(updatedCCTV);
 },
 onPlans: (updatedPlans) => {
 setContentPlans(updatedPlans);
 },
 onRenewals: (updatedRenewals) => {
 setRenewals(updatedRenewals);
 }
 });

 let unsubSupervisor = () => {};
 if (isAdmin) {
 unsubSupervisor = subscribeToSupervisorFeatures({
 onActivities: (updatedActivities) => setActivities(updatedActivities),
 onEvidence: (updatedEvidence) => setEvidence(updatedEvidence),
 onAllDailyLogs: (updatedLogs) => setAllDailyLogs(updatedLogs),
 onEmployees: (updatedEmployees) => setEmployees(updatedEmployees)
 });
 }

 return () => {
 unsubTickets();
 unsubSync();
 unsubSupervisor();
 };
 }
 }, [currentUser, isAdmin]);

 useEffect(() => {
 if (!accessLoading && userProfile && !isAdmin) {
 // allNavItems is defined in the render, so we'll use a local copy or the same logic
 const allowedIds = [
 "tickets", "dashboard", "reports", "kpi", "daily-kpi", "skills", "assets", 
 "purchases", "renewals", "security", "marketing", "files", "settings", "help", "meetings"
 ].filter(id => canAccess(userProfile.role, id));

 if (!canAccess(userProfile.role, activeTab) && allowedIds.length > 0) {
 setActiveTab(allowedIds[0] as any);
 }
 }
 }, [accessLoading, userProfile, isAdmin, canAccess]);

 const handleLogin = async () => {
 try {
 const { data, error } = await supabase.auth.signInWithOAuth({ 
 provider: 'google',
 options: {
 skipBrowserRedirect: true, redirectTo: window.location.origin // Crucial for iframes
 }
 });
 if (error) throw error;
 
 if (data?.url) {
 // Open in a popup to escape the iframe
 window.open(data.url, 'oauth_popup', 'width=600,height=700');
 }
 } catch (error) {
 console.error("Login failed", error);
 }
 };

 const handleLogout = async () => {
 try {
 await supabase.auth.signOut();
 } catch (error) {
 console.error("Logout failed", error);
 }
 };

 useEffect(() => {
 const checkSopReminders = () => {
 const now = new Date();
 const todayStr = format(now, "yyyy-MM-dd");
 const currentHour = now.getHours();
 const currentMinute = now.getMinutes();
 const currentTimeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
 const dayOfWeek = now.getDay(); // 0 = Sun, 5 = Fri
 const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
 const isLastDayOfMonth = now.getDate() === lastDayOfMonth;

 const newReminders: {id: string, message: string, type: 'urgent' | 'info'}[] = [];

 // SOP: Daily Morning Reminders (9:00 - 12:00)
 if (currentHour >= 9 && currentHour < 12) {
 newReminders.push({ id: "DAILY-1", message: "CCTV Daily Check & Log entry required [SOP-G01]", type: 'info' });
 newReminders.push({ id: "DAILY-2", message: "Log new IT Support Requests to IT Support Log", type: 'info' });
 }

 // SOP: Weekly Friday Report
 if (dayOfWeek === 5) {
 newReminders.push({ id: "WEEKLY-1", message: "Friday Check: Submit Weekly Progress Report to IT Supervisor", type: 'urgent' });
 }

 // SOP: Monthly Inventory & Backup Report
 if (isLastDayOfMonth) {
 newReminders.push({ id: "MONTHLY-1", message: "Month End: Submit Asset Inventory & Backup Status to Management", type: 'urgent' });
 }

 // SOP: Asset Assignment Reminder
 const unassignedCount = assets.filter(a => a.assignedTo === "Unassigned").length;
 if (unassignedCount > 0) {
 newReminders.push({ id: "ASSET-1", message: `SOP Alert: ${unassignedCount} unassigned assets found. Please map to users.`, type: 'urgent' });
 }

 // SOP: Bi-directional Sync Alert (Assignment check)
 const recentlyAssigned = assets.filter(a => a.assignedTo !== "Unassigned" && a.purchaseRecordId);
 if (recentlyAssigned.length > 0) {
 const lastAsset = recentlyAssigned[0];
 newReminders.push({ 
 id: `SYNC-${lastAsset.id}`, 
 message: `Sync Alert: Asset ${lastAsset.model} has been assigned to ${lastAsset.assignedTo}. Purchase Record ${lastAsset.purchaseRecordId} updated.`, 
 type: 'info' 
 });
 }

 // SOP: Scheduled Backups Logic
 INITIAL_SCHEDULE.forEach(sch => {
 const hasBackup = backups.some(b => b.date === todayStr && b.status === "Success" && (
 (sch.time === "09:00" && b.storageType === "Cloud Storage") ||
 (sch.time === "22:00" && b.storageType === "External Drive")
 ));

 if (!hasBackup) {
 if (currentTimeStr >= sch.time) {
 newReminders.push({
 id: sch.id,
 message: `URGENT: ${sch.label} is OVERDUE (${sch.time})`,
 type: 'urgent'
 });
 } else {
 const [schH] = sch.time.split(":").map(Number);
 if (schH - currentHour <= 1 && schH - currentHour >= 0) {
 newReminders.push({
 id: sch.id,
 message: `Upcoming SOP Activity: ${sch.label} at ${sch.time}`,
 type: 'info'
 });
 }
 }
 }
 });

 setReminders(newReminders);
 };

 checkSopReminders();
 const interval = setInterval(checkSopReminders, 60000); // Check every minute
 return () => clearInterval(interval);
 }, [backups, assets]);

 useEffect(() => {
 if (authReady && currentUser && !isAdmin) {
 const allowedTabs = ["tickets", "assets"];
 if (!allowedTabs.includes(activeTab)) {
 setActiveTab("tickets");
 }
 }
 }, [isAdmin, authReady, activeTab, currentUser]);

 if (!authReady) {
 return (
 <div className="min-h-screen bg-slate-950 flex items-center justify-center">
 <div className="flex flex-col items-center gap-4">
 <RefreshCw className="text-cyan-500 animate-spin" size={32} />
 <p className="text-slate-500 dark:text-slate-400 font-mono text-sm tracking-widest animate-pulse">BOOTING IT SYSTEMS...</p>
 </div>
 </div>
 );
 }

 if (!currentUser) {
 return (
 <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 bg-[radial-gradient(circle_at_50%_50%,rgba(6,182,212,0.1),transparent_70%)]">
 <motion.div 
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 className="w-full max-w-md md:max-w-lg bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 text-center"
 >
 <div className="w-20 h-20 bg-cyan-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-cyan-500/30">
 <ShieldCheck className="text-cyan-400" size={40} />
 </div>
 <h1 className="text-2xl font-medium text-white mb-2">IT Operations Login</h1>
 <p className="text-slate-400 text-sm mb-8">Access restricted to Taunggyi Pharmacy IT Staff. SOP-001 Protocol enabled.</p>
 
 <button 
 onClick={handleLogin}
 className="w-full bg-white dark:bg-slate-900 text-slate-950 font-medium py-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-cyan-50 transition-colors"
 >
 <LogIn size={20} />
 Sign in with Google
 </button>
 
 <div className="mt-8 flex items-center gap-2 justify-center">
 <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span>
 <span className="text-xs text-slate-500 dark:text-slate-400 font-medium text-slate-500 dark:text-slate-400">Secure Environment</span>
 </div>
 </motion.div>
 </div>
 );
 }

 const isSpecialUser = userProfile?.role === UserRole.IT_DIGITAL_MARKETING || userProfile?.role === UserRole.MERCHANDISING_SUPERVISOR;

 const allNavItems = [
 { id: "tickets", label: "IT Support Log", icon: Ticket, badge: pendingTicketsCount > 0 ? pendingTicketsCount : undefined },
 { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
 { id: "reports", label: "Reporting & Dash", icon: BarChart2 },
 { id: "kpi", label: "KPI Dashboard", icon: ClipboardList },
 { id: "daily-kpi", label: "Daily KPI Tracker", icon: Calendar, badge: pendingDailyKpiCount > 0 ? pendingDailyKpiCount : undefined },
 { id: "meetings", label: "Meetings & Followup", icon: FileText },
 { id: "skills", label: "Team Skill Matrix", icon: Users },
 { id: "assets", label: "Assets Inventory", icon: Package },
 { id: "purchases", label: "Purchase Records", icon: ShoppingCart },
 { id: "renewals", label: "Renewal Tracker", icon: RefreshCw },
 { id: "security", label: "Security & Monitoring", icon: ShieldCheck },
 { id: "marketing", label: "Digital Marketing", icon: Megaphone },
 { id: "files", label: "Cloud Files", icon: HardDrive },
 { id: "settings", label: "System Settings", icon: Settings },
 { id: "id-layout", label: "ID Auto Layout", icon: Printer },
  { id: "help", label: "Help & Support", icon: HelpCircle },
 ];

 const navItems = allNavItems.filter(item => {
 // Admin always sees everything
 if (isAdmin) return true;
 
 // Wait for permissions to load
 if (accessLoading) return false;

 // IT Support Log, Help, and Meetings are open for everyone
 if (item.id === "tickets" || item.id === "help" || item.id === "meetings" || item.id === "id-layout") return true;

 // Use our new AccessControlContext for other items
 if (userProfile?.role) {
 return canAccess(userProfile.role, item.id);
 }
 
 return false;
 });

 return (
 <div className="flex h-screen bg-[#f8fafc] dark:bg-slate-950 overflow-hidden font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300">
 {/* Mobile Sidebar Overlay */}
 <AnimatePresence>
 {isMobile && isSidebarOpen && (
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 0.4 }}
 exit={{ opacity: 0 }}
 transition={{ duration: 0.2 }}
 onClick={() => setIsSidebarOpen(false)}
 className="fixed inset-0 bg-slate-900 z-40 lg:hidden"
 />
 )}
 </AnimatePresence>

 {/* Sidebar */}
 <motion.aside 
 initial={false}
 animate={{ 
 width: isMobile ? 280 : (isSidebarOpen ? 280 : 80),
 x: isMobile ? (isSidebarOpen ? 0 : -280) : 0
 }}
 transition={{ type: "spring", stiffness: 320, damping: 30 }}
 className="bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col z-50 fixed inset-y-0 left-0 lg:relative lg:translate-x-0 shadow-sm"
 >
 <div className={cn(
 "h-20 px-6 flex items-center shrink-0 border-b border-slate-100 dark:border-slate-800",
 isSidebarOpen ? "justify-between" : "justify-center"
 )}>
 <AnimatePresence mode="wait">
 {isSidebarOpen ? (
 <motion.div 
 key="logo-open"
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: 1, scale: 1 }}
 exit={{ opacity: 0, scale: 0.95 }}
 transition={{ duration: 0.2 }}
 className="flex items-center gap-2"
 >
 <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
 <Box size={20} />
 </div>
 <div className="font-medium text-slate-800 dark:text-slate-100 tracking-tight leading-none">
 managez.<br/>
 <span className="text-slate-400 dark:text-slate-500 dark:text-slate-400 font-medium text-xs ">Powered by Lex Corp.</span>
 </div>
 </motion.div>
 ) : (
 <motion.div
 key="logo-closed"
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: 1, scale: 1 }}
 exit={{ opacity: 0, scale: 0.95 }}
 transition={{ duration: 0.2 }}
 className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white"
 >
 <Box size={24} />
 </motion.div>
 )}
 </AnimatePresence>
 </div>

 <nav className="flex-1 px-3 space-y-1 mt-3 overflow-y-auto sidebar-scroll">
 {accessLoading ? (
 <div className="px-4 py-3.5 space-y-4">
 {[1, 2, 3, 4, 5, 6].map(i => (
 <div key={i} className="flex items-center gap-4">
 <div className="w-5 h-5 bg-slate-100 dark:bg-slate-800 rounded animate-pulse shrink-0" />
 <motion.div
 initial={false}
 animate={{
 opacity: isSidebarOpen ? 1 : 0,
 width: isSidebarOpen ? "auto" : 0,
 }}
 transition={{ duration: 0.2 }}
 style={{ overflow: "hidden" }}
 className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-24 animate-pulse"
 />
 </div>
 ))}
 </div>
 ) : (
 navItems.map((item) => (
 <button
 key={item.id}
 onClick={() => {
 setActiveTab(item.id as any);
 if (isMobile) {
 setIsSidebarOpen(false);
 }
 }}
 className={cn(
 "w-full min-h-11 flex items-center px-3 py-2.5 rounded-xl transition-colors duration-200 group text-left relative",
 isSidebarOpen ? "gap-4 justify-start" : "gap-0 justify-center",
 activeTab === item.id 
 ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400" 
 : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:text-white dark:hover:text-slate-100"
 )}
 >
 <item.icon size={20} className={cn("shrink-0", activeTab === item.id ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600 dark:text-slate-300")} />
 
 <motion.span
 initial={false}
 animate={{
 opacity: isSidebarOpen ? 1 : 0,
 width: isSidebarOpen ? "auto" : 0,
 marginLeft: isSidebarOpen ? 0 : -10,
 }}
 transition={{ duration: 0.2 }}
 style={{ overflow: "hidden", whiteSpace: "nowrap", display: "inline-block" }}
 className="text-sm font-semibold tracking-tight"
 >
 {item.label}
 </motion.span>

 {item.badge !== undefined && (
 <div className={cn(
 "ml-auto flex items-center justify-center rounded-full bg-rose-500 text-xs font-medium text-white transition-all duration-200",
 isSidebarOpen ? "px-1.5 py-0.5 min-w-[1.2rem]" : "absolute top-2 right-2 w-4 h-4 shadow-sm"
 )}>
 {isSidebarOpen ? item.badge : ""}
 </div>
 )}
 {!isSidebarOpen && activeTab === item.id && <div className="absolute right-0 w-1 h-6 bg-indigo-600 rounded-l" />}
 </button>
 ))
 )}
 </nav>

 <AnimatePresence>
 {isSidebarOpen && (
 <motion.div 
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: 10 }}
 transition={{ duration: 0.2 }}
 className="p-6 bg-slate-50/50 dark:bg-slate-800/20"
 >
 <div className="flex items-center gap-3 mb-4">
 <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
 <Activity size={20} />
 </div>
 <div className="flex-1">
 <p className="text-xs font-medium text-slate-800 dark:text-slate-100 dark:text-slate-200">Overall usage 45% (51 °C)</p>
 <p className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400 mt-0.5">23 Dec 2020, 6:00 pm</p>
 </div>
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 </motion.aside>

 {/* Main Content Area */}
 <main className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-0">
 <header className="h-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 lg:px-8 shrink-0 transition-colors duration-300">
 <div className="flex items-center gap-3 lg:gap-4">
 <button 
 onClick={() => setIsSidebarOpen(!isSidebarOpen)}
 className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-400 transition-colors"
 >
 {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
 </button>
 <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 mx-2 hidden sm:block" />
 <div className="hidden sm:block">
 <p className="text-xs font-medium text-slate-400 dark:text-slate-500 dark:text-slate-400 ">Inventory Management</p>
 <h2 className="text-sm font-medium text-slate-800 dark:text-slate-100 tracking-tight">{navItems.find(i => i.id === activeTab)?.label}</h2>
 </div>
 </div>

 <div className="flex items-center gap-3 lg:gap-6">
 {/* Theme Toggle */}
 <button
 onClick={() => setIsDarkMode(!isDarkMode)}
 className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700"
 title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
 >
 {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
 </button>

 {/* Search */}
 <div className="relative hidden md:block group">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 dark:text-slate-400 transition-colors group-focus-within:text-indigo-600" size={16} />
 <input 
 type="text" 
 placeholder="Search assets, tickets, specs (RAM/CPU)..." 
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 className="pl-10 pr-4 py-2 bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 transition-all focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 focus:bg-white dark:focus:bg-slate-800 rounded-xl text-sm w-48 lg:w-64 outline-none text-slate-800 dark:text-slate-100"
 />
 </div>

 <div className="flex items-center gap-2">
 <div className="relative">
 <button 
 onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
 className={cn(
 "relative p-2 transition-all rounded-xl",
 isNotificationsOpen ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none" : "text-slate-400 dark:text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
 )}
 >
 <Bell size={20} />
 {(pendingTicketsCount + (isAdmin && pendingDailyKpiCount > 0 ? 1 : 0)) > 0 && (
 <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-xs font-medium flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900 animate-pulse">
 {pendingTicketsCount + (isAdmin && pendingDailyKpiCount > 0 ? 1 : 0)}
 </span>
 )}
 </button>

 <AnimatePresence>
 {isNotificationsOpen && (
 <motion.div
 initial={{ opacity: 0, y: 10, scale: 0.95 }}
 animate={{ opacity: 1, y: 0, scale: 1 }}
 exit={{ opacity: 0, y: 10, scale: 0.95 }}
 className="absolute right-0 mt-3 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 z-50 overflow-hidden"
 >
 <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
 <h3 className="font-medium text-slate-800 dark:text-slate-100 text-sm italic">Notifications中心</h3>
 <button className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline">Mark all read</button>
 </div>
 <div className="max-h-[400px] overflow-y-auto">
 {isAdmin && pendingDailyKpiCount > 0 && (
 <div 
 onClick={() => {
 setActiveTab("daily-kpi");
 setIsNotificationsOpen(false);
 }}
 className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer border-b border-rose-50 dark:border-rose-950/30 border-l-4 border-l-rose-500"
 >
 <div className="flex justify-between items-start mb-1">
 <p className="text-xs font-medium text-slate-800 dark:text-slate-100 dark:text-slate-200 italic ">Missing Daily Logs</p>
 <span className="text-xs text-rose-500 font-medium bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded-full">ACTION REQUIRED</span>
 </div>
 <div className="flex items-center gap-2">
 <AlertCircle size={10} className="text-rose-500" />
 <p className="text-xs text-slate-500 dark:text-slate-400">{pendingDailyKpiCount} Operational tasks remaining for today</p>
 </div>
 </div>
 )}
 {tickets.filter(t => t.status === Status.PENDING || t.status === Status.IN_PROGRESS).length === 0 && pendingDailyKpiCount === 0 ? (
 <div className="p-8 text-center">
 <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
 <BellOff className="text-slate-300 dark:text-slate-600 dark:text-slate-300" size={24} />
 </div>
 <p className="text-xs font-medium text-slate-400 dark:text-slate-500 dark:text-slate-400 ">No active tickets</p>
 </div>
 ) : (
 tickets
 .filter(t => t.status === Status.PENDING || t.status === Status.IN_PROGRESS)
 .slice(0, 5)
 .map((ticket) => (
 <div 
 key={ticket.id} 
 onClick={() => {
 setActiveTab("tickets");
 setIsNotificationsOpen(false);
 }}
 className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer border-b border-slate-50 dark:border-slate-800 last:border-0 border-l-4 border-l-transparent hover:border-l-indigo-600"
 >
 <div className="flex justify-between items-start mb-1">
 <p className="text-xs font-medium text-slate-800 dark:text-slate-100 dark:text-slate-200">{ticket.problemType}</p>
 <span className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400 font-mono italic">
 {safeFormat(ticket.requestTime, "HH:mm")}
 </span>
 </div>
 <div className="flex items-center gap-2">
 <span className={cn(
 "px-1.5 py-0.5 rounded-[4px] text-xs font-medium ",
 ticket.priority === Priority.CRITICAL ? "bg-rose-500 text-white" :
 ticket.priority === Priority.HIGH ? "bg-amber-500 text-white" :
 "bg-slate-200 text-slate-600 dark:text-slate-300"
 )}>
 {ticket.priority}
 </span>
 <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{ticket.requesterName} • {ticket.requesterBranch}</p>
 </div>
 </div>
 ))
 )}
 </div>
 <button className="w-full p-3 text-xs font-medium text-slate-400 hover:bg-slate-50 dark:bg-slate-800/50 border-t border-slate-50 bg-slate-50/50">View all notifications</button>
 </motion.div>
 )}
 </AnimatePresence>
 </div>

 {isAdmin && (
 <button 
 onClick={() => setActiveTab("settings")}
 className={cn(
 "p-2 transition-all rounded-xl",
 activeTab === "settings" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
 )}
 >
 <Settings size={20} />
 </button>
 )}
 </div>

 <div className="h-8 w-px bg-slate-200 mx-2" />

 <div className="flex items-center gap-3">
 <div className="text-right hidden sm:block">
 <p className="text-sm font-medium text-slate-800 dark:text-slate-100 leading-none">{currentUser.displayName || "User"}</p>
 <p className="text-xs text-slate-400 font-medium mt-1 ">
 {userProfile?.role || "Staff"}
 </p>
 </div>
 <div className="relative group cursor-pointer">
 {currentUser.photoURL ? (
 <img src={currentUser.photoURL} alt="User" className="w-10 h-10 rounded-lg border border-slate-200 dark:border-slate-800 group-hover:border-indigo-500 transition-all shadow-sm" />
 ) : (
 <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-sm font-medium">
 {currentUser.displayName?.charAt(0) || "D"}
 </div>
 )}
 <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></div>
 </div>
 <button 
 onClick={handleLogout}
 className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
 title="Log Out"
 >
 <LogOut size={20} />
 </button>
 </div>
 </div>
 </header>



 <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 lg:py-8 custom-scrollbar">
 <AnimatePresence mode="wait">
 <motion.div
 key={activeTab}
 className="w-full max-w-[1600px] mx-auto"
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -10 }}
 transition={{ duration: 0.2 }}
 >
 {(activeTab === "dashboard" || activeTab === "tickets") && !canAccess(userProfile?.role as UserRole, activeTab) && !isAdmin && (
 <div className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
 <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/20 rounded-2xl flex items-center justify-center text-rose-500 mb-4">
 <ShieldOff size={32} />
 </div>
 <h3 className="text-lg font-medium text-slate-800 dark:text-slate-100 mb-2 italic">Access Restricted</h3>
 <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs">You do not have permission to access the {activeTab} module. Please contact your IT Supervisor.</p>
 </div>
 )}

 {activeTab === "dashboard" && canAccess(userProfile?.role as UserRole, "dashboard") && (
 <ReportsModule 
 activities={activities} 
 evidence={evidence} 
 allDailyLogs={allDailyLogs} 
 tickets={tickets}
 employees={employees}
 />
 )}
 {activeTab === "tickets" && <TicketsModule tickets={tickets} setTickets={setTickets} searchTerm={searchTerm} isAdmin={isAdmin} settings={settings} userProfile={userProfile} />}
 {activeTab === "assets" && canAccess(userProfile?.role as UserRole, "assets") && (
 <AssetsModule 
 assets={assets} 
 setAssets={setAssets} 
 searchTerm={searchTerm} 
 isAdmin={isAdmin} 
 settings={settings}
 />
 )}
 {activeTab === "security" && canAccess(userProfile?.role as UserRole, "security") && <SecurityModule backups={backups} setBackups={setBackups} requests={cctvRequests} setRequests={setCctvRequests} searchTerm={searchTerm} isAdmin={isAdmin} />}
 {activeTab === "renewals" && canAccess(userProfile?.role as UserRole, "renewals") && <RenewalsModule renewals={renewals} setRenewals={setRenewals} isAdmin={isAdmin} />}
 {activeTab === "purchases" && canAccess(userProfile?.role as UserRole, "purchases") && <PurchasesModule 
 purchases={purchases} 
 setPurchases={setPurchases} 
 assets={assets}
 setAssets={setAssets}
 isAdmin={isAdmin}
 />}
 {activeTab === "marketing" && canAccess(userProfile?.role as UserRole, "marketing") && <MarketingModule plans={contentPlans} setPlans={setContentPlans} isAdmin={isAdmin} />}
 {activeTab === "settings" && <SettingsModule settings={settings} setSettings={setSettings} isAdmin={isAdmin} allNavItems={allNavItems} setAssets={setAssets} />}
 {activeTab === "help" && <HelpSupportModule />}
 {activeTab === "files" && canAccess(userProfile?.role as UserRole, "files") && <FileManagerModule isAdmin={isAdmin} quota={quota} setQuota={setQuota} />}
 {activeTab === "kpi" && canAccess(userProfile?.role as UserRole, "kpi") && <KPIDashboard />}
 {activeTab === "daily-kpi" && canAccess(userProfile?.role as UserRole, "daily-kpi") && <KPITracker userRole={userProfile?.role} />}
 {activeTab === "meetings" && <MeetingMinutesModule userRole={userProfile?.role} isAdmin={isAdmin} />}
          {activeTab === "id-layout" && <IdLayoutGenerator />}
 {activeTab === "skills" && isAdmin && <SkillMatrix />}
 {activeTab === "reports" && isAdmin && (
 <ReportsModule 
 activities={activities} 
 evidence={evidence} 
 allDailyLogs={allDailyLogs} 
 tickets={tickets}
 employees={employees}
 />
 )}
 </motion.div>
 </AnimatePresence>
 </div>
 </main>

 {/* Bottom Navigation for Mobile */}
 <nav className="fixed bottom-0 left-0 right-0 h-20 glass-panel border-t border-white/10 flex items-center justify-around px-2 z-40 lg:hidden">
 {navItems.map((item) => (
 <button
 key={item.id}
 onClick={() => {
 setActiveTab(item.id as any);
 }}
 className={cn(
 "flex flex-col items-center justify-center gap-1.5 min-w-[64px] h-full transition-all duration-200",
 activeTab === item.id ? "text-indigo-600" : "text-slate-500 dark:text-slate-400 hover:text-slate-400"
 )}
 >
 <div className={cn(
 "p-1.5 rounded-lg transition-all",
 activeTab === item.id && "bg-indigo-50"
 )}>
 <item.icon size={22} strokeWidth={activeTab === item.id ? 2.5 : 2} />
 </div>
 <span className="text-xs font-medium text-slate-500 dark:text-slate-400 scale-75 origin-top">{item.label.split(' ')[0]}</span>
 </button>
 ))}
 </nav>
 
 <ConfirmationModal 
 isOpen={confirmTarget !== null}
 onClose={() => setConfirmTarget(null)}
 onConfirm={() => {
 if (confirmTarget) confirmTarget.onConfirm();
 }}
 title={confirmTarget?.title || "Confirm Action"}
 message={confirmTarget?.message}
 confirmText={confirmTarget?.confirmText || "Confirm"}
 />
 </div>
 );
}

