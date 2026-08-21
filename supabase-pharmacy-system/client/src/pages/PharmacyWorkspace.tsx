import DashboardLayout, { type PharmacyNavigationItem } from "@/components/DashboardLayout";
import { usePharmacyAuth } from "@/hooks/usePharmacyAuth";
import { signInWithGoogle, signInWithUsernamePassword, supabase } from "@/lib/supabase";
import { trpc } from "@/lib/trpc";
import { isThreeWayMatch } from "@shared/pharmacyRules";
import {
  AlertTriangle,
  ArrowDownToLine,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  FileClock,
  FileText,
  FolderLock,
  HelpCircle,
  Laptop,
  LayoutDashboard,
  Loader2,
  PackageCheck,
  Plus,
  RefreshCw,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Ticket,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type PageId =
  | "dashboard"
  | "tickets"
  | "assets"
  | "access"
  | "procurement"
  | "renewals"
  | "meetings"
  | "documents"
  | "reports"
  | "settings";

type RecordRow = Record<string, unknown>;

const navigation: PharmacyNavigationItem[] = [
  { id: "dashboard", label: "Overview", icon: LayoutDashboard },
  { id: "tickets", label: "IT Helpdesk", icon: Ticket },
  { id: "assets", label: "Asset Registry", icon: Laptop },
  { id: "access", label: "Access Control", icon: ShieldCheck },
  { id: "procurement", label: "Procurement", icon: ShoppingCart },
  { id: "renewals", label: "Renewals", icon: CalendarClock },
  { id: "meetings", label: "Meeting Minutes", icon: FileText },
  { id: "documents", label: "Scoped Documents", icon: FolderLock },
  { id: "reports", label: "Reports & Export", icon: BarChart3 },
  { id: "settings", label: "System Settings", icon: Settings },
];

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] ${className}`}>{children}</section>;
}

function Heading({ label, title, description }: { label: string; title: string; description: string }) {
  return <div className="mb-7"><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-700">{label}</p><h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">{title}</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p></div>;
}

function Empty({ title, description }: { title: string; description: string }) {
  return <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-5 py-10 text-center"><FileClock className="h-5 w-5 text-emerald-700" /><p className="mt-3 text-sm font-semibold text-slate-800">{title}</p><p className="mt-1 max-w-md text-xs leading-5 text-slate-500">{description}</p></div>;
}

function Status({ value }: { value: string }) {
  const tone = value.includes("open") || value.includes("submitted") ? "bg-sky-50 text-sky-700" : value.includes("review") || value.includes("progress") ? "bg-amber-50 text-amber-700" : value.includes("resolved") || value.includes("active") || value.includes("matched") ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700";
  return <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold capitalize ${tone}`}>{value.replaceAll("_", " ")}</span>;
}

function DataTable({ rows, columns }: { rows: RecordRow[]; columns: Array<{ id: string; label: string }> }) {
  if (!rows.length) return <Empty title="No records yet" description="Records created through this module will appear here after Supabase connection and permissions are enabled." />;
  return <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-xs"><thead><tr className="border-b border-slate-100 text-[10px] uppercase tracking-[0.12em] text-slate-400">{columns.map((column) => <th key={column.id} className="px-3 py-3 font-semibold">{column.label}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={String(row.id ?? index)} className="border-b border-slate-50 last:border-0">{columns.map((column) => <td key={column.id} className="px-3 py-3 text-slate-700">{column.id === "status" ? <Status value={String(row[column.id] ?? "-")} /> : String(row[column.id] ?? "—")}</td>)}</tr>)}</tbody></table></div>;
}

function useRecords(table: string, order = "created_at") {
  const [rows, setRows] = useState<RecordRow[]>([]);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [error, setError] = useState<string | null>(null);
  const refresh = async () => {
    if (!supabase) return;
    setLoading(true);
    const { data, error: queryError } = await supabase.from(table).select("*").order(order, { ascending: false });
    setLoading(false);
    if (queryError) setError(queryError.message); else setRows((data ?? []) as RecordRow[]);
  };
  useEffect(() => { refresh(); }, [table, order]);
  return { rows, loading, error, refresh };
}

