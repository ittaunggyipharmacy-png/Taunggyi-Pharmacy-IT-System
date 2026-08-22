import { supabase } from "./lib/supabase";

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
      
      // A full reload ensures everything boots up correctly
      window.location.reload();
    } else if (event.data === 'SUPABASE_AUTH_COMPLETED') { // backward compatibility
      await supabase.auth.getSession();
      window.location.reload();
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
 signInWithPopup, 
 GoogleAuthProvider, 
 onAuthStateChanged, 
 signOut,
 User as FirebaseUser 
} from "firebase/auth";

import { auth, storage, db } from "./services/firebase";
import { onSnapshot, doc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { 
 subscribeToSync, 
 savePurchaseRecord, 
 updateAssetAssignment,
 checkAdminStatus,
 deleteAsset,
 deletePurchaseRecord,
 deleteTicket,
 saveAsset,
 saveTicket,
 saveBackup,
 saveCCTVRequest,
 saveContentPlan,
 saveRenewal,
 saveActivity,
 clearAllAssets,
 subscribeToSupervisorFeatures,
 migrateAssetsToSequentialCodes,
 initializeAssetCodeCounters,
 importLegacyExcelData,
 importKeyboardsMigration,
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
 deleteRenewal
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

const formatStorage = (bytes: string | number | undefined | null) => {
 if (bytes === undefined || bytes === null || bytes === "") return "--";
 const b = Number(bytes);
 if (isNaN(b) || b < 0) return "--";
 if (b === 0) return "0 B";
 if (b >= 1024 * 1024 * 1024 * 1024) return `${(b / 1024 / 1024 / 1024 / 1024).toFixed(2)} TB`;
 if (b >= 1024 * 1024 * 1024) return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`;
 if (b >= 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
 if (b >= 1024) return `${(b / 1024).toFixed(1)} KB`;
 return `${b} B`;
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
 const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
 const [userProfile, setUserProfile] = useState<SystemUser | null>(null);
 const [isAdmin, setIsAdmin] = useState(false);
 const [authReady, setAuthReady] = useState(false);

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
 unsubUserDoc = onSnapshot(doc(db, "app_users", user.id), (docSnap) => {
 if (docSnap.exists()) {
 const updatedProfile = docSnap.data() as SystemUser;
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
 }, (error) => {
 console.error("Profile onSnapshot error:", error);
 });
 } catch (e) {
 console.error("Firestore onSnapshot setup failed", e);
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

 const unsubSync = subscribeToSync({
 // ... existing sync handlers ...
 onPurchases: (updatedPurchases) => {
 setPurchases(updatedPurchases);
 },
 onAssets: (updatedAssets) => {
 setAssets(updatedAssets);
 },
 onTickets: (updatedTickets) => {
 setTickets(updatedTickets);
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

 {activeTab === "dashboard" && canAccess(userProfile?.role as UserRole, "dashboard") && <Dashboard tickets={tickets} assets={assets} backups={backups} quota={quota} />}
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

function SettingsModule({ settings, setSettings, isAdmin, allNavItems, setAssets }: { settings: SystemSettings, setSettings: React.Dispatch<React.SetStateAction<SystemSettings>>, isAdmin: boolean, allNavItems: any[], setAssets: React.Dispatch<React.SetStateAction<ITAsset[]>> }) {
 const [confirmTarget, setConfirmTarget] = useState<{ id: string, onConfirm: () => void, message: string, title?: string, confirmText?: string } | null>(null);
 const [newDept, setNewDept] = useState("");
 const [newLoc, setNewLoc] = useState("");
 const [newBranchName, setNewBranchName] = useState("");
 const [newBranchLoc, setNewBranchLoc] = useState("");
 const [newBranchPhone, setNewBranchPhone] = useState("");
 const [newPassLabel, setNewPassLabel] = useState("");
 const [newPassAccount, setNewPassAccount] = useState("");
 const [newPassVal, setNewPassVal] = useState("");
 const [passwordEntries, setPasswordEntries] = useState<PasswordVaultEntry[]>([]);
 const [editingPasswordNote, setEditingPasswordNote] = useState<any | null>(null);
 const [editingBranchNote, setEditingBranchNote] = useState<any | null>(null);
 const { permissions, updatePermission } = useAccessControl();

 useEffect(() => {
 if (isAdmin) {
 const loadAndMigratePasswords = async () => {
 try {
 const legacyNotes = (settings as any).passwordNotes;
 if (legacyNotes && legacyNotes.length > 0) {
 console.log("Found legacy passwordNotes in settings config. Initiating one-time database migration to password_vault...");
 for (const note of legacyNotes) {
 const entry: PasswordVaultEntry = {
 id: note.id || Date.now().toString() + "_" + Math.random().toString(36).substr(2, 5),
 label: note.label || "",
 account: note.account || "",
 password: note.password || ""
 };
 await savePasswordEntry(entry);
 }
 const { passwordNotes, ...strippedSettings } = settings as any;
 setSettings(strippedSettings);
 await saveSettings(strippedSettings);
 console.log("Legacy passwordNotes successfully migrated to password_vault and removed from system_config.");
 }

 const entries = await getPasswordEntries();
 setPasswordEntries(entries);
 } catch (error) {
 console.error("Failed to load or migrate database password entries:", error);
 }
 };
 loadAndMigratePasswords();
 }
 }, [isAdmin, settings, setSettings]);

 const addDept = () => {
 if (!isAdmin || !newDept.trim()) return;
 const newSettings = { ...settings, departments: [...settings.departments, newDept.trim()] };
 setSettings(newSettings);
 saveSettings(newSettings);
 setNewDept("");
 };

 const addLoc = () => {
 if (!isAdmin || !newLoc.trim()) return;
 const newSettings = { ...settings, locations: [...settings.locations, newLoc.trim()] };
 setSettings(newSettings);
 saveSettings(newSettings);
 setNewLoc("");
 };

 const addBranchNote = () => {
 if (!isAdmin || !newBranchName.trim() || !newBranchLoc.trim() || !newBranchPhone.trim()) return;
 const newNote = {
 id: Date.now().toString(),
 name: newBranchName.trim(),
 location: newBranchLoc.trim(),
 phone: newBranchPhone.trim()
 };
 const newSettings = { 
 ...settings, 
 branchNotes: [...(settings.branchNotes || []), newNote] 
 };
 setSettings(newSettings);
 saveSettings(newSettings);
 setNewBranchName("");
 setNewBranchLoc("");
 setNewBranchPhone("");
 };
 
 const addPasswordNote = async () => {
 if (!isAdmin || !newPassLabel.trim() || !newPassAccount.trim() || !newPassVal.trim()) return;
 const newNote: PasswordVaultEntry = {
 id: Date.now().toString(),
 label: newPassLabel.trim(),
 account: newPassAccount.trim(),
 password: newPassVal.trim()
 };
 await savePasswordEntry(newNote);
 setPasswordEntries(prev => [...prev, newNote]);
 setNewPassLabel("");
 setNewPassAccount("");
 setNewPassVal("");
 };

 const togglePermission = async (role: string, itemId: string) => {
 if (!isAdmin) return;
 const currentPerm = permissions.find(p => p.role === role);
 const isAllowed = currentPerm?.allowed_menus[itemId] === true;
 await updatePermission(role, itemId, !isAllowed);
 };

 return (
 <div className="space-y-8 pb-20 lg:pb-0">
 <div className="enterprise-card p-6 lg:p-10">
 <h2 className="text-xl lg:text-2xl font-medium text-slate-800 dark:text-slate-100 tracking-tight ">System Configuration</h2>
 <p className="text-xs lg:text-xs text-slate-400 mt-2 lg:mt-3 leading-relaxed font-medium">
 {isAdmin ? "Manage Organizational Structures & Menu Access Control" : "View-Only: Organizational Structures & Menu Access Control"}
 </p>
 </div>

 <div className="grid grid-cols-1 gap-8">
 {/* Menu Permissions Section */}
 <div className="enterprise-card p-6">
 <h3 className="font-medium text-slate-800 dark:text-slate-100  mb-6">Menu Access Control</h3>
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead>
 <tr>
 <th className="text-left py-2">Role</th>
 {allNavItems.map(item => <th key={item.id} className="text-center py-2 px-2 text-xs ">{item.label}</th>)}
 </tr>
 </thead>
 <tbody>
 {Object.values(UserRole).map(role => (
 <tr key={role} className="border-t border-slate-100">
 <td className="py-2 font-medium">{role}</td>
 {allNavItems.map(item => (
 <td key={item.id} className="text-center py-2 px-2">
 <input 
 type="checkbox"
 checked={permissions.find(p => p.role === role)?.allowed_menus[item.id] || false}
 onChange={() => togglePermission(role, item.id)}
 disabled={!isAdmin}
 />
 </td>
 ))}
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>

 {/* User Management Section */}
 <div className="enterprise-card p-6">
 <UserManagement isSuperAdmin={isAdmin} />
 </div>

 {/* Password Notes Section */}
 <div className="enterprise-card p-6">
 <h3 className="font-medium text-slate-800 dark:text-slate-100  mb-6">Account Credentials</h3>
 {isAdmin ? (
 <>
 <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-6">
 <input type="text" value={newPassLabel} onChange={e => setNewPassLabel(e.target.value)} placeholder="Label (e.g. Gmail)..." className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm" />
 <input type="text" value={newPassAccount} onChange={e => setNewPassAccount(e.target.value)} placeholder="Account..." className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm" />
 <input type="text" value={newPassVal} onChange={e => setNewPassVal(e.target.value)} placeholder="Password..." className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm" />
 <button onClick={addPasswordNote} className="px-6 py-3 bg-amber-600 text-white rounded-xl font-medium text-xs hover:bg-amber-500 transition-colors shadow-lg">Save</button>
 </div>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {passwordEntries.map(note => (
 editingPasswordNote?.id === note.id ? (
 <div key={note.id} className="p-4 bg-amber-50 border border-amber-200 rounded-xl relative">
 <input type="text" value={editingPasswordNote.label} onChange={e => setEditingPasswordNote({...editingPasswordNote, label: e.target.value})} className="w-full mb-1 p-2 border rounded text-sm" placeholder="Label" />
 <input type="text" value={editingPasswordNote.account} onChange={e => setEditingPasswordNote({...editingPasswordNote, account: e.target.value})} className="w-full mb-1 p-2 border rounded text-sm" placeholder="Account" />
 <input type="text" value={editingPasswordNote.password} onChange={e => setEditingPasswordNote({...editingPasswordNote, password: e.target.value})} className="w-full mb-1 p-2 border rounded text-sm" placeholder="Password" />
 <button onClick={async () => {
 await savePasswordEntry(editingPasswordNote);
 setPasswordEntries(prev => prev.map(n => n.id === note.id ? editingPasswordNote : n));
 setEditingPasswordNote(null);
 }} className="mt-2 w-full bg-amber-600 text-white p-2 rounded text-xs font-medium">Save</button>
 </div>
 ) : (
 <div key={note.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 rounded-xl relative group">
 <p className="font-medium text-sm text-slate-800 dark:text-slate-100">{note.label}</p>
 <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Acc: {note.account}</p>
 <p className="text-xs text-amber-600 mt-1 font-mono">Pass: {note.password}</p>
 <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex gap-2">
 <button onClick={() => setEditingPasswordNote(note)} className="text-slate-400 hover:text-indigo-500 text-xs">Edit</button>
 <button onClick={async () => {
 await deletePasswordEntry(note.id);
 setPasswordEntries(prev => prev.filter(n => n.id !== note.id));
 }} className="text-slate-400 hover:text-red-500 text-xs">Delete</button>
 </div>
 </div>
 )
 ))}
 </div>
 </>
 ) : (
 <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl text-sm flex items-center gap-2">
 <span className="font-medium">Access Restricted:</span> Only IT Supervisors and Administrators can view account credentials.
 </div>
 )}
 </div>

 {/* Branch Notes Section */}
 <div className="enterprise-card p-6">
 <h3 className="font-medium text-slate-800 dark:text-slate-100  mb-6">Branch Locations & Contacts</h3>
 {isAdmin && (
 <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-6">
 <input type="text" value={newBranchName} onChange={e => setNewBranchName(e.target.value)} placeholder="Branch Name..." className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm" />
 <input type="text" value={newBranchLoc} onChange={e => setNewBranchLoc(e.target.value)} placeholder="Location..." className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm" />
 <input type="text" value={newBranchPhone} onChange={e => setNewBranchPhone(e.target.value)} placeholder="Phone..." className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm" />
 <button onClick={addBranchNote} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium text-xs hover:bg-blue-500 transition-colors shadow-lg">Add Note</button>
 </div>
 )}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {(settings.branchNotes || []).map(note => (
 editingBranchNote?.id === note.id ? (
 <div key={note.id} className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl relative">
 <input type="text" value={editingBranchNote.name} onChange={e => setEditingBranchNote({...editingBranchNote, name: e.target.value})} className="w-full mb-1 p-2 border rounded text-sm" placeholder="Branch Name" />
 <input type="text" value={editingBranchNote.location} onChange={e => setEditingBranchNote({...editingBranchNote, location: e.target.value})} className="w-full mb-1 p-2 border rounded text-sm" placeholder="Location" />
 <input type="text" value={editingBranchNote.phone} onChange={e => setEditingBranchNote({...editingBranchNote, phone: e.target.value})} className="w-full mb-1 p-2 border rounded text-sm" placeholder="Phone" />
 <button onClick={() => {
 setSettings(p => ({...p, branchNotes: p.branchNotes?.map(n => n.id === note.id ? editingBranchNote : n)}));
 setEditingBranchNote(null);
 }} className="mt-2 w-full bg-indigo-600 text-white p-2 rounded text-xs font-medium">Save</button>
 </div>
 ) : (
 <div key={note.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 rounded-xl relative group">
 <p className="font-medium text-sm text-slate-800 dark:text-slate-100">{note.name}</p>
 <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{note.location}</p>
 <p className="text-xs text-indigo-600 mt-1 font-mono">{note.phone}</p>
 {isAdmin && (
 <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex gap-2">
 <button onClick={() => setEditingBranchNote(note)} className="text-slate-400 hover:text-indigo-500 text-xs">Edit</button>
 <button onClick={() => setSettings(p => ({...p, branchNotes: p.branchNotes?.filter(n => n.id !== note.id)}))} className="text-slate-400 hover:text-red-500 text-xs">Delete</button>
 </div>
 )}
 </div>
 )
 ))}
 </div>
 </div>

 {/* Existing Dept/Loc UI */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
 <div className="enterprise-card p-6">
 <div className="flex items-center gap-3 mb-6">
 <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
 <Layers size={20} />
 </div>
 <h3 className="font-medium text-slate-800 dark:text-slate-100 ">Departments</h3>
 </div>
 {isAdmin && (
 <div className="flex gap-2 mb-6">
 <input 
 type="text" 
 value={newDept}
 onChange={e => setNewDept(e.target.value)}
 placeholder="New department name..."
 className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/20"
 />
 <button 
 onClick={addDept}
 className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium text-xs hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-100"
 >
 Add
 </button>
 </div>
 )}
 <div className="flex flex-wrap gap-2">
 {settings.departments.map(d => (
 <span key={d} className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 ">
 {d}
 </span>
 ))}
 </div>
 </div>

 <div className="enterprise-card p-6">
 <div className="flex items-center gap-3 mb-6">
 <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
 <Globe size={20} />
 </div>
 <h3 className="font-medium text-slate-800 dark:text-slate-100 ">Locations</h3>
 </div>
 {isAdmin && (
 <div className="flex gap-2 mb-6">
 <input 
 type="text" 
 value={newLoc}
 onChange={e => setNewLoc(e.target.value)}
 placeholder="New location name..."
 className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/20"
 />
 <button 
 onClick={addLoc}
 className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-medium text-xs hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-100"
 >
 Add
 </button>
 </div>
 )}
 <div className="flex flex-wrap gap-2">
 {settings.locations.map(l => (
 <span key={l} className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 ">
 {l}
 </span>
 ))}
 </div>
 </div>
 </div>

 <div className="enterprise-card p-6 border border-emerald-100">
 <h3 className="font-medium text-slate-800 dark:text-slate-100  mb-6">Data Tools</h3>
 <div className="flex flex-col gap-4">
 <div className="p-6 bg-emerald-50 rounded-3xl flex flex-col md:flex-row items-center gap-6">
 <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm font-sans italic font-medium text-xs">
 MIG
 </div>
 <div className="flex-1 text-center md:text-left">
 <h4 className="font-medium text-emerald-900 mb-1">Standardize Serial Codes</h4>
 <p className="text-xs text-emerald-700 font-medium leading-relaxed">Runs a one-time database migration to sequentially assign new formatted asset codes (e.g., TG-PC-001) to all existing hardware grouped by category.</p>
 </div>
 <button
 onClick={() => {
 if (!isAdmin) return;
 setConfirmTarget({
 id: "migration1",
 message: "Execute one-time Sequential Asset Code migration?",
 onConfirm: async () => {
 setConfirmTarget(null);
 const tid = toast.loading("Executing standard migration...");
 try {
 const res = await migrateAssetsToSequentialCodes();
 toast.success(`Success: updated ${res.processedCount} records!`, { id: tid });
 } catch(err) {
 toast.error("Migration failed", { id: tid });
 }
 }
 });
 }}
 disabled={!isAdmin}
 className="px-4 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-medium transition-all shadow-xl shadow-emerald-100 active:scale-95 disabled:opacity-50"
 >
 Run Migration
 </button>
 </div>
 
 {/* NEW SCRIPT */}
 <div className="p-6 bg-blue-50 rounded-3xl flex flex-col md:flex-row items-center gap-6">
 <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm font-sans italic font-medium text-xs">
 IMP
 </div>
 <div className="flex-1 text-center md:text-left">
 <h4 className="font-medium text-blue-900 mb-1">Import Keyboards (SOP)</h4>
 <p className="text-xs text-blue-700 font-medium leading-relaxed">Runs a one-time import script for standalone keyboards based on the provided TSV list.</p>
 </div>
 <button
 onClick={() => {
 if (!isAdmin) return;
 setConfirmTarget({
 id: "import1",
 message: "Execute keyboard spreadsheet import?",
 onConfirm: async () => {
 setConfirmTarget(null);
 const tid = toast.loading("Importing keyboard layout...");
 try {
 const res = await importKeyboardsMigration();
 toast.success(`Success: imported ${res.importedCount} keyboards!`, { id: tid });
 } catch(err) {
 toast.error("Import failed", { id: tid });
 }
 }
 });
 }}
 disabled={!isAdmin}
 className="px-4 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-medium transition-all shadow-xl shadow-blue-100 active:scale-95 disabled:opacity-50 whitespace-nowrap"
 >
 Run Import Script
 </button>
 </div>

 {/* INITIALIZE ASSET CODE COUNTERS */}
 <div className="p-6 bg-indigo-50 rounded-3xl flex flex-col md:flex-row items-center gap-6">
 <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm font-sans italic font-medium text-xs">
 CNT
 </div>
 <div className="flex-1 text-center md:text-left">
 <h4 className="font-medium text-indigo-900 mb-1">Initialize Asset Code Counters</h4>
 <p className="text-xs text-indigo-700 font-medium leading-relaxed">Scans all current assets to determine the highest starting sequence number for each category, initializing the database transaction counters so upcoming asset entries are race-condition safe.</p>
 </div>
 <button
 onClick={() => {
 if (!isAdmin) return;
 setConfirmTarget({
 id: "initCounters1",
 message: "Initialize race-safe asset code counters? This will scan all existing inventory to set starting numbers.",
 onConfirm: async () => {
 setConfirmTarget(null);
 const tid = toast.loading("Initializing transaction counters...");
 try {
 const res = await initializeAssetCodeCounters();
 toast.success("Counters initialized successfully!", { id: tid });
 } catch(err: any) {
 toast.error(`Initialization failed: ${err?.message || err}`, { id: tid });
 }
 }
 });
 }}
 disabled={!isAdmin}
 className="px-4 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-medium transition-all shadow-xl shadow-indigo-100 active:scale-95 disabled:opacity-50 whitespace-nowrap"
 >
 Initialize Counters
 </button>
 </div>
 
 {/* RESET DATABASE TOOL */}
 {isAdmin && (
 <div className="p-6 bg-rose-50 rounded-3xl flex flex-col md:flex-row items-center gap-6 border border-rose-100 mt-4">
 <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center text-rose-600 shadow-sm font-sans italic font-medium text-xs">
 DEL
 </div>
 <div className="flex-1 text-center md:text-left">
 <h4 className="font-medium text-rose-900 mb-1">Reset Database</h4>
 <p className="text-xs text-rose-700 font-medium leading-relaxed">Deletes ALL IT assets in the inventory collection. Use with extreme caution as this action is permanent and irreversible.</p>
 </div>
 <ResetAssetsButton setAssets={setAssets} setConfirmTarget={setConfirmTarget} isCompact={true} />
 </div>
 )}
 </div>
 </div>

 </div>

 <ConfirmationModal 
 isOpen={confirmTarget !== null}
 onClose={() => setConfirmTarget(null)}
 onConfirm={() => {
 if (confirmTarget) confirmTarget.onConfirm();
 }}
 title={confirmTarget?.title || "Admin Protocol Confirmation"}
 message={confirmTarget?.message}
 confirmText={confirmTarget?.confirmText || "Confirm Execution"}
 />
 </div>
 );
}



import { saveEmployeeProfile } from './services/firestoreService';

function SkillsModule({ employees, settings }: { employees: EmployeeProfile[], settings: SystemSettings }) {
 const [isAdding, setIsAdding] = useState(false);
 const [newEmployee, setNewEmployee] = useState<Partial<EmployeeProfile>>({ department: "IT", skills: [] });

 const DEPARTMENTS = ["IT", "Merchandising", "Digital Marketing", "Management"];
 const SKILL_CATEGORIES = [
 "Hardware", "Networking", "Graphic Design", "Video Editing", 
 "Copywriting", "Software", "System Admin", "Data Analysis", "Communication"
 ];

 const handleSave = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!newEmployee.name || !newEmployee.department) return;
 
 await saveEmployeeProfile(newEmployee);
 setIsAdding(false);
 setNewEmployee({ department: "IT", skills: [] });
 };

 const updateSkill = (category: string, level: number) => {
 const existingSkills = newEmployee.skills || [];
 const filtered = existingSkills.filter(s => s.category !== category);
 setNewEmployee({
 ...newEmployee,
 skills: [...filtered, { category, level }]
 });
 };

 return (
 <div className="space-y-8">
 <div className="flex items-center justify-between">
 <div>
 <h2 className="text-2xl font-medium text-slate-800 dark:text-slate-100">Team Skill Matrix</h2>
 <p className="text-sm text-slate-500 dark:text-slate-400">Track and manage employee competencies</p>
 </div>
 <button 
 onClick={() => setIsAdding(true)}
 className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium text-xs hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-100"
 >
 <Plus size={16} />
 Add Employee
 </button>
 </div>

 {isAdding && (
 <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm mb-8">
 <h3 className="text-lg font-medium text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2"><User size={20} className="text-indigo-600 dark:text-indigo-400" /> New Employee Profile</h3>
 <form onSubmit={handleSave} className="space-y-6">
 <div className="grid grid-cols-2 gap-6">
 <div>
 <label className="block text-xs font-medium text-slate-400 dark:text-slate-500 dark:text-slate-400 mb-2">Name</label>
 <input type="text" required value={newEmployee.name || ""} onChange={e => setNewEmployee({...newEmployee, name: e.target.value})} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 dark:text-slate-300" placeholder="John Doe" />
 </div>
 <div>
 <label className="block text-xs font-medium text-slate-400 dark:text-slate-500 dark:text-slate-400 mb-2">Department</label>
 <select value={newEmployee.department} onChange={e => setNewEmployee({...newEmployee, department: e.target.value as any})} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
 <option value="">Select Department</option>
 {settings.departments.map(d => <option key={d} value={d} className="bg-white dark:bg-slate-800">{d}</option>)}
 </select>
 </div>
 </div>

 <div>
 <label className="block text-xs font-medium text-slate-400 dark:text-slate-500 dark:text-slate-400 mb-4">Assign Skills</label>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {SKILL_CATEGORIES.map(category => {
 const currLevel = newEmployee.skills?.find(s => s.category === category)?.level || 0;
 return (
 <div key={category} className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 rounded-xl flex flex-col justify-between h-24">
 <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{category}</span>
 <div className="flex gap-1 mt-2">
 {[1,2,3,4,5].map(lvl => (
 <button
 key={lvl}
 type="button"
 onClick={() => updateSkill(category, lvl)}
 className={`w-6 h-6 rounded flex items-center justify-center text-xs transition-colors ${lvl <= currLevel ? 'bg-amber-400 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-600'}`}
 >
 ★
 </button>
 ))}
 </div>
 </div>
 );
 })}
 </div>
 </div>

 <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
 <button type="button" onClick={() => setIsAdding(false)} className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl font-medium text-xs hover:bg-slate-200 dark:hover:bg-slate-700">Cancel</button>
 <button type="submit" className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium text-xs hover:bg-indigo-500">Save Profile</button>
 </div>
 </form>
 </div>
 )}

 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 {employees.map(emp => (
 <div key={emp.id} className="enterprise-card p-6 flex flex-col h-full">
 <div className="flex justify-between items-start mb-6">
 <div>
 <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">{emp.name}</h3>
 <span className="inline-block px-2 py-1 mt-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-xs font-medium text-slate-500 dark:text-slate-400 rounded">{emp.department}</span>
 </div>
 <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500 dark:text-slate-400 font-medium">
 {emp.name.charAt(0)}
 </div>
 </div>

 <div className="flex-1 space-y-4">
 <h4 className="text-xs font-medium text-slate-400 dark:text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">Skill Matrix</h4>
 {emp.skills?.length === 0 ? (
 <p className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400 italic">No skills recorded.</p>
 ) : (
 emp.skills?.sort((a,b) => b.level - a.level).map(skill => (
 <div key={skill.category} className="flex justify-between items-center">
 <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{skill.category}</span>
 <div className="flex gap-1">
 {[1,2,3,4,5].map(lvl => (
 <div key={lvl} className={`w-3 h-3 rounded-full ${lvl <= skill.level ? 'bg-amber-400' : 'bg-slate-100 dark:bg-slate-800'}`} />
 ))}
 </div>
 </div>
 ))
 )}
 </div>
 </div>
 ))}
 </div>
 </div>
 );
}

function ReportsModule({ activities, evidence, allDailyLogs, tickets, employees }: { 
 activities: ActivityEntry[], 
 evidence: TaskEvidence[], 
 allDailyLogs: DailyLog[],
 tickets: ITTicket[],
 employees: EmployeeProfile[]
}) {
 const [dateRange, setDateRange] = useState({ start: format(subDays(new Date(), 30), "yyyy-MM-dd"), end: format(new Date(), "yyyy-MM-dd") });

 const filteredDailyLogs = allDailyLogs.filter(log => log.date >= dateRange.start && log.date <= dateRange.end);
 const filteredTickets = tickets.filter(t => t.requestTime.slice(0, 10) >= dateRange.start && t.requestTime.slice(0, 10) <= dateRange.end);

 const exportKPISummary = () => {
 const data = filteredDailyLogs.map(log => {
 const completion = Object.values(log.tasks).filter(Boolean).length;
 return {
 Date: log.date,
 UserID: log.userId,
 TasksCompleted: completion,
 TotalTasks: Object.keys(log.tasks).length,
 CompletionRate: `${Math.round((completion / Object.keys(log.tasks).length) * 100)}%`
 };
 });

 const ws = utils.json_to_sheet(data);
 const wb = utils.book_new();
 utils.book_append_sheet(wb, ws, "KPI Summary");
 writeFile(wb, `KPI_Summary_${format(new Date(), "yyyy-MM")}.xlsx`);
 };

 // Group logs by date to show progress over time
 const chartData = Array.from({ length: 7 }).map((_, i) => {
 const date = format(subDays(new Date(), 6 - i), "yyyy-MM-dd");
 const dayLogs = allDailyLogs.filter(l => l.date === date);
 
 let totalComp = 0;
 let totalTasks = 0;
 
 dayLogs.forEach(l => {
 totalComp += Object.values(l.tasks).filter(Boolean).length;
 totalTasks += Object.keys(l.tasks).length;
 });

 return {
 date: format(parseISO(date), "MMM dd"),
 progress: totalTasks > 0 ? Math.round((totalComp / totalTasks) * 100) : 0
 };
 });

 const staffPerformance = employees.map(emp => {
 const logs = allDailyLogs.filter(l => l.userId === emp.id);
 let totalTasks = 0;
 let completedTasks = 0;
 logs.forEach(l => {
 totalTasks += Object.keys(l.tasks).length;
 completedTasks += Object.values(l.tasks).filter(Boolean).length;
 });
 const completionRate = totalTasks > 0 ? Math.round((completedTasks/totalTasks) * 100) : 0;
 const avgSkill = emp.skills && emp.skills.length > 0 
 ? emp.skills.reduce((acc, s) => acc + s.level, 0) / emp.skills.length 
 : 0;

 return {
 ...emp,
 completionRate,
 avgSkill: avgSkill.toFixed(1)
 };
 }).sort((a,b) => b.completionRate - a.completionRate);

 return (
 <div className="space-y-8">
 <div className="flex items-center justify-between">
 <div>
 <h2 className="text-2xl font-medium text-slate-800 dark:text-slate-100">IT Supervisor Dashboard</h2>
 <p className="text-sm text-slate-500 dark:text-slate-400">Real-time Performance & Subordinate Monitoring</p>
 </div>
 <div className="flex items-center gap-4">
 <input type="date" value={dateRange.start} onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))} className="px-3 py-2 border rounded-xl" />
 <input type="date" value={dateRange.end} onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))} className="px-3 py-2 border rounded-xl" />
 <button 
 onClick={exportKPISummary}
 className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-medium text-xs hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-100"
 >
 <Download size={16} />
 Export KPI Report (XLSX)
 </button>
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
 {/* Activity Feed */}
 <div className="lg:col-span-1 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-3xl p-6 flex flex-col h-[600px]">
 <h3 className="text-sm font-medium text-slate-400 mb-6 flex items-center gap-2">
 <Activity size={16} className="text-indigo-600" />
 Live Activity Feed
 </h3>
 <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
 {activities.length === 0 ? (
 <div className="text-center py-20 grayscale opacity-50">
 <Clock size={40} className="mx-auto mb-3" />
 <p className="text-xs font-medium text-slate-500 dark:text-slate-400">No activities logged</p>
 </div>
 ) : (
 activities.map((act) => (
 <div key={act.id} className="relative pl-6 border-l-2 border-slate-100 pb-1">
 <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white dark:bg-slate-900 border-2 border-indigo-600 shadow-sm" />
 <div className="flex flex-col">
 <span className="text-xs font-medium text-slate-400 ">
 {safeFormat(act.timestamp, "HH:mm • dd MMM")}
 </span>
 <p className="text-sm font-medium text-slate-800 dark:text-slate-100 mt-1">
 <span className="text-indigo-600">{act.userName}</span> {act.action}
 </p>
 <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 dark:text-slate-400 w-fit mt-1.5 font-medium">
 {act.department}
 </span>
 </div>
 </div>
 ))
 )}
 </div>
 </div>

 {/* Charts and Evidence */}
 <div className="lg:col-span-2 space-y-8">
 {/* Progress Chart */}
 <div className="enterprise-card p-6">
 <h3 className="text-sm font-medium text-slate-400 mb-6">Staff Daily Completion Rate (%)</h3>
 <div className="h-[300px] w-full">
 <ResponsiveContainer width="100%" height="100%" minHeight={250} minWidth={250}>
 <BarChart data={chartData}>
 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
 <XAxis 
 dataKey="date" 
 axisLine={false} 
 tickLine={false} 
 tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} 
 />
 <YAxis 
 axisLine={false} 
 tickLine={false} 
 tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
 domain={[0, 100]}
 />
 <Tooltip 
 contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
 cursor={{ fill: '#f8fafc' }}
 />
 <Bar 
 dataKey="progress" 
 fill="#6366f1" 
 radius={[4, 4, 0, 0]} 
 barSize={40}
 label={{ position: 'top', fontSize: 10, fontWeight: 'bold', fill: '#6366f1' }}
 />
 </BarChart>
 </ResponsiveContainer>
 </div>
 </div>

 {/* Recent Evidence */}
 <div className="enterprise-card p-6">
 <h3 className="text-sm font-medium text-slate-400 mb-6 flex items-center justify-between">
 Recent Photo Evidence
 <span className="text-xs lowercase text-slate-400 font-normal tracking-normal italic">Proof of completion</span>
 </h3>
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 {evidence.slice(0, 8).map((ev) => (
 <div key={ev.id} className="group relative aspect-square rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
 <img src={ev.imageUrl} alt="Evidence" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
 <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all p-3 flex flex-col justify-end">
 <p className="text-xs font-medium text-white ">{ev.userName}</p>
 <p className="text-xs text-white/70 line-clamp-1">{ev.taskId}</p>
 </div>
 </div>
 ))}
 {evidence.length === 0 && (
 <div className="col-span-full py-12 text-center bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
 <Camera className="mx-auto text-slate-300 mb-2" size={24} />
 <p className="text-xs font-medium text-slate-400 ">No photo evidence uploaded yet</p>
 </div>
 )}
 </div>
 </div>

 {/* Staff Performance Ranking */}
 <div className="enterprise-card p-6">
 <h3 className="text-sm font-medium text-slate-400 mb-6">Staff Performance & Skill Growth</h3>
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead>
 <tr className="border-b border-slate-100">
 <th className="text-left text-xs font-semibold text-slate-600 dark:text-slate-300  pb-3">Staff Member</th>
 <th className="text-left text-xs font-semibold text-slate-600 dark:text-slate-300  pb-3">Department</th>
 <th className="text-left text-xs font-semibold text-slate-600 dark:text-slate-300  pb-3">KPI Completion</th>
 <th className="text-left text-xs font-semibold text-slate-600 dark:text-slate-300  pb-3">Avg Skill Level</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100">
 {staffPerformance.map(emp => (
 <tr key={emp.id}>
 <td className="py-4">
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-medium text-xs">
 {emp.name.charAt(0)}
 </div>
 <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{emp.name}</span>
 </div>
 </td>
 <td className="py-4">
 <span className="px-2 py-1 bg-slate-50 text-slate-500 dark:text-slate-400 rounded text-xs font-medium">{emp.department}</span>
 </td>
 <td className="py-4">
 <div className="flex items-center gap-2">
 <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
 <div className="h-full bg-emerald-500" style={{ width: `${emp.completionRate}%` }} />
 </div>
 <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{emp.completionRate}%</span>
 </div>
 </td>
 <td className="py-4">
 <div className="flex items-center gap-1">
 <span className="text-amber-400 text-sm">★</span>
 <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{emp.avgSkill}</span>
 </div>
 </td>
 </tr>
 ))}
 {staffPerformance.length === 0 && (
 <tr>
 <td colSpan={4} className="py-8 text-center text-xs font-medium text-slate-400 ">
 No employees recorded
 </td>
 </tr>
 )}
 </tbody>
 </table>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
}



function Dashboard({ tickets, assets, backups, quota }: { tickets: ITTicket[], assets: ITAsset[], backups: BackupLog[], quota: {limit: string, usage: string} | null }) {
 const activeAssets = assets.filter(a => a.status === "Active").length;
 const underRepairAssets = assets.filter(a => a.status === "Under Repair" || a.status === "Maintenance").length;

 const summaryStats = [
 { label: "Critical Tickets", current: tickets.filter(t => t.priority === Priority.CRITICAL).length, total: tickets.length, sub: "Total tickets", icon: AlertTriangle, color: "text-rose-500", iconColor: "text-rose-500" },
 { label: "Active Assets", current: activeAssets, total: assets.length, sub: "Inventory status", icon: BarChart2, color: "text-indigo-600", iconColor: "text-indigo-600" },
 { label: "Under Repair", current: underRepairAssets, total: assets.length, sub: "Hardware offline", icon: Wrench, color: "text-emerald-500", iconColor: "text-emerald-500" },
 { 
 label: "Cloud Storage", 
 current: quota ? formatStorage(quota.usage) : "...", 
 total: quota ? formatStorage(Number(quota.limit) || 2199023255552) : "...", 
 sub: "Drive Quota", 
 icon: HardDrive, 
 color: "text-indigo-600", 
 iconColor: "text-indigo-600" 
 },
 ];

 const inventoryData = [
 { name: 'SWITCHES', value: assets.filter(a => a.category === "Network").length || 4 },
 { name: 'DESKTOP', value: assets.filter(a => a.brand === "Desktop").length || 6 },
 { name: 'LAPTOPS', value: assets.filter(a => a.category === "Computer" && a.brand !== "Desktop").length || 12 },
 { name: 'SERVER', value: 2 },
 ];

 const pieData = [
 { name: 'Finance', value: 45, color: '#A855F7' },
 { name: 'IOT', value: 5, color: '#38BDF8' },
 { name: 'IT', value: 45, color: '#6366F1' },
 { name: 'NMS', value: 5, color: '#6366F1' },
 ];

 const licenses = [
 { name: "Microsoft Windows 11 Pro", used: 12, total: 15, logo: "W" },
 { name: "Microsoft Office 365", used: 45, total: 50, logo: "O" },
 { name: "Adobe Creative Cloud", used: 2, total: 5, logo: "A" },
 { name: "Tally ERP 9", used: 4, total: 4, logo: "T" },
 ];

 return (
 <div className="grid grid-cols-1 xl:grid-cols-[1fr,320px] gap-6">
 <div className="flex-1 space-y-6">
 <div className="flex items-center justify-between">
 <h1 className="text-2xl font-medium text-slate-800 dark:text-slate-100">Inventory dashboard</h1>
 <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm">
 <Plus size={18} />
 <span>Add items</span>
 </button>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
 {summaryStats.map((stat, i) => (
 <div key={i} className="enterprise-card p-6 flex flex-col justify-between h-40">
 <div className="flex items-start justify-between">
 <stat.icon className={stat.iconColor} size={24} />
 </div>
 <div>
 <div className="text-3xl font-medium text-slate-900 dark:text-white">
 {stat.current}
 {stat.total && <span className="text-slate-400 text-xl">/{stat.total}</span>}
 </div>
 <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{stat.sub}</p>
 <p className="text-xs font-semibold text-slate-400 mt-0.5">{stat.label}</p>
 </div>
 </div>
 ))}
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 {/* Inventory Counter Chart */}
 <div className="enterprise-card p-6">
 <div className="flex items-center justify-between mb-6">
 <div>
 <h3 className="text-lg font-medium text-slate-800 dark:text-slate-100">Inventory counter</h3>
 <div className="flex gap-4 mt-2">
 <button className="text-sm font-medium text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 pb-1">Device</button>
 <button className="text-sm font-medium text-slate-400 dark:text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:text-slate-300 dark:hover:text-slate-300">Spare parts</button>
 </div>
 </div>
 <div className="flex gap-2">
 <button className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-300 transition-colors"><Activity size={16} /></button>
 <button className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-300 transition-colors"><RefreshCw size={16} /></button>
 <button className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-300 transition-colors"><Download size={16} /></button>
 </div>
 </div>
 
 <div className="h-[250px] w-full mt-4">
 <ResponsiveContainer width="100%" height="100%" minHeight={250} minWidth={250}>
 <BarChart layout="vertical" data={inventoryData} margin={{ left: 20 }}>
 <XAxis type="number" hide />
 <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} />
 <Tooltip cursor={{ fill: 'transparent' }} />
 <Bar 
 dataKey="value" 
 fill="#6366F1" 
 radius={[0, 4, 4, 0]} 
 barSize={32}
 >
 {inventoryData.map((entry, index) => (
 <Cell key={`cell-${index}`} fill={['#C084FC', '#4F46E5', '#2DD4BF', '#818CF8'][index % 4]} />
 ))}
 </Bar>
 </BarChart>
 </ResponsiveContainer>
 </div>
 </div>

 {/* Workstations Chart */}
 <div className="enterprise-card p-6">
 <div className="flex items-center justify-between mb-6">
 <h3 className="text-lg font-medium text-slate-800 dark:text-slate-100">Workstations</h3>
 <button className="p-2 text-slate-400 dark:text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:text-slate-300 dark:hover:text-slate-300 transition-colors"><Download size={16} /></button>
 </div>
 <div className="flex gap-4 mb-6">
 <button className="text-sm font-medium text-indigo-600 border-b-2 border-indigo-600 pb-1">State count</button>
 <button className="text-sm font-medium text-slate-400 hover:text-slate-600 dark:text-slate-300">Department count</button>
 </div>

 <div className="relative h-[250px] flex items-center justify-center">
 <ResponsiveContainer width="100%" height="100%" minHeight={250} minWidth={250}>
 <RePieChart>
 <Pie
 data={pieData}
 cx="50%"
 cy="50%"
 innerRadius={60}
 outerRadius={90}
 paddingAngle={5}
 dataKey="value"
 >
 {pieData.map((entry, index) => (
 <Cell key={`cell-${index}`} fill={entry.color} />
 ))}
 </Pie>
 <Tooltip />
 </RePieChart>
 </ResponsiveContainer>
 <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
 <p className="text-xs text-slate-500 dark:text-slate-400 font-medium ">Total</p>
 <p className="text-2xl font-medium text-slate-800 dark:text-slate-100">100%</p>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4 mt-4">
 {pieData.map((item, idx) => (
 <div key={idx} className="flex items-center gap-2">
 <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
 <span className="text-xs font-medium text-slate-600 dark:text-slate-300 ">{item.name} {item.value}%</span>
 </div>
 ))}
 </div>
 </div>
 </div>
 </div>

 {/* Right License Sidebar */}
 <div className="xl:col-start-2 xl:row-start-1">
 <div className="enterprise-card p-6 h-full">
 <h3 className="text-lg font-medium text-slate-800 dark:text-slate-100 mb-6">Purchased license</h3>
 <div className="relative mb-6">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 dark:text-slate-400" size={16} />
 <input 
 type="text" 
 placeholder="Search" 
 className="w-full pl-10 pr-4 py-2 bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-slate-100"
 />
 </div>
 
 <div className="space-y-6">
 {licenses.map((license, i) => (
 <div key={i} className="group cursor-pointer">
 <div className="flex gap-4">
 <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-medium text-lg group-hover:bg-indigo-600 group-hover:text-white transition-all">
 {license.logo}
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{license.name}</p>
 <p className="text-xs text-slate-400 font-medium mt-1">
 {license.used} Used • {license.total - license.used} Available
 </p>
 </div>
 </div>
 <div className="mt-4 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
 <div className="h-full bg-indigo-500" style={{ width: `${(license.used / license.total) * 100}%` }}></div>
 </div>
 </div>
 ))}
 </div>

 <button className="w-full mt-10 py-3 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-indigo-600 transition-colors border-t border-slate-100">
 Manage All Licenses
 </button>
 </div>
 </div>
 </div>
 );
}



function TicketsModule({ tickets, setTickets, searchTerm, isAdmin, settings, userProfile }: { tickets: ITTicket[], setTickets: (t: ITTicket[]) => void, searchTerm: string, isAdmin: boolean, settings: SystemSettings, userProfile: any }) {
 const [isAdding, setIsAdding] = useState(false);
 const [isSavingTicket, setIsSavingTicket] = useState(false);
 const [selectedTicket, setSelectedTicket] = useState<ITTicket | null>(null);
 const [newAction, setNewAction] = useState("");
 const [ticketSearch, setTicketSearch] = useState("");
 
 // Advanced Edit State
 const [isAdvancedEditing, setIsAdvancedEditing] = useState(false);
 const [advEditTicket, setAdvEditTicket] = useState<ITTicket | null>(null);
 const isSupervisor = userProfile?.role === UserRole.IT_SUPERVISOR || userProfile?.role === UserRole.IT_SUPERVISOR_CAPS || isAdmin;
 const [filterStatus, setFilterStatus] = useState("All");
 const [filterPriority, setFilterPriority] = useState("All");
 const [filterDept, setFilterDept] = useState("All");
 const [filterAssigned, setFilterAssigned] = useState("All");

 const [newTicket, setNewTicket] = useState<Partial<ITTicket>>({
 priority: Priority.MEDIUM,
 status: Status.PENDING
 });

 // Auto-save logic
 useEffect(() => {
 // Ensuring isAdding is false on mount
 setIsAdding(false);
 
 const savedDraft = localStorage.getItem("it_ticket_draft");
 if (savedDraft) {
 try {
 const draft = JSON.parse(savedDraft);
 if (draft.problemType || draft.requesterName) {
 setNewTicket(prev => ({ ...prev, ...draft }));
 }
 } catch (e) {
 console.error("Failed to load draft", e);
 }
 }
 }, []);

 useEffect(() => {
 if (isAdding) {
 localStorage.setItem("it_ticket_draft", JSON.stringify(newTicket));
 }
 }, [newTicket, isAdding]);

 const filteredTickets = tickets.filter(ticket => {
 const searchLower = (searchTerm || ticketSearch).toLowerCase();
 
 const matchesStatus = filterStatus === "All" || ticket.status === filterStatus;
 const matchesPriority = filterPriority === "All" || ticket.priority === filterPriority;
 const matchesDept = filterDept === "All" || ticket.department === filterDept;
 const matchesAssigned = filterAssigned === "All" || ticket.assignedToName === filterAssigned;

 const matchesSearch = (searchTerm === "" && ticketSearch === "") ||
 ticket.id.toLowerCase().includes(searchLower) ||
 ticket.problemType.toLowerCase().includes(searchLower) ||
 ticket.requesterName.toLowerCase().includes(searchLower) ||
 ticket.status.toLowerCase().includes(searchLower) ||
 ticket.priority.toLowerCase().includes(searchLower);

 return matchesStatus && matchesPriority && matchesDept && matchesAssigned && matchesSearch;
 }).sort((a, b) => new Date(b.requestTime).getTime() - new Date(a.requestTime).getTime());

 const currentTickets = filteredTickets.filter(t => !isHistorical(t.requestTime));
 const historicalTickets = filteredTickets.filter(t => isHistorical(t.requestTime));

 const handleAddTicket = () => {
 if (isSavingTicket) return;
 if (!newTicket.problemType || !newTicket.requesterName) return;
 
 const ticket: Partial<ITTicket> = {
 problemType: newTicket.problemType!,
 priority: newTicket.priority as Priority,
 requestTime: new Date().toISOString(),
 requesterName: newTicket.requesterName!,
 requesterBranch: newTicket.requesterBranch || "Unknown",
 department: newTicket.department || "IT",
 description: newTicket.description || "",
 actions: [],
 status: Status.PENDING,
 };

 setIsSavingTicket(true);
 saveTicket(ticket).then(() => {
 setIsAdding(false);
 setNewTicket({ priority: Priority.MEDIUM, status: Status.PENDING });
 localStorage.removeItem("it_ticket_draft");
 }).catch(err => {
 console.error("Failed to save ticket", err);
 }).finally(() => {
 setIsSavingTicket(false);
 });
 };

 const handleAddAction = (ticketId: string) => {
 if (!newAction.trim()) return;
 
 const entry: ActionEntry = {
 timestamp: new Date().toISOString(),
 performer: auth.currentUser?.displayName || auth.currentUser?.email || "IT Agent",
 action: newAction.trim()
 };

 const targetTicket = tickets.find(t => t.id === ticketId);
 if (!targetTicket) return;

 const updatedTicket = {
 ...targetTicket,
 actions: [...targetTicket.actions, entry],
 status: targetTicket.status === Status.PENDING ? Status.IN_PROGRESS : targetTicket.status
 };

 saveTicket(updatedTicket).then(() => {
 setNewAction("");
 setSelectedTicket(updatedTicket);
 }).catch(err => {
 console.error("Failed to add action", err);
 });
 };

 const [assignedUser, setAssignedUser] = useState("");
 const [assignedUserName, setAssignedUserName] = useState("");
 const [editingPasswordId, setEditingPasswordId] = useState<string | null>(null);
 const [editingBranchId, setEditingBranchId] = useState<string | null>(null);

 const handleAssignTicket = async (ticketId: string, userId: string, userName: string) => {
 const targetTicket = tickets.find(t => t.id === ticketId);
 if (!targetTicket) return;

 const requestTime = new Date(targetTicket.requestTime).getTime();
 const assignmentTime = new Date().getTime();
 const responseTimeInMinutes = Math.round((assignmentTime - requestTime) / 60000);

 const updatedTicket = {
 ...targetTicket,
 assignedTo: userId,
 assignedToName: userName,
 responseTime: responseTimeInMinutes,
 status: Status.IN_PROGRESS,
 actions: [
 ...targetTicket.actions,
 {
 timestamp: new Date().toISOString(),
 performer: auth.currentUser?.displayName || auth.currentUser?.email || "Supervisor",
 action: `Ticket assigned to ${userName}. Response time: ${responseTimeInMinutes} mins.`
 }
 ]
 };

 try {
 await saveTicket(updatedTicket);
 setSelectedTicket(updatedTicket);

 // Update Daily KPI
 const today = format(new Date(), "yyyy-MM-dd");
 const logId = `${today}_${userId}`;
 const log = await getDailyLog(logId);
 const tasks = log?.tasks || {};
 tasks["it_support"] = (Number(tasks["it_support"]) || 0) + 1;
 
 await saveDailyLog({
 id: logId,
 date: today,
 userId: userId,
 tasks: tasks
 });
 } catch (err) {
 console.error("Failed to assign ticket or update KPI", err);
 }
 };
 const [showDeleteModal, setShowDeleteModal] = useState(false);
 const [ticketToDelete, setTicketToDelete] = useState<string | null>(null);

 const handleCompleteTicket = (ticketId: string) => {
 const targetTicket = tickets.find(t => t.id === ticketId);
 if (!targetTicket) return;

 const updatedTicket = {
 ...targetTicket,
 status: Status.COMPLETED,
 completedAt: new Date().toISOString()
 };

 saveTicket(updatedTicket).then(() => {
 setSelectedTicket(updatedTicket);
 }).catch(err => {
 console.error("Failed to complete ticket", err);
 });
 };

 const handleDeleteTicket = (ticketId: string) => {
 if (!isAdmin) return;
 setTicketToDelete(ticketId);
 setShowDeleteModal(true);
 };

 const confirmDeleteTicket = async () => {
 if (!ticketToDelete) return;
 try {
 await deleteTicket(ticketToDelete);
 setSelectedTicket(null);
 toast.success("IT Log record purged successfully.");
 } catch (err) {
 console.error("Failed to delete ticket", err);
 toast.error("Protocol Violation: Deletion failed.");
 } finally {
 setShowDeleteModal(false);
 setTicketToDelete(null);
 }
 };

 const handleExportTickets = () => {
 const data = filteredTickets.map(t => ({
 ID: String(filteredTickets.indexOf(t) + 1).padStart(5, '0'),
 Issue: t.problemType,
 Priority: t.priority,
 Requester: t.requesterName,
 Department: t.department || "-",
 "Assigned To": t.assignedToName || "-",
 Status: t.status,
 "Request Time": safeFormat(t.requestTime, "yyyy-MM-dd HH:mm:ss"),
 "Action History": t.actions.map(a => `[${safeFormat(a.timestamp, "HH:mm")}] ${a.performer}: ${a.action}`).join("; "),
 "Completed At": t.completedAt ? safeFormat(t.completedAt, "yyyy-MM-dd HH:mm:ss") : "-"
 }));

 const worksheet = utils.json_to_sheet(data);
 const workbook = utils.book_new();
 utils.book_append_sheet(workbook, worksheet, "IT Support Log");
 writeFile(workbook, `IT_Support_Log_${format(new Date(), "yyyyMMdd")}.xlsx`);
 };

 return (
 <div className="space-y-6">
 <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 enterprise-card p-6">
 <div>
 <h2 className="text-xl font-medium text-slate-800 dark:text-slate-100 dark:text-white tracking-tight flex items-center gap-2">
 <ClipboardList size={20} className="text-indigo-600" />
 IT Support Log (SOP-001)
 </h2>
 <p className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400 mt-1  font-medium tracking-[0.2em]">Ticketing & Resolution Tracking</p>
 </div>
 
 <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto items-center">
 <div className="relative w-full sm:w-64 group">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={14} />
 <input 
 type="text" 
 placeholder="Search tickets..." 
 value={ticketSearch}
 onChange={(e) => setTicketSearch(e.target.value)}
 className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all shadow-sm"
 />
 </div>
 <div className="flex gap-2 w-full sm:w-auto">
 <button 
 onClick={handleExportTickets}
 className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-medium hover:border-indigo-400 transition-all border border-slate-200 dark:border-slate-800 shadow-sm"
 >
 <Download size={14} /> Export
 </button>
 <button 
 onClick={() => setIsAdding(true)}
 className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-medium hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
 >
 <Plus size={14} /> New Entry
 </button>
 </div>
 </div>
 </div>

 {/* Enhanced Ticket Filtering */}
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 enterprise-card p-6">
 <div className="col-span-1">
 <SearchableDropdown 
 label="Status Cluster"
 placeholder="All Active Tickets"
 options={Object.values(Status)}
 value={filterStatus}
 onChange={setFilterStatus}
 icon={Activity}
 />
 </div>
 <div className="col-span-1">
 <SearchableDropdown 
 label="Priority Tier"
 placeholder="All Priority Levels"
 options={Object.values(Priority)}
 value={filterPriority}
 onChange={setFilterPriority}
 icon={AlertTriangle}
 />
 </div>
 <div className="col-span-1">
 <SearchableDropdown 
 label="Department View"
 placeholder="All Departments"
 options={settings.departments}
 value={filterDept}
 onChange={setFilterDept}
 icon={Users}
 />
 </div>
 <div className="col-span-1">
 <SearchableDropdown 
 label="Assigned Agent"
 placeholder="All Personnel"
 options={Array.from(new Set(tickets.map(t => t.assignedToName).filter(Boolean))) as string[]}
 value={filterAssigned}
 onChange={setFilterAssigned}
 icon={User}
 />
 </div>
 </div>

 <div className="enterprise-card overflow-hidden">
 {/* Desktop Table View */}
 <div className="hidden lg:block">
 <table className="w-full text-left">
 <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
 <tr className=" text-[#475569] dark:text-slate-300 font-medium text-xs hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
 <th className="px-4 py-3.5">DATE</th>
 <th className="px-4 py-3.5">REQUESTER</th>
 <th className="px-4 py-3.5 text-center">DEPT</th>
 <th className="px-4 py-3.5">ISSUE</th>
 <th className="px-4 py-3.5">PRIORITY</th>
 <th className="px-4 py-3.5">ACTION TAKEN</th>
 <th className="px-4 py-3.5 text-right">STATUS</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100">
 {[
 { label: "Active Support Logs", items: currentTickets },
 { label: "Historical Records (>30 days)", items: historicalTickets }
 ].map((group) => (
 <React.Fragment key={group.label}>
 {group.items.length > 0 && (
 <tr className="bg-slate-50/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
 <td colSpan={6} className="px-6 py-2 text-xs font-medium text-indigo-600 ">{group.label}</td>
 </tr>
 )}
 {group.items.map((ticket) => (
 <tr 
 key={ticket.id} 
 onClick={() => setSelectedTicket(ticket)}
 className="hover:bg-slate-50 transition-colors group cursor-pointer"
 >
 <td className="px-4 py-3.5">
 <p className="text-xs text-slate-600 dark:text-slate-300 font-medium ">{safeFormat(ticket.requestTime, "yyyy-MM-dd")}</p>
 <p className="text-xs text-slate-400 font-mono mt-0.5">{safeFormat(ticket.requestTime, "HH:mm:ss")}</p>
 </td>
 <td className="px-4 py-3.5">
 <span className="text-xs text-indigo-600 font-medium text-slate-500 dark:text-slate-400">{ticket.requesterName}</span>
 <p className="text-xs text-slate-400 font-mono mt-0.5">{formatId(ticket.id)}</p>
 </td>
 <td className="px-4 py-3.5 text-xs text-slate-500 dark:text-slate-400 font-medium ">
 {ticket.department || "-"}
 </td>
 <td className="px-4 py-3.5">
 <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 transition-colors line-clamp-1">{ticket.problemType}</p>
 </td>
 <td className="px-4 py-3.5">
 <span className={cn(
 "px-2 py-0.5 rounded text-xs font-medium border",
 ticket.priority === Priority.CRITICAL ? "bg-rose-50 text-rose-600 border-rose-100" : 
 ticket.priority === Priority.HIGH ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-slate-50 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800"
 )}>
 {ticket.priority}
 </span>
 </td>
 <td className="px-4 py-3.5">
 {ticket.actions.length > 0 ? (
 <div className="max-w-[200px]">
 <p className="text-xs text-slate-500 dark:text-slate-400 italic line-clamp-1 font-medium">"{ticket.actions[ticket.actions.length - 1].action}"</p>
 <p className="text-xs text-slate-400  font-medium mt-0.5 flex items-center gap-1">
 <Clock size={8} /> {safeFormat(ticket.actions[ticket.actions.length - 1].timestamp, "HH:mm")} • IT Agent
 </p>
 </div>
 ) : (
 <span className="text-xs text-slate-400 italic">Pending assigned...</span>
 )}
 </td>
 <td className="px-4 py-3.5 text-right">
 <div className="flex items-center justify-end gap-3">
 {isSupervisor && (
 <button 
 onClick={(e) => {
 e.stopPropagation();
 setAdvEditTicket(ticket);
 setIsAdvancedEditing(true);
 }}
 className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
 title="Advanced Edit (Supervisor Only)"
 >
 <Edit size={14} />
 </button>
 )}
 <span className={cn(
 "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium",
 ticket.status === Status.COMPLETED ? "bg-emerald-50 text-emerald-600" : 
 ticket.status === Status.IN_PROGRESS ? "bg-indigo-50 text-indigo-600" : "bg-slate-50 text-slate-400 italic"
 )}>
 {ticket.status}
 </span>
 </div>
 </td>
 </tr>
 ))}
 </React.Fragment>
 ))}
 </tbody>
 </table>
 </div>

 {/* Mobile Card View */}
 <div className="lg:hidden divide-y divide-slate-100">
 {filteredTickets.map((ticket) => (
 <button 
 key={ticket.id} 
 onClick={() => setSelectedTicket(ticket)}
 className="w-full text-left p-4 hover:bg-slate-50 transition-colors active:bg-slate-100"
 >
 <div className="flex justify-between items-start mb-2">
 <span className="text-xs font-mono font-medium text-slate-400">{formatId(ticket.id)}</span>
 <span className={cn(
 "px-2 py-0.5 rounded text-xs font-medium",
 ticket.status === Status.COMPLETED ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : 
 ticket.status === Status.IN_PROGRESS ? "bg-indigo-50 text-indigo-600 border border-indigo-100" : "bg-slate-50 text-slate-400 italic border border-slate-200 dark:border-slate-800"
 )}>
 {ticket.status}
 </span>
 </div>
 <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-2 line-clamp-2">{ticket.problemType}</p>
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <div className={cn(
 "w-2 h-2 rounded-full",
 ticket.priority === Priority.CRITICAL ? "bg-rose-500" : 
 ticket.priority === Priority.HIGH ? "bg-amber-500" : "bg-slate-300"
 )}></div>
 <span className="text-xs text-slate-400  font-medium tracking-widest">{ticket.requesterName}</span>
 </div>
 <div className="flex items-center gap-2 text-slate-400">
 <Clock size={12} />
 <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{safeFormat(ticket.requestTime, "HH:mm")}</span>
 </div>
 </div>
 </button>
 ))}
 </div>
 </div>

 <AnimatePresence>
 {isAdding && (
 <div 
 onClick={() => setIsAdding(false)}
 className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-0 sm:p-4"
 >
 <motion.div 
 initial={{ y: 20, opacity: 0, scale: 0.95 }}
 animate={{ y: 0, opacity: 1, scale: 1 }}
 exit={{ y: 20, opacity: 0, scale: 0.95 }}
 onClick={(e) => e.stopPropagation()}
 className="enterprise-modal p-6 sm:p-8 w-full h-full sm:h-auto sm:max-w-2xl md:max-w-3xl max-h-[90vh] rounded-none sm:rounded-3xl overflow-y-auto relative shadow-2xl"
 >
 <button 
 onClick={() => setIsAdding(false)}
 className="absolute right-6 top-6 p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors"
 >
 <X size={20} />
 </button>
 <h3 className="text-xl font-medium text-slate-800 dark:text-slate-100 mb-8 tracking-tight italic border-l-4 border-indigo-600 pl-4">System Node Registration</h3>
 <div className="space-y-6">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div>
 <label className="block text-xs font-medium text-slate-400 mb-2">Requester ID</label>
 <input 
 type="text" 
 value={newTicket.requesterName || ""}
 onChange={e => setNewTicket({...newTicket, requesterName: e.target.value})}
 placeholder="Staff identifier..." 
 className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
 />
 </div>
 <div>
 <label className="block text-xs font-medium text-slate-400 mb-2">Department</label>
 <select 
 value={newTicket.department || ""}
 onChange={e => setNewTicket({...newTicket, department: e.target.value})}
 className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
 >
 <option value="">Select Department</option>
 {settings.departments.map(dept => (
 <option key={dept} value={dept}>{dept}</option>
 ))}
 </select>
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div>
 <label className="block text-xs font-medium text-slate-400 mb-2">Branch / Store</label>
 <input 
 type="text" 
 value={newTicket.requesterBranch || ""}
 onChange={e => setNewTicket({...newTicket, requesterBranch: e.target.value})}
 placeholder="e.g. Branch 3, Office..." 
 className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
 />
 </div>
 <div>
 <label className="block text-xs font-medium text-slate-400 mb-2">Priority Classification</label>
 <select 
 onChange={e => setNewTicket({...newTicket, priority: e.target.value as Priority})}
 className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
 >
 <option value={Priority.LOW}>Low Intensity</option>
 <option value={Priority.MEDIUM}>Standard</option>
 <option value={Priority.HIGH}>Elevated</option>
 <option value={Priority.CRITICAL}>Critical Override</option>
 </select>
 </div>
 </div>

 <div>
 <label className="block text-xs font-medium text-slate-400 mb-2">Issue Diagnostic</label>
 <textarea 
 rows={3}
 value={newTicket.problemType || ""}
 onChange={e => setNewTicket({...newTicket, problemType: e.target.value})}
 placeholder="Brief summary..." 
 className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
 />
 </div>
 <div>
 <label className="block text-xs font-medium text-slate-400 mb-2">Detailed Description</label>
 <textarea 
 rows={3}
 value={newTicket.description || ""}
 onChange={e => setNewTicket({...newTicket, description: e.target.value})}
 placeholder="Full details of the issue..." 
 className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
 />
 </div>
 </div>
 <div className="flex flex-col sm:flex-row gap-3 mt-10">
 <button 
 onClick={() => setIsAdding(false)}
 disabled={isSavingTicket}
 className="w-full py-4 sm:py-3 px-4 bg-slate-100 text-slate-600 dark:text-slate-300 rounded-xl font-medium text-xs hover:bg-slate-200 transition-colors order-2 sm:order-1 disabled:opacity-50 disabled:cursor-not-allowed"
 >
 Terminate
 </button>
 <button 
 onClick={handleAddTicket}
 disabled={isSavingTicket}
 className="enterprise-btn-primary w-full py-4 sm:py-3 px-4 rounded-xl font-medium text-xs order-1 sm:order-2 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
 >
 {isSavingTicket ? (
 <>
 <RefreshCw size={14} className="animate-spin" />
 Saving...
 </>
 ) : (
 "Confirm Log"
 )}
 </button>
 </div>
 </motion.div>
 </div>
 )}

 {selectedTicket && (
 <div 
 onClick={() => setSelectedTicket(null)}
 className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-0 sm:p-4"
 >
 <motion.div 
 initial={{ y: 20, opacity: 0, scale: 0.95 }}
 animate={{ y: 0, opacity: 1, scale: 1 }}
 exit={{ y: 20, opacity: 0, scale: 0.95 }}
 onClick={(e) => e.stopPropagation()}
 className="enterprise-modal p-0 w-full h-full sm:h-auto sm:max-w-2xl rounded-none sm:rounded-3xl overflow-hidden flex flex-col sm:max-h-[85vh] shadow-2xl"
 >
 <div className="p-6 sm:p-8 border-b border-slate-100 bg-white dark:bg-slate-900 flex items-center justify-between shrink-0">
 <div className="flex-1 mr-4">
 <div className="flex items-center gap-3 mb-2">
 <span className="text-xs font-mono font-medium text-slate-400">{formatId(selectedTicket.id)}</span>
 <span className={cn(
 "px-2 py-0.5 rounded text-xs font-medium border",
 selectedTicket.priority === Priority.CRITICAL ? "bg-rose-50 text-rose-600 border-rose-100" : 
 selectedTicket.priority === Priority.HIGH ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-slate-50 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800"
 )}>
 {selectedTicket.priority} Priority
 </span>
 {isSupervisor && (
 <button 
 onClick={() => {
 setAdvEditTicket(selectedTicket);
 setIsAdvancedEditing(true);
 }}
 className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded text-xs font-medium hover:bg-indigo-600 hover:text-white transition-all ml-2"
 >
 <Settings size={10} /> Advanced Edit
 </button>
 )}
 </div>
 <h3 className="text-lg sm:text-xl font-medium text-slate-800 dark:text-slate-100 tracking-tight break-words whitespace-pre-wrap">{selectedTicket.problemType}</h3>
 </div>
 <button 
 onClick={() => setSelectedTicket(null)}
 className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors"
 >
 <X size={24} />
 </button>
 </div>

 <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 lg:py-8 space-y-8 custom-scrollbar bg-white dark:bg-slate-900">
 <section>
 <div className="grid grid-cols-2 gap-6 mb-8">
 <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
 <p className="text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1.5">
 <MapPin size={12} className="text-indigo-600" /> Requester Location
 </p>
 <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{selectedTicket.requesterBranch || "Central Office"}</p>
 </div>
 <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
 <p className="text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1.5">
 <User size={12} className="text-indigo-600" /> Assigned To
 </p>
 <p className="text-sm font-medium text-slate-800 dark:text-slate-100 italic">{selectedTicket.assignedToName || "Pending Assignment"}</p>
 </div>
 </div>

 {!selectedTicket.assignedTo && selectedTicket.status !== Status.COMPLETED && (
 <div className="mb-8 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
 <p className="text-xs font-medium text-indigo-600 mb-3">Assign Task to Agent</p>
 <div className="flex flex-wrap gap-2">
 {["IT Supervisor", "Merchandising Supervisor", "IT Digital Marketing"].map(staff => (
 <button 
 key={staff}
 onClick={() => handleAssignTicket(selectedTicket.id, staff.toLowerCase().replace(/\s+/g, '_'), staff)}
 className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-indigo-200 text-indigo-600 rounded-lg text-xs font-medium transition-all hover:bg-indigo-600 hover:text-white"
 >
 Assign to {staff}
 </button>
 ))}
 </div>
 </div>
 )}

 {selectedTicket.responseTime !== undefined && (
 <div className="mb-8 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-between">
 <p className="text-xs font-medium text-emerald-600 ">Supervisor KPI: Response Time</p>
 <p className="text-sm font-medium text-emerald-600">{selectedTicket.responseTime} mins</p>
 </div>
 )}

 <h4 className="text-xs font-medium text-slate-400 mb-4">Detailed Signal Data</h4>
 <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm text-slate-600 dark:text-slate-300 leading-relaxed italic mb-8">
 {selectedTicket.description || "No supplemental diagnostic data provided by node."}
 </div>

 <h4 className="text-xs font-medium text-slate-400 mb-6 flex items-center gap-2">
 <History size={14} className="text-indigo-600" />
 Action History Cluster
 </h4>
 <div className="space-y-6">
 {selectedTicket.actions.length === 0 ? (
 <div className="py-12 border-2 border-dashed border-slate-100 rounded-2xl flex flex-col items-center justify-center text-slate-300">
 <Bot size={32} strokeWidth={1} />
 <p className="text-xs font-medium mt-3 tracking-widest italic text-center">
 No diagnostic entries found.
 </p>
 </div>
 ) : (
 <div className="relative pl-6 space-y-8">
 <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-gradient-to-b from-indigo-500/30 via-slate-100 to-transparent"></div>
 {selectedTicket.actions.map((entry, idx) => (
 <div key={idx} className="relative">
 <div className="absolute -left-[27px] top-1.5 w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(79,70,229,0.4)]"></div>
 <div className="flex justify-between items-start">
 <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-[80%]">{entry.action}</p>
 <span className="text-xs font-mono text-slate-400 font-medium">{safeFormat(entry.timestamp, "HH:mm")}</span>
 </div>
 <p className="text-xs text-slate-400 font-medium text-slate-500 dark:text-slate-400 mt-2 px-2 py-0.5 bg-slate-50 w-fit rounded">Operator: {entry.performer}</p>
 </div>
 ))}
 </div>
 )}
 </div>
 </section>
 </div>

 {selectedTicket.status !== Status.COMPLETED && (
 <div className="p-8 border-t border-slate-100 bg-slate-50 space-y-4">
 <textarea 
 value={newAction}
 onChange={(e) => setNewAction(e.target.value)}
 placeholder="Input systematic action taken..."
 className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none shadow-sm"
 rows={2}
 />
 <div className="flex gap-4">
 <button 
 onClick={() => handleAddAction(selectedTicket.id)}
 disabled={!newAction.trim()}
 className="enterprise-btn-primary flex-1 py-3 px-6 rounded-xl text-xs font-medium text-slate-500 dark:text-slate-400 disabled:opacity-50"
 >
 Record Action
 </button>
 <button 
 onClick={() => handleCompleteTicket(selectedTicket.id)}
 className="py-3 px-6 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-emerald-100 transition-all"
 >
 Close Node
 </button>
 {isAdmin && (
 <button 
 onClick={() => handleDeleteTicket(selectedTicket.id)}
 className="py-3 px-6 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-rose-100 transition-all"
 >
 Delete Node
 </button>
 )}
 </div>
 </div>
 )}
 </motion.div>
 </div>
 )}
 </AnimatePresence>

 <ConfirmationModal 
 isOpen={showDeleteModal}
 onClose={() => {
 setShowDeleteModal(false);
 setTicketToDelete(null);
 }}
 onConfirm={confirmDeleteTicket}
 title="Protocol: Record Deletion"
 message="Are you sure you want to permanently remove this IT Support Log record? This action will void the digital audit trail for this specific request."
 confirmText="Confirm Void"
 />

 {/* SUPERVISOR ADVANCED EDIT MODAL */}
 <AnimatePresence>
 {isAdvancedEditing && advEditTicket && (
 <SupervisorEditModal 
 ticket={advEditTicket}
 isOpen={isAdvancedEditing}
 onClose={() => {
 setIsAdvancedEditing(false);
 setAdvEditTicket(null);
 }}
 onSave={async (updatedTicket) => {
 try {
 await saveTicket(updatedTicket);
 // Update local list
 setTickets(tickets.map(t => t.id === updatedTicket.id ? updatedTicket : t));
 // Update selected viewing ticket if it's the same
 if (selectedTicket?.id === updatedTicket.id) {
 setSelectedTicket(updatedTicket);
 }
 setIsAdvancedEditing(false);
 setAdvEditTicket(null);
 toast.success("Ticket override successful. Master database updated.");
 } catch (error) {
 console.error("Advanced edit failed", error);
 toast.error("Override failed: Integrity check error.");
 }
 }}
 settings={settings}
 />
 )}
 </AnimatePresence>
 </div>
 );
}

function SupervisorEditModal({ 
 ticket, 
 isOpen, 
 onClose, 
 onSave, 
 settings 
}: { 
 ticket: ITTicket, 
 isOpen: boolean, 
 onClose: () => void, 
 onSave: (updated: ITTicket) => Promise<void>,
 settings: SystemSettings
}) {
 const [formData, setFormData] = useState<ITTicket>({ ...ticket });
 const [isSaving, setIsSaving] = useState(false);

 const handleSave = async () => {
 setIsSaving(true);
 try {
 await onSave(formData);
 } finally {
 setIsSaving(false);
 }
 };

 const handleActionEdit = (index: number, newText: string) => {
 const updatedActions = [...formData.actions];
 updatedActions[index] = { ...updatedActions[index], action: newText };
 setFormData({ ...formData, actions: updatedActions });
 };

 const toDatetimeLocal = (isoString?: string) => {
 if (!isoString) return "";
 try {
 const date = new Date(isoString);
 if (isNaN(date.getTime())) return "";
 const pad = (n: number) => String(n).padStart(2, '0');
 return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
 } catch {
 return "";
 }
 };

 const fromDatetimeLocal = (localString: string) => {
 if (!localString) return "";
 try {
 return new Date(localString).toISOString();
 } catch {
 return "";
 }
 };

 return (
 <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[60] p-4">
 <motion.div 
 initial={{ opacity: 0, scale: 0.9, y: 20 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.9, y: 20 }}
 className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800"
 >
 <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-indigo-600 sm:bg-white dark:bg-slate-900 dark:sm:bg-slate-900">
 <div className="flex items-center gap-4">
 <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600">
 <ShieldCheck size={24} />
 </div>
 <div>
 <h3 className="text-xl font-medium text-slate-800 dark:text-slate-100 dark:text-white leading-none">Supervisor Override</h3>
 <p className="text-xs font-medium text-slate-400 mt-2 ">{formatId(ticket.id)} • Advanced Logic Control</p>
 </div>
 </div>
 <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400">
 <X size={20} />
 </button>
 </div>

 <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 lg:py-8 space-y-8 custom-scrollbar">
 {/* Core Identity */}
 <div className="grid grid-cols-2 gap-6">
 <div className="space-y-2">
 <label className="text-xs font-medium text-slate-400 px-1">Problem Node</label>
 <input 
 type="text" 
 value={formData.problemType}
 onChange={e => setFormData({ ...formData, problemType: e.target.value })}
 className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none font-medium"
 />
 </div>
 <div className="space-y-2">
 <label className="text-xs font-medium text-slate-400 px-1">Current Status</label>
 <select 
 value={formData.status}
 onChange={e => setFormData({ ...formData, status: e.target.value as Status })}
 className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none font-medium text-indigo-600"
 >
 {Object.values(Status).map(s => <option key={s} value={s}>{s}</option>)}
 </select>
 </div>
 </div>

 {/* Location & Requester */}
 <div className="grid grid-cols-2 gap-6">
 <div className="space-y-2">
 <label className="text-xs font-medium text-slate-400 px-1">Requester Name</label>
 <input 
 type="text" 
 value={formData.requesterName}
 onChange={e => setFormData({ ...formData, requesterName: e.target.value })}
 className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
 />
 </div>
 <div className="space-y-2">
 <label className="text-xs font-medium text-slate-400 px-1">Department</label>
 <input 
 type="text" 
 value={formData.department || ""}
 onChange={e => setFormData({ ...formData, department: e.target.value })}
 placeholder="Assign department..."
 className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
 />
 </div>
 </div>

 {/* Temporal Overrides */}
 <div className="grid grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-950/40 p-4 rounded-3xl border border-slate-100 dark:border-slate-850">
 <div className="space-y-2">
 <label className="text-xs font-medium text-slate-500 dark:text-slate-400 px-1">Request / Assign Date & Time</label>
 <input 
 type="datetime-local" 
 value={toDatetimeLocal(formData.requestTime)}
 onChange={e => {
 const iso = fromDatetimeLocal(e.target.value);
 if (iso) {
 setFormData({ ...formData, requestTime: iso });
 }
 }}
 className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none font-mono"
 />
 </div>
 <div className="space-y-2">
 <label className="text-xs font-medium text-slate-500 dark:text-slate-400 px-1">Completed Date & Time</label>
 <input 
 type="datetime-local" 
 value={toDatetimeLocal(formData.completedAt)}
 onChange={e => {
 const iso = fromDatetimeLocal(e.target.value);
 setFormData({ ...formData, completedAt: iso || undefined });
 }}
 className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none font-mono"
 />
 </div>
 </div>

 {/* Extra Diagnostics */}
 <div className="space-y-2">
 <label className="text-xs font-medium text-slate-400 px-1">Baseline Description</label>
 <textarea 
 value={formData.description || ""}
 onChange={e => setFormData({ ...formData, description: e.target.value })}
 rows={3}
 className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none resize-none"
 />
 </div>

 {/* Action History Editing */}
 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <label className="text-xs font-medium text-slate-400 px-1">Action Log History</label>
 <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded font-medium ">Supervisor Override Active</span>
 </div>
 <div className="space-y-3">
 {formData.actions.map((action, idx) => (
 <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 group">
 <div className="flex items-center justify-between mb-2">
 <span className="text-xs font-medium text-indigo-500 ">{action.performer}</span>
 <span className="text-xs font-mono text-slate-400">{safeFormat(action.timestamp, "yyyy-MM-dd HH:mm")}</span>
 </div>
 <textarea 
 value={action.action}
 onChange={e => handleActionEdit(idx, e.target.value)}
 className="w-full bg-transparent text-xs text-slate-600 dark:text-slate-300 focus:outline-none resize-none leading-relaxed"
 rows={2}
 />
 </div>
 ))}
 {formData.actions.length === 0 && (
 <div className="text-center py-6 text-slate-400 text-xs italic">No actions recorded on this node.</div>
 )}
 </div>
 </div>
 </div>

 <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex gap-4">
 <button 
 onClick={onClose}
 className="flex-1 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl text-xs font-medium  hover:bg-slate-100 transition-all"
 >
 Cancel
 </button>
 <button 
 onClick={handleSave}
 disabled={isSaving}
 className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl text-xs font-medium shadow-xl shadow-indigo-600/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
 >
 {isSaving ? "Executing Protocol..." : "Commit Override"}
 </button>
 </div>
 </motion.div>
 </div>
 );
}

function SearchableSelect({ label, value, onChange, options, placeholder }: { label: string, value: string, onChange: (val: string) => void, options: { id: string, label: string }[], placeholder: string }) {
 const [isOpen, setIsOpen] = useState(false);
 const [search, setSearch] = useState("");
 const containerRef = useRef<HTMLDivElement>(null);

 const filtered = options.filter(o => 
 o.label.toLowerCase().includes(search.toLowerCase()) || 
 o.id.toLowerCase().includes(search.toLowerCase())
 );

 useEffect(() => {
 const handleClickOutside = (event: MouseEvent) => {
 if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
 setIsOpen(false);
 }
 };
 document.addEventListener("mousedown", handleClickOutside);
 return () => document.removeEventListener("mousedown", handleClickOutside);
 }, []);

 return (
 <div className="relative" ref={containerRef}>
 <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">{label}</label>
 <div 
 onClick={() => setIsOpen(!isOpen)}
 className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-100 cursor-pointer flex justify-between items-center"
 >
 <span className={cn(!value && "text-slate-400")}>
 {value ? options.find(o => o.id === value)?.label || value : placeholder}
 </span>
 <ChevronDown size={14} className={cn("transition-transform", isOpen && "rotate-180")} />
 </div>
 
 {isOpen && (
 <div className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
 <div className="p-2 border-b border-slate-100">
 <div className="relative">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
 <input 
 type="text"
 autoFocus
 value={search}
 onChange={e => setSearch(e.target.value)}
 placeholder="Search computer..."
 className="w-full pl-9 pr-4 py-2 bg-slate-50 rounded-lg text-xs focus:outline-none"
 />
 </div>
 </div>
 <div className="max-h-48 overflow-y-auto py-2">
 {filtered.length === 0 ? (
 <div className="px-4 py-2 text-xs text-slate-400 text-center font-medium ">No computers found</div>
 ) : filtered.map(o => (
 <button
 key={o.id}
 onClick={() => {
 onChange(o.id);
 setIsOpen(false);
 setSearch("");
 }}
 className={cn(
 "w-full text-left px-4 py-2.5 text-xs hover:bg-slate-50 transition-colors flex flex-col",
 value === o.id && "bg-indigo-50 text-indigo-600"
 )}
 >
 <span className="font-medium">{o.label}</span>
 <span className="text-xs opacity-60">{o.id}</span>
 </button>
 ))}
 </div>
 </div>
 )}
 </div>
 );
}

function AssetsModule({ assets, setAssets, searchTerm, isAdmin, settings }: { assets: ITAsset[], setAssets: React.Dispatch<React.SetStateAction<ITAsset[]>>, searchTerm: string, isAdmin: boolean, settings: SystemSettings }) {
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

function SecurityModule({ backups, setBackups, requests, setRequests, searchTerm, isAdmin }: { 
 backups: BackupLog[], 
 setBackups: (b: BackupLog[]) => void,
 requests: CCTVRequest[],
 setRequests: (r: CCTVRequest[]) => void,
 searchTerm: string,
 isAdmin: boolean
}) {
 const [isAddingRequest, setIsAddingRequest] = useState(false);
 const [newRequest, setNewRequest] = useState<Partial<CCTVRequest>>({
 approvalStatus: "Pending"
 });

 const filteredRequests = requests.filter(req => {
 const searchLower = searchTerm.toLowerCase();
 return (
 req.id.toLowerCase().includes(searchLower) ||
 req.requester.toLowerCase().includes(searchLower) ||
 req.reason.toLowerCase().includes(searchLower) ||
 (req.approvedBy?.toLowerCase() || "").includes(searchLower) ||
 req.approvalStatus.toLowerCase().includes(searchLower)
 );
 });

 const handlePerformBackup = () => {
 const newBackup: Partial<BackupLog> = {
 date: format(new Date(), "yyyy-MM-dd"),
 storageType: "External Drive",
 status: "Success",
 performer: "IT User"
 };
 saveBackup(newBackup).catch(err => console.error("Backup trigger failed", err));
 };

 const handleAddRequest = () => {
 if (!newRequest.requester || !newRequest.reason || !newRequest.dateOfFootage) return;

 const request: Partial<CCTVRequest> = {
 requester: newRequest.requester!,
 reason: newRequest.reason!,
 dateOfFootage: newRequest.dateOfFootage!,
 approvalStatus: "Pending"
 };

 saveCCTVRequest(request).then(() => {
 setIsAddingRequest(false);
 setNewRequest({ approvalStatus: "Pending" });
 }).catch(err => console.error("Failed to add CCTV request", err));
 };

 const handleExportCCTV = () => {
 const data = requests.map(r => ({
 ID: r.id,
 Requester: r.requester,
 "Footage Date": r.dateOfFootage,
 Reason: r.reason,
 Status: r.approvalStatus,
 "Approved By": r.approvedBy || "-"
 }));

 const worksheet = utils.json_to_sheet(data);
 const workbook = utils.book_new();
 utils.book_append_sheet(workbook, worksheet, "CCTV Requests");
 writeFile(workbook, `CCTV_Request_Log_${format(new Date(), "yyyyMMdd")}.xlsx`);
 };

 return (
 <div className="space-y-6 lg:space-y-8 pb-20 lg:pb-0">
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
 {/* Backup Logs */}
 <div className="space-y-4 lg:space-y-6">
 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 enterprise-card p-5 lg:p-6">
 <div>
 <h2 className="text-base lg:text-lg font-medium text-slate-800 dark:text-slate-100 flex items-center gap-2 tracking-tight">
 <HardDrive size={18} className="text-indigo-600" />
 Data Integrity Cluster
 </h2>
 </div>
 {isAdmin && (
 <button 
 onClick={handlePerformBackup}
 className="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-indigo-700 transition-all shadow-sm"
 >
 Trigger Backup
 </button>
 )}
 </div>
 <div className="enterprise-card overflow-hidden">
 {/* Desktop Table */}
 <div className="hidden sm:block overflow-x-auto">
 <table className="w-full text-left">
 <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
 <tr className="text-slate-600 dark:text-slate-300 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
 <th className="px-4 py-3.5">Date</th>
 <th className="px-4 py-3.5">Node Path</th>
 <th className="px-4 py-3.5 text-center">Status</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100">
 {backups.map(log => (
 <tr key={log.id} className="hover:bg-slate-50 transition-colors">
 <td className="px-4 py-3.5 text-xs font-semibold text-slate-600 dark:text-slate-300 font-mono italic">{log.date}</td>
 <td className="px-4 py-3.5 text-xs font-medium text-slate-500 dark:text-slate-400 ">{log.storageType}</td>
 <td className="px-4 py-3.5 text-center">
 <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-emerald-600">
 <CheckCircle2 size={12} /> {log.status}
 </span>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 {/* Mobile View */}
 <div className="sm:hidden divide-y divide-slate-100">
 {backups.map(log => (
 <div key={log.id} className="p-4 flex flex-col gap-2">
 <div className="flex justify-between items-center">
 <span className="text-xs font-semibold text-slate-300 font-mono italic">{log.date}</span>
 <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-emerald-400 bg-emerald-500/5">
 <CheckCircle2 size={10} /> {log.status}
 </span>
 </div>
 <span className="text-xs font-medium text-slate-500 dark:text-slate-400 ">{log.storageType}</span>
 </div>
 ))}
 </div>
 </div>
 </div>

 {/* CCTV Security Notice */}
 <div className="bg-red-500/10 text-white p-6 lg:p-8 rounded-3xl border border-red-500/20 relative overflow-hidden flex flex-col justify-center h-fit lg:h-auto">
 <AlertTriangle className="absolute -right-6 -top-6 w-24 lg:w-32 h-24 lg:h-32 text-red-500 opacity-20" />
 <div className="flex items-center gap-3 mb-4 lg:mb-6 relative z-10">
 <Camera size={24} className="text-red-400" />
 <h2 className="text-lg lg:text-xl font-medium tracking-tight">Security Protocol</h2>
 </div>
 <p className="text-xs lg:text-xs text-red-100/70 leading-relaxed mb-6 lg:mb-8 font-medium relative z-10 max-w-sm">
 CCTV review requires multi-stage authorization. 
 Any unauthorized review, copying, or sharing of footage is strictly PROHIBITED and will result in disciplinary action.
 </p>
 <div className="relative z-10">
 {isAdmin ? (
 <button 
 onClick={() => setIsAddingRequest(true)}
 className="w-full sm:w-auto px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-medium text-slate-500 dark:text-slate-400 transition-all shadow-lg shadow-red-900/40"
 >
 Submit Footage Request
 </button>
 ) : (
 <p className="text-xs text-red-400 font-medium text-slate-500 dark:text-slate-400 italic border border-red-500/20 p-3 rounded-xl bg-red-500/5">
 Contact IT Supervisor for footage review.
 </p>
 )}
 </div>
 </div>
 </div>

 {/* CCTV Requests Table */}
 <div className="space-y-4 lg:space-y-6">
 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 enterprise-card p-5 lg:p-6">
 <div>
 <h2 className="text-base lg:text-lg font-medium text-slate-800 dark:text-slate-100 flex items-center gap-2 tracking-tight">
 <Camera size={18} className="text-rose-500" />
 CCTV Request Log
 </h2>
 <p className="text-xs text-slate-500 dark:text-slate-400 font-medium text-slate-500 dark:text-slate-400 mt-1">Management Review Required</p>
 </div>
 <button 
 onClick={handleExportCCTV}
 className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-medium  hover:bg-slate-100 transition-all border border-slate-200 dark:border-slate-800 shadow-sm"
 >
 <Download size={16} /> Export Logs
 </button>
 </div>
 <div className="enterprise-card overflow-hidden">
 {/* Desktop Table */}
 <div className="hidden lg:block overflow-x-auto">
 <table className="w-full text-left">
 <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
 <tr className="text-slate-600 dark:text-slate-300 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
 <th className="px-4 py-3.5">ID</th>
 <th className="px-4 py-3.5">Requester</th>
 <th className="px-4 py-3.5">Footage Date</th>
 <th className="px-4 py-3.5">Reason</th>
 <th className="px-4 py-3.5 text-right">Approval</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100">
 {filteredRequests.length === 0 ? (
 <tr>
 <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic text-sm">
 No matching footage requests found
 </td>
 </tr>
 ) : (
 filteredRequests.map(req => (
 <tr key={req.id} className="hover:bg-slate-50 transition-colors group">
 <td className="px-4 py-3.5 text-xs font-mono font-medium text-slate-500 dark:text-slate-400">{req.id}</td>
 <td className="px-4 py-3.5 text-xs font-medium text-slate-800 dark:text-slate-100 ">{req.requester}</td>
 <td className="px-4 py-3.5 text-xs text-slate-500 dark:text-slate-400 font-mono italic">{req.dateOfFootage}</td>
 <td className="px-4 py-3.5 text-xs text-slate-500 dark:text-slate-400 italic max-w-xs truncate">{req.reason}</td>
 <td className="px-4 py-3.5 text-right">
 <span className={cn(
 "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border",
 req.approvalStatus === "Approved" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : 
 req.approvalStatus === "Denied" ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-amber-50 text-amber-600 border-amber-100"
 )}>
 {req.approvalStatus}
 </span>
 </td>
 </tr>
 ))
 )}
 </tbody>
 </table>
 </div>
 {/* Mobile View */}
 <div className="lg:hidden divide-y divide-slate-100">
 {filteredRequests.length === 0 ? (
 <div className="p-12 text-center text-slate-400 italic text-xs">
 No matching footage requests found
 </div>
 ) : (
 filteredRequests.map(req => (
 <div key={req.id} className="p-4 space-y-3 text-slate-600 dark:text-slate-300">
 <div className="flex justify-between items-start">
 <span className="text-xs font-mono font-medium text-slate-400">{req.id}</span>
 <span className={cn(
 "px-2 py-0.5 rounded text-xs font-medium border",
 req.approvalStatus === "Approved" ? "text-emerald-600 border-emerald-100" : 
 req.approvalStatus === "Denied" ? "text-rose-600 border-rose-100" : "text-amber-600 border-amber-100"
 )}>
 {req.approvalStatus}
 </span>
 </div>
 <div>
 <p className="text-xs font-medium text-slate-800 dark:text-slate-100 ">{req.requester}</p>
 <p className="text-xs text-slate-500 dark:text-slate-400 font-mono italic mt-1">Footage on: {req.dateOfFootage}</p>
 </div>
 <p className="text-xs text-slate-500 dark:text-slate-400 italic line-clamp-2 bg-slate-50 p-2 rounded-lg border border-slate-100">{req.reason}</p>
 </div>
 ))
 )}
 </div>
 </div>
 </div>

 <AnimatePresence>
 {isAddingRequest && (
 <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-0 sm:p-4">
 <motion.div 
 initial={{ y: 20, opacity: 0 }}
 animate={{ y: 0, opacity: 1 }}
 exit={{ y: 20, opacity: 0 }}
 className="glass-panel p-6 sm:p-8 w-full h-full sm:h-auto sm:max-w-md shadow-2xl rounded-none sm:rounded-3xl overflow-y-auto"
 >
 <h3 className="text-xl font-medium text-white mb-6 lg:mb-8 tracking-tight flex items-center gap-2">
 <Camera size={20} className="text-red-400" />
 Evidence Review Request
 </h3>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 lg:gap-6">
 <div>
 <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Requester Name</label>
 <input 
 type="text" 
 onChange={e => setNewRequest({...newRequest, requester: e.target.value})}
 placeholder="Staff identifier..." 
 className="w-full px-4 py-3.5 bg-white dark:bg-slate-900/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:bg-white dark:bg-slate-900/10"
 />
 </div>
 <div>
 <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Date of Footage</label>
 <input 
 type="date"
 onChange={e => setNewRequest({...newRequest, dateOfFootage: e.target.value})}
 className="w-full px-4 py-3.5 bg-white dark:bg-slate-900/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:bg-white dark:bg-slate-900/10"
 />
 </div>
 </div>
 <div>
 <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Justification / Reason</label>
 <textarea 
 rows={4}
 onChange={e => setNewRequest({...newRequest, reason: e.target.value})}
 placeholder="Provide specific reason for review..." 
 className="w-full px-4 py-3.5 bg-white dark:bg-slate-900/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:bg-white dark:bg-slate-900/10 resize-none"
 />
 </div>
 <div className="flex flex-col sm:flex-row gap-3 mt-10">
 <button 
 onClick={() => setIsAddingRequest(false)}
 className="w-full py-4 sm:py-3 px-4 bg-white dark:bg-slate-900/5 text-slate-400 rounded-xl font-medium text-xs hover:bg-white dark:bg-slate-900/10 transition-colors order-2 sm:order-1"
 >
 Cancel
 </button>
 <button 
 onClick={handleAddRequest}
 className="w-full py-4 sm:py-3 px-4 bg-red-600 text-white rounded-xl font-medium text-xs hover:bg-red-500 transition-all shadow-lg shadow-red-900/40 order-1 sm:order-2"
 >
 Submit Request
 </button>
 </div>
 </motion.div>
 </div>
 )}
 </AnimatePresence>
 </div>
 );
}

function PurchasesModule({ 
 purchases, 
 setPurchases, 
 assets, 
 setAssets,
 isAdmin
}: { 
 purchases: PurchaseRecord[], 
 setPurchases: React.Dispatch<React.SetStateAction<PurchaseRecord[]>>,
 assets: ITAsset[],
 setAssets: React.Dispatch<React.SetStateAction<ITAsset[]>>,
 isAdmin: boolean
}) {
 const [isAdding, setIsAdding] = useState(false);
 const [isEditing, setIsEditing] = useState(false);
 const [isDeleting, setIsDeleting] = useState(false);
 const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: 'purchase' } | null>(null);
 const [editingId, setEditingId] = useState<string | null>(null);
 const [newPurchase, setNewPurchase] = useState<Partial<PurchaseRecord>>({
 status: "Received",
 currency: "MMK",
 quantity: 1,
 syncToInventory: true
 });

 const combinedPurchases = React.useMemo(() => {
 const list = [...purchases];
 
 // Find assets that aren't linked to a purchase record ID
 const unlinkedAssets = assets.filter(a => {
 const isHistorical = a.purchaseDate && a.purchaseDate !== "Unknown" && a.purchaseDate !== "";
 const isNotLinked = !a.purchaseRecordId;
 return isHistorical && isNotLinked;
 });
 
 const groups: Record<string, ITAsset[]> = {};
 unlinkedAssets.forEach(a => {
 const key = `${a.purchaseDate}_${a.model}`;
 if (!groups[key]) groups[key] = [];
 groups[key].push(a);
 });

 Object.values(groups).forEach(group => {
 const first = group[0];
 const exists = purchases.find(p => p.date === first.purchaseDate && p.item === first.model);
 if (!exists) {
 list.push({
 id: `HIST-${first.id}`,
 item: first.model,
 category: first.category,
 price: Number(first.purchasePrice) || 0,
 currency: "MMK",
 quantity: group.length,
 date: first.purchaseDate!,
 supplier: "Legacy Data",
 status: "Received"
 });
 }
 });

 return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
 }, [purchases, assets]);

 const handleAdd = async () => {
 if (!newPurchase.item || !newPurchase.price || !newPurchase.date) return;
 
 const purchaseData: Partial<PurchaseRecord> = {
 id: editingId || undefined,
 item: newPurchase.item,
 category: newPurchase.category || "Other",
 price: Number(newPurchase.price),
 currency: newPurchase.currency || "MMK",
 quantity: Number(newPurchase.quantity) || 1,
 date: newPurchase.date,
 supplier: newPurchase.supplier || "Unknown",
 supplierContact: newPurchase.supplierContact,
 status: newPurchase.status as any,
 remarks: newPurchase.remarks,
 serialNumber: newPurchase.serialNumber,
 syncToInventory: newPurchase.syncToInventory ?? true
 };

 try {
 await savePurchaseRecord(purchaseData);
 setIsAdding(false);
 setIsEditing(false);
 setEditingId(null);
 setNewPurchase({ status: "Received", currency: "MMK", quantity: 1 });
 } catch (error) {
 console.error("Failed to save purchase record", error);
 alert("Failed to save purchase record. Check SOP-001 logs.");
 }
 };

 const handleEdit = (record: PurchaseRecord) => {
 setEditingId(record.id);
 setIsEditing(true);
 setNewPurchase({
 item: record.item,
 category: record.category,
 price: record.price,
 currency: record.currency,
 quantity: record.quantity,
 date: record.date,
 supplier: record.supplier,
 supplierContact: record.supplierContact,
 status: record.status,
 remarks: record.remarks
 });
 setIsAdding(true);
 };

 const totalSpent = combinedPurchases.reduce((sum, p) => sum + (p.price * p.quantity), 0);
 const handleExportPurchases = () => {
 const data = combinedPurchases.map(p => ({
 "Record ID": p.id,
 "Date": p.date,
 "Item": p.item,
 "Category": p.category,
 "Supplier": p.supplier,
 "Quantity": p.quantity,
 "Unit Price": p.price,
 "Total Price": p.price * p.quantity,
 "Currency": p.currency,
 "Status": p.status,
 }));
 
 const ws = utils.json_to_sheet(data);
 const wb = utils.book_new();
 utils.book_append_sheet(wb, ws, "Purchases");
 writeFile(wb, `IT_Purchases_Export_${format(new Date(), 'yyyyMMdd')}.xlsx`);
 };

 const handleDeletePurchase = (recordId: string, e: React.MouseEvent) => {
 e.stopPropagation();
 setDeleteTarget({ id: recordId, type: 'purchase' });
 };

 const executeDelete = async () => {
 if (!deleteTarget || deleteTarget.type !== 'purchase') return;
 const recordId = deleteTarget.id;

 const tid = toast.loading("Voiding procurement record...");
 setIsDeleting(true);
 try {
 await deletePurchaseRecord(recordId);
 setPurchases(prev => prev.filter(p => p.id !== recordId));
 toast.success("Procurement record voided.", { id: tid });
 } catch (error) {
 console.error("Delete failed", error);
 toast.error("Protocol Violation: Deletion request rejected.", { id: tid });
 }
 
 setIsDeleting(false);
 setDeleteTarget(null);
 };

 return (
 <div className="space-y-6">
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div className="enterprise-card p-6 border-l-4 border-indigo-500">
 <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 font-sans">Total Procurement</div>
 <div className="text-2xl font-medium text-slate-900 dark:text-white font-mono">{totalSpent.toLocaleString()} <span className="text-xs text-indigo-600">MMK</span></div>
 </div>
 <div className="enterprise-card p-6 border-l-4 border-amber-500">
 <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 font-sans">Transits</div>
 <div className="text-2xl font-medium text-slate-900 dark:text-white font-mono">{combinedPurchases.filter(p => p.status === "Transit").length} <span className="text-xs text-amber-400  font-sans">Items</span></div>
 </div>
 <div className="enterprise-card p-6 border-l-4 border-emerald-500 flex items-center justify-between font-sans">
 <div>
 <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Total Records</div>
 <div className="text-2xl font-medium text-slate-900 dark:text-white font-mono">{combinedPurchases.length}</div>
 </div>
 <div className="flex items-center gap-2">
 <button 
 onClick={handleExportPurchases}
 className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center hover:bg-emerald-100 transition-all text-emerald-600 border border-emerald-200"
 title="Export Purchases"
 >
 <Download size={16} />
 </button>
 {isAdmin && (
 <button 
 onClick={() => setIsAdding(true)}
 className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center hover:bg-indigo-700 transition-all text-white shadow-sm"
 >
 <Plus size={20} />
 </button>
 )}
 </div>
 </div>
 </div>

 <div className="enterprise-card overflow-hidden">
 {/* Desktop Table View */}
 <div className="hidden lg:block overflow-x-auto">
 <table className="w-full text-left font-sans">
 <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
 <tr className=" text-[#475569] dark:text-slate-300 font-medium text-xs hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
 <th className="px-4 py-3.5">RECORD DATE</th>
 <th className="px-4 py-3.5">ITEM NAME</th>
 <th className="px-4 py-3.5">QTY</th>
 <th className="px-4 py-3.5">PRICE</th>
 <th className="px-4 py-3.5">STATUS (INVENTORY)</th>
 <th className="px-4 py-3.5">VENDOR INFO</th>
 <th className="px-4 py-3.5 text-right">LOCATION</th>
 {isAdmin && <th className="px-4 py-3.5 text-center">ACTIONS</th>}
 </tr>
 </thead>
 <tbody className="divide-y divide-white/5">
 {combinedPurchases.length === 0 ? (
 <tr>
 <td colSpan={6} className="px-6 py-12 text-center">
 <div className="flex flex-col items-center gap-3">
 <AlertTriangle className="text-amber-500" size={32} />
 <p className="text-sm text-slate-400">No Purchase Records found.</p>
 <p className="text-xs text-amber-500 font-medium text-slate-500 dark:text-slate-400 leading-loose text-center px-4">
 SOP-001 Protocol: Please upload the latest Data Export (CSV/JSON)<br/>
 or Trigger the Firestore Sync Function. (ဒေတာများစုစည်းနေဆဲဖြစ်ပါသည်။)
 </p>
 </div>
 </td>
 </tr>
 ) : combinedPurchases.map(p => {
 const linkedAssets = assets.filter(a => a.purchaseRecordId === p.id || (a.purchaseDate === p.date && a.model === p.item));
 const currentStatuses = Array.from(new Set(linkedAssets.map(a => a.status)));
 const locations = Array.from(new Set(linkedAssets.map(a => a.location || a.department).filter(Boolean)));

 return (
 <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
 <td className="px-4 py-3.5">
 <span className="text-xs font-mono text-slate-500 dark:text-slate-400 font-medium">{p.date}</span>
 </td>
 <td className="px-4 py-3.5">
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-50 border border-indigo-100 text-indigo-600 capitalize">
 {p.item.charAt(0)}
 </div>
 <div>
 <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{p.item}</p>
 <p className="text-xs text-slate-400 font-mono tracking-tighter ">{p.id}</p>
 </div>
 </div>
 </td>
 <td className="px-4 py-3.5">
 <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{p.quantity}</span>
 </td>
 <td className="px-4 py-3.5">
 <span className="text-sm font-medium text-emerald-600 font-mono">{(p.price * p.quantity).toLocaleString()} {p.currency}</span>
 </td>
 <td className="px-4 py-3.5">
 <div className="flex flex-wrap gap-1">
 {currentStatuses.length > 0 ? currentStatuses.map(s => (
 <span key={s} className={cn(
 "text-xs font-medium text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded border",
 s === "Active" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-50 text-slate-400 border-slate-200 dark:border-slate-800"
 )}>{s}</span>
 )) : (
 <span className="text-xs font-medium text-slate-300 italic">Syncing...</span>
 )}
 </div>
 </td>
 <td className="px-4 py-3.5">
 <div className="flex flex-col">
 <span className="text-xs font-medium text-slate-800 dark:text-slate-100">{p.supplier}</span>
 <span className="text-xs text-slate-400 font-mono tracking-tighter">{p.supplierContact || "No Contact"}</span>
 </div>
 </td>
 <td className="px-4 py-3.5 text-right">
 <div className="flex flex-col items-end">
 {locations.length > 0 ? locations.map(l => (
 <span key={l} className="text-xs font-medium text-slate-400 ">{l}</span>
 )) : (
 <span className="text-xs font-medium text-slate-600 dark:text-slate-300 italic">Unknown</span>
 )}
 </div>
 </td>
 {isAdmin && (
 <td className="px-4 py-3.5 text-center">
 <div className="flex items-center justify-center gap-2">
 <button
 onClick={() => handleEdit(p)}
 className="p-2 text-cyan-400 hover:bg-cyan-400/10 rounded-lg transition-colors"
 title="Edit Record"
 >
 <History size={14} />
 </button>
 <button 
 disabled={isDeleting || p.id.startsWith('HIST-')}
 onClick={(e) => handleDeletePurchase(p.id, e)}
 className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors disabled:opacity-30"
 title={p.id.startsWith('HIST-') ? "Cannot delete legacy data generated from assets" : "Delete Record"}
 >
 <Trash2 size={14} />
 </button>
 </div>
 </td>
 )}
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>

 {/* Mobile Card View */}
 <div className="lg:hidden divide-y divide-white/5">
 {combinedPurchases.length === 0 ? (
 <div className="px-6 py-12 text-center">
 <p className="text-xs text-slate-500 dark:text-slate-400">No Purchase Records found.</p>
 </div>
 ) : combinedPurchases.map(p => {
 const linkedAssets = assets.filter(a => a.purchaseRecordId === p.id || (a.purchaseDate === p.date && a.model === p.item));
 const currentStatuses = Array.from(new Set(linkedAssets.map(a => a.status)));
 return (
 <div key={p.id} className="p-4 hover:bg-white dark:bg-slate-900/5 active:bg-white dark:bg-slate-900/10 transition-colors flex flex-col gap-3">
 <div className="flex justify-between items-start">
 <div className="flex flex-col gap-2">
 <span className="text-xs font-mono font-medium text-slate-300">{p.date}</span>
 {isAdmin && (
 <div className="flex gap-2">
 <button
 onClick={() => handleEdit(p)}
 className="w-fit p-1 text-cyan-400 hover:bg-cyan-400/10 rounded transition-colors flex items-center gap-2"
 >
 <History size={12} />
 <span className="text-xs font-medium">Edit</span>
 </button>
 <button 
 disabled={isDeleting || p.id.startsWith('HIST-')}
 onClick={(e) => handleDeletePurchase(p.id, e)}
 className="w-fit p-1 text-rose-500 hover:bg-rose-500/10 rounded transition-colors disabled:opacity-30 flex items-center gap-2"
 >
 <Trash2 size={12} />
 <span className="text-xs font-medium">Delete</span>
 </button>
 </div>
 )}
 </div>
 <div className="flex flex-wrap gap-1 justify-end">
 {currentStatuses.length > 0 ? currentStatuses.map(s => (
 <span key={s} className="text-xs font-medium text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">{s}</span>
 )) : (
 <span className="text-xs font-medium text-slate-600 dark:text-slate-300 italic border border-white/10 px-1.5 py-0.5 rounded">Syncing...</span>
 )}
 </div>
 </div>
 <div>
 <p className="text-sm font-medium text-white mb-0.5">{p.item}</p>
 <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tracking-tighter ">{p.id} • {p.supplier} {p.supplierContact ? `(${p.supplierContact})` : ""}</p>
 </div>
 <div className="flex justify-between items-end pt-1 border-t border-white/5">
 <div className="flex items-center gap-2">
 <span className="text-xs text-slate-500 dark:text-slate-400 font-medium text-slate-500 dark:text-slate-400">Qty: {p.quantity}</span>
 </div>
 <span className="text-sm font-medium text-emerald-400 font-mono">{(p.price * p.quantity).toLocaleString()} {p.currency}</span>
 </div>
 </div>
 );
 })}
 </div>
 </div>

 <AnimatePresence>
 {isAdding && (
 <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[70] p-4 font-sans">
 <motion.div 
 initial={{ scale: 0.95, opacity: 0 }}
 animate={{ scale: 1, opacity: 1 }}
 exit={{ scale: 0.95, opacity: 0 }}
 className="glass-panel w-full max-w-lg p-8 space-y-6 shadow-2xl border border-white/20"
 >
 <div className="flex justify-between items-center">
 <h3 className="text-lg font-medium text-white tracking-tight ">{isEditing ? "Update Purchase Entry" : "New Purchase Entry"}</h3>
 <button onClick={() => { setIsAdding(false); setIsEditing(false); setEditingId(null); setNewPurchase({ status: "Received", currency: "MMK", quantity: 1 }); }} className="p-2 hover:bg-white dark:bg-slate-900/10 rounded-lg text-slate-500 dark:text-slate-400"><X size={20} /></button>
 </div>

 <div className="space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div className="col-span-2">
 <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Item Name (Model)</label>
 <input 
 type="text" 
 value={newPurchase.item || ""}
 onChange={e => setNewPurchase({...newPurchase, item: e.target.value})}
 className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
 placeholder="e.g. Logitech Mouse..."
 />
 </div>
 <div>
 <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Serial Number (Primary/Start)</label>
 <input 
 type="text" 
 value={newPurchase.serialNumber || ""}
 onChange={e => setNewPurchase({...newPurchase, serialNumber: e.target.value})}
 className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
 placeholder="e.g. SN12345..."
 />
 </div>
 <div>
 <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Category</label>
 <input 
 type="text" 
 value={newPurchase.category || ""}
 onChange={e => setNewPurchase({...newPurchase, category: e.target.value})}
 className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
 placeholder="e.g. Network"
 />
 </div>
 <div>
 <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Supplier</label>
 <input 
 type="text" 
 value={newPurchase.supplier || ""}
 onChange={e => setNewPurchase({...newPurchase, supplier: e.target.value})}
 className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
 placeholder="e.g. KMD"
 />
 </div>
 <div>
 <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Supplier Contact</label>
 <input 
 type="text" 
 value={newPurchase.supplierContact || ""}
 onChange={e => setNewPurchase({...newPurchase, supplierContact: e.target.value})}
 className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
 placeholder="e.g. 09..."
 />
 </div>
 </div>

 <div className="grid grid-cols-3 gap-4">
 <div>
 <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Qty</label>
 <input 
 type="number" 
 value={newPurchase.quantity || 1}
 onChange={e => setNewPurchase({...newPurchase, quantity: Number(e.target.value)})}
 className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
 />
 </div>
 <div className="col-span-2">
 <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Unit Price (MMK)</label>
 <input 
 type="number" 
 value={newPurchase.price || ""}
 onChange={e => setNewPurchase({...newPurchase, price: Number(e.target.value)})}
 className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
 placeholder="0"
 />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Purchase Date</label>
 <input 
 type="date" 
 value={newPurchase.date || ""}
 onChange={e => setNewPurchase({...newPurchase, date: e.target.value})}
 className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
 />
 </div>
 <div>
 <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Inventory Sync</label>
 <button 
 onClick={() => setNewPurchase({...newPurchase, syncToInventory: !newPurchase.syncToInventory})}
 className={cn(
 "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-xs font-medium text-slate-500 dark:text-slate-400 transition-all",
 newPurchase.syncToInventory 
 ? "bg-indigo-50 text-indigo-600 border-indigo-200" 
 : "bg-slate-50 text-slate-400 border-slate-200 dark:border-slate-800"
 )}
 >
 {newPurchase.syncToInventory ? <CheckCircle2 size={14} /> : <Ban size={14} />}
 {newPurchase.syncToInventory ? "Sync Active" : "Sync Disabled"}
 </button>
 </div>
 </div>
 </div>

 <div className="flex gap-4 pt-4">
 <button 
 onClick={() => { setIsAdding(false); setIsEditing(false); setEditingId(null); setNewPurchase({ status: "Received", currency: "MMK", quantity: 1, syncToInventory: true }); }}
 className="flex-1 py-4 border border-white/10 text-slate-400 rounded-xl text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-white dark:bg-slate-900/5 transition-all"
 >
 Cancel
 </button>
 <button 
 onClick={handleAdd}
 className="flex-[2] py-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-medium text-slate-500 dark:text-slate-400 shadow-lg shadow-cyan-900/40 transition-all font-sans font-medium"
 >
 {isEditing ? "Update Entry" : "Record Entry"}
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
 title="Ledger Entry Void"
 message={`SOP-001 Procurement Alert: Are you sure you want to void purchase record ${deleteTarget?.id}? Linked inventory assets will remain but the record will be purged from the ledger.`}
 confirmText="Confirm Void"
 />
 </div>
 );
}

function MarketingModule({ plans, setPlans, isAdmin }: { plans: ContentPlan[], setPlans: (p: ContentPlan[]) => void, isAdmin: boolean }) {
 const [isAddingPlan, setIsAddingPlan] = useState(false);

 return (
 <div className="space-y-6 lg:space-y-8 pb-20 lg:pb-0">
 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 enterprise-card p-6 lg:p-10">
 <div className="max-w-md">
 <h2 className="text-xl lg:text-2xl font-medium text-slate-800 dark:text-slate-100 tracking-tight ">Strategy & Ops Pipeline</h2>
 <p className="text-xs lg:text-xs text-slate-400 mt-2 lg:mt-3 leading-relaxed font-medium">
 Verify: Product • Price • Promo Period • Contact ID
 </p>
 </div>
 <div className="w-full sm:w-auto p-4 lg:p-5 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-center justify-between sm:justify-start gap-4 lg:gap-5">
 <div className="flex items-center gap-3 lg:gap-5">
 <div className="w-10 h-10 lg:w-14 lg:h-14 bg-indigo-600 text-white rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
 <Megaphone size={20} className="lg:w-7 lg:h-7" />
 </div>
 <div>
 <p className="text-xs lg:text-xs font-medium text-slate-400 ">Active nodes</p>
 <p className="text-xl lg:text-2xl font-medium text-slate-800 dark:text-slate-100">{plans.filter(p => p.status === "Draft").length}</p>
 </div>
 </div>
 <div className="flex items-center gap-4">
 {isAdmin && (
 <>
 <button 
 onClick={() => setIsAddingPlan(true)}
 className="hidden lg:flex items-center gap-2 py-2 px-4 bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 rounded-xl text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-cyan-600 hover:text-white transition-all"
 >
 <Plus size={16} /> Add Strategy
 </button>
 <button 
 onClick={() => setIsAddingPlan(true)}
 className="p-2 bg-white dark:bg-slate-900/5 hover:bg-white dark:bg-slate-900/10 rounded-lg text-cyan-400 lg:hidden"
 >
 <Plus size={24} />
 </button>
 </>
 )}
 </div>
 </div>
 </div>

 <AnimatePresence>
 {isAddingPlan && (
 <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-0 sm:p-4">
 <motion.div 
 initial={{ y: 20, opacity: 0 }}
 animate={{ y: 0, opacity: 1 }}
 exit={{ y: 20, opacity: 0 }}
 className="glass-panel p-6 sm:p-8 w-full h-full sm:h-auto sm:max-w-md shadow-2xl rounded-none sm:rounded-3xl overflow-y-auto"
 >
 <h3 className="text-xl font-medium text-white mb-8 tracking-tight flex items-center gap-2">
 <Megaphone size={20} className="text-cyan-400" />
 New Content Blueprint
 </h3>
 <div className="space-y-6">
 <div>
 <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Platform</label>
 <select className="w-full px-4 py-3.5 bg-slate-900 border border-white/10 rounded-xl text-sm text-white focus:outline-none">
 <option>Facebook</option>
 <option>Viber</option>
 <option>TikTok</option>
 </select>
 </div>
 <div>
 <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Product / Topic</label>
 <input 
 type="text" 
 placeholder="Campaign title..." 
 className="w-full px-4 py-3.5 bg-white dark:bg-slate-900/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:bg-white dark:bg-slate-900/10"
 />
 </div>
 <div>
 <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Promotion Details</label>
 <textarea 
 rows={3}
 placeholder="Price, duration, special offers..." 
 className="w-full px-4 py-3.5 bg-white dark:bg-slate-900/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:bg-white dark:bg-slate-900/10 resize-none"
 />
 </div>
 </div>
 <div className="flex flex-col sm:flex-row gap-3 mt-10">
 <button 
 onClick={() => setIsAddingPlan(false)}
 className="w-full py-4 sm:py-3 px-4 bg-white dark:bg-slate-900/5 text-slate-400 rounded-xl font-medium text-xs hover:bg-white dark:bg-slate-900/10 transition-colors order-2 sm:order-1"
 >
 Cancel
 </button>
 <button 
 onClick={() => setIsAddingPlan(false)}
 className="w-full py-4 sm:py-3 px-4 bg-cyan-600 text-white rounded-xl font-medium text-xs hover:bg-cyan-500 transition-all shadow-lg shadow-cyan-900/40 order-1 sm:order-2"
 >
 Initialize Strategy
 </button>
 </div>
 </motion.div>
 </div>
 )}
 </AnimatePresence>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
 {plans.map(plan => (
 <div key={plan.id} className="glass-card p-6 lg:p-8 group hover:border-cyan-500/40 transition-all duration-300">
 <div className="flex justify-between items-center mb-6 lg:mb-8">
 <span className={cn(
 "px-2.5 py-0.5 lg:px-3 lg:py-1 rounded border text-xs lg:text-xs font-medium text-slate-500 dark:text-slate-400",
 plan.platform === "Facebook" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
 plan.platform === "Viber" ? "bg-purple-500/10 text-purple-400 border-purple-500/20" : "bg-white dark:bg-slate-900/5 text-slate-400 border-white/10"
 )}>
 {plan.platform}
 </span>
 <span className="text-xs lg:text-xs font-medium text-amber-400  flex items-center gap-2 tracking-widest">
 <Clock size={12} className="animate-pulse" /> {plan.status}
 </span>
 </div>
 
 <h4 className="text-lg lg:text-xl font-medium text-white tracking-tight group-hover:text-cyan-400 transition-colors ">{plan.productName}</h4>
 <div className="mt-6 lg:mt-8 space-y-3 lg:space-y-4">
 <div className="flex items-center gap-4 p-3 lg:p-4 bg-white dark:bg-slate-900/5 rounded-2xl border border-white/5">
 <span className="text-xs lg:text-xs font-medium text-slate-500 dark:text-slate-400 w-16 lg:w-20 shrink-0">Price Unit</span>
 <span className="text-xs lg:text-sm font-semibold text-slate-200">{plan.price}</span>
 </div>
 <div className="flex items-center gap-4 p-3 lg:p-4 bg-white dark:bg-slate-900/5 rounded-2xl border border-white/5">
 <span className="text-xs lg:text-xs font-medium text-slate-500 dark:text-slate-400 w-16 lg:w-20 shrink-0">Duration</span>
 <span className="text-xs lg:text-sm font-semibold text-slate-200">{plan.promotionPeriod}</span>
 </div>
 </div>

 {isAdmin && (
 <div className="mt-8 lg:mt-10 flex flex-col sm:flex-row gap-3 lg:gap-4">
 <button className="flex-1 py-4 sm:py-3.5 px-6 bg-cyan-600 text-white rounded-xl text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-cyan-500 transition-all shadow-lg shadow-cyan-900/40">
 Commit & Dispatch
 </button>
 <button className="flex-1 py-4 sm:py-3.5 px-6 bg-white dark:bg-slate-900/5 text-slate-400 rounded-xl text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-white dark:bg-slate-900/10 transition-colors">
 Modify
 </button>
 </div>
 )}
 </div>
 ))}
 {isAdmin && (
 <button 
 onClick={() => setIsAddingPlan(true)}
 className="border-2 border-dashed border-white/10 rounded-[2rem] lg:rounded-[2.5rem] p-8 lg:p-12 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 hover:border-cyan-500/40 hover:text-cyan-400 transition-all group bg-white dark:bg-slate-900/5 backdrop-blur-sm shadow-xl"
 >
 <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-xl lg:rounded-2xl flex items-center justify-center bg-white dark:bg-slate-900/5 group-hover:bg-cyan-500/10 border border-white/5 transition-all mb-4 lg:mb-6">
 <Plus size={24} className="lg:w-7 lg:h-7" />
 </div>
 <p className="font-medium text-xs lg:text-sm tracking-tight ">New Content Blueprint</p>
 <p className="text-xs lg:text-xs  font-medium mt-2 opacity-40 tracking-widest">SOP-001 Protocol</p>
 </button>
 )}
 </div>
 </div>
 );
}

function FileManagerModule({ isAdmin, quota, setQuota }: { isAdmin: boolean, quota: {limit: string, usage: string} | null, setQuota: (q: {limit: string, usage: string} | null) => void }) {
 const [files, setFiles] = useState<DriveFile[]>([]);
 const [isLoading, setIsLoading] = useState(true);
 const [isUploading, setIsUploading] = useState(false);
 const [editingId, setEditingId] = useState<string | null>(null);
 const [newName, setNewName] = useState("");
 const [searchQuery, setSearchQuery] = useState("");
 
 // Navigation State
 const [currentFolderId, setCurrentFolderId] = useState<string>(""); 
 const [navigationStack, setNavigationStack] = useState<{id: string, name: string}[]>([]);

 const [uploadProgress, setUploadProgress] = useState(0);
 const [dragActive, setDragActive] = useState(false);

 const fetchFiles = async (folderId?: string) => {
 setIsLoading(true);
 try {
 // Fetch Files from Google Drive
 const data = await fetchStorageFiles(folderId || currentFolderId);
 setFiles(data);
 
 // Also update quota
 const quotaData = await fetchStorageQuota();
 setQuota(quotaData);
 } catch (err) {
 console.error("Fetch failed", err);
 } finally {
 setIsLoading(false);
 }
 };

 useEffect(() => {
 fetchFiles(currentFolderId);
 }, [currentFolderId]);

 const handleFolderClick = (folder: DriveFile) => {
 setNavigationStack(prev => [...prev, { id: currentFolderId, name: folder.name.slice(0, 10) + (folder.name.length > 10 ? '...' : '') }]);
 setCurrentFolderId(folder.id);
 };

 const handleBack = () => {
 const newStack = [...navigationStack];
 const previous = newStack.pop();
 if (previous !== undefined) {
 setNavigationStack(newStack);
 setCurrentFolderId(previous.id);
 }
 };

 const processUpload = async (file: File) => {
 setIsUploading(true);
 setUploadProgress(0);
 
 const formData = new FormData();
 formData.append("file", file);
 if (currentFolderId) {
 formData.append("folderId", currentFolderId);
 }

 try {
 // Artificial progress for UI since fetch doesn't support upload progress natively
 const progressInterval = setInterval(() => {
 setUploadProgress(prev => (prev >= 90 ? 90 : prev + 10));
 }, 300);

 const token = auth.currentUser ? await auth.currentUser.getIdToken() : "";
 const response = await fetch("/api/drive/upload", {
 method: "POST",
 headers: {
 "Authorization": `Bearer ${token}`
 },
 body: formData,
 });

 clearInterval(progressInterval);

 if (!response.ok) {
 throw new Error(`Upload failed with status ${response.status}`);
 }
 
 setUploadProgress(100);
 setTimeout(() => {
 setIsUploading(false);
 setUploadProgress(0);
 fetchFiles(currentFolderId);
 }, 500);
 } catch (error) {
 console.error("Upload error", error);
 setIsUploading(false);
 }
 };

 const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (file) processUpload(file);
 };

 const handleDrag = (e: React.DragEvent) => {
 e.preventDefault();
 e.stopPropagation();
 if (e.type === "dragenter" || e.type === "dragover") {
 setDragActive(true);
 } else if (e.type === "dragleave") {
 setDragActive(false);
 }
 };

 const handleDrop = (e: React.DragEvent) => {
 e.preventDefault();
 e.stopPropagation();
 setDragActive(false);
 if (e.dataTransfer.files && e.dataTransfer.files[0]) {
 processUpload(e.dataTransfer.files[0]);
 }
 };

 const handleRename = async (id: string) => {
 // Firebase storage doesn't support rename natively without copy/delete
 alert("Rename is not supported in this version.");
 setEditingId(null);
 };

 const [confirmTarget, setConfirmTarget] = useState<{ id: string, onConfirm: () => void, message: string, title?: string, confirmText?: string } | null>(null);

 const handleDelete = (id: string) => {
 setConfirmTarget({
 id,
 message: "Are you sure you want to delete this file?",
 onConfirm: async () => {
 setConfirmTarget(null);
 try {
 const pathSuffix = currentFolderId ? `/${currentFolderId}` : '';
 await deleteStorageFile(`uploads${pathSuffix}/${id}`);
 fetchFiles();
 } catch (err) {
 console.error("Delete failed", err);
 }
 }
 });
 };

 const filteredFiles = files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
 const foldersList = filteredFiles.filter(f => f.mimeType === "application/vnd.google-apps.folder");

 return (
 <div className="flex flex-col lg:flex-row gap-8 min-h-[800px]">
 {/* Main Content Area */}
 <div className="flex-1 space-y-8 order-2 lg:order-1">
 
 {/* Header & Search */}
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
 <div>
 <h1 className="text-3xl font-medium text-slate-800 dark:text-slate-100 tracking-tight">Cloud Files</h1>
 <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage your pharmacy documents and assets securely.</p>
 </div>
 
 <div className="flex items-center gap-3">
 <button 
 className="p-3 bg-white dark:bg-slate-900 hover:bg-slate-50 text-slate-700 dark:text-slate-200 rounded-2xl flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 transition-all border border-slate-200 dark:border-slate-800 shadow-sm"
 >
 <Plus size={18} />
 <span>New Folder</span>
 </button>
 <label className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 cursor-pointer transition-all shadow-md">
 {isUploading ? <RefreshCw size={18} className="animate-spin" /> : <Upload size={18} />}
 <span>Upload</span>
 <input type="file" className="hidden" onChange={handleUpload} disabled={isUploading} />
 </label>
 </div>
 </div>

 {/* Drag and Drop Zone */}
 <div 
 className={`relative w-full py-8 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center transition-all ${dragActive ? 'border-indigo-500 bg-indigo-50/50 scale-[1.02]' : 'border-slate-300 bg-white dark:bg-slate-900 hover:bg-slate-50'}`}
 onDragEnter={handleDrag}
 onDragLeave={handleDrag}
 onDragOver={handleDrag}
 onDrop={handleDrop}
 >
 {isUploading ? (
 <div className="flex flex-col items-center w-full max-w-sm px-8">
 <RefreshCw size={32} className="animate-spin text-indigo-500 mb-4" />
 <div className="w-full bg-slate-200 rounded-full h-3 mb-3 overflow-hidden shadow-inner">
 <div className="bg-indigo-600 h-full transition-all duration-300 ease-out" style={{ width: `${uploadProgress}%` }}></div>
 </div>
 <span className="text-sm font-medium text-slate-600 dark:text-slate-300 ">{uploadProgress}% Uploaded</span>
 <p className="text-xs text-slate-400 mt-1 italic">Please wait while the file is automatically routed to the correct folder...</p>
 </div>
 ) : (
 <>
 <Upload size={40} className={`mb-4 ${dragActive ? 'text-indigo-500' : 'text-slate-300'}`} />
 <p className="text-lg font-medium text-slate-800 dark:text-slate-100">Drag & Drop files here</p>
 <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Videos will go to TikTok_Videos, PSDs to Photoshop_Files, Images to Viber_Photos</p>
 </>
 )}
 </div>

 {/* Quick Access Folders Grid */}
 <div>
 <div className="flex items-center justify-between mb-4">
 <h3 className="text-sm font-medium text-slate-800 dark:text-slate-100 flex items-center gap-2">
 <Layers size={16} className="text-indigo-600" />
 Quick Access
 </h3>
 <div className="flex items-center gap-2">
 {navigationStack.length > 0 && (
 <button 
 onClick={handleBack}
 className="px-3 py-1 bg-white dark:bg-slate-900 hover:bg-slate-50 text-xs font-medium text-slate-500 dark:text-slate-400 rounded-lg border border-slate-200 dark:border-slate-800"
 >
 Back
 </button>
 )}
 </div>
 </div>
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
 {isLoading ? (
 Array(4).fill(0).map((_, i) => (
 <div key={i} className="h-24 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 animate-pulse" />
 ))
 ) : foldersList.length > 0 ? (
 foldersList.slice(0, 4).map((folder) => (
 <div 
 key={folder.id}
 onClick={() => handleFolderClick(folder)}
 className="group relative p-5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-[2rem] transition-all cursor-pointer overflow-hidden shadow-sm hover:shadow-md"
 >
 <div className="flex items-start justify-between">
 <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
 <Folder size={20} fill="currentColor" fillOpacity={0.2} />
 </div>
 <button className="p-1 text-slate-400 hover:text-slate-600 dark:text-slate-300 relative z-10">
 <MoreVertical size={16} />
 </button>
 </div>
 <div className="mt-4">
 <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{folder.name}</p>
 <p className="text-xs text-slate-400  font-medium tracking-widest mt-1">Folder</p>
 </div>
 </div>
 ))
 ) : (
 <div className="col-span-full py-8 text-center bg-slate-50 rounded-[2rem] border border-dashed border-slate-200 dark:border-slate-800">
 <p className="text-slate-400 text-xs  font-medium tracking-widest italic">No folders found here.</p>
 </div>
 )}
 
 {/* Add New Folder Card Button */}
 <button className="flex flex-col items-center justify-center p-5 bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-300 hover:bg-indigo-50/30 rounded-[2rem] transition-all group">
 <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-colors">
 <Plus size={20} />
 </div>
 <p className="text-xs font-medium text-slate-400 mt-2 ">Add New Folder</p>
 </button>
 </div>
 </div>

 {/* Search & Results */}
 <div className="space-y-6">
 <div className="flex flex-col sm:flex-row items-center gap-4">
 <div className="relative flex-1 w-full">
 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
 <input 
 type="text"
 value={searchQuery}
 onChange={e => setSearchQuery(e.target.value)}
 placeholder="Search by file name..."
 className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-sm"
 />
 </div>
 <div className="flex items-center gap-3 shrink-0">
 <button className="p-4 bg-white dark:bg-slate-900 hover:bg-slate-50 text-slate-400 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all focus:ring-2 focus:ring-indigo-500/10">
 <Activity size={18} />
 </button>
 <button onClick={() => fetchFiles()} className="p-4 bg-white dark:bg-slate-900 hover:bg-slate-50 text-slate-400 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all focus:ring-2 focus:ring-indigo-500/10 active:scale-95">
 <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
 </button>
 </div>
 </div>

 <div className="enterprise-card overflow-hidden">
 <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
 <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400 ">All Files & Folders</h3>
 <div className="flex gap-4">
 <button className="text-xs font-medium text-indigo-600 hover:text-indigo-700 ">Sort By</button>
 <button className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-100 ">Filter</button>
 </div>
 </div>
 
 <div className="overflow-x-auto">
 <table className="w-full text-left border-collapse">
 <thead>
 <tr className="bg-slate-50/30 text-slate-600 dark:text-slate-300 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
 <th className="px-4 py-3.5">File Name</th>
 <th className="px-4 py-3.5">Time Added</th>
 <th className="px-4 py-3.5">Size</th>
 <th className="px-4 py-3.5">Location</th>
 <th className="px-4 py-3.5 text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100">
 {isLoading ? (
 Array(5).fill(0).map((_, i) => (
 <tr key={i} className="animate-pulse">
 <td className="px-4 py-3.5"><div className="h-4 w-32 bg-slate-100 rounded"></div></td>
 <td className="px-4 py-3.5"><div className="h-4 w-24 bg-slate-100 rounded"></div></td>
 <td className="px-4 py-3.5"><div className="h-4 w-16 bg-slate-100 rounded"></div></td>
 <td className="px-4 py-3.5"><div className="h-4 w-20 bg-slate-100 rounded"></div></td>
 <td className="px-4 py-3.5"><div className="h-4 w-8 bg-slate-100 ml-auto rounded"></div></td>
 </tr>
 ))
 ) : filteredFiles.length === 0 ? (
 <tr>
 <td colSpan={5} className="py-24 text-center">
 <HardDrive size={48} className="mx-auto text-slate-200 mb-4" />
 <p className="text-slate-500 dark:text-slate-400 font-medium text-slate-500 dark:text-slate-400 text-xs">No entries found.</p>
 </td>
 </tr>
 ) : (
 filteredFiles.map((file) => {
 const isFolder = file.mimeType === "application/vnd.google-apps.folder";
 return (
 <tr key={file.id} className="group hover:bg-slate-50 transition-colors">
 <td className="px-4 py-3.5">
 <div className="flex items-center gap-4">
 <div className={cn(
 "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
 isFolder ? "bg-amber-50 text-amber-600" : "bg-indigo-50 text-indigo-600"
 )}>
 {isFolder ? <Folder size={20} /> : <FileText size={20} />}
 </div>
 <div className="min-w-0">
 {editingId === file.id ? (
 <div className="flex items-center gap-2">
 <input 
 value={newName} 
 onChange={e => setNewName(e.target.value)}
 className="bg-white dark:bg-slate-900 border border-indigo-500 rounded px-2 py-1 text-xs text-slate-800 dark:text-slate-100"
 autoFocus
 onKeyDown={(e) => {
 if (e.key === 'Enter') handleRename(file.id);
 if (e.key === 'Escape') setEditingId(null);
 }}
 />
 <button onClick={() => handleRename(file.id)} className="text-emerald-600">
 <Check size={16} />
 </button>
 <button onClick={() => setEditingId(null)} className="text-slate-400">
 <X size={16} />
 </button>
 </div>
 ) : (
 <>
 {isFolder ? (
 <button 
 onClick={() => handleFolderClick(file)}
 className="text-sm font-medium text-slate-800 dark:text-slate-100 hover:text-indigo-600 transition-colors text-left block truncate max-w-[200px]"
 >
 {file.name}
 </button>
 ) : (
 <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate max-w-[200px]">{file.name}</p>
 )}
 <p className="text-xs text-slate-400 font-mono mt-1">{formatId(file.id)}</p>
 </>
 )}
 </div>
 </div>
 </td>
 <td className="px-4 py-3.5">
 <p className="text-xs font-medium text-slate-500 dark:text-slate-400 ">{safeFormat(file.createdAt, "MMM d, HH:mm")}</p>
 </td>
 <td className="px-4 py-3.5">
 <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
 {isFolder ? "--" : formatStorage(file.size)}
 </p>
 </td>
 <td className="px-4 py-3.5">
 <div className="flex items-center gap-2 text-slate-400 group-hover:text-indigo-600 transition-colors">
 <Folder size={12} />
 <span className="text-xs font-medium text-slate-500 dark:text-slate-400">DRIVE</span>
 </div>
 </td>
 <td className="px-4 py-3.5">
 <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
 {!isFolder && (
 <a 
 href={file.webContentLink || file.webViewLink} 
 target="_blank" 
 rel="noopener noreferrer"
 className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
 >
 <Download size={16} />
 </a>
 )}
 <button 
 onClick={() => { setEditingId(file.id); setNewName(file.name); }}
 className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
 >
 <Edit2 size={16} />
 </button>
 {isAdmin && (
 <button 
 onClick={() => handleDelete(file.id)}
 className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
 >
 <Trash2 size={16} />
 </button>
 )}
 </div>
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
 </div>

 {/* Sidebar - Storage & Info */}
 <div className="lg:w-80 space-y-6 order-1 lg:order-2">
 {/* Storage Overview Widget */}
 <div className="enterprise-card p-8 relative overflow-hidden group">
 <h3 className="text-sm font-medium text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
 <PieChart size={16} className="text-indigo-600" />
 File Breakdown
 </h3>
 
 {/* Mock Chart Visualization */}
 <div className="relative w-48 h-48 mx-auto mb-8">
 {quota ? (() => {
 const usage = Number(quota.usage) || 0;
 const limit = Number(quota.limit) || 2199023255552;
 const percent = Math.min(1, usage / limit);
 const offset = 502 * (1 - percent);
 
 return (
 <>
 <svg className="w-full h-full transform -rotate-90">
 <circle cx="96" cy="96" r="80" stroke="currentColor" strokeWidth="16" fill="transparent" className="text-slate-100" />
 <circle 
 cx="96" cy="96" r="80" stroke="currentColor" strokeWidth="16" fill="transparent" 
 strokeDasharray="502" 
 strokeDashoffset={isNaN(offset) ? 502 : offset} 
 className={cn(
 percent > 0.9 ? "text-rose-500" : "text-indigo-600"
 )} 
 />
 </svg>
 <div className="absolute inset-0 flex flex-col items-center justify-center">
 <p className="text-3xl font-medium text-slate-800 dark:text-slate-100 tracking-tighter">
 {(percent * 100).toFixed(1)}%
 </p>
 <p className="text-xs text-slate-400 font-medium text-slate-500 dark:text-slate-400 mt-1">Full</p>
 </div>
 </>
 );
 })() : (
 <div className="flex items-center justify-center h-full">
 <RefreshCw className="animate-spin text-slate-200" size={32} />
 </div>
 )}
 </div>

 <div className="space-y-4">
 {(() => {
 const totalFiles = files.length;
 const images = files.filter(f => f.mimeType?.startsWith('image/')).length;
 const docs = files.filter(f => f.mimeType?.includes('pdf') || f.mimeType?.includes('sheet') || f.mimeType?.includes('word')).length;
 const folders = files.filter(f => f.mimeType === 'application/vnd.google-apps.folder').length;
 const others = totalFiles - images - docs - folders;

 return [
 { label: "Folders", count: folders, color: "bg-amber-500" },
 { label: "Document Assets", count: docs, color: "bg-emerald-500" },
 { label: "Media Assets", count: images, color: "bg-indigo-500" },
 { label: "System Data", count: others, color: "bg-slate-400" },
 ].map((item, idx) => (
 <div key={idx} className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className={cn("w-2 h-2 rounded-full", item.color)}></div>
 <span className="text-xs font-medium text-slate-600 dark:text-slate-300 ">{item.label}</span>
 </div>
 <span className="text-xs font-mono text-slate-400">{item.count.toLocaleString()}</span>
 </div>
 ));
 })()}
 </div>
 
 {/* Storage Alert */}
 <div className="mt-8 p-6 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 rounded-[2rem] relative">
 <div className="absolute top-0 right-0 p-4 opacity-10">
 <AlertCircle size={48} className="text-indigo-500" />
 </div>
 <h4 className="text-xs font-medium text-slate-800 dark:text-slate-100 mb-2">Storage Status</h4>
 {quota ? (() => {
 const usage = Number(quota.usage) || 0;
 const limit = Number(quota.limit) || 2199023255552;
 const percent = Math.min(1, usage / limit);
 return (
 <>
 <p className="text-xs text-slate-400 font-medium text-slate-500 dark:text-slate-400 mb-4">
 {formatStorage(usage)} / {formatStorage(limit)}
 </p>
 <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
 <div 
 className={cn(
 "h-full transition-all duration-500",
 percent > 0.9 ? "bg-rose-500" : "bg-indigo-600"
 )} 
 style={{ width: `${percent * 100}%` }} 
 />
 </div>
 </>
 );
 })() : (
 <div className="h-1.5 w-full bg-slate-100 rounded-full animate-pulse" />
 )}
 </div>
 </div>

 {/* Connection Info */}
 <div className="enterprise-card p-8">
 <h3 className="text-sm font-medium text-slate-800 dark:text-slate-100 mb-4">Security</h3>
 <div className="flex items-center gap-3 mb-6">
 <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
 <ShieldCheck size={20} />
 </div>
 <div>
 <p className="text-xs font-medium text-slate-800 dark:text-slate-100 ">Encrypted</p>
 <p className="text-xs text-emerald-600 font-medium text-slate-500 dark:text-slate-400">TLS 1.3 Active</p>
 </div>
 </div>
 <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-6">All files are synced with Taunggyi Pharmacy G-Suite Node.</p>
 <button className="w-full py-4 bg-white dark:bg-slate-900/5 hover:bg-white dark:bg-slate-900/10 text-white text-xs font-medium  rounded-2xl border border-white/5 transition-all">
 System Logs
 </button>
 </div>
 </div>

 <ConfirmationModal 
 isOpen={confirmTarget !== null}
 onClose={() => setConfirmTarget(null)}
 onConfirm={() => {
 if (confirmTarget) confirmTarget.onConfirm();
 }}
 title={confirmTarget?.title || "Confirm Action"}
 message={confirmTarget?.message}
 confirmText={confirmTarget?.confirmText || "Delete Permanently"}
 />
 </div>
 );
}
