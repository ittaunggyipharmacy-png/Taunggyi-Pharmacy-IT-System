import React, { useState, useEffect, useRef, Fragment } from "react";
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
  Download,
  X,
  Search,
  Menu,
  RefreshCw,
  ShoppingCart,
  LogIn,
  LogOut,
  Trash2,
  Folder,
  ArrowLeft,
  Edit2,
  Check,
  MoreVertical,
  Activity,
  Layers,
  PieChart,
  AlertCircle,
  FileText,
  Upload,
  Bell,
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
  ClipboardList,
  Info,
  ExternalLink,
  Phone,
  CreditCard,
  Users,
  Wrench
} from "lucide-react";
import { utils, writeFile } from "xlsx";
import { motion, AnimatePresence } from "motion/react";

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, subDays, parseISO } from "date-fns";
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

import { auth, storage } from "./services/firebase";
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
  subscribeToSupervisorFeatures,
  saveDailyLog,
  getDailyLog,
  fetchStorageFiles,
  fetchStorageQuota,
  deleteStorageFile
} from "./services/firestoreService";

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
  EmployeeProfile
} from "./types";
import { KPITracker } from "./components/KPITracker";
import KPIDashboard from "./components/KPIDashboard";
import SkillMatrix from "./components/SkillMatrix";


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

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  const [activeTab, setActiveTab] = useState<"dashboard" | "tickets" | "assets" | "security" | "marketing" | "renewals" | "purchases" | "files" | "settings" | "help" | "kpi" | "daily-kpi" | "reports" | "skills">("dashboard");
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [evidence, setEvidence] = useState<TaskEvidence[]>([]);
  const [allDailyLogs, setAllDailyLogs] = useState<DailyLog[]>([]);
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [tickets, setTickets] = useState<ITTicket[]>(INITIAL_TICKETS);
  const [quota, setQuota] = useState<{limit: string, usage: string} | null>(null);
  const [assets, setAssets] = useState<ITAsset[]>(INITIAL_ASSETS);
  const [backups, setBackups] = useState<BackupLog[]>(INITIAL_BACKUPS);
  const [contentPlans, setContentPlans] = useState<ContentPlan[]>([]);
  const [cctvRequests, setCctvRequests] = useState<CCTVRequest[]>(INITIAL_CCTV_REQS);
  const [renewals, setRenewals] = useState<RenewalRecord[]>(INITIAL_RENEWALS);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>(INITIAL_PURCHASES);
  const [settings, setSettings] = useState<SystemSettings>(INITIAL_SETTINGS);
  const [reminders, setReminders] = useState<{id: string, message: string, type: 'urgent' | 'info'}[]>([]);
  
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const adminStatus = await checkAdminStatus(user.uid);
        setIsAdmin(adminStatus);
      } else {
        setIsAdmin(false);
      }
      setAuthReady(true);
    });

    return () => unsubAuth();
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
          if (updatedPurchases.length > 0) {
             setPurchases(prev => {
               const merged = [...prev];
               updatedPurchases.forEach(p => {
                 const idx = merged.findIndex(m => m.id === p.id);
                 if (idx !== -1) merged[idx] = p;
                 else merged.unshift(p);
               });
               return merged;
             });
          }
        },
        onAssets: (updatedAssets) => {
          if (updatedAssets.length > 0) {
            setAssets(prev => {
              const merged = [...prev];
              updatedAssets.forEach(a => {
                const idx = merged.findIndex(m => m.id === a.id);
                if (idx !== -1) merged[idx] = a;
                else merged.unshift(a);
              });
              return merged;
            });
          }
        },
        onTickets: (updatedTickets) => {
          if (updatedTickets.length > 0) {
            setTickets(prev => {
              const merged = [...prev];
              updatedTickets.forEach(t => {
                const idx = merged.findIndex(m => m.id === t.id);
                if (idx !== -1) merged[idx] = t;
                else merged.unshift(t);
              });
              return merged;
            });
          }
        },
        onBackups: (updatedBackups) => {
          if (updatedBackups.length > 0) {
            setBackups(prev => {
              const merged = [...prev];
              updatedBackups.forEach(b => {
                const idx = merged.findIndex(m => m.id === b.id);
                if (idx !== -1) merged[idx] = b;
                else merged.unshift(b);
              });
              return merged;
            });
          }
        },
        onCCTV: (updatedCCTV) => {
          if (updatedCCTV.length > 0) {
            setCctvRequests(prev => {
              const merged = [...prev];
              updatedCCTV.forEach(c => {
                const idx = merged.findIndex(m => m.id === c.id);
                if (idx !== -1) merged[idx] = c;
                else merged.unshift(c);
              });
              return merged;
            });
          }
        },
        onPlans: (updatedPlans) => {
          if (updatedPlans.length > 0) {
            setContentPlans(prev => {
              const merged = [...prev];
              updatedPlans.forEach(p => {
                const idx = merged.findIndex(m => m.id === p.id);
                if (idx !== -1) merged[idx] = p;
                else merged.unshift(p);
              });
              return merged;
            });
          }
        },
        onRenewals: (updatedRenewals) => {
          if (updatedRenewals.length > 0) {
            setRenewals(prev => {
              const merged = [...prev];
              updatedRenewals.forEach(r => {
                const idx = merged.findIndex(m => m.id === r.id);
                if (idx !== -1) merged[idx] = r;
                else merged.unshift(r);
              });
              return merged;
            });
          }
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

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = () => signOut(auth);

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



  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="text-cyan-500 animate-spin" size={32} />
          <p className="text-slate-500 font-mono text-sm tracking-widest animate-pulse">BOOTING IT SYSTEMS...</p>
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
          className="w-full max-w-md bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 text-center"
        >
          <div className="w-20 h-20 bg-cyan-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-cyan-500/30">
            <ShieldCheck className="text-cyan-400" size={40} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">IT Operations Login</h1>
          <p className="text-slate-400 text-sm mb-8">Access restricted to Taunggyi Pharmacy IT Staff. SOP-001 Protocol enabled.</p>
          
          <button 
            onClick={handleLogin}
            className="w-full bg-white text-slate-950 font-bold py-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-cyan-50 transition-colors"
          >
            <LogIn size={20} />
            Sign in with Google
          </button>
          
          <div className="mt-8 flex items-center gap-2 justify-center">
            <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Secure Environment</span>
          </div>
        </motion.div>
      </div>
    );
  }



  const navItems = [
    { id: "tickets", label: "IT Support Log", icon: Ticket },
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    ...(isAdmin ? [{ id: "reports", label: "Reporting & Dash", icon: BarChart2 }] : []),
    { id: "kpi", label: "KPI Dashboard", icon: ClipboardList },
    { id: "daily-kpi", label: "Daily KPI Tracker", icon: Calendar },
    ...(isAdmin ? [{ id: "skills", label: "Team Skill Matrix", icon: Users }] : []),
    { id: "assets", label: "Assets Inventory", icon: Package },
    { id: "purchases", label: "Purchase Records", icon: ShoppingCart },
    { id: "renewals", label: "Renewal Tracker", icon: RefreshCw },
    { id: "security", label: "Security & Monitoring", icon: ShieldCheck },
    { id: "marketing", label: "Digital Marketing", icon: Megaphone },
    { id: "files", label: "Cloud Files", icon: HardDrive },
    { id: "settings", label: "System Settings", icon: Settings },
    { id: "help", label: "Help & Support", icon: HelpCircle },
  ];

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden font-sans text-slate-900">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ 
          width: isSidebarOpen ? 280 : 80,
          x: typeof window !== 'undefined' && window.innerWidth < 1024 
            ? (isSidebarOpen ? 0 : -280) 
            : 0
        }}
        className={cn(
          "bg-white border-r border-slate-200 flex flex-col z-50 fixed inset-y-0 left-0 lg:relative lg:translate-x-0 shadow-sm transition-all duration-300",
          !isSidebarOpen && "lg:w-20"
        )}
      >
        <div className={cn(
          "h-20 px-6 flex items-center shrink-0 border-b border-slate-100",
          isSidebarOpen ? "justify-between" : "justify-center"
        )}>
          {isSidebarOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2"
            >
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
                <Box size={20} />
              </div>
              <div className="font-bold text-slate-800 tracking-tight leading-none">
                managez.<br/>
                <span className="text-slate-400 font-medium text-[10px] uppercase tracking-wider">Powered by Lex Corp.</span>
              </div>
            </motion.div>
          )}
          {!isSidebarOpen && (
             <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
               <Box size={24} />
             </div>
          )}
        </div>

        <nav className="flex-1 px-0 space-y-1 mt-4 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id as any);
              }}
              className={cn(
                "w-full flex items-center gap-4 px-6 py-4 transition-all duration-200 group text-left",
                activeTab === item.id 
                  ? "bg-indigo-50/80 text-indigo-600 border-r-4 border-indigo-600" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <item.icon size={20} className={cn(activeTab === item.id ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600")} />
              {isSidebarOpen && <span className="text-sm font-semibold tracking-tight">{item.label}</span>}
              {!isSidebarOpen && activeTab === item.id && <div className="absolute right-0 w-1 h-6 bg-indigo-600 rounded-l" />}
            </button>
          ))}
        </nav>

        {isSidebarOpen && (
          <div className="p-6 bg-slate-50/50">
             <div className="flex items-center gap-3 mb-4">
               <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                  <Activity size={20} />
               </div>
               <div className="flex-1">
                  <p className="text-xs font-bold text-slate-800">Overall usage 45% (51 °C)</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">23 Dec 2020, 6:00 pm</p>
               </div>
             </div>
          </div>
        )}
      </motion.aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-0">
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 shrink-0">
          <div className="flex items-center gap-3 lg:gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 transition-colors"
            >
              <Menu size={24} />
            </button>
            <div className="h-8 w-px bg-slate-200 mx-2 hidden sm:block" />
            <div className="hidden sm:block">
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Inventory Management</p>
               <h2 className="text-sm font-bold text-slate-800 tracking-tight">{navItems.find(i => i.id === activeTab)?.label}</h2>
            </div>
          </div>

          <div className="flex items-center gap-3 lg:gap-6">
            {/* Search */}
            <div className="relative hidden md:block group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-indigo-600" size={16} />
              <input 
                type="text" 
                placeholder="Search assets, tickets, specs (RAM/CPU)..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-slate-100/50 border border-slate-200 transition-all focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 focus:bg-white rounded-xl text-sm w-48 lg:w-64 outline-none text-slate-800"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <button 
                  onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                  className={cn(
                    "relative p-2 transition-all rounded-xl",
                    isNotificationsOpen ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                  )}
                >
                  <Bell size={20} />
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">8</span>
                </button>

                <AnimatePresence>
                  {isNotificationsOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden"
                    >
                      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="font-bold text-slate-800 text-sm italic">Notifications中心</h3>
                        <button className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest hover:underline">Mark all read</button>
                      </div>
                      <div className="max-h-[400px] overflow-y-auto">
                        {[
                          { id: 1, title: "System Maintenance", msg: "Scheduled for midnight today", time: "2h ago", type: "system" },
                          { id: 2, title: "Critical Ticket #724", msg: "Server latency detected in Shop 3", time: "5h ago", type: "alert" },
                          { id: 3, title: "New Asset Sync", msg: "12 mobile devices added to inventory", time: "1d ago", type: "update" },
                          { id: 4, title: "Security Alert", msg: "Multiple login attempts from undefined IP", time: "2d ago", type: "security" },
                        ].map((n) => (
                          <div key={n.id} className="p-4 hover:bg-slate-50 transition-colors cursor-pointer border-b border-slate-50 last:border-0 border-l-4 border-l-transparent hover:border-l-indigo-600">
                            <div className="flex justify-between items-start mb-1">
                              <p className="text-xs font-bold text-slate-800">{n.title}</p>
                              <span className="text-[9px] text-slate-400 font-mono italic">{n.time}</span>
                            </div>
                            <p className="text-[11px] text-slate-500 line-clamp-2">{n.msg}</p>
                          </div>
                        ))}
                      </div>
                      <button className="w-full p-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:bg-slate-50 border-t border-slate-50 bg-slate-50/50">View all notifications</button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button 
                onClick={() => setActiveTab("settings")}
                className={cn(
                  "p-2 transition-all rounded-xl",
                  activeTab === "settings" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                )}
              >
                <Settings size={20} />
              </button>
            </div>

            <div className="h-8 w-px bg-slate-200 mx-2" />

            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-800 leading-none">{currentUser.displayName || "David Jones"}</p>
                <p className="text-[10px] text-slate-400 font-medium mt-1">Super Admin</p>
              </div>
              <div className="relative group cursor-pointer">
                {currentUser.photoURL ? (
                  <img src={currentUser.photoURL} alt="User" className="w-10 h-10 rounded-lg border border-slate-200 group-hover:border-indigo-500 transition-all shadow-sm" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-sm font-bold">
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



        <div className="flex-1 overflow-y-auto p-6 lg:p-10 custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === "dashboard" && <Dashboard tickets={tickets} assets={assets} backups={backups} quota={quota} />}
              {activeTab === "tickets" && <TicketsModule tickets={tickets} setTickets={setTickets} searchTerm={searchTerm} isAdmin={isAdmin} />}
              {activeTab === "assets" && (
                <AssetsModule 
                  assets={assets} 
                  setAssets={setAssets} 
                  searchTerm={searchTerm} 
                  isAdmin={isAdmin} 
                />
              )}
              {activeTab === "security" && <SecurityModule backups={backups} setBackups={setBackups} requests={cctvRequests} setRequests={setCctvRequests} searchTerm={searchTerm} />}
              {activeTab === "renewals" && <RenewalsModule renewals={renewals} setRenewals={setRenewals} />}
              {activeTab === "purchases" && <PurchasesModule 
                purchases={purchases} 
                setPurchases={setPurchases} 
                assets={assets}
                setAssets={setAssets}
                isAdmin={isAdmin}
              />}
              {activeTab === "marketing" && <MarketingModule plans={contentPlans} setPlans={setContentPlans} />}
              {activeTab === "settings" && <SettingsModule settings={settings} setSettings={setSettings} />}
              {activeTab === "help" && <HelpSupportModule />}
              {activeTab === "files" && <FileManagerModule isAdmin={isAdmin} quota={quota} setQuota={setQuota} />}
              {activeTab === "kpi" && <KPIDashboard />}
              {activeTab === "daily-kpi" && <KPITracker />}
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
              activeTab === item.id ? "text-indigo-600" : "text-slate-500 hover:text-slate-400"
            )}
          >
            <div className={cn(
              "p-1.5 rounded-lg transition-all",
              activeTab === item.id && "bg-indigo-50"
            )}>
              <item.icon size={22} strokeWidth={activeTab === item.id ? 2.5 : 2} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest scale-75 origin-top">{item.label.split(' ')[0]}</span>
          </button>
        ))}
      </nav>

    </div>
  );
}