function Metrics() {
  const tickets = useRecords("tickets");
  const assets = useRecords("assets");
  const access = useRecords("access_requests");
  const renewals = useRecords("renewals", "renewal_date");
  const openTickets = tickets.rows.filter((row) => ["open", "in_progress"].includes(String(row.status))).length;
  const pendingAccess = access.rows.filter((row) => ["submitted", "manager_review", "it_review"].includes(String(row.status))).length;
  const expiring = renewals.rows.filter((row) => {
    const date = row.renewal_date ? new Date(String(row.renewal_date)) : null;
    return Boolean(date && date.getTime() > Date.now() && date.getTime() < Date.now() + 30 * 86400000);
  }).length;
  const cards = [
    { label: "Open IT tickets", value: openTickets, hint: "Needs support attention", icon: Ticket, color: "bg-sky-50 text-sky-700" },
    { label: "Tracked assets", value: assets.rows.length, hint: "Registered equipment", icon: Laptop, color: "bg-emerald-50 text-emerald-700" },
    { label: "Access actions", value: pendingAccess, hint: "Awaiting workflow action", icon: ShieldCheck, color: "bg-violet-50 text-violet-700" },
    { label: "Renewals in 30 days", value: expiring, hint: "Review obligations early", icon: CalendarClock, color: "bg-amber-50 text-amber-700" },
  ];
  return <><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map((card) => { const Icon = card.icon; return <Panel key={card.label}><div className="flex items-start justify-between"><div><p className="text-xs font-medium text-slate-500">{card.label}</p><p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{tickets.loading ? "—" : card.value}</p></div><div className={`grid h-10 w-10 place-items-center rounded-xl ${card.color}`}><Icon className="h-5 w-5" /></div></div><p className="mt-4 text-[11px] text-slate-500">{card.hint}</p></Panel>; })}</div><div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.65fr]"><Panel><div className="mb-4 flex items-center justify-between"><div><h2 className="text-sm font-semibold text-slate-900">Recent helpdesk requests</h2><p className="mt-1 text-xs text-slate-500">Latest requests visible to your pharmacy role.</p></div><RefreshCw className="h-4 w-4 text-slate-400" /></div><DataTable rows={tickets.rows.slice(0, 5)} columns={[{ id: "ticket_number", label: "Ticket" }, { id: "subject", label: "Request" }, { id: "priority", label: "Priority" }, { id: "status", label: "Status" }]} /></Panel><Panel><h2 className="text-sm font-semibold text-slate-900">Security posture</h2><div className="mt-4 space-y-3"><div className="rounded-xl bg-emerald-50 p-3"><p className="text-xs font-semibold text-emerald-900">Approved pharmacy profiles</p><p className="mt-1 text-[11px] leading-5 text-emerald-800">Supabase row-level security limits records to approved accounts and their permitted role.</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-semibold text-slate-800">Scoped documents</p><p className="mt-1 text-[11px] leading-5 text-slate-600">The document service verifies every Drive action stays inside the configured pharmacy folder.</p></div></div></Panel></div></>;
}

function TicketModule({ userId }: { userId: string }) {
  const records = useRecords("tickets");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [notice, setNotice] = useState<string | null>(null);
  const submit = async (event: React.FormEvent) => { event.preventDefault(); if (!supabase) return; const { error } = await supabase.from("tickets").insert({ subject, description, priority, requester_id: userId }); if (error) setNotice(error.message); else { setSubject(""); setDescription(""); setNotice("Ticket submitted to the IT helpdesk."); records.refresh(); } };
  return <div className="grid gap-6 xl:grid-cols-[0.78fr_1.22fr]"><Panel><h2 className="text-sm font-semibold text-slate-900">Submit an IT request</h2><form className="mt-4 space-y-3" onSubmit={submit}><input required value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Short request title" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-200" /><textarea required value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe the issue, branch, device, and impact." className="min-h-28 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-200" /><select value={priority} onChange={(event) => setPriority(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="low">Low priority</option><option value="medium">Medium priority</option><option value="high">High priority</option><option value="critical">Critical priority</option></select><button className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white"><Plus className="h-4 w-4" />Create ticket</button>{notice ? <p className="text-xs text-slate-600">{notice}</p> : null}</form></Panel><Panel><h2 className="text-sm font-semibold text-slate-900">Ticket queue</h2><p className="mt-1 mb-4 text-xs text-slate-500">Supervisors can assign, resolve, and close tickets under role policies.</p><DataTable rows={records.rows} columns={[{ id: "ticket_number", label: "Ticket" }, { id: "subject", label: "Subject" }, { id: "priority", label: "Priority" }, { id: "status", label: "Status" }]} /></Panel></div>;
}

