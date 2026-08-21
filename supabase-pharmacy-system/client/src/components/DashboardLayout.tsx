import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { LogOut, PanelLeft, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";

export type PharmacyNavigationItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
};

type DashboardLayoutProps = {
  children: React.ReactNode;
  menuItems: PharmacyNavigationItem[];
  activeItem: string;
  onNavigate: (id: string) => void;
  userName: string;
  userEmail: string;
  userRole: string;
  onSignOut: () => void;
};

export default function DashboardLayout({
  children,
  menuItems,
  activeItem,
  onNavigate,
  userName,
  userEmail,
  userRole,
  onSignOut,
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <SidebarProvider defaultOpen>
      <Sidebar collapsible="icon" className="border-r border-slate-200 bg-white">
        <SidebarHeader className="h-[76px] border-b border-slate-100 px-3 py-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-700 text-white shadow-sm transition-transform active:scale-95"
              aria-label="Toggle navigation"
            >
              {sidebarOpen ? <ShieldCheck className="h-5 w-5" /> : <PanelLeft className="h-5 w-5" />}
            </button>
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <p className="truncate text-sm font-semibold tracking-tight text-slate-950">Taunggyi Pharmacy</p>
              <p className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.14em] text-emerald-700">IT Operations</p>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent className="px-2 py-3">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 group-data-[collapsible=icon]:hidden">Workspace</p>
          <SidebarMenu>
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = item.id === activeItem;
              return (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={active}
                    tooltip={item.label}
                    onClick={() => onNavigate(item.id)}
                    className={`h-10 rounded-xl px-3 text-[13px] transition-colors ${
                      active ? "bg-emerald-50 font-semibold text-emerald-800 hover:bg-emerald-50" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${active ? "text-emerald-700" : "text-slate-400"}`} />
                    <span>{item.label}</span>
                    {item.badge ? <span className="ml-auto rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">{item.badge}</span> : null}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarContent>

        <SidebarFooter className="border-t border-slate-100 p-3">
          <div className="flex items-center gap-2.5 rounded-xl bg-slate-50 p-2.5 group-data-[collapsible=icon]:justify-center">
            <Avatar className="h-8 w-8 shrink-0 border border-emerald-100 bg-white">
              <AvatarFallback className="bg-emerald-50 text-xs font-semibold text-emerald-800">{userName.slice(0, 1).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
              <p className="truncate text-xs font-semibold text-slate-800">{userName}</p>
              <p className="truncate text-[10px] text-slate-500">{userRole.replaceAll("_", " ")}</p>
            </div>
            <button type="button" onClick={onSignOut} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white hover:text-rose-600 group-data-[collapsible=icon]:hidden" title={`Sign out ${userEmail}`}>
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="min-h-screen bg-[#f4f7f5]">
        <header className="sticky top-0 z-20 flex h-[76px] items-center gap-3 border-b border-slate-200/80 bg-white/90 px-5 backdrop-blur md:px-7">
          <SidebarTrigger className="md:hidden" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-950">Pharmacy IT Management System</p>
            <p className="mt-0.5 text-xs text-slate-500">Secure internal operations workspace</p>
          </div>
          <div className="ml-auto hidden rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-800 sm:block">Authorized pharmacy access</div>
        </header>
        <main className="mx-auto w-full max-w-[1600px] p-5 md:p-7">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
