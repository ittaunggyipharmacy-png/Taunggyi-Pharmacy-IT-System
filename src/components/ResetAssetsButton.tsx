import React, { useState } from "react";
import { toast } from "react-hot-toast";
import { ITAsset } from "../types";
import { clearAllAssets } from "../services/assetService";

export function ResetAssetsButton({ 
 setAssets, 
 setConfirmTarget, 
 isCompact 
}: { 
 setAssets: React.Dispatch<React.SetStateAction<ITAsset[]>>, 
 setConfirmTarget: React.Dispatch<React.SetStateAction<{ id: string, onConfirm: () => void, message: string, title?: string, confirmText?: string } | null>>, 
 isCompact?: boolean 
}) {
 const [isClearing, setIsClearing] = useState(false);
 
 const handleClear = async () => {
 const password = window.prompt("EXTREME ACCESS: Enter Administrative Password to authorize database wipe:");
 if (password !== "Tgp@admin123") {
 if (password !== null) toast.error("Invalid password. Database reset aborted.");
 return;
 }

 setConfirmTarget({
 id: "clear_all_assets",
 title: "EXTREME CAUTION: Reset Database",
 message: "Are you absolutely sure you want to delete ALL IT assets? This action is PERMANENT and will wipe the entire inventory database clean. This cannot be undone.",
 confirmText: "Wipe Database Now",
 onConfirm: async () => {
 setConfirmTarget(null);
 setIsClearing(true);
 try {
 await clearAllAssets();
 setAssets([]);
 toast.success("Successfully cleared all assets.");
 } catch (e) {
 toast.error("Failed to clear assets. Check permissions.");
 } finally {
 setIsClearing(false);
 }
 }
 });
 };

 if (isCompact) {
 return (
 <button
 onClick={handleClear}
 disabled={isClearing}
 className="px-4 py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-medium transition-all shadow-xl shadow-rose-100 active:scale-95 disabled:opacity-50 whitespace-nowrap"
 >
 {isClearing ? "Wiping Database..." : "Reset Database"}
 </button>
 );
 }

 return (
 <button
 onClick={handleClear}
 disabled={isClearing}
 className="fixed top-4 right-4 z-[9999] bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg shadow-lg transition-all active:scale-95 disabled:opacity-50"
 >
 {isClearing ? "Wiping Database..." : "Reset Database / Delete All Assets"}
 </button>
 );
}