function AssetModule({ userId }: { userId: string }) {
  const records = useRecords("assets"); const [category, setCategory] = useState("Computer"); const [model, setModel] = useState(""); const [serial, setSerial] = useState(""); const [notice, setNotice] = useState<string | null>(null);
  const submit = async (event: React.FormEvent) => { event.preventDefault(); if (!supabase) return; const { error } = await supabase.from("assets").insert({ category, model, serial_number: serial || null, created_by: userId }); if (error) setNotice(error.message); else { setModel(""); setSerial(""); setNotice("Asset registered. Supabase generated its unique asset code."); records.refresh(); } };
  return <div className="grid gap-6 xl:grid-cols-[0.78fr_1.22fr]"><Panel><h2 className="text-sm font-semibold text-slate-900">Register equipment</h2><form className="mt-4 space-y-3" onSubmit={submit}><select value={category} onChange={(event) => setCategory(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option>Computer</option><option>Printer</option><option>Phone</option><option>Scanner</option><option>Network</option><option>Other</option></select><input required value={model} onChange={(event) => setModel(event.target.value)} placeholder="Model or device name" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /><input value={serial} onChange={(event) => setSerial(event.target.value)} placeholder="Serial number (optional)" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /><button className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white"><Plus className="h-4 w-4" />Register asset</button>{notice ? <p className="text-xs text-slate-600">{notice}</p> : null}</form></Panel><Panel><h2 className="text-sm font-semibold text-slate-900">Equipment registry</h2><p className="mt-1 mb-4 text-xs text-slate-500">Assignment, transfer, maintenance, and disposal events are retained in asset movements.</p><DataTable rows={records.rows} columns={[{ id: "asset_code", label: "Asset code" }, { id: "category", label: "Category" }, { id: "model", label: "Model" }, { id: "status", label: "Status" }]} /></Panel></div>;
}

function AccessModule({ userId }: { userId: string }) {
  const records = useRecords("access_requests"); const [resource, setResource] = useState(""); const [reason, setReason] = useState(""); const [level, setLevel] = useState("Standard user"); const [sensitivity, setSensitivity] = useState("medium"); const [notice, setNotice] = useState<string | null>(null);
  const submit = async (event: React.FormEvent) => { event.preventDefault(); if (!supabase) return; const { error } = await supabase.from("access_requests").insert({ requester_id: userId, resource_name: resource, resource_category: "Internal system", requested_access_level: level, data_sensitivity: sensitivity, business_reason: reason }); if (error) setNotice(error.message); else { setResource(""); setReason(""); setNotice("Access request submitted; all workflow actions will be added to its immutable audit timeline."); records.refresh(); } };
  return <div className="grid gap-6 xl:grid-cols-[0.78fr_1.22fr]"><Panel><h2 className="text-sm font-semibold text-slate-900">Request internal access</h2><form className="mt-4 space-y-3" onSubmit={submit}><input required value={resource} onChange={(event) => setResource(event.target.value)} placeholder="Internal system or resource" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /><select value={level} onChange={(event) => setLevel(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option>Read only</option><option>Standard user</option><option>Power user</option><option>Admin / privileged</option></select><select value={sensitivity} onChange={(event) => setSensitivity(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="low">Low sensitivity</option><option value="medium">Medium sensitivity</option><option value="high">High sensitivity</option><option value="restricted">Restricted</option></select><textarea required value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Business reason" className="min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /><button className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white"><ShieldCheck className="h-4 w-4" />Submit request</button>{notice ? <p className="text-xs text-slate-600">{notice}</p> : null}</form></Panel><Panel><h2 className="text-sm font-semibold text-slate-900">Access workflow history</h2><p className="mt-1 mb-4 text-xs text-slate-500">Review, approval, provisioning, and revocation are captured as append-only audit records.</p><DataTable rows={records.rows} columns={[{ id: "request_number", label: "Request" }, { id: "resource_name", label: "Resource" }, { id: "requested_access_level", label: "Level" }, { id: "status", label: "Status" }]} /></Panel></div>;
}

function ProcurementModule() {
  const [po, setPo] = useState(""); const [received, setReceived] = useState(""); const [invoice, setInvoice] = useState("");
  const amounts = [Number(po), Number(received), Number(invoice)]; const valid = amounts.every((amount) => Number.isFinite(amount) && amount > 0); const matched = valid && isThreeWayMatch(amounts[0], amounts[1], amounts[2]);
  const fields = [{ label: "Purchase order amount", value: po, set: setPo }, { label: "Received-goods amount", value: received, set: setReceived }, { label: "Invoice amount", value: invoice, set: setInvoice }];
  return <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]"><Panel><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-700"><ShoppingCart className="h-5 w-5" /></div><div><h2 className="text-sm font-semibold text-slate-900">Controlled purchasing workflow</h2><p className="mt-1 text-xs text-slate-500">Requisition → Purchase order → Goods receipt → Invoice match.</p></div></div><div className="mt-5 grid gap-3 sm:grid-cols-3">{["Purchase requisition", "Purchase order", "Goods receipt"].map((step, index) => <div key={step} className="rounded-xl border border-slate-100 p-3"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Step {index + 1}</p><p className="mt-2 text-xs font-semibold text-slate-800">{step}</p></div>)}</div><div className="mt-4 rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold text-slate-800">Reconciliation rule</p><p className="mt-1 text-xs leading-5 text-slate-600">The permanent server recalculates line totals and allows payment approval only when purchase-order, received-goods, and invoice values reconcile.</p></div></Panel><Panel><h2 className="text-sm font-semibold text-slate-900">Three-way match check</h2><p className="mt-1 text-xs text-slate-500">Check values before finance approval.</p><div className="mt-4 space-y-3">{fields.map((field) => <label key={field.label} className="block"><span className="mb-1.5 block text-xs font-medium text-slate-600">{field.label} (MMK)</span><input inputMode="decimal" value={field.value} onChange={(event) => field.set(event.target.value)} placeholder="0.00" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label>)}</div><div className={`mt-4 rounded-xl p-3 ${!valid ? "bg-slate-50 text-slate-600" : matched ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}><p className="text-xs font-semibold">{!valid ? "Enter all three values to check reconciliation." : matched ? "Matched — values reconcile." : "Mismatch — finance review is required."}</p></div></Panel></div>;
}

function SimpleRecords({ label, title, description, table, order, columns, icon: Icon }: { label: string; title: string; description: string; table: string; order?: string; columns: Array<{ id: string; label: string }>; icon: typeof FileText }) {
  const records = useRecords(table, order);
  return <><Heading label={label} title={title} description={description} /><Panel><div className="mb-4 flex items-start justify-between"><div><h2 className="text-sm font-semibold text-slate-900">{title}</h2><p className="mt-1 text-xs text-slate-500">Secure Supabase records visible to your approved role.</p></div><Icon className="h-5 w-5 text-emerald-700" /></div><DataTable rows={records.rows} columns={columns} /></Panel></>;
}

function ReportsModule() {
  const [notice, setNotice] = useState<string | null>(null);
  const exportTable = async (table: string) => { if (!supabase) return; const { data, error } = await supabase.from(table).select("*"); if (error) { setNotice(error.message); return; } const rows = (data ?? []) as RecordRow[]; if (!rows.length) { setNotice(`No ${table} records are available to export.`); return; } const keys = Object.keys(rows[0]); const content = [keys.join(","), ...rows.map((row) => keys.map((key) => JSON.stringify(row[key] ?? "")).join(","))].join("\n"); const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([content], { type: "text/csv" })); link.download = `pharmacy-${table}-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(link.href); setNotice(`${table} export downloaded.`); };
  const reports = [{ table: "assets", label: "Asset register", icon: Laptop }, { table: "tickets", label: "Helpdesk tickets", icon: Ticket }, { table: "purchase_requisitions", label: "Purchase requisitions", icon: ClipboardCheck }];
  return <><Heading label="Operational reporting" title="Reports & export" description="Generate CSV exports from the operational records allowed by your Supabase role." /><div className="grid gap-4 md:grid-cols-3">{reports.map((report) => { const Icon = report.icon; return <Panel key={report.table}><Icon className="h-5 w-5 text-emerald-700" /><h2 className="mt-4 text-sm font-semibold text-slate-900">{report.label}</h2><p className="mt-1 text-xs leading-5 text-slate-500">Export the permitted operational data for accountable review.</p><button onClick={() => exportTable(report.table)} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"><ArrowDownToLine className="h-4 w-4" />Export CSV</button></Panel>; })}</div>{notice ? <p className="mt-4 text-xs text-slate-600">{notice}</p> : null}</>;
}

function PasswordSignIn() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await signInWithUsernamePassword(username, password);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to sign in with those credentials.");
    } finally {
      setSubmitting(false);
    }
  };
  return <form className="mt-6 space-y-3 text-left" onSubmit={submit}><label className="block text-xs font-semibold text-slate-700">Username<input required autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Username" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-200" /></label><label className="block text-xs font-semibold text-slate-700">Password<input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-200" /></label><button disabled={submitting} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-transform active:scale-95 disabled:opacity-60">{submitting ? "Signing in…" : "Sign in"}</button>{error ? <p className="text-xs leading-5 text-rose-700">{error}</p> : null}<p className="text-[11px] leading-5 text-slate-500">The initial administrator must change the default password after first access.</p></form>;
}

function ScopedDocumentManager({ accessToken, canManage }: { accessToken: string; canManage: boolean }) {
  const picker = useRef<HTMLInputElement>(null);
  const documents = trpc.pharmacy.documents.list.useQuery({ accessToken });
  const upload = trpc.pharmacy.documents.upload.useMutation({ onSuccess: () => documents.refetch() });
  const remove = trpc.pharmacy.documents.delete.useMutation({ onSuccess: () => documents.refetch() });
  const [notice, setNotice] = useState<string | null>(null);
  const uploadFile = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) { setNotice("Documents must be 10 MB or smaller."); return; }
    const contentBase64 = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(",")[1] ?? ""); reader.onerror = reject; reader.readAsDataURL(file); });
    upload.mutate({ accessToken, name: file.name, mimeType: file.type || "application/octet-stream", contentBase64 }, { onError: (error) => setNotice(error.message), onSuccess: () => setNotice("Document uploaded to the approved pharmacy folder.") });
  };
  const files = (documents.data ?? []) as Array<{ id: string; name: string; mimeType: string; webViewLink?: string }>;
  return <><Heading label="Scoped storage" title="Google Drive document manager" description="Server-side controls restrict every document action to the approved pharmacy Drive folder." /><Panel><div className="mb-5 flex items-center justify-between gap-4"><div><h2 className="text-sm font-semibold text-slate-900">Approved pharmacy folder</h2><p className="mt-1 text-xs text-slate-500">Credentials stay on the server and are never exposed to browser users.</p></div>{canManage ? <><input ref={picker} type="file" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) uploadFile(file); event.currentTarget.value = ""; }} /><button onClick={() => picker.current?.click()} disabled={upload.isPending} className="rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-60">{upload.isPending ? "Uploading…" : "Upload document"}</button></> : null}</div>{documents.isLoading ? <Loader2 className="mx-auto my-8 h-5 w-5 animate-spin text-emerald-700" /> : files.length ? <div className="divide-y divide-slate-100">{files.map((file) => <div key={file.id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="truncate text-sm font-medium text-slate-800">{file.name}</p><p className="mt-1 text-[11px] text-slate-500">{file.mimeType}</p></div><div className="flex shrink-0 gap-2">{file.webViewLink ? <a href={file.webViewLink} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700">Open</a> : null}{canManage ? <button onClick={() => remove.mutate({ accessToken, fileId: file.id }, { onError: (error) => setNotice(error.message), onSuccess: () => setNotice("Document deleted from the approved folder.") })} className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700">Delete</button> : null}</div></div>)}</div> : <Empty title="No scoped documents yet" description="Authorized document managers can upload the first document into the approved pharmacy folder." />}{notice ? <p className="mt-4 text-xs text-slate-600">{notice}</p> : null}</Panel></>;
}