function SettingsModule({ settings, setSettings }: { settings: SystemSettings, setSettings: (s: SystemSettings) => void }) {
  const [newDept, setNewDept] = useState("");
  const [newLoc, setNewLoc] = useState("");

  const addDept = () => {
    if (!newDept.trim()) return;
    setSettings({ ...settings, departments: [...settings.departments, newDept.trim()] });
    setNewDept("");
  };

  const addLoc = () => {
    if (!newLoc.trim()) return;
    setSettings({ ...settings, locations: [...settings.locations, newLoc.trim()] });
    setNewLoc("");
  };

  return (
    <div className="space-y-8 pb-20 lg:pb-0">
      <div className="enterprise-card p-6 lg:p-10">
        <h2 className="text-xl lg:text-2xl font-bold text-slate-800 tracking-tight uppercase">System Configuration</h2>
        <p className="text-[10px] lg:text-xs text-slate-400 mt-2 lg:mt-3 leading-relaxed font-bold tracking-widest uppercase">
          Manage Organizational Structures & Master Data
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="enterprise-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Layers size={20} />
            </div>
            <h3 className="font-bold text-slate-800 uppercase tracking-tight">Departments</h3>
          </div>
          <div className="flex gap-2 mb-6">
            <input 
              type="text" 
              value={newDept}
              onChange={e => setNewDept(e.target.value)}
              placeholder="New department name..."
              className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/20"
            />
            <button 
              onClick={addDept}
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold uppercase text-[10px] tracking-widest hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-100"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {settings.departments.map(d => (
              <span key={d} className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 uppercase tracking-widest">
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
            <h3 className="font-bold text-slate-800 uppercase tracking-tight">Locations</h3>
          </div>
          <div className="flex gap-2 mb-6">
            <input 
              type="text" 
              value={newLoc}
              onChange={e => setNewLoc(e.target.value)}
              placeholder="New location name..."
              className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/20"
            />
            <button 
              onClick={addLoc}
              className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold uppercase text-[10px] tracking-widest hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-100"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {settings.locations.map(l => (
              <span key={l} className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                {l}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function HelpSupportModule() {
  return (
    <div className="space-y-8 pb-20 lg:pb-0">
      <div className="enterprise-card p-6 lg:p-10">
        <h2 className="text-xl lg:text-2xl font-bold text-slate-800 tracking-tight uppercase">Knowledge Base & Support</h2>
        <p className="text-[10px] lg:text-xs text-slate-400 mt-2 lg:mt-3 leading-relaxed font-bold tracking-widest uppercase">
          Standard Operating Procedures & Support Channels
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="enterprise-card p-8">
            <h3 className="text-lg font-bold text-slate-800 mb-6 uppercase tracking-tight flex items-center gap-3">
              <FileText className="text-indigo-600" size={24} />
              IT-SOP-001 Protocol
            </h3>
            <div className="prose prose-slate prose-sm max-w-none space-y-4 text-slate-600">
              <p className="font-bold text-slate-800">1. Lifecycle Management</p>
              <p>Every asset (Hardware/Software) must be registered in the Asset Inventory upon arrival. Purchase records must be synced with the inventory ID.</p>
              
              <p className="font-bold text-slate-800">2. Security Compliance</p>
              <p>CCTV footage requests require management approval. Personnel access must be revoked within 2 hours of resignation.</p>

              <p className="font-bold text-slate-800">3. Backup & Recovery</p>
              <p>Critical data must be backed up daily to both Cloud and Physical nodes. Performance logs are reviewed weekly.</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="enterprise-card p-6">
            <h3 className="font-bold text-slate-800 mb-4 uppercase tracking-tight">IT Hotlines</h3>
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Technical Support</p>
                <p className="text-sm font-bold text-slate-800 mt-1">09-940-931-313</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Urgent Escalation</p>
                <p className="text-sm font-bold text-slate-800 mt-1">09-XXX-XXX-XXX</p>
              </div>
            </div>
          </div>


        </div>
      </div>
    </div>
  );
}

import { saveEmployeeProfile } from './services/firestoreService';

function SkillsModule({ employees }: { employees: EmployeeProfile[] }) {
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
          <h2 className="text-2xl font-bold text-slate-800">Team Skill Matrix</h2>
          <p className="text-sm text-slate-500">Track and manage employee competencies</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold uppercase text-[10px] tracking-widest hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-100"
        >
          <Plus size={16} />
          Add Employee
        </button>
      </div>

      {isAdding && (
         <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm mb-8">
           <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><User size={20} className="text-indigo-600" /> New Employee Profile</h3>
           <form onSubmit={handleSave} className="space-y-6">
             <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Name</label>
                  <input type="text" required value={newEmployee.name || ""} onChange={e => setNewEmployee({...newEmployee, name: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl" placeholder="John Doe" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Department</label>
                  <select value={newEmployee.department} onChange={e => setNewEmployee({...newEmployee, department: e.target.value as any})} className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white">
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
             </div>

             <div>
               <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Assign Skills</label>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                 {SKILL_CATEGORIES.map(category => {
                   const currLevel = newEmployee.skills?.find(s => s.category === category)?.level || 0;
                   return (
                     <div key={category} className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex flex-col justify-between h-24">
                        <span className="text-sm font-bold text-slate-700">{category}</span>
                        <div className="flex gap-1 mt-2">
                          {[1,2,3,4,5].map(lvl => (
                            <button
                              key={lvl}
                              type="button"
                              onClick={() => updateSkill(category, lvl)}
                              className={`w-6 h-6 rounded flex items-center justify-center text-xs ${lvl <= currLevel ? 'bg-amber-400 text-white' : 'bg-slate-200 text-slate-400 hover:bg-slate-300'}`}
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

             <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
               <button type="button" onClick={() => setIsAdding(false)} className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold uppercase text-[10px] tracking-widest hover:bg-slate-200">Cancel</button>
               <button type="submit" className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold uppercase text-[10px] tracking-widest hover:bg-indigo-500">Save Profile</button>
             </div>
           </form>
         </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {employees.map(emp => (
          <div key={emp.id} className="enterprise-card p-6 flex flex-col h-full">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-lg font-black text-slate-900">{emp.name}</h3>
                <span className="inline-block px-2 py-1 mt-1 bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase tracking-widest rounded">{emp.department}</span>
              </div>
              <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 font-bold">
                {emp.name.charAt(0)}
              </div>
            </div>

            <div className="flex-1 space-y-4">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Skill Matrix</h4>
              {emp.skills?.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No skills recorded.</p>
              ) : (
                emp.skills?.sort((a,b) => b.level - a.level).map(skill => (
                  <div key={skill.category} className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-700">{skill.category}</span>
                    <div className="flex gap-1">
                      {[1,2,3,4,5].map(lvl => (
                        <div key={lvl} className={`w-3 h-3 rounded-full ${lvl <= skill.level ? 'bg-amber-400' : 'bg-slate-100'}`} />
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
  const exportKPISummary = () => {
    const data = allDailyLogs.map(log => {
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
          <h2 className="text-2xl font-bold text-slate-800">IT Supervisor Dashboard</h2>
          <p className="text-sm text-slate-500">Real-time Performance & Subordinate Monitoring</p>
        </div>
        <button 
          onClick={exportKPISummary}
          className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold uppercase text-[10px] tracking-widest hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-100"
        >
          <Download size={16} />
          Export KPI Report (XLSX)
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Activity Feed */}
        <div className="lg:col-span-1 border border-slate-200 bg-white rounded-3xl p-6 flex flex-col h-[600px]">
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
            <Activity size={16} className="text-indigo-600" />
            Live Activity Feed
          </h3>
          <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
            {activities.length === 0 ? (
              <div className="text-center py-20 grayscale opacity-50">
                <Clock size={40} className="mx-auto mb-3" />
                <p className="text-xs font-bold uppercase tracking-widest">No activities logged</p>
              </div>
            ) : (
              activities.map((act) => (
                <div key={act.id} className="relative pl-6 border-l-2 border-slate-100 pb-1">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-2 border-indigo-600 shadow-sm" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                      {safeFormat(act.timestamp, "HH:mm • dd MMM")}
                    </span>
                    <p className="text-sm font-bold text-slate-800 mt-1">
                      <span className="text-indigo-600">{act.userName}</span> {act.action}
                    </p>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 w-fit mt-1.5 font-bold">
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
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">Staff Daily Completion Rate (%)</h3>
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
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center justify-between">
              Recent Photo Evidence
              <span className="text-[10px] lowercase text-slate-400 font-normal tracking-normal italic">Proof of completion</span>
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {evidence.slice(0, 8).map((ev) => (
                <div key={ev.id} className="group relative aspect-square rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                  <img src={ev.imageUrl} alt="Evidence" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all p-3 flex flex-col justify-end">
                    <p className="text-[9px] font-bold text-white uppercase">{ev.userName}</p>
                    <p className="text-[8px] text-white/70 line-clamp-1">{ev.taskId}</p>
                  </div>
                </div>
              ))}
              {evidence.length === 0 && (
                <div className="col-span-full py-12 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                  <Camera className="mx-auto text-slate-300 mb-2" size={24} />
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No photo evidence uploaded yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Staff Performance Ranking */}
          <div className="enterprise-card p-6">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">Staff Performance & Skill Growth</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left text-[10px] font-black text-slate-400 uppercase tracking-wider pb-3">Staff Member</th>
                    <th className="text-left text-[10px] font-black text-slate-400 uppercase tracking-wider pb-3">Department</th>
                    <th className="text-left text-[10px] font-black text-slate-400 uppercase tracking-wider pb-3">KPI Completion</th>
                    <th className="text-left text-[10px] font-black text-slate-400 uppercase tracking-wider pb-3">Avg Skill Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {staffPerformance.map(emp => (
                    <tr key={emp.id}>
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs">
                            {emp.name.charAt(0)}
                          </div>
                          <span className="text-sm font-bold text-slate-800">{emp.name}</span>
                        </div>
                      </td>
                      <td className="py-4">
                        <span className="px-2 py-1 bg-slate-50 text-slate-500 rounded text-[10px] font-bold uppercase tracking-wider">{emp.department}</span>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500" style={{ width: `${emp.completionRate}%` }} />
                          </div>
                          <span className="text-xs font-bold text-slate-700">{emp.completionRate}%</span>
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-1">
                          <span className="text-amber-400 text-sm">★</span>
                          <span className="text-sm font-bold text-slate-700">{emp.avgSkill}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {staffPerformance.length === 0 && (
                     <tr>
                       <td colSpan={4} className="py-8 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
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
    <div className="flex flex-col xl:flex-row gap-6">
      <div className="flex-1 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-800">Inventory dashboard</h1>
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
                 <div className="text-3xl font-bold text-slate-900">
                    {stat.current}
                    {stat.total && <span className="text-slate-400 text-xl">/{stat.total}</span>}
                 </div>
                 <p className="text-sm text-slate-500 mt-1">{stat.sub}</p>
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
                <h3 className="text-lg font-bold text-slate-800">Inventory counter</h3>
                <div className="flex gap-4 mt-2">
                   <button className="text-sm font-bold text-indigo-600 border-b-2 border-indigo-600 pb-1">Device</button>
                   <button className="text-sm font-medium text-slate-400 hover:text-slate-600">Spare parts</button>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors"><Activity size={16} /></button>
                <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors"><RefreshCw size={16} /></button>
                <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors"><Download size={16} /></button>
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
              <h3 className="text-lg font-bold text-slate-800">Workstations</h3>
              <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors"><Download size={16} /></button>
            </div>
            <div className="flex gap-4 mb-6">
               <button className="text-sm font-bold text-indigo-600 border-b-2 border-indigo-600 pb-1">State count</button>
               <button className="text-sm font-medium text-slate-400 hover:text-slate-600">Department count</button>
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
                 <p className="text-xs text-slate-500 font-bold uppercase">Total</p>
                 <p className="text-2xl font-bold text-slate-800">100%</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
               {pieData.map((item, idx) => (
                 <div key={idx} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                    <span className="text-[11px] font-bold text-slate-600 uppercase">{item.name} {item.value}%</span>
                 </div>
               ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right License Sidebar */}
      <div className="w-full xl:w-80 space-y-6 shrink-0">
        <div className="enterprise-card p-6 min-h-full">
           <h3 className="text-lg font-bold text-slate-800 mb-6">Purchased license</h3>
           <div className="relative mb-6">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
             <input 
               type="text" 
               placeholder="Search" 
               className="w-full pl-10 pr-4 py-2 bg-slate-100/50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
             />
           </div>
           
           <div className="space-y-6">
             {licenses.map((license, i) => (
               <div key={i} className="group cursor-pointer">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-lg group-hover:bg-indigo-600 group-hover:text-white transition-all">
                      {license.logo}
                    </div>
                    <div className="flex-1 min-w-0">
                       <p className="text-sm font-bold text-slate-800 truncate">{license.name}</p>
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

           <button className="w-full mt-10 py-3 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors uppercase tracking-widest border-t border-slate-100">
             Manage All Licenses
           </button>
        </div>
      </div>
    </div>
  );
}

function TicketsModule({ tickets, setTickets, searchTerm, isAdmin }: { tickets: ITTicket[], setTickets: (t: ITTicket[]) => void, searchTerm: string, isAdmin: boolean }) {
  const [isAdding, setIsAdding] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<ITTicket | null>(null);
  const [newAction, setNewAction] = useState("");
  const [ticketSearch, setTicketSearch] = useState("");
  const [newTicket, setNewTicket] = useState<Partial<ITTicket>>({
    priority: Priority.MEDIUM,
    status: Status.PENDING
  });

  // Auto-save logic
  useEffect(() => {
    const savedDraft = localStorage.getItem("it_ticket_draft");
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        if (draft.problemType || draft.requesterName) {
          setNewTicket(prev => ({ ...prev, ...draft }));
          setIsAdding(true);
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
    return (
      (searchTerm === "" && ticketSearch === "") ||
      ticket.id.toLowerCase().includes(searchLower) ||
      ticket.problemType.toLowerCase().includes(searchLower) ||
      ticket.requesterName.toLowerCase().includes(searchLower) ||
      ticket.status.toLowerCase().includes(searchLower) ||
      ticket.priority.toLowerCase().includes(searchLower)
    );
  });

  const currentTickets = filteredTickets.filter(t => !isHistorical(t.requestTime));
  const historicalTickets = filteredTickets.filter(t => isHistorical(t.requestTime));

  const handleAddTicket = () => {
    if (!newTicket.problemType || !newTicket.requesterName) return;
    
    const ticket: Partial<ITTicket> = {
      problemType: newTicket.problemType!,
      priority: newTicket.priority as Priority,
      requestTime: new Date().toISOString(),
      requesterName: newTicket.requesterName!,
      requesterBranch: newTicket.requesterBranch || "Unknown",
      description: newTicket.description || "",
      actions: [],
      status: Status.PENDING,
    };

    saveTicket(ticket).then(() => {
      setIsAdding(false);
      setNewTicket({ priority: Priority.MEDIUM, status: Status.PENDING });
      localStorage.removeItem("it_ticket_draft");
    }).catch(err => {
      console.error("Failed to save ticket", err);
    });
  };

  const handleAddAction = (ticketId: string) => {
    if (!newAction.trim()) return;
    
    const entry: ActionEntry = {
      timestamp: new Date().toISOString(),
      performer: auth.currentUser?.email || "IT Agent",
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
          performer: auth.currentUser?.email || "Supervisor",
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

  const handleDeleteTicket = async (ticketId: string) => {
    if (!isAdmin) return;
    try {
      await deleteTicket(ticketId);
      setSelectedTicket(null);
    } catch (err) {
      console.error("Failed to delete ticket", err);
    }
  };

  const handleExportTickets = () => {
    const data = tickets.map(t => ({
      ID: t.id,
      Issue: t.problemType,
      Priority: t.priority,
      Requester: t.requesterName,
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
      <div className="flex justify-between items-center enterprise-card p-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">IT Support Log (SOP-001)</h2>
          <p className="text-xs text-slate-400 mt-1 uppercase font-bold tracking-widest leading-loose">Active nodes: {tickets.filter(t => t.status !== Status.COMPLETED).length}</p>
        </div>
        <div className="flex gap-3 items-center">
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text" 
              placeholder="Search tickets..." 
              value={ticketSearch}
              onChange={(e) => setTicketSearch(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all w-48 lg:w-64"
            />
          </div>
          <button 
            onClick={handleExportTickets}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-emerald-100 transition-all border border-emerald-200"
          >
            <Download size={16} /> Export
          </button>
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-sm"
          >
            <Plus size={16} /> New Entry
          </button>
        </div>
      </div>

      <div className="enterprise-card overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden lg:block">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="uppercase tracking-widest text-slate-400 font-bold text-[9px]">
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Requester</th>
                <th className="px-6 py-4">Issue</th>
                <th className="px-6 py-4">Priority</th>
                <th className="px-6 py-4">Action Taken</th>
                <th className="px-6 py-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[
                { label: "Active Support Logs", items: currentTickets },
                { label: "Historical Records (>30 days)", items: historicalTickets }
              ].map((group) => (
                <React.Fragment key={group.label}>
                  {group.items.length > 0 && (
                    <tr className="bg-slate-50/50">
                      <td colSpan={6} className="px-6 py-2 text-[10px] font-bold text-indigo-600 uppercase tracking-widest">{group.label}</td>
                    </tr>
                  )}
                  {group.items.map((ticket) => (
                    <tr 
                      key={ticket.id} 
                      onClick={() => setSelectedTicket(ticket)}
                      className="hover:bg-slate-50 transition-colors group cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <p className="text-[10px] text-slate-600 font-bold uppercase">{safeFormat(ticket.requestTime, "yyyy-MM-dd")}</p>
                        <p className="text-[9px] text-slate-400 font-mono mt-0.5">{safeFormat(ticket.requestTime, "HH:mm:ss")}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest">{ticket.requesterName}</span>
                        <p className="text-[9px] text-slate-400 font-mono mt-0.5">{formatId(ticket.id)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs font-semibold text-slate-700 group-hover:text-indigo-600 transition-colors line-clamp-1">{ticket.problemType}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[9px] font-bold uppercase border",
                          ticket.priority === Priority.CRITICAL ? "bg-rose-50 text-rose-600 border-rose-100" : 
                          ticket.priority === Priority.HIGH ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-slate-50 text-slate-500 border-slate-200"
                        )}>
                          {ticket.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {ticket.actions.length > 0 ? (
                          <div className="max-w-[200px]">
                            <p className="text-[10px] text-slate-500 italic line-clamp-1 font-medium">"{ticket.actions[ticket.actions.length - 1].action}"</p>
                            <p className="text-[8px] text-slate-400 uppercase font-bold mt-0.5 flex items-center gap-1">
                               <Clock size={8} /> {safeFormat(ticket.actions[ticket.actions.length - 1].timestamp, "HH:mm")} • IT Agent
                            </p>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Pending assigned...</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <span className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
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
                <span className="text-[10px] font-mono font-bold text-slate-400">{formatId(ticket.id)}</span>
                <span className={cn(
                  "px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider",
                  ticket.status === Status.COMPLETED ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : 
                  ticket.status === Status.IN_PROGRESS ? "bg-indigo-50 text-indigo-600 border border-indigo-100" : "bg-slate-50 text-slate-400 italic border border-slate-200"
                )}>
                  {ticket.status}
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-800 mb-2 line-clamp-2">{ticket.problemType}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    ticket.priority === Priority.CRITICAL ? "bg-rose-500" : 
                    ticket.priority === Priority.HIGH ? "bg-amber-500" : "bg-slate-300"
                  )}></div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">{ticket.requesterName}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <Clock size={12} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">{safeFormat(ticket.requestTime, "HH:mm")}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-0 sm:p-4">
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="enterprise-modal p-6 sm:p-8 w-full h-full sm:h-auto sm:max-w-md rounded-none sm:rounded-3xl overflow-y-auto"
            >
              <h3 className="text-xl font-bold text-slate-800 mb-8 tracking-tight">System Node Registration</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Requester ID</label>
                  <input 
                    type="text" 
                    value={newTicket.requesterName || ""}
                    onChange={e => setNewTicket({...newTicket, requesterName: e.target.value})}
                    placeholder="Staff identifier..." 
                    className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Branch / Store</label>
                  <input 
                    type="text" 
                    value={newTicket.requesterBranch || ""}
                    onChange={e => setNewTicket({...newTicket, requesterBranch: e.target.value})}
                    placeholder="e.g. Branch 3, Office..." 
                    className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Issue Diagnostic</label>
                  <textarea 
                    rows={3}
                    value={newTicket.problemType || ""}
                    onChange={e => setNewTicket({...newTicket, problemType: e.target.value})}
                    placeholder="Brief summary..." 
                    className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Detailed Description</label>
                  <textarea 
                    rows={3}
                    value={newTicket.description || ""}
                    onChange={e => setNewTicket({...newTicket, description: e.target.value})}
                    placeholder="Full details of the issue..." 
                    className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Priority Classification</label>
                  <select 
                    onChange={e => setNewTicket({...newTicket, priority: e.target.value as Priority})}
                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value={Priority.LOW}>Low Intensity</option>
                    <option value={Priority.MEDIUM}>Standard</option>
                    <option value={Priority.HIGH}>Elevated</option>
                    <option value={Priority.CRITICAL}>Critical Override</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 mt-10">
                <button 
                  onClick={() => setIsAdding(false)}
                  className="w-full py-4 sm:py-3 px-4 bg-slate-100 text-slate-600 rounded-xl font-bold uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-colors order-2 sm:order-1"
                >
                  Terminate
                </button>
                <button 
                  onClick={handleAddTicket}
                  className="enterprise-btn-primary w-full py-4 sm:py-3 px-4 rounded-xl font-bold uppercase text-[10px] tracking-widest order-1 sm:order-2"
                >
                  Confirm Log
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {selectedTicket && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-0 sm:p-4">
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="enterprise-modal p-0 w-full h-full sm:h-auto sm:max-w-2xl rounded-none sm:rounded-3xl overflow-hidden flex flex-col sm:max-h-[85vh]"
            >
              <div className="p-6 sm:p-8 border-b border-slate-100 bg-white flex items-center justify-between shrink-0">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs font-mono font-bold text-slate-400">{formatId(selectedTicket.id)}</span>
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[9px] font-bold uppercase border",
                      selectedTicket.priority === Priority.CRITICAL ? "bg-rose-50 text-rose-600 border-rose-100" : 
                      selectedTicket.priority === Priority.HIGH ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-slate-50 text-slate-500 border-slate-200"
                    )}>
                      {selectedTicket.priority} Priority
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight line-clamp-1">{selectedTicket.problemType}</h3>
                </div>
                <button 
                  onClick={() => setSelectedTicket(null)}
                  className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar bg-white">
                <section>
                  <div className="grid grid-cols-2 gap-6 mb-8">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                        <MapPin size={12} className="text-indigo-600" /> Requester Location
                      </p>
                      <p className="text-sm font-bold text-slate-800">{selectedTicket.requesterBranch || "Central Office"}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                        <User size={12} className="text-indigo-600" /> Assigned To
                      </p>
                      <p className="text-sm font-bold text-slate-800 italic">{selectedTicket.assignedToName || "Pending Assignment"}</p>
                    </div>
                  </div>

                  {isAdmin && !selectedTicket.assignedTo && selectedTicket.status !== Status.COMPLETED && (
                    <div className="mb-8 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
                      <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-3">Assign Task to Agent</p>
                      <div className="flex flex-wrap gap-2">
                        {["IT Staff A", "IT Staff B", "Field Engineer", "Admin"].map(staff => (
                          <button 
                            key={staff}
                            onClick={() => handleAssignTicket(selectedTicket.id, staff.toLowerCase().replace(' ', '_'), staff)}
                            className="px-3 py-1.5 bg-white border border-indigo-200 text-indigo-600 rounded-lg text-[10px] font-bold uppercase transition-all hover:bg-indigo-600 hover:text-white"
                          >
                            Assign to {staff}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedTicket.responseTime !== undefined && (
                    <div className="mb-8 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-between">
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Supervisor KPI: Response Time</p>
                      <p className="text-sm font-black text-emerald-600">{selectedTicket.responseTime} mins</p>
                    </div>
                  )}

                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Detailed Signal Data</h4>
                  <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-600 leading-relaxed italic mb-8">
                    {selectedTicket.description || "No supplemental diagnostic data provided by node."}
                  </div>

                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <History size={14} className="text-indigo-600" />
                    Action History Cluster
                  </h4>
                  <div className="space-y-6">
                    {selectedTicket.actions.length === 0 ? (
                      <div className="py-12 border-2 border-dashed border-slate-100 rounded-2xl flex flex-col items-center justify-center text-slate-300">
                        <Bot size={32} strokeWidth={1} />
                        <p className="text-[10px] font-bold uppercase mt-3 tracking-widest italic text-center">
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
                              <p className="text-sm text-slate-600 leading-relaxed max-w-[80%]">{entry.action}</p>
                              <span className="text-[9px] font-mono text-slate-400 font-bold">{safeFormat(entry.timestamp, "HH:mm")}</span>
                            </div>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-2 px-2 py-0.5 bg-slate-50 w-fit rounded">Operator: {entry.performer}</p>
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
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none shadow-sm"
                    rows={2}
                  />
                  <div className="flex gap-4">
                    <button 
                      onClick={() => handleAddAction(selectedTicket.id)}
                      disabled={!newAction.trim()}
                      className="enterprise-btn-primary flex-1 py-3 px-6 rounded-xl text-[10px] font-bold uppercase tracking-widest disabled:opacity-50"
                    >
                      Record Action
                    </button>
                    <button 
                      onClick={() => handleCompleteTicket(selectedTicket.id)}
                      className="py-3 px-6 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-100 transition-all"
                    >
                      Close Node
                    </button>
                    {isAdmin && (
                      <button 
                        onClick={() => handleDeleteTicket(selectedTicket.id)}
                        className="py-3 px-6 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-rose-100 transition-all"
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
    </div>
  );
}

function AssetsModule({ assets, setAssets, searchTerm, isAdmin }: { assets: ITAsset[], setAssets: (a: ITAsset[]) => void, searchTerm: string, isAdmin: boolean }) {
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<ITAsset | null>(null);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [newAsset, setNewAsset] = useState<Partial<ITAsset>>({ category: "Computer", status: "Active" });
  const [filterDept, setFilterDept] = useState("All");
  const [filterUser, setFilterUser] = useState("All");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");

  const departments = ["All", ...Array.from(new Set(assets.map(a => a.department || a.location).filter(Boolean)))];
  const users = ["All", ...Array.from(new Set(assets.map(a => a.assignedTo).filter(Boolean)))];
  const categories = ["All", ...Array.from(new Set(assets.map(a => a.category).filter(Boolean)))];
  const statuses = ["All", ...Array.from(new Set(assets.map(a => a.status).filter(Boolean)))];
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (assetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this asset? This action cannot be undone.")) return;
    
    setIsDeleting(true);
    try {
      await deleteAsset(assetId);
      // Local filter if subscribeToSync doesn't handle deletions automatically (it should but let's be safe)
      setAssets(assets.filter(a => a.id !== assetId));
    } catch (error) {
      console.error("Delete failed", error);
      alert("Failed to delete asset. Insufficient permissions.");
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredAssets = assets.filter(asset => {
    const assetDept = asset.department || asset.location;
    const matchesDept = filterDept === "All" || assetDept === filterDept;
    const matchesUser = filterUser === "All" || asset.assignedTo === filterUser;
    const matchesCategory = filterCategory === "All" || asset.category === filterCategory;
    const matchesStatus = filterStatus === "All" || asset.status === filterStatus;
    
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = searchTerm === "" || 
      asset.id.toLowerCase().includes(searchLower) ||
      asset.model.toLowerCase().includes(searchLower) ||
      (asset.brand?.toLowerCase() || "").includes(searchLower) ||
      (asset.serialNumber?.toLowerCase() || "").includes(searchLower) ||
      (asset.assignedTo?.toLowerCase() || "").includes(searchLower) ||
      (asset.department?.toLowerCase() || "").includes(searchLower) ||
      (asset.location?.toLowerCase() || "").includes(searchLower) ||
      (asset.specs?.toLowerCase() || "").includes(searchLower) ||
      (asset.peripherals?.keyboard?.toLowerCase() || "").includes(searchLower) ||
      (asset.peripherals?.mouse?.toLowerCase() || "").includes(searchLower) ||
      (asset.peripherals?.usb?.toLowerCase() || "").includes(searchLower) ||
      (asset.peripherals?.fan?.toLowerCase() || "").includes(searchLower);

    return matchesDept && matchesUser && matchesCategory && matchesStatus && matchesSearch;
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
    if (!newAsset.model || !newAsset.serialNumber) return;

    // Validation: Only assign if status is 'In Stock', 'Active', or 'New'
    const isAssigned = newAsset.assignedTo && newAsset.assignedTo !== "Unassigned";
    const targetStatus = newAsset.status || (isEditing ? selectedAsset?.status : "New");
    const allowedStatuses = ["Active", "In Stock", "New"];

    if (isAssigned && !allowedStatuses.includes(targetStatus as string)) {
      alert(`⚠️ SOP-001 Validation Error: Assets in '${targetStatus}' status cannot be assigned to a user. Please set status to 'Active', 'In Stock' or 'New' first.`);
      return;
    }
    
    if (isEditing && selectedAsset) {
      try {
        await updateAssetAssignment(
          selectedAsset.id,
          newAsset.assignedTo || "Unassigned",
          newAsset.location || "Central Storage",
          newAsset.department || "",
          newAsset.status || "Active",
          {
            purchasePrice: newAsset.purchasePrice,
            purchaseDate: newAsset.purchaseDate,
            uom: newAsset.uom,
            specs: newAsset.specs,
            brand: newAsset.brand,
            remark2: newAsset.remark2,
            peripherals: newAsset.peripherals,
            category: newAsset.category
          }
        );
        setIsEditing(false);
        setSelectedAsset(null);
      } catch (error) {
        console.error("Failed to update asset", error);
        alert("Failed to update asset. Check SOP-001 protocols.");
      }
    } else {
      try {
        const asset: Partial<ITAsset> = {
          category: newAsset.category as any,
          model: newAsset.model!,
          serialNumber: newAsset.serialNumber!,
          purchaseDate: newAsset.purchaseDate || new Date().toISOString().split('T')[0],
          maintenanceDueDate: newAsset.maintenanceDueDate,
          location: newAsset.location || "Central Storage",
          department: newAsset.department,
          uom: newAsset.uom,
          assignedTo: newAsset.assignedTo || "Unassigned",
          status: "Active",
          brand: newAsset.brand,
          specs: newAsset.specs,
          remarks: newAsset.remarks,
          remark2: newAsset.remark2,
          purchasePrice: newAsset.purchasePrice,
          peripherals: newAsset.peripherals
        };

        await saveAsset(asset);
        setIsAdding(false);
        setNewAsset({ category: "Computer", status: "Active" });
      } catch (error) {
        console.error("Add failed", error);
        alert("Failed to register node.");
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

  const handleExportAssets = () => {
    const data = assets.map(a => ({
      "Asset ID": a.id,
      Category: a.category,
      Brand: a.brand || "-",
      Model: a.model,
      Specs: a.specs || "-",
      "Serial Number": a.serialNumber,
      "Purchase Date": a.purchaseDate,
      "Maintenance Due": a.maintenanceDueDate || "-",
      "Assigned To": a.assignedTo,
      Department: a.department || a.location || "-",
      Location: a.location,
      UOM: a.uom || "-",
      Price: a.purchasePrice || "0",
      Status: a.status,
      Remarks: a.remarks || "-",
      Remark2: a.remark2 || "-",
      Keyboard: a.peripherals?.keyboard || "-",
      Mouse: a.peripherals?.mouse || "-",
      USB: a.peripherals?.usb || "-",
      Fan: a.peripherals?.fan || "-"
    }));

    const worksheet = utils.json_to_sheet(data);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "IT Asset Inventory");
    writeFile(workbook, `IT_Asset_Inventory_${format(new Date(), "yyyyMMdd")}.xlsx`);
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
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.label}</span>
              <item.icon size={16} className={cn("opacity-40 group-hover:opacity-100 transition-opacity", item.color)} />
            </div>
            <div className="mt-3 flex items-end gap-2">
              <span className="text-2xl font-bold text-slate-800 leading-none">{item.value}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pb-0.5">{item.sub}</span>
            </div>
          </div>
        ))}
      </div>
      
      {/* Consolidated Breakdown Bar */}
      <div className="flex flex-wrap gap-2 items-center">
        {Object.entries(analysis.categories).map(([cat, count]) => (
          <div key={cat} className="bg-white px-3 py-1.5 flex items-center gap-3 border border-slate-200 rounded-lg hover:border-indigo-300 transition-colors shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{cat}</span>
            <span className="text-xs font-bold text-indigo-600">{count}</span>
          </div>
        ))}

        <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" />

        <div className="bg-amber-50/50 px-3 py-1.5 flex items-center gap-3 border border-amber-100 rounded-lg shadow-sm">
          <Keyboard size={12} className="text-amber-600" />
          <span className="text-[9px] font-bold text-amber-700 uppercase tracking-widest">Keyboards</span>
          <span className="text-xs font-bold text-amber-600">{analysis.peripherals.keyboards}</span>
        </div>
        <div className="bg-slate-50 px-3 py-1.5 flex items-center gap-3 border border-slate-200 rounded-lg shadow-sm">
          <MousePointer2 size={12} className="text-slate-600" />
          <span className="text-[9px] font-bold text-slate-700 uppercase tracking-widest">Mice</span>
          <span className="text-xs font-bold text-slate-600">{analysis.peripherals.mice}</span>
        </div>
        <div className="bg-indigo-50/50 px-3 py-1.5 flex items-center gap-3 border border-indigo-100 rounded-lg shadow-sm">
          <Usb size={12} className="text-indigo-600" />
          <span className="text-[9px] font-bold text-indigo-700 uppercase tracking-widest">USB Hubs</span>
          <span className="text-xs font-bold text-indigo-600">{analysis.peripherals.usbHubs}</span>
        </div>
        <div className="bg-cyan-50/50 px-3 py-1.5 flex items-center gap-3 border border-cyan-100 rounded-lg shadow-sm">
          <Wind size={12} className="text-cyan-600" />
          <span className="text-[9px] font-bold text-cyan-700 uppercase tracking-widest">Cooling Fans</span>
          <span className="text-xs font-bold text-cyan-600">{analysis.peripherals.fans}</span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 enterprise-card p-6">
        <div className="max-w-xl w-full">
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">IT Asset Inventory (SOP-001)</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            <div>
              <label className="block text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-1 ml-1">Dept</label>
              <select 
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-[10px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-bold"
              >
                {departments.map(dept => <option key={dept} value={dept || ""}>{dept || "None"}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-1 ml-1">User</label>
              <select 
                value={filterUser}
                onChange={(e) => setFilterUser(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-[10px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-bold"
              >
                {users.map(user => <option key={user} value={user || ""}>{user || "Unassigned"}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-1 ml-1">Category</label>
              <select 
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-[10px] text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-bold"
              >
                {categories.map(cat => <option key={cat} value={cat || ""}>{cat || "Other"}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-1 ml-1">Status</label>
              <select 
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-[10px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-bold"
              >
                {statuses.map(status => <option key={status} value={status || ""}>{status || "Unknown"}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="flex gap-3 w-full lg:w-auto">
          <button 
            onClick={handleExportAssets}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-emerald-100 transition-all border border-emerald-200"
          >
            <Download size={16} /> Export
          </button>
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-sm"
          >
            <Plus size={16} /> Register Asset
          </button>
        </div>
      </div>

      <div className="enterprise-card overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="uppercase tracking-widest text-slate-400">
                <th className="px-6 py-5 whitespace-nowrap">
                  <input 
                    type="checkbox" 
                    checked={selectedAssetIds.length > 0 && selectedAssetIds.length === filteredAssets.length}
                    onChange={toggleSelectAll}
                    className="w-3 h-3 rounded border-slate-300 bg-white accent-indigo-600 cursor-pointer"
                  />
                </th>
                <th className="px-4 py-5 text-[9px] font-bold">Hardware</th>
                <th className="px-6 py-5 text-[9px] font-bold">Assigned User</th>
                <th className="px-6 py-5 text-[9px] font-bold">Location</th>
                <th className="px-6 py-5 text-[9px] font-bold">Status</th>
                <th className="px-6 py-5 text-[9px] font-bold text-right">Linked Purchase Date</th>
                {isAdmin && <th className="px-6 py-5 text-[9px] font-bold text-center">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAssets.length === 0 ? (
                <tr>
                   <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <HardDrive className="text-slate-300" size={32} />
                      <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">Inventory Tracker Empty</p>
                      <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest leading-loose text-center px-4">
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
                    <tr className="bg-slate-50/30">
                      <td colSpan={isAdmin ? 7 : 6} className="px-6 py-2 text-[10px] font-bold text-indigo-600 uppercase tracking-widest">{group.label}</td>
                    </tr>
                  )}
                  {group.items.map((asset) => (
                    <tr 
                      key={asset.id} 
                      onClick={() => setSelectedAsset(asset)}
                      className={cn(
                        "hover:bg-slate-50 transition-colors group cursor-pointer text-slate-600",
                        selectedAssetIds.includes(asset.id) && "bg-indigo-50/50"
                      )}
                    >
                      <td className="px-6 py-4" onClick={(e) => toggleSelectAsset(asset.id, e)}>
                        <input 
                          type="checkbox" 
                          checked={selectedAssetIds.includes(asset.id)}
                          onChange={() => {}} 
                          className="w-3 h-3 rounded border-slate-300 bg-white accent-indigo-600 cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3 text-slate-700">
                          <div className="p-1.5 bg-slate-100 rounded-lg text-slate-400">
                            {asset.category === "Computer" && <Monitor size={14} />}
                            {asset.category === "Software" ? <RefreshCw size={14} /> : <HardDrive size={14} />}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-800">
                              {asset.brand && <span className="text-indigo-600 font-bold mr-2">[{asset.brand}]</span>}
                              {asset.model}
                            </p>
                            {asset.specs && <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1 italic">{asset.specs}</p>}
                            {asset.peripherals && (asset.peripherals.keyboard || asset.peripherals.mouse || asset.peripherals.usb || asset.peripherals.fan) && (
                              <div className="flex flex-wrap gap-2 mt-1">
                                {asset.peripherals.keyboard && <span className="text-[8px] bg-amber-50 text-amber-600 px-1 rounded border border-amber-100 flex items-center gap-1"><Keyboard size={8} /> {asset.peripherals.keyboard}</span>}
                                {asset.peripherals.mouse && <span className="text-[8px] bg-slate-50 text-slate-500 px-1 rounded border border-slate-200 flex items-center gap-1"><MousePointer2 size={8} /> {asset.peripherals.mouse}</span>}
                                {asset.peripherals.usb && <span className="text-[8px] bg-indigo-50 text-indigo-600 px-1 rounded border border-indigo-100 flex items-center gap-1"><Usb size={8} /> {asset.peripherals.usb}</span>}
                                {asset.peripherals.fan && <span className="text-[8px] bg-cyan-50 text-cyan-600 px-1 rounded border border-cyan-100 flex items-center gap-1"><Wind size={8} /> {asset.peripherals.fan}</span>}
                              </div>
                            )}
                            <p className="text-[9px] text-slate-400 font-mono italic">{asset.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[10px] text-indigo-600 font-bold uppercase tracking-widest">{asset.assignedTo}</td>
                      <td className="px-6 py-4 text-[10px] text-slate-500 font-bold uppercase">{(asset.department || asset.location) || "-"}</td>
                      <td className="px-6 py-4">
                         <span className={cn(
                           "text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border",
                           asset.status === "Active" ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                           asset.status === "New" ? "bg-indigo-50 text-indigo-600 border-indigo-100" :
                           "bg-rose-50 text-rose-600 border-rose-100"
                         )}>
                            {asset.status}
                         </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                         <span className="text-xs font-mono text-slate-400 font-bold">{asset.purchaseDate || "N/A"}</span>
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4 text-center">
                          <button 
                            disabled={isDeleting}
                            onClick={(e) => handleDelete(asset.id, e)}
                            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
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
                  className="w-4 h-4 rounded border-slate-300 bg-white accent-indigo-600 cursor-pointer"
                />
              </div>
              <div 
                onClick={() => setSelectedAsset(asset)}
                className="w-full text-left p-4 pl-12 hover:bg-slate-50 transition-colors active:bg-slate-100 cursor-pointer"
              >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold text-slate-400">{asset.id}</span>
                  <span className="text-[8px] px-1.5 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded font-bold uppercase tracking-widest">
                    {asset.category}
                  </span>
                  {(isMaintenanceNear(asset.maintenanceDueDate) || isMaintenanceOverdue(asset.maintenanceDueDate)) && (
                    <AlertTriangle size={10} className={cn("animate-pulse", isMaintenanceOverdue(asset.maintenanceDueDate) ? "text-rose-600" : "text-amber-600")} />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider",
                    asset.status === "Active" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                  )}>
                    {asset.status}
                  </div>
                  {isAdmin && (
                    <button 
                      disabled={isDeleting}
                      onClick={(e) => handleDelete(asset.id, e)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
              
              <div className="mb-4">
                <p className="text-sm font-semibold text-slate-800 leading-tight">
                  <span className="text-slate-400 mr-1 font-medium">{asset.brand}</span>
                  {asset.model}
                </p>
                {asset.specs && <p className="text-[10px] text-slate-400 mt-1 italic leading-relaxed">{asset.specs}</p>}
                {asset.peripherals && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {asset.peripherals.keyboard && (
                      <div className="flex items-center gap-1 bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded text-[8px] border border-amber-100 italic">
                        <Keyboard size={8} /> {asset.peripherals.keyboard}
                      </div>
                    )}
                    {asset.peripherals.mouse && (
                      <div className="flex items-center gap-1 bg-slate-50 text-slate-600 px-1.5 py-0.5 rounded text-[8px] border border-slate-200 italic">
                        <MousePointer2 size={8} /> {asset.peripherals.mouse}
                      </div>
                    )}
                    {asset.peripherals.usb && (
                      <div className="flex items-center gap-1 bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded text-[8px] border border-indigo-100 italic">
                        <Usb size={8} /> {asset.peripherals.usb}
                      </div>
                    )}
                    {asset.peripherals.fan && (
                      <div className="flex items-center gap-1 bg-cyan-50 text-cyan-600 px-1.5 py-0.5 rounded text-[8px] border border-cyan-100 italic">
                        <Wind size={8} /> {asset.peripherals.fan}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 p-2 bg-slate-50 border border-slate-100 rounded-lg">
                <div className="flex flex-col">
                  <span className="text-[7px] text-slate-400 uppercase font-bold tracking-widest">Dept</span>
                  <span className="text-[9px] text-slate-600 font-bold uppercase truncate">{(asset.department || asset.location) || "-"}</span>
                </div>
                <div className="flex flex-col border-l border-slate-200 pl-2">
                  <span className="text-[7px] text-slate-400 uppercase font-bold tracking-widest">User</span>
                  <span className="text-[9px] text-indigo-600 font-bold uppercase truncate">{asset.assignedTo || "Unassigned"}</span>
                </div>
                <div className="flex flex-col border-l border-slate-200 pl-2 text-right">
                  <span className="text-[7px] text-slate-400 uppercase font-bold tracking-widest">Price</span>
                  <span className="text-[9px] text-emerald-600 font-bold font-mono">
                    {asset.purchasePrice ? Number(asset.purchasePrice).toLocaleString() : "0"} <span className="text-[7px] opacity-60">MMK</span>
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
              <span className="flex items-center justify-center w-6 h-6 bg-cyan-600 rounded-full text-[10px] font-bold text-white">
                {selectedAssetIds.length}
              </span>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Selected</span>
              <button 
                onClick={() => setSelectedAssetIds([])}
                className="text-[10px] font-bold text-cyan-400 uppercase hover:text-white transition-colors"
              >
                Clear
              </button>
            </div>
            
            <div className="flex items-center gap-3 pr-4 border-r border-white/10">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Bulk Action</span>
              <select 
                onChange={(e) => handleBulkUpdate({ status: e.target.value as any })}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-[11px] text-white focus:outline-none focus:border-cyan-500/50 transition-all font-bold"
                value=""
              >
                <option value="" disabled>Change Status</option>
                <option value="Active">Set Active</option>
                <option value="Maintenance">Set Maintenance</option>
                <option value="Disposed">Set Disposed</option>
              </select>
              
              <select 
                onChange={(e) => handleBulkUpdate({ assignedTo: e.target.value })}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-[11px] text-white focus:outline-none focus:border-cyan-500/50 transition-all font-bold"
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
                if (confirm(`Delete ${selectedAssetIds.length} assets permanently?`)) {
                  setAssets(assets.filter(a => !selectedAssetIds.includes(a.id)));
                  setSelectedAssetIds([]);
                }
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-rose-600/20 text-rose-400 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all border border-rose-500/30"
            >
              <ShieldCheck size={14} /> Delete
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
                  <h3 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                    <Monitor className="text-indigo-600" size={20} />
                    Asset Details: {selectedAsset.id}
                  </h3>
                  <p className="text-xs text-slate-400 uppercase font-bold tracking-widest mt-1">Full hardware audit specification</p>
                </div>
                <button onClick={() => setSelectedAsset(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Core Configuration</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between border-b border-slate-100 pb-2">
                        <span className="text-xs text-slate-500">Model</span>
                        <span className="text-xs font-bold text-slate-800">{selectedAsset.model}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-2">
                        <span className="text-xs text-slate-500">Serial</span>
                        <span className="text-xs font-mono text-slate-600">{selectedAsset.serialNumber}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-2">
                        <span className="text-xs text-slate-500">Specs</span>
                        <span className="text-xs text-indigo-600 font-bold">{selectedAsset.specs || "Standard Build"}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-2">
                        <span className="text-xs text-slate-500">Purchase Date</span>
                        <span className="text-xs font-bold text-slate-800">{selectedAsset.purchaseDate}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-2">
                        <span className="text-xs text-slate-500">Unit Price</span>
                        <span className="text-xs text-emerald-600 font-bold font-mono">{selectedAsset.purchasePrice ? Number(selectedAsset.purchasePrice).toLocaleString() : "0"} MMK</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-2 items-center">
                        <span className="text-xs text-slate-500">Maintenance Due</span>
                        <div className="flex flex-col items-end">
                          <span className={cn(
                            "text-xs font-bold",
                            isMaintenanceOverdue(selectedAsset.maintenanceDueDate) ? "text-rose-600" :
                            isMaintenanceNear(selectedAsset.maintenanceDueDate) ? "text-amber-600" : "text-slate-800"
                          )}>
                            {selectedAsset.maintenanceDueDate || "Not set"}
                          </span>
                          {(isMaintenanceNear(selectedAsset.maintenanceDueDate) || isMaintenanceOverdue(selectedAsset.maintenanceDueDate)) && (
                            <span className="text-[8px] font-bold uppercase tracking-tighter text-amber-500 animate-pulse">
                              {isMaintenanceOverdue(selectedAsset.maintenanceDueDate) ? "Overdue" : "Due Soon"}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-2">
                        <span className="text-xs text-slate-400">UOM</span>
                        <span className="text-xs font-bold text-slate-800">{selectedAsset.uom || "Unit"}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-2">
                        <span className="text-xs text-slate-400">Section</span>
                        <span className="text-xs font-bold text-slate-800">{selectedAsset.remark2 || "-"}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Assignment Data</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between border-b border-slate-100 pb-2">
                        <span className="text-xs text-slate-500">Assigned User</span>
                        <span className="text-xs font-bold text-slate-800">{selectedAsset.assignedTo}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-2">
                        <span className="text-xs text-slate-500">Department</span>
                        <span className="text-xs font-bold text-slate-800">{selectedAsset.department || "-"}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-2">
                        <span className="text-xs text-slate-500">Location</span>
                        <span className="text-xs font-bold text-slate-800">{selectedAsset.location}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                      {selectedAsset.category === "Mobile" ? (
                        <>
                          <Smartphone size={14} className="text-indigo-600" />
                          Cellular Network & IMEI
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
                              <p className="text-[10px] font-bold text-slate-500 uppercase">SIM Card / Number</p>
                              <p className="text-xs text-slate-800 font-medium">{selectedAsset.remarks || "No SIM Data"}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-1 h-1 bg-indigo-600 rounded-full mt-2" />
                            <div>
                              <p className="text-[10px] font-bold text-slate-500 uppercase">Hardware Specs</p>
                              <p className="text-xs text-slate-800 font-medium">{selectedAsset.specs || "Standard"}</p>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-start gap-3">
                            <div className="w-1 h-1 bg-indigo-600 rounded-full mt-2" />
                            <div>
                              <p className="text-[10px] font-bold text-slate-500 uppercase">Keyboard</p>
                              <p className="text-xs text-slate-800 font-medium">{selectedAsset.peripherals?.keyboard || "Standard Issue"}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-1 h-1 bg-indigo-600 rounded-full mt-2" />
                            <div>
                              <p className="text-[10px] font-bold text-slate-500 uppercase">Mouse</p>
                              <p className="text-xs text-slate-800 font-medium">{selectedAsset.peripherals?.mouse || "Standard Issue"}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-1 h-1 bg-indigo-600 rounded-full mt-2" />
                            <div>
                              <p className="text-[10px] font-bold text-slate-500 uppercase">USB Config</p>
                              <p className="text-xs text-slate-800 font-medium">{selectedAsset.peripherals?.usb || "N/A"}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-1 h-1 bg-indigo-600 rounded-full mt-2" />
                            <div>
                              <p className="text-[10px] font-bold text-slate-500 uppercase">Cooling/Fan</p>
                              <p className="text-xs text-slate-800 font-medium">{selectedAsset.peripherals?.fan || "Standard Tray"}</p>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 pt-6 border-t border-white/10 flex justify-end gap-3">
                <button 
                  onClick={() => {
                    setNewAsset({ ...selectedAsset });
                    setIsEditing(true);
                    setIsAdding(true);
                    setSelectedAsset(null);
                  }}
                  className="px-6 py-2 bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-cyan-600 hover:text-white transition-all"
                >
                  Edit Asset
                </button>
                <button 
                  onClick={() => setSelectedAsset(null)}
                  className="px-6 py-2 bg-white/10 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-white/20 transition-all"
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
              <div className="p-6 sm:p-8 border-b border-slate-100 shrink-0 bg-white">
                <h3 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight">
                  {isEditing ? `Edit Asset: ${newAsset.id}` : "Infrastructure Node Registration"}
                </h3>
              </div>
              
              <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar space-y-6 flex-1 bg-white">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Category</label>
                    <select 
                      value={newAsset.category}
                      onChange={e => setNewAsset({...newAsset, category: e.target.value as any})}
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="Computer">Computer</option>
                      <option value="Printer">Printer</option>
                      <option value="Network">Network</option>
                      <option value="Mobile">Mobile</option>
                      <option value="Scanner">Scanner</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">UOM</label>
                    <input 
                      type="text" 
                      value={newAsset.uom || ""}
                      onChange={e => setNewAsset({...newAsset, uom: e.target.value})}
                      placeholder="e.g., Unit, Set" 
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Brand</label>
                    <input 
                      type="text" 
                      value={newAsset.brand || ""}
                      onChange={e => setNewAsset({...newAsset, brand: e.target.value})}
                      placeholder="e.g., HP, Dell, Huawei" 
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Model</label>
                    <input 
                      type="text" 
                      value={newAsset.model || ""}
                      onChange={e => setNewAsset({...newAsset, model: e.target.value})}
                      placeholder="e.g., Latitude 5420" 
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Specs (CPU/RAM/SSD)</label>
                    <input 
                      type="text" 
                      value={newAsset.specs || ""}
                      onChange={e => setNewAsset({...newAsset, specs: e.target.value})}
                      placeholder="e.g., i5/8GB/256GB" 
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Serial Number</label>
                    <input 
                      type="text" 
                      value={newAsset.serialNumber || ""}
                      onChange={e => setNewAsset({...newAsset, serialNumber: e.target.value})}
                      placeholder="Unique identifier" 
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Purchase Price (MMK)</label>
                    <input 
                      type="text" 
                      value={newAsset.purchasePrice || ""}
                      onChange={e => setNewAsset({...newAsset, purchasePrice: e.target.value})}
                      placeholder="400,000" 
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Procure Date</label>
                    <input 
                      type="date"
                      value={newAsset.purchaseDate || ""}
                      onChange={e => setNewAsset({...newAsset, purchaseDate: e.target.value})}
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-2">Maintenance Due</label>
                    <input 
                      type="date"
                      value={newAsset.maintenanceDueDate || ""}
                      onChange={e => setNewAsset({...newAsset, maintenanceDueDate: e.target.value})}
                      className="w-full px-4 py-3.5 bg-slate-50 border border-amber-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Status</label>
                    <select 
                      value={newAsset.status || "Active"}
                      onChange={e => setNewAsset({...newAsset, status: e.target.value as any})}
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="Active">Active</option>
                      <option value="Maintenance">Maintenance</option>
                      <option value="Replacement Required">Replacement Required</option>
                      <option value="Decommissioned">Decommissioned</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Assigned To</label>
                    <input 
                      type="text" 
                      value={newAsset.assignedTo || ""}
                      onChange={e => setNewAsset({...newAsset, assignedTo: e.target.value})}
                      placeholder="Staff Name" 
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Department</label>
                    <input 
                      type="text" 
                      value={newAsset.department || ""}
                      onChange={e => setNewAsset({...newAsset, department: e.target.value})}
                      placeholder="e.g., MK, Finance" 
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Location</label>
                    <input 
                      type="text" 
                      value={newAsset.location || ""}
                      onChange={e => setNewAsset({...newAsset, location: e.target.value})}
                      placeholder="Room or Dept" 
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Remark2 (Section)</label>
                  <input 
                    type="text" 
                    value={newAsset.remark2 || ""}
                    onChange={e => setNewAsset({...newAsset, remark2: e.target.value})}
                    placeholder="Additional notes" 
                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <h4 className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Package size={14} />
                    Peripheral Details (Optional)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Keyboard</label>
                      <input 
                        type="text" 
                        value={newAsset.peripherals?.keyboard || ""}
                        onChange={e => setNewAsset({...newAsset, peripherals: { ...newAsset.peripherals, keyboard: e.target.value }})}
                        placeholder="Model / Serial" 
                        className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Mouse</label>
                      <input 
                        type="text" 
                        value={newAsset.peripherals?.mouse || ""}
                        onChange={e => setNewAsset({...newAsset, peripherals: { ...newAsset.peripherals, mouse: e.target.value }})}
                        placeholder="Model / Serial" 
                        className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">USB Ports</label>
                      <input 
                        type="text" 
                        value={newAsset.peripherals?.usb || ""}
                        onChange={e => setNewAsset({...newAsset, peripherals: { ...newAsset.peripherals, usb: e.target.value }})}
                        placeholder="e.g., 4 Ports, USB-C Hub" 
                        className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Cooling Fan</label>
                      <input 
                        type="text" 
                        value={newAsset.peripherals?.fan || ""}
                        onChange={e => setNewAsset({...newAsset, peripherals: { ...newAsset.peripherals, fan: e.target.value }})}
                        placeholder="Model / Quantity" 
                        className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
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
                  className="w-full sm:flex-1 py-4 sm:py-3 px-4 bg-slate-200 text-slate-600 rounded-xl font-bold uppercase text-[10px] tracking-widest hover:bg-slate-300 transition-colors order-2 sm:order-1"
                >
                  Terminate
                </button>
                <button 
                  onClick={handleAddAsset}
                  className="w-full sm:flex-1 py-4 sm:py-3 px-4 bg-indigo-600 text-white rounded-xl font-bold uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-900/40 hover:bg-indigo-700 transition-colors order-1 sm:order-2"
                >
                  {isEditing ? "Save Changes" : "Register Node"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SecurityModule({ backups, setBackups, requests, setRequests, searchTerm }: { 
  backups: BackupLog[], 
  setBackups: (b: BackupLog[]) => void,
  requests: CCTVRequest[],
  setRequests: (r: CCTVRequest[]) => void,
  searchTerm: string
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
              <h2 className="text-base lg:text-lg font-bold text-slate-800 flex items-center gap-2 tracking-tight">
                <HardDrive size={18} className="text-indigo-600" />
                Data Integrity Cluster
              </h2>
            </div>
            <button 
              onClick={handlePerformBackup}
              className="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-sm"
            >
              Trigger Backup
            </button>
          </div>
          <div className="enterprise-card overflow-hidden">
            {/* Desktop Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Date</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Node Path</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {backups.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-xs font-semibold text-slate-600 font-mono italic">{log.date}</td>
                      <td className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">{log.storageType}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase text-emerald-600">
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
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase text-emerald-400 bg-emerald-500/5">
                      <CheckCircle2 size={10} /> {log.status}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{log.storageType}</span>
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
            <h2 className="text-lg lg:text-xl font-bold tracking-tight">Security Protocol</h2>
          </div>
          <p className="text-[11px] lg:text-xs text-red-100/70 leading-relaxed mb-6 lg:mb-8 font-medium relative z-10 max-w-sm">
            CCTV review requires multi-stage authorization. 
            Any unauthorized review, copying, or sharing of footage is strictly PROHIBITED and will result in disciplinary action.
          </p>
          <div className="relative z-10">
            <button 
              onClick={() => setIsAddingRequest(true)}
              className="w-full sm:w-auto px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg shadow-red-900/40"
            >
              Submit Footage Request
            </button>
          </div>
        </div>
      </div>

      {/* CCTV Requests Table */}
      <div className="space-y-4 lg:space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 enterprise-card p-5 lg:p-6">
          <div>
            <h2 className="text-base lg:text-lg font-bold text-slate-800 flex items-center gap-2 tracking-tight">
              <Camera size={18} className="text-rose-500" />
              CCTV Request Log
            </h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Management Review Required</p>
          </div>
          <button 
            onClick={handleExportCCTV}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-100 transition-all border border-slate-200 shadow-sm"
          >
            <Download size={16} /> Export Logs
          </button>
        </div>
        <div className="enterprise-card overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">ID</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Requester</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Footage Date</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Reason</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Approval</th>
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
                      <td className="px-6 py-4 text-xs font-mono font-bold text-slate-500">{req.id}</td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-800 uppercase tracking-wider">{req.requester}</td>
                      <td className="px-6 py-4 text-xs text-slate-500 font-mono italic">{req.dateOfFootage}</td>
                      <td className="px-6 py-4 text-xs text-slate-500 italic max-w-xs truncate">{req.reason}</td>
                      <td className="px-6 py-4 text-right">
                        <span className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase border",
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
                <div key={req.id} className="p-4 space-y-3 text-slate-600">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-mono font-bold text-slate-400">{req.id}</span>
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border",
                      req.approvalStatus === "Approved" ? "text-emerald-600 border-emerald-100" : 
                      req.approvalStatus === "Denied" ? "text-rose-600 border-rose-100" : "text-amber-600 border-amber-100"
                    )}>
                      {req.approvalStatus}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">{req.requester}</p>
                    <p className="text-[10px] text-slate-500 font-mono italic mt-1">Footage on: {req.dateOfFootage}</p>
                  </div>
                  <p className="text-[11px] text-slate-500 italic line-clamp-2 bg-slate-50 p-2 rounded-lg border border-slate-100">{req.reason}</p>
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
              <h3 className="text-xl font-bold text-white mb-6 lg:mb-8 tracking-tight flex items-center gap-2">
                <Camera size={20} className="text-red-400" />
                Evidence Review Request
              </h3>
              <div className="space-y-5 lg:space-y-6">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Requester Name</label>
                  <input 
                    type="text" 
                    onChange={e => setNewRequest({...newRequest, requester: e.target.value})}
                    placeholder="Staff identifier..." 
                    className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:bg-white/10"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Date of Footage</label>
                  <input 
                    type="date"
                    onChange={e => setNewRequest({...newRequest, dateOfFootage: e.target.value})}
                    className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:bg-white/10"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Justification / Reason</label>
                  <textarea 
                    rows={4}
                    onChange={e => setNewRequest({...newRequest, reason: e.target.value})}
                    placeholder="Provide specific reason for review..." 
                    className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:bg-white/10 resize-none"
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 mt-10">
                <button 
                  onClick={() => setIsAddingRequest(false)}
                  className="w-full py-4 sm:py-3 px-4 bg-white/5 text-slate-400 rounded-xl font-bold uppercase text-[10px] tracking-widest hover:bg-white/10 transition-colors order-2 sm:order-1"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAddRequest}
                  className="w-full py-4 sm:py-3 px-4 bg-red-600 text-white rounded-xl font-bold uppercase text-[10px] tracking-widest hover:bg-red-500 transition-all shadow-lg shadow-red-900/40 order-1 sm:order-2"
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

function RenewalsModule({ renewals, setRenewals }: { renewals: RenewalRecord[], setRenewals: (r: RenewalRecord[]) => void }) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [infoRenewal, setInfoRenewal] = useState<RenewalRecord | null>(null);
  const [newRenewal, setNewRenewal] = useState<Partial<RenewalRecord>>({
    currency: "MMK",
    billingCycle: "Yearly",
    requiredDocuments: []
  });

  const getStatus = (expireDate: string) => {
    if (!expireDate) return "Active";
    const now = new Date();
    const expire = new Date(expireDate);
    const diff = expire.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (days < 0) return "Expired";
    if (days <= 30) return "Expiring Soon";
    return "Active";
  };

  const getStatusColor = (expireDate: string) => {
    const status = getStatus(expireDate);
    if (status === "Expired") return "text-rose-600 bg-rose-50 border-rose-100";
    if (status === "Expiring Soon") return "text-amber-600 bg-amber-50 border-amber-100";
    return "text-emerald-600 bg-emerald-50 border-emerald-100";
  };

  const upcomingRenewals = renewals
    .filter(r => getStatus(r.expireDate) === "Expiring Soon" || getStatus(r.expireDate) === "Expired")
    .sort((a, b) => new Date(a.expireDate).getTime() - new Date(b.expireDate).getTime());

  const totalUpcomingCost = upcomingRenewals
    .filter(r => r.currency === "MMK")
    .reduce((sum, r) => sum + r.price, 0);

  const handleSave = () => {
    if (!newRenewal.serviceName || !newRenewal.shopName || !newRenewal.expireDate || !newRenewal.price) return;
    const renewal: Partial<RenewalRecord> = {
      ...newRenewal,
      id: editingId || undefined,
      price: Number(newRenewal.price),
      status: getStatus(newRenewal.expireDate!) as any,
    };
    
    saveRenewal(renewal).then(() => {
      setIsAdding(false);
      setEditingId(null);
      setNewRenewal({ currency: "MMK", billingCycle: "Yearly", requiredDocuments: [] });
    }).catch(err => console.error("Failed to save renewal", err));
  };

  const startEdit = (r: RenewalRecord) => {
    setNewRenewal(r);
    setEditingId(r.id);
    setIsAdding(true);
  };

  const toggleDoc = (doc: string) => {
    const docs = newRenewal.requiredDocuments || [];
    if (docs.includes(doc)) {
      setNewRenewal({ ...newRenewal, requiredDocuments: docs.filter(d => d !== doc) });
    } else {
      setNewRenewal({ ...newRenewal, requiredDocuments: [...docs, doc] });
    }
  };

  return (
    <div className="space-y-6">
       {/* Header with Stats */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="enterprise-card p-6 border-l-4 border-indigo-500 shadow-sm">
             <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Upcoming Cost (30 Days)</div>
             <div className="text-2xl font-bold text-slate-900 font-mono">{totalUpcomingCost.toLocaleString()} <span className="text-xs text-indigo-600">MMK</span></div>
          </div>
          <div className="enterprise-card p-6 border-l-4 border-amber-500 shadow-sm">
             <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 font-sans">Action Needed</div>
             <div className="text-2xl font-bold text-slate-900 font-mono">{upcomingRenewals.length} <span className="text-xs text-amber-500 font-sans">ITEMS</span></div>
          </div>
          <div className="enterprise-card p-6 border-l-4 border-emerald-500 flex items-center justify-between shadow-sm">
             <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Active Services</div>
                <div className="text-2xl font-bold text-slate-900 font-mono">{renewals.length}</div>
             </div>
             <button 
                onClick={() => setIsAdding(true)}
                className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center hover:bg-indigo-700 transition-all text-white shadow-lg shadow-indigo-200"
             >
                <Plus size={24} />
             </button>
          </div>
       </div>

       {/* Module Header */}
       <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">IT Service Renewal Monitoring</h2>
            <p className="text-xs text-slate-500 mt-1 uppercase font-bold tracking-widest">SOP-004: IT Renewal Tracker</p>
          </div>
       </div>

       {/* Renewal Display */}
       <div className="enterprise-card overflow-hidden shadow-xl border-slate-100">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-sans">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr className="uppercase tracking-widest text-slate-500 font-bold text-[10px]">
                  <th className="px-6 py-4">Shop / Service</th>
                  <th className="px-6 py-4">Provider Info</th>
                  <th className="px-6 py-4">Expire Date</th>
                  <th className="px-6 py-4">Cost</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {renewals.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                       <div className="flex flex-col items-center gap-3 text-slate-300">
                          <RefreshCw size={32} className="animate-spin-slow" />
                          <p className="text-sm font-bold uppercase tracking-widest">Initialising Service Tracker...</p>
                       </div>
                    </td>
                  </tr>
                ) : renewals.sort((a, b) => new Date(a.expireDate).getTime() - new Date(b.expireDate).getTime()).map(r => {
                  const status = getStatus(r.expireDate);
                  return (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center border",
                            status === "Expiring Soon" ? "bg-amber-50 border-amber-200 text-amber-500" :
                            status === "Expired" ? "bg-rose-50 border-rose-200 text-rose-500" :
                            "bg-indigo-50 border-indigo-200 text-indigo-600"
                          )}>
                             <RefreshCw size={18} className={status === "Expiring Soon" ? "animate-spin-slow" : ""} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{r.shopName}</p>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">{r.serviceName}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                         <div className="space-y-1">
                            <p className="text-[10px] font-bold text-slate-800 uppercase tracking-tight">{r.provider || r.ispName || "Unknown"}</p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase">{r.billingCycle}</p>
                         </div>
                      </td>
                      <td className="px-6 py-4">
                         <div className="flex items-center gap-1.5">
                            <Calendar size={12} className={status !== "Active" ? "text-amber-500" : "text-slate-400"} />
                            <span className={cn(
                              "text-xs font-bold font-mono",
                              status === "Expiring Soon" ? "text-amber-500" :
                              status === "Expired" ? "text-rose-500" : "text-slate-600"
                            )}>
                              {r.expireDate}
                            </span>
                         </div>
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-slate-900 text-xs">
                        {r.price.toLocaleString()} <span className="text-[10px] text-slate-400 font-sans">{r.currency}</span>
                      </td>
                      <td className="px-6 py-4">
                         <span className={cn(
                           "text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border shadow-sm",
                           getStatusColor(r.expireDate)
                         )}>
                            {status}
                         </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                         <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => setInfoRenewal(r)}
                              className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-all border border-indigo-100"
                              title="How to Renew"
                            >
                               <Info size={16} />
                            </button>
                            <button 
                              onClick={() => startEdit(r)}
                              className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-all border border-slate-200"
                              title="Edit Record"
                            >
                               <Edit2 size={16} />
                            </button>
                         </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
       </div>

       {/* How to Renew Info Popup */}
       <AnimatePresence>
          {infoRenewal && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[80] p-4">
               <motion.div 
                 initial={{ scale: 0.9, opacity: 0, y: 20 }}
                 animate={{ scale: 1, opacity: 1, y: 0 }}
                 exit={{ scale: 0.9, opacity: 0, y: 20 }}
                 className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl"
               >
                  <div className={cn(
                    "p-8 text-white relative overflow-hidden",
                    getStatus(infoRenewal.expireDate) === "Expired" ? "bg-rose-600" :
                    getStatus(infoRenewal.expireDate) === "Expiring Soon" ? "bg-amber-500" : "bg-indigo-600"
                  )}>
                     <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                        <RefreshCw size={120} className="animate-spin-slow" />
                     </div>
                     <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                           <div className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[9px] font-bold uppercase tracking-widest border border-white/20">
                              Renewal Instruction
                           </div>
                           <button onClick={() => setInfoRenewal(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                              <X size={20} />
                           </button>
                        </div>
                        <h3 className="text-2xl font-bold tracking-tight mb-1">{infoRenewal.serviceName}</h3>
                        <p className="text-white/80 text-xs font-bold uppercase tracking-widest">{infoRenewal.shopName}</p>
                     </div>
                  </div>

                  <div className="p-8 space-y-6 bg-white">
                     <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1">
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                              <CreditCard size={10} /> Renewal Method
                           </p>
                           <p className="text-sm font-bold text-slate-800">{infoRenewal.renewalMethod || "Not specified"}</p>
                        </div>
                        <div className="space-y-1">
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                              <User size={10} /> Provider / Contact
                           </p>
                           <div className="space-y-0.5">
                              <p className="text-sm font-bold text-slate-800">{infoRenewal.provider || infoRenewal.contactPerson || "Staff/Admin"}</p>
                              {infoRenewal.contactPhone && (
                                <p className="text-xs text-indigo-600 font-bold flex items-center gap-1">
                                   <Phone size={10} /> {infoRenewal.contactPhone}
                                </p>
                              )}
                           </div>
                        </div>
                     </div>

                     <div className="space-y-3">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                           <ClipboardList size={10} /> Required Documents
                        </p>
                        <div className="flex flex-wrap gap-2">
                           {infoRenewal.requiredDocuments && infoRenewal.requiredDocuments.length > 0 ? infoRenewal.requiredDocuments.map((doc, i) => (
                             <span key={i} className="px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-xs font-medium text-slate-600 flex items-center gap-1.5">
                                <Check size={12} className="text-emerald-500" /> {doc}
                             </span>
                           )) : (
                             <span className="text-xs text-slate-400 italic">No specific documents required.</span>
                           )}
                        </div>
                     </div>

                     {infoRenewal.websiteLink && (
                       <div className="pt-2">
                          <a 
                            href={infoRenewal.websiteLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="w-full py-4 bg-slate-900 text-white rounded-2xl flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                          >
                             Visit Online Portal <ExternalLink size={14} />
                          </a>
                       </div>
                     )}
                     
                     <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-3">
                        <AlertCircle className="text-amber-500 shrink-0" size={18} />
                        <div>
                           <p className="text-[10px] font-bold text-amber-800 uppercase tracking-widest mb-1">Important Note</p>
                           <p className="text-[11px] text-amber-700 leading-relaxed font-sans">
                              {infoRenewal.remarks || "Please perform renewal at least 3 days before expiry to avoid service interruption."}
                           </p>
                        </div>
                     </div>
                  </div>
               </motion.div>
            </div>
          )}
       </AnimatePresence>

       {/* Add/Edit Modal */}
       <AnimatePresence>
          {isAdding && (
              <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[70] p-4 overflow-y-auto">
                <motion.div 
                   initial={{ scale: 0.95, opacity: 0 }}
                   animate={{ scale: 1, opacity: 1 }}
                   exit={{ scale: 0.95, opacity: 0 }}
                   className="bg-white rounded-[2.5rem] w-full max-w-2xl p-8 sm:p-10 shadow-2xl relative my-auto border border-slate-100"
                >
                  <div className="flex justify-between items-center mb-8">
                     <div>
                        <h3 className="text-xl font-bold text-slate-900 tracking-tight">{editingId ? "Update Service Record" : "Add New Service Record"}</h3>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">SOP-004 Documentation Sync</p>
                     </div>
                     <button onClick={() => { setIsAdding(false); setEditingId(null); }} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"><X size={24} /></button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                     {/* Basic Info */}
                     <div className="space-y-6">
                        <h4 className="text-[10px] font-bold text-indigo-600 uppercase tracking-[0.2em] pb-2 border-b border-indigo-50">Basic Information</h4>
                        
                        <div className="space-y-4">
                           <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Shop Name / Branch</label>
                              <input 
                                type="text" 
                                value={newRenewal.shopName || ""}
                                onChange={e => setNewRenewal({...newRenewal, shopName: e.target.value})}
                                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-sans"
                                placeholder="e.g. TGI Main Branch"
                              />
                           </div>
                           <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Service Type</label>
                              <input 
                                type="text" 
                                value={newRenewal.serviceName || ""}
                                onChange={e => setNewRenewal({...newRenewal, serviceName: e.target.value})}
                                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-sans"
                                placeholder="e.g. FIBER Internet"
                              />
                           </div>
                           <div className="grid grid-cols-2 gap-4">
                              <div>
                                 <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Expiry Date</label>
                                 <input 
                                   type="date" 
                                   value={newRenewal.expireDate || ""}
                                   onChange={e => setNewRenewal({...newRenewal, expireDate: e.target.value})}
                                   className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-sans"
                                 />
                              </div>
                              <div>
                                 <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Price (Amount)</label>
                                 <input 
                                   type="number" 
                                   value={newRenewal.price || ""}
                                   onChange={e => setNewRenewal({...newRenewal, price: Number(e.target.value)})}
                                   className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-sans font-mono"
                                   placeholder="0"
                                 />
                              </div>
                           </div>
                        </div>
                     </div>

                     {/* Renewal Instructions */}
                     <div className="space-y-6">
                        <h4 className="text-[10px] font-bold text-emerald-600 uppercase tracking-[0.2em] pb-2 border-b border-emerald-50">Renewal Instructions</h4>
                        
                        <div className="space-y-4">
                           <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Renewal Method</label>
                              <select 
                                value={newRenewal.renewalMethod || ""}
                                onChange={e => setNewRenewal({...newRenewal, renewalMethod: e.target.value})}
                                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all font-sans appearance-none"
                              >
                                 <option value="">Select Method...</option>
                                 <option value="Online Payment">Online Payment (KPay/Bank)</option>
                                 <option value="Bank Transfer">Bank Transfer (Company A/C)</option>
                                 <option value="Office Visit">Office Visit (In-Person)</option>
                                 <option value="Agent Pickup">Agent Pickup (Doorstep)</option>
                              </select>
                           </div>
                           <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Website Link</label>
                              <input 
                                type="url" 
                                value={newRenewal.websiteLink || ""}
                                onChange={e => setNewRenewal({...newRenewal, websiteLink: e.target.value})}
                                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all font-sans"
                                placeholder="https://portal.provider.com"
                              />
                           </div>
                           <div className="grid grid-cols-2 gap-4">
                              <div>
                                 <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Contact Person</label>
                                 <input 
                                   type="text" 
                                   value={newRenewal.contactPerson || ""}
                                   onChange={e => setNewRenewal({...newRenewal, contactPerson: e.target.value})}
                                   className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all font-sans"
                                   placeholder="Name"
                                 />
                              </div>
                              <div>
                                 <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Phone Number</label>
                                 <input 
                                   type="text" 
                                   value={newRenewal.contactPhone || ""}
                                   onChange={e => setNewRenewal({...newRenewal, contactPhone: e.target.value})}
                                   className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all font-sans font-mono"
                                   placeholder="09..."
                                 />
                              </div>
                           </div>
                           <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Required Documents</label>
                              <div className="flex flex-wrap gap-2">
                                 {["ID Card", "Original Invoice", "NID Copy", "Payment Proof", "Company Letter"].map(docName => (
                                   <button 
                                     key={docName}
                                     onClick={() => toggleDoc(docName)}
                                     className={cn(
                                       "px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all",
                                       newRenewal.requiredDocuments?.includes(docName) 
                                         ? "bg-emerald-600 text-white border-emerald-600 shadow-sm" 
                                         : "bg-white text-slate-400 border-slate-200 hover:border-emerald-200"
                                     )}
                                   >
                                      {docName}
                                   </button>
                                 ))}
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="flex gap-4">
                     <button 
                       onClick={() => { setIsAdding(false); setEditingId(null); }}
                       className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-slate-200 transition-all"
                     >
                       Discard
                     </button>
                     <button 
                       onClick={handleSave}
                       className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                     >
                       {editingId ? "Update Monitor Record" : "Create Monitor Entry"}
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
  setPurchases: (p: PurchaseRecord[]) => void,
  assets: ITAsset[],
  setAssets: (a: ITAsset[]) => void,
  isAdmin: boolean
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newPurchase, setNewPurchase] = useState<Partial<PurchaseRecord>>({
    status: "Received",
    currency: "MMK",
    quantity: 1
  });

  const combinedPurchases = React.useMemo(() => {
    const list = [...purchases];
    
    // Find assets that aren't linked to a purchase record ID
    // We filter for historical assets that have a valid purchase date
    const unlinkedAssets = assets.filter(a => {
      const isHistorical = a.purchaseDate && a.purchaseDate !== "Unknown" && a.purchaseDate !== "";
      const isNotLinked = !a.purchaseRecordId;
      return isHistorical && isNotLinked;
    });
    
    // Group unlinked assets by date and model to create "Legacy Purchase Records"
    const groups: Record<string, ITAsset[]> = {};
    unlinkedAssets.forEach(a => {
      const key = `${a.purchaseDate}_${a.model}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(a);
    });

    Object.values(groups).forEach(group => {
      const first = group[0];
      // Check if this virtual purchase overlaps with an existing real purchase record
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
      remarks: newPurchase.remarks
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
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleDelete = async (recordId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this purchase record?")) return;
    
    setIsDeleting(true);
    try {
       await deletePurchaseRecord(recordId);
       setPurchases(purchases.filter(p => p.id !== recordId));
    } catch (error) {
       console.error("Delete failed", error);
       alert("Insufficient permissions to delete records.");
    } finally {
       setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="enterprise-card p-6 border-l-4 border-indigo-500">
           <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 font-sans">Total Procurement</div>
           <div className="text-2xl font-bold text-slate-900 font-mono">{totalSpent.toLocaleString()} <span className="text-xs text-indigo-600">MMK</span></div>
        </div>
        <div className="enterprise-card p-6 border-l-4 border-amber-500">
           <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 font-sans">Transits</div>
           <div className="text-2xl font-bold text-slate-900 font-mono">{combinedPurchases.filter(p => p.status === "Transit").length} <span className="text-xs text-amber-400 uppercase font-sans">Items</span></div>
        </div>
        <div className="enterprise-card p-6 border-l-4 border-emerald-500 flex items-center justify-between font-sans">
           <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Records</div>
              <div className="text-2xl font-bold text-slate-900 font-mono">{combinedPurchases.length}</div>
           </div>
           <div className="flex items-center gap-2">
             <button 
               onClick={handleExportPurchases}
               className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center hover:bg-emerald-100 transition-all text-emerald-600 border border-emerald-200"
               title="Export Purchases"
             >
               <Download size={16} />
             </button>
             <button 
                onClick={() => setIsAdding(true)}
                className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center hover:bg-indigo-700 transition-all text-white shadow-sm"
             >
                <Plus size={20} />
             </button>
           </div>
        </div>
      </div>

      <div className="enterprise-card overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left font-sans">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="uppercase tracking-widest text-slate-400 font-bold text-[9px]">
                  <th className="px-6 py-5">Record Date</th>
                  <th className="px-6 py-5">Item Name</th>
                  <th className="px-6 py-5">Qty</th>
                  <th className="px-6 py-5">Price</th>
                  <th className="px-6 py-5">Status (Inventory)</th>
                  <th className="px-6 py-5">Vendor Info</th>
                  <th className="px-6 py-5 text-right">Location</th>
                  {isAdmin && <th className="px-6 py-5 text-center">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {combinedPurchases.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <AlertTriangle className="text-amber-500" size={32} />
                        <p className="text-sm text-slate-400">No Purchase Records found.</p>
                        <p className="text-[10px] text-amber-500 font-bold uppercase tracking-widest leading-loose text-center px-4">
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
                      <td className="px-6 py-4">
                        <span className="text-xs font-mono text-slate-500 font-bold">{p.date}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-50 border border-indigo-100 text-indigo-600 capitalize">
                             {p.item.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">{p.item}</p>
                            <p className="text-[9px] text-slate-400 font-mono tracking-tighter uppercase">{p.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-bold text-slate-600">{p.quantity}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-emerald-600 font-mono">{(p.price * p.quantity).toLocaleString()} {p.currency}</span>
                      </td>
                      <td className="px-6 py-4">
                         <div className="flex flex-wrap gap-1">
                           {currentStatuses.length > 0 ? currentStatuses.map(s => (
                             <span key={s} className={cn(
                               "text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border",
                               s === "Active" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-50 text-slate-400 border-slate-200"
                             )}>{s}</span>
                           )) : (
                             <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest italic">Syncing...</span>
                           )}
                         </div>
                      </td>
                      <td className="px-6 py-4">
                         <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-800">{p.supplier}</span>
                            <span className="text-[10px] text-slate-400 font-mono tracking-tighter">{p.supplierContact || "No Contact"}</span>
                         </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                         <div className="flex flex-col items-end">
                            {locations.length > 0 ? locations.map(l => (
                              <span key={l} className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{l}</span>
                            )) : (
                              <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest italic">Unknown</span>
                            )}
                         </div>
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4 text-center">
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
                               onClick={(e) => handleDelete(p.id, e)}
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
                  <p className="text-xs text-slate-500">No Purchase Records found.</p>
               </div>
             ) : combinedPurchases.map(p => {
                const linkedAssets = assets.filter(a => a.purchaseRecordId === p.id || (a.purchaseDate === p.date && a.model === p.item));
                const currentStatuses = Array.from(new Set(linkedAssets.map(a => a.status)));
                return (
                  <div key={p.id} className="p-4 hover:bg-white/5 active:bg-white/10 transition-colors flex flex-col gap-3">
                     <div className="flex justify-between items-start">
                        <div className="flex flex-col gap-2">
                           <span className="text-xs font-mono font-bold text-slate-300">{p.date}</span>
                           {isAdmin && (
                             <div className="flex gap-2">
                               <button
                                 onClick={() => handleEdit(p)}
                                 className="w-fit p-1 text-cyan-400 hover:bg-cyan-400/10 rounded transition-colors flex items-center gap-2"
                               >
                                 <History size={12} />
                                 <span className="text-[9px] font-bold uppercase">Edit</span>
                               </button>
                               <button 
                                 disabled={isDeleting || p.id.startsWith('HIST-')}
                                 onClick={(e) => handleDelete(p.id, e)}
                                 className="w-fit p-1 text-rose-500 hover:bg-rose-500/10 rounded transition-colors disabled:opacity-30 flex items-center gap-2"
                               >
                                 <Trash2 size={12} />
                                 <span className="text-[9px] font-bold uppercase">Delete</span>
                               </button>
                             </div>
                           )}
                        </div>
                        <div className="flex flex-wrap gap-1 justify-end">
                           {currentStatuses.length > 0 ? currentStatuses.map(s => (
                             <span key={s} className="text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">{s}</span>
                           )) : (
                             <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest italic border border-white/10 px-1.5 py-0.5 rounded">Syncing...</span>
                           )}
                        </div>
                     </div>
                     <div>
                        <p className="text-sm font-bold text-white mb-0.5">{p.item}</p>
                        <p className="text-[9px] text-slate-500 font-mono tracking-tighter uppercase">{p.id} • {p.supplier} {p.supplierContact ? `(${p.supplierContact})` : ""}</p>
                     </div>
                     <div className="flex justify-between items-end pt-1 border-t border-white/5">
                        <div className="flex items-center gap-2">
                           <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Qty: {p.quantity}</span>
                        </div>
                        <span className="text-sm font-bold text-emerald-400 font-mono">{(p.price * p.quantity).toLocaleString()} {p.currency}</span>
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
                <h3 className="text-lg font-bold text-white tracking-tight uppercase">{isEditing ? "Update Purchase Entry" : "New Purchase Entry"}</h3>
                <button onClick={() => { setIsAdding(false); setIsEditing(false); setEditingId(null); setNewPurchase({ status: "Received", currency: "MMK", quantity: 1 }); }} className="p-2 hover:bg-white/10 rounded-lg text-slate-500"><X size={20} /></button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Item Name</label>
                    <input 
                      type="text" 
                      value={newPurchase.item || ""}
                      onChange={e => setNewPurchase({...newPurchase, item: e.target.value})}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      placeholder="e.g. Logitech Mouse..."
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Category</label>
                    <input 
                      type="text" 
                      value={newPurchase.category || ""}
                      onChange={e => setNewPurchase({...newPurchase, category: e.target.value})}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      placeholder="e.g. Network"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Supplier</label>
                    <input 
                      type="text" 
                      value={newPurchase.supplier || ""}
                      onChange={e => setNewPurchase({...newPurchase, supplier: e.target.value})}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      placeholder="e.g. KMD"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Supplier Contact</label>
                    <input 
                      type="text" 
                      value={newPurchase.supplierContact || ""}
                      onChange={e => setNewPurchase({...newPurchase, supplierContact: e.target.value})}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      placeholder="e.g. 09..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Qty</label>
                    <input 
                      type="number" 
                      value={newPurchase.quantity || 1}
                      onChange={e => setNewPurchase({...newPurchase, quantity: Number(e.target.value)})}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Unit Price (MMK)</label>
                    <input 
                      type="number" 
                      value={newPurchase.price || ""}
                      onChange={e => setNewPurchase({...newPurchase, price: Number(e.target.value)})}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Purchase Date</label>
                    <input 
                      type="date" 
                      value={newPurchase.date || ""}
                      onChange={e => setNewPurchase({...newPurchase, date: e.target.value})}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Status</label>
                    <select 
                      value={newPurchase.status}
                      onChange={e => setNewPurchase({...newPurchase, status: e.target.value as any})}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="Ordered">Ordered</option>
                      <option value="Transit">Transit</option>
                      <option value="Received">Received</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => { setIsAdding(false); setIsEditing(false); setEditingId(null); setNewPurchase({ status: "Received", currency: "MMK", quantity: 1 }); }}
                  className="flex-1 py-4 border border-white/10 text-slate-400 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAdd}
                  className="flex-[2] py-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-cyan-900/40 transition-all font-sans font-bold"
                >
                  {isEditing ? "Update Entry" : "Record Entry"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MarketingModule({ plans, setPlans }: { plans: ContentPlan[], setPlans: (p: ContentPlan[]) => void }) {
  const [isAddingPlan, setIsAddingPlan] = useState(false);

  return (
    <div className="space-y-6 lg:space-y-8 pb-20 lg:pb-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 enterprise-card p-6 lg:p-10">
        <div className="max-w-md">
          <h2 className="text-xl lg:text-2xl font-bold text-slate-800 tracking-tight uppercase">Strategy & Ops Pipeline</h2>
          <p className="text-[9px] lg:text-xs text-slate-400 mt-2 lg:mt-3 leading-relaxed font-bold tracking-widest uppercase">
            Verify: Product • Price • Promo Period • Contact ID
          </p>
        </div>
        <div className="w-full sm:w-auto p-4 lg:p-5 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-center justify-between sm:justify-start gap-4 lg:gap-5">
          <div className="flex items-center gap-3 lg:gap-5">
            <div className="w-10 h-10 lg:w-14 lg:h-14 bg-indigo-600 text-white rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
              <Megaphone size={20} className="lg:w-7 lg:h-7" />
            </div>
            <div>
              <p className="text-[9px] lg:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active nodes</p>
              <p className="text-xl lg:text-2xl font-bold text-slate-800">{plans.filter(p => p.status === "Draft").length}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsAddingPlan(true)}
              className="hidden lg:flex items-center gap-2 py-2 px-4 bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-cyan-600 hover:text-white transition-all"
            >
              <Plus size={16} /> Add Strategy
            </button>
            <button 
              onClick={() => setIsAddingPlan(true)}
              className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-cyan-400 lg:hidden"
            >
              <Plus size={24} />
            </button>
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
              <h3 className="text-xl font-bold text-white mb-8 tracking-tight flex items-center gap-2">
                <Megaphone size={20} className="text-cyan-400" />
                New Content Blueprint
              </h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Platform</label>
                  <select className="w-full px-4 py-3.5 bg-slate-900 border border-white/10 rounded-xl text-sm text-white focus:outline-none">
                    <option>Facebook</option>
                    <option>Viber</option>
                    <option>TikTok</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Product / Topic</label>
                  <input 
                    type="text" 
                    placeholder="Campaign title..." 
                    className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:bg-white/10"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Promotion Details</label>
                  <textarea 
                    rows={3}
                    placeholder="Price, duration, special offers..." 
                    className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:bg-white/10 resize-none"
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 mt-10">
                <button 
                  onClick={() => setIsAddingPlan(false)}
                  className="w-full py-4 sm:py-3 px-4 bg-white/5 text-slate-400 rounded-xl font-bold uppercase text-[10px] tracking-widest hover:bg-white/10 transition-colors order-2 sm:order-1"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => setIsAddingPlan(false)}
                  className="w-full py-4 sm:py-3 px-4 bg-cyan-600 text-white rounded-xl font-bold uppercase text-[10px] tracking-widest hover:bg-cyan-500 transition-all shadow-lg shadow-cyan-900/40 order-1 sm:order-2"
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
                "px-2.5 py-0.5 lg:px-3 lg:py-1 rounded border text-[8px] lg:text-[9px] font-bold uppercase tracking-widest",
                plan.platform === "Facebook" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                plan.platform === "Viber" ? "bg-purple-500/10 text-purple-400 border-purple-500/20" : "bg-white/5 text-slate-400 border-white/10"
              )}>
                {plan.platform}
              </span>
              <span className="text-[9px] lg:text-[10px] font-bold text-amber-400 uppercase flex items-center gap-2 tracking-widest">
                <Clock size={12} className="animate-pulse" /> {plan.status}
              </span>
            </div>
            
            <h4 className="text-lg lg:text-xl font-bold text-white tracking-tight group-hover:text-cyan-400 transition-colors uppercase">{plan.productName}</h4>
            <div className="mt-6 lg:mt-8 space-y-3 lg:space-y-4">
              <div className="flex items-center gap-4 p-3 lg:p-4 bg-white/5 rounded-2xl border border-white/5">
                <span className="text-[8px] lg:text-[9px] font-bold text-slate-500 uppercase tracking-widest w-16 lg:w-20 shrink-0">Price Unit</span>
                <span className="text-xs lg:text-sm font-semibold text-slate-200">{plan.price}</span>
              </div>
              <div className="flex items-center gap-4 p-3 lg:p-4 bg-white/5 rounded-2xl border border-white/5">
                <span className="text-[8px] lg:text-[9px] font-bold text-slate-500 uppercase tracking-widest w-16 lg:w-20 shrink-0">Duration</span>
                <span className="text-xs lg:text-sm font-semibold text-slate-200">{plan.promotionPeriod}</span>
              </div>
            </div>

            <div className="mt-8 lg:mt-10 flex flex-col sm:flex-row gap-3 lg:gap-4">
              <button className="flex-1 py-4 sm:py-3.5 px-6 bg-cyan-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-cyan-500 transition-all shadow-lg shadow-cyan-900/40">
                Commit & Dispatch
              </button>
              <button className="flex-1 py-4 sm:py-3.5 px-6 bg-white/5 text-slate-400 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-colors">
                Modify
              </button>
            </div>
          </div>
        ))}
        <button 
          onClick={() => setIsAddingPlan(true)}
          className="border-2 border-dashed border-white/10 rounded-[2rem] lg:rounded-[2.5rem] p-8 lg:p-12 flex flex-col items-center justify-center text-slate-500 hover:border-cyan-500/40 hover:text-cyan-400 transition-all group bg-white/5 backdrop-blur-sm shadow-xl"
        >
          <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-xl lg:rounded-2xl flex items-center justify-center bg-white/5 group-hover:bg-cyan-500/10 border border-white/5 transition-all mb-4 lg:mb-6">
            <Plus size={24} className="lg:w-7 lg:h-7" />
          </div>
          <p className="font-bold text-xs lg:text-sm tracking-tight uppercase">New Content Blueprint</p>
          <p className="text-[9px] lg:text-[10px] uppercase font-bold mt-2 opacity-40 tracking-widest">SOP-001 Protocol</p>
        </button>
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

      const response = await fetch("/api/drive/upload", {
        method: "POST",
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

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this file?")) return;
    try {
      const pathSuffix = currentFolderId ? `/${currentFolderId}` : '';
      await deleteStorageFile(`uploads${pathSuffix}/${id}`);
      fetchFiles();
    } catch (err) {
      console.error("Delete failed", err);
    }
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
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Cloud Files</h1>
            <p className="text-slate-500 text-sm mt-1">Manage your pharmacy documents and assets securely.</p>
          </div>
          
          <div className="flex items-center gap-3">
             <button 
              className="p-3 bg-white hover:bg-slate-50 text-slate-700 rounded-2xl flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-all border border-slate-200 shadow-sm"
            >
              <Plus size={18} />
              <span>New Folder</span>
            </button>
            <label className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl flex items-center gap-2 text-xs font-bold uppercase tracking-widest cursor-pointer transition-all shadow-md">
              {isUploading ? <RefreshCw size={18} className="animate-spin" /> : <Upload size={18} />}
              <span>Upload</span>
              <input type="file" className="hidden" onChange={handleUpload} disabled={isUploading} />
            </label>
          </div>
        </div>

        {/* Drag and Drop Zone */}
        <div 
          className={`relative w-full py-8 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center transition-all ${dragActive ? 'border-indigo-500 bg-indigo-50/50 scale-[1.02]' : 'border-slate-300 bg-white hover:bg-slate-50'}`}
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
               <span className="text-sm font-bold text-slate-600 uppercase tracking-widest">{uploadProgress}% Uploaded</span>
               <p className="text-xs text-slate-400 mt-1 italic">Please wait while the file is automatically routed to the correct folder...</p>
             </div>
           ) : (
             <>
               <Upload size={40} className={`mb-4 ${dragActive ? 'text-indigo-500' : 'text-slate-300'}`} />
               <p className="text-lg font-bold text-slate-800">Drag & Drop files here</p>
               <p className="text-sm text-slate-500 mt-1">Videos will go to TikTok_Videos, PSDs to Photoshop_Files, Images to Viber_Photos</p>
             </>
           )}
        </div>

        {/* Quick Access Folders Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
             <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
               <Layers size={16} className="text-indigo-600" />
               Quick Access
             </h3>
             <div className="flex items-center gap-2">
                {navigationStack.length > 0 && (
                  <button 
                    onClick={handleBack}
                    className="px-3 py-1 bg-white hover:bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-widest rounded-lg border border-slate-200"
                  >
                    Back
                  </button>
                )}
             </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {isLoading ? (
              Array(4).fill(0).map((_, i) => (
                <div key={i} className="h-24 bg-white rounded-[2rem] border border-slate-100 animate-pulse" />
              ))
            ) : foldersList.length > 0 ? (
              foldersList.slice(0, 4).map((folder) => (
                <div 
                  key={folder.id}
                  onClick={() => handleFolderClick(folder)}
                  className="group relative p-5 bg-white hover:bg-slate-50 border border-slate-200 rounded-[2rem] transition-all cursor-pointer overflow-hidden shadow-sm hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                      <Folder size={20} fill="currentColor" fillOpacity={0.2} />
                    </div>
                    <button className="p-1 text-slate-400 hover:text-slate-600 relative z-10">
                      <MoreVertical size={16} />
                    </button>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm font-bold text-slate-800 truncate">{folder.name}</p>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mt-1">Folder</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-8 text-center bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                 <p className="text-slate-400 text-xs uppercase font-bold tracking-widest italic">No folders found here.</p>
              </div>
            )}
            
            {/* Add New Folder Card Button */}
            <button className="flex flex-col items-center justify-center p-5 bg-white border border-dashed border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 rounded-[2rem] transition-all group">
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-colors">
                <Plus size={20} />
              </div>
              <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">Add New Folder</p>
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
                className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-sm"
              />
            </div>
            <div className="flex items-center gap-3 shrink-0">
               <button className="p-4 bg-white hover:bg-slate-50 text-slate-400 rounded-2xl border border-slate-200 shadow-sm transition-all focus:ring-2 focus:ring-indigo-500/10">
                 <Activity size={18} />
               </button>
               <button onClick={() => fetchFiles()} className="p-4 bg-white hover:bg-slate-50 text-slate-400 rounded-2xl border border-slate-200 shadow-sm transition-all focus:ring-2 focus:ring-indigo-500/10 active:scale-95">
                 <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
               </button>
            </div>
          </div>

          <div className="enterprise-card overflow-hidden">
             <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em]">All Files & Folders</h3>
                <div className="flex gap-4">
                   <button className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 uppercase tracking-widest">Sort By</button>
                   <button className="text-[10px] font-bold text-slate-500 hover:text-slate-800 uppercase tracking-widest">Filter</button>
                </div>
             </div>
             
             <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                 <thead>
                    <tr className="bg-slate-50/30">
                      <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">File Name</th>
                      <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Time Added</th>
                      <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Size</th>
                      <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Location</th>
                      <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                    {isLoading ? (
                      Array(5).fill(0).map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          <td className="px-8 py-4"><div className="h-4 w-32 bg-slate-100 rounded"></div></td>
                          <td className="px-8 py-4"><div className="h-4 w-24 bg-slate-100 rounded"></div></td>
                          <td className="px-8 py-4"><div className="h-4 w-16 bg-slate-100 rounded"></div></td>
                          <td className="px-8 py-4"><div className="h-4 w-20 bg-slate-100 rounded"></div></td>
                          <td className="px-8 py-4"><div className="h-4 w-8 bg-slate-100 ml-auto rounded"></div></td>
                        </tr>
                      ))
                    ) : filteredFiles.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-24 text-center">
                          <HardDrive size={48} className="mx-auto text-slate-200 mb-4" />
                          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No entries found.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredFiles.map((file) => {
                        const isFolder = file.mimeType === "application/vnd.google-apps.folder";
                        return (
                          <tr key={file.id} className="group hover:bg-slate-50 transition-colors">
                            <td className="px-8 py-5">
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
                                        className="bg-white border border-indigo-500 rounded px-2 py-1 text-xs text-slate-800"
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
                                          className="text-sm font-bold text-slate-800 hover:text-indigo-600 transition-colors text-left block truncate max-w-[200px]"
                                        >
                                          {file.name}
                                        </button>
                                      ) : (
                                        <p className="text-sm font-bold text-slate-700 truncate max-w-[200px]">{file.name}</p>
                                      )}
                                      <p className="text-[10px] text-slate-400 font-mono mt-1">{formatId(file.id)}</p>
                                    </>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-8 py-5">
                              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{safeFormat(file.createdAt, "MMM d, HH:mm")}</p>
                            </td>
                            <td className="px-8 py-5">
                              <p className="text-xs font-mono text-slate-500">
                                {isFolder ? "--" : formatStorage(file.size)}
                              </p>
                            </td>
                            <td className="px-8 py-5">
                               <div className="flex items-center gap-2 text-slate-400 group-hover:text-indigo-600 transition-colors">
                                  <Folder size={12} />
                                  <span className="text-[10px] font-bold uppercase tracking-widest">DRIVE</span>
                               </div>
                            </td>
                            <td className="px-8 py-5">
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
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2">
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
                        <p className="text-3xl font-bold text-slate-800 tracking-tighter">
                          {(percent * 100).toFixed(1)}%
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Full</p>
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
                         <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">{item.label}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">{item.count.toLocaleString()}</span>
                   </div>
                 ));
               })()}
            </div>
            
            {/* Storage Alert */}
            <div className="mt-8 p-6 bg-slate-50 border border-slate-100 rounded-[2rem] relative">
               <div className="absolute top-0 right-0 p-4 opacity-10">
                  <AlertCircle size={48} className="text-indigo-500" />
               </div>
               <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest mb-2">Storage Status</h4>
               {quota ? (() => {
                 const usage = Number(quota.usage) || 0;
                 const limit = Number(quota.limit) || 2199023255552;
                 const percent = Math.min(1, usage / limit);
                 return (
                   <>
                     <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-4">
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
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-4">Security</h3>
            <div className="flex items-center gap-3 mb-6">
               <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <ShieldCheck size={20} />
               </div>
               <div>
                  <p className="text-xs font-bold text-slate-800 uppercase">Encrypted</p>
                  <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">TLS 1.3 Active</p>
               </div>
            </div>
            <p className="text-[10px] text-slate-500 font-medium leading-relaxed uppercase tracking-widest mb-6">All files are synced with Taunggyi Pharmacy G-Suite Node.</p>
            <button className="w-full py-4 bg-white/5 hover:bg-white/10 text-white text-[10px] font-bold uppercase tracking-[0.2em] rounded-2xl border border-white/5 transition-all">
               System Logs
            </button>
         </div>
      </div>
    </div>
  );
}