export default function PharmacyWorkspace() {
  const auth = usePharmacyAuth(); const [page, setPage] = useState<PageId>("dashboard");
  const menuItems = useMemo(() => navigation.map((item) => item.id === "access" ? { ...item, badge: 1 } : item), []);
  if (!auth.isConfigured) return <div className="grid min-h-screen place-items-center bg-[#f4f7f5] p-6"><Panel className="max-w-lg text-center"><AlertTriangle className="mx-auto h-7 w-7 text-amber-600" /><h1 className="mt-5 text-xl font-semibold text-slate-950">Supabase configuration required</h1><p className="mt-3 text-sm leading-6 text-slate-600">The pharmacy workspace is ready for Supabase Auth and row-level security. Add the project URL and publishable key through secure project settings to enable Google sign-in.</p></Panel></div>;
  if (auth.loading) return <div className="grid min-h-screen place-items-center bg-[#f4f7f5]"><Loader2 className="h-7 w-7 animate-spin text-emerald-700" /></div>;
  if (!auth.user) return <div className="grid min-h-screen place-items-center bg-[#f4f7f5] p-6"><Panel className="w-full max-w-lg text-center"><ShieldCheck className="mx-auto h-7 w-7 text-emerald-700" /><p className="mt-5 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-700">Protected pharmacy workspace</p><h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Sign in to pharmacy IT</h1><p className="mt-3 text-sm leading-6 text-slate-600">Only approved accounts can access IT operations, asset records, procurement, and scoped documents.</p><PasswordSignIn /><div className="my-5 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400"><span className="h-px flex-1 bg-slate-200" />or<span className="h-px flex-1 bg-slate-200" /></div><button onClick={() => signInWithGoogle().catch(() => undefined)} className="inline-flex items-center gap-2 rounded-xl border border-emerald-700 px-5 py-3 text-sm font-semibold text-emerald-800 shadow-sm transition-transform active:scale-95"><ShieldCheck className="h-4 w-4" />Continue with Google</button></Panel></div>;
  if (auth.error || !auth.profile || !auth.isApproved) return <div className="grid min-h-screen place-items-center bg-[#f4f7f5] p-6"><Panel className="max-w-lg text-center"><HelpCircle className="mx-auto h-7 w-7 text-amber-600" /><h1 className="mt-4 text-xl font-semibold text-slate-950">Account approval required</h1><p className="mt-3 text-sm leading-6 text-slate-600">Your Google account is authenticated, but an administrator has not approved it for pharmacy IT operations. Contact the IT supervisor to request access.</p><button onClick={() => auth.signOut()} className="mt-5 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Sign out</button></Panel></div>;
  if (String(page) === "documents") return <DashboardLayout menuItems={menuItems} activeItem={page} onNavigate={(id) => setPage(id as PageId)} userName={auth.profile.full_name || auth.user.email || "Pharmacy user"} userEmail={auth.profile.email} userRole={auth.profile.role} onSignOut={() => auth.signOut()}><ScopedDocumentManager accessToken={auth.accessToken ?? ""} canManage={["super_admin", "it_supervisor", "document_manager"].includes(auth.profile.role)} /></DashboardLayout>;
  const content = page === "dashboard" ? <><Heading label="Operational overview" title="Good morning, IT team." description="Monitor pharmacy technology operations, approvals, inventory, and upcoming obligations from one protected workspace." /><Metrics /></> : page === "tickets" ? <><Heading label="Helpdesk" title="IT support requests" description="Submit pharmacy technology issues, track their status, and retain a single accountable support record." /><TicketModule userId={auth.user.id} /></> : page === "assets" ? <><Heading label="Inventory" title="Hardware asset registry" description="Register pharmacy equipment, use database-generated asset codes, and maintain lifecycle accountability." /><AssetModule userId={auth.user.id} /></> : page === "access" ? <><Heading label="Security workflow" title="IT access control" description="Request, review, approve, provision, or revoke internal system access with an immutable audit history." /><AccessModule userId={auth.user.id} /></> : page === "procurement" ? <><Heading label="Procurement controls" title="Purchase requisitions & three-way matching" description="Control purchasing from requisition to purchase order, goods receipt, and invoice reconciliation." /><ProcurementModule /></> : page === "renewals" ? <SimpleRecords label="Continuity planning" title="Renewals & expiry tracker" description="Monitor software licenses, subscriptions, and contracts approaching their renewal dates." table="renewals" order="renewal_date" icon={CalendarClock} columns={[{ id: "name", label: "Renewal" }, { id: "category", label: "Category" }, { id: "renewal_date", label: "Renewal date" }, { id: "status", label: "Status" }]} /> : page === "meetings" ? <SimpleRecords label="Governance" title="Meeting minutes & action items" description="Record pharmacy IT decisions, attendees, and accountable follow-up work." table="meeting_minutes" order="meeting_date" icon={UsersRound} columns={[{ id: "meeting_date", label: "Date" }, { id: "title", label: "Meeting" }, { id: "notes", label: "Notes" }]} /> : page === "documents" ? <><Heading label="Scoped storage" title="Google Drive document manager" description="Authorized document managers can upload, list, and delete documents only within the approved pharmacy folder." /><Panel><Empty title="Google Drive scope awaiting secure configuration" description="The server integration activates after the Drive service-account JSON and root-folder ID are stored securely. Browser users never receive that credential." /></Panel></> : page === "reports" ? <ReportsModule /> : <><Heading label="Administration" title="System settings" description="Manage approved accounts, roles, reference data, and controlled migrations under super-admin policies." /><div className="grid gap-6 lg:grid-cols-2"><Panel><h2 className="text-sm font-semibold text-slate-900">Your access profile</h2><div className="mt-4 space-y-3 text-sm"><div className="flex justify-between border-b border-slate-100 pb-3"><span className="text-slate-500">Account</span><span className="font-medium text-slate-800">{auth.profile.email}</span></div><div className="flex justify-between border-b border-slate-100 pb-3"><span className="text-slate-500">Role</span><span className="font-medium capitalize text-slate-800">{auth.profile.role.replaceAll("_", " ")}</span></div><div className="flex justify-between"><span className="text-slate-500">Approval</span><span className="font-medium text-emerald-700">Approved</span></div></div></Panel><Panel><h2 className="text-sm font-semibold text-slate-900">Administrative safeguards</h2><p className="mt-4 rounded-xl bg-emerald-50 p-3 text-xs leading-5 text-emerald-800">Only a super administrator can approve accounts, set roles, change reference data, or run controlled migrations. All sensitive records remain protected by Supabase policies.</p></Panel></div></>;
  return <DashboardLayout menuItems={menuItems} activeItem={page} onNavigate={(id) => setPage(id as PageId)} userName={auth.profile.full_name || auth.user.email || "Pharmacy user"} userEmail={auth.profile.email} userRole={auth.profile.role} onSignOut={() => auth.signOut()}>{content}</DashboardLayout>;
}
