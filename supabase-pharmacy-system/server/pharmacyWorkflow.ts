import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { TRPCError } from "@trpc/server";

export type PharmacyRole =
  | "super_admin"
  | "it_supervisor"
  | "finance_manager"
  | "asset_editor"
  | "document_manager"
  | "staff_viewer";

export type AccessStatus =
  | "submitted"
  | "manager_review"
  | "it_review"
  | "approved"
  | "provisioning"
  | "active"
  | "revoked"
  | "rejected";

export type ApprovedActor = {
  id: string;
  email: string;
  role: PharmacyRole;
};

function getAdminClient(): SupabaseClient {
  const projectUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!projectUrl || !serviceRoleKey) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Supabase server configuration is incomplete." });
  }
  return createClient(projectUrl, serviceRoleKey, { auth: { persistSession: false } });
}

function databaseError(error: { message: string } | null): never {
  throw new TRPCError({ code: "BAD_REQUEST", message: error?.message ?? "The operation could not be completed." });
}

export async function authenticateApprovedActor(accessToken: string): Promise<ApprovedActor> {
  const admin = getAdminClient();
  const { data: authData, error: authError } = await admin.auth.getUser(accessToken);
  if (authError || !authData.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "A valid Supabase session is required." });
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, email, role, approved")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (profileError || !profile || !profile.approved || profile.role === "disabled") {
    throw new TRPCError({ code: "FORBIDDEN", message: "This pharmacy account has not been approved." });
  }

  return { id: profile.id, email: profile.email, role: profile.role as PharmacyRole };
}

function requireRole(actor: ApprovedActor, allowed: PharmacyRole[]) {
  if (!allowed.includes(actor.role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Your pharmacy role cannot perform this action." });
  }
}

export function canTransitionAccessRequest(from: AccessStatus, to: AccessStatus): boolean {
  const transitions: Record<AccessStatus, AccessStatus[]> = {
    submitted: ["manager_review", "rejected"],
    manager_review: ["it_review", "rejected"],
    it_review: ["approved", "rejected"],
    approved: ["provisioning", "revoked"],
    provisioning: ["active", "revoked"],
    active: ["revoked"],
    revoked: [],
    rejected: [],
  };
  return transitions[from].includes(to);
}

export async function createAsset(
  actor: ApprovedActor,
  input: { category: string; model: string; brand?: string; serialNumber?: string; notes?: string },
) {
  requireRole(actor, ["super_admin", "it_supervisor", "asset_editor"]);
  const { data, error } = await getAdminClient()
    .from("assets")
    .insert({
      category: input.category,
      model: input.model,
      brand: input.brand ?? null,
      serial_number: input.serialNumber ?? null,
      notes: input.notes ?? null,
      created_by: actor.id,
    })
    .select("id, asset_code, category, model, status")
    .single();
  if (error) databaseError(error);
  return data;
}

export async function transitionAccessRequest(
  actor: ApprovedActor,
  input: { requestId: string; toStatus: AccessStatus; provisionReference?: string },
) {
  requireRole(actor, ["super_admin", "it_supervisor"]);
  const admin = getAdminClient();
  const { data: request, error: readError } = await admin
    .from("access_requests")
    .select("id, status")
    .eq("id", input.requestId)
    .single();
  if (readError || !request) databaseError(readError);
  if (!canTransitionAccessRequest(request.status as AccessStatus, input.toStatus)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "This access-request status transition is not allowed." });
  }
  const { data, error } = await admin
    .from("access_requests")
    .update({ status: input.toStatus, provision_reference: input.provisionReference ?? null })
    .eq("id", input.requestId)
    .select("id, request_number, status, provision_reference")
    .single();
  if (error) databaseError(error);
  return data;
}

export async function createPurchaseRequisition(
  actor: ApprovedActor,
  input: { purpose: string; requiredBy?: string; currency?: string },
) {
  const { data, error } = await getAdminClient()
    .from("purchase_requisitions")
    .insert({
      requester_id: actor.id,
      purpose: input.purpose,
      required_by: input.requiredBy ?? null,
      currency: input.currency ?? "MMK",
      status: "submitted",
    })
    .select("id, requisition_number, purpose, status, currency")
    .single();
  if (error) databaseError(error);
  return data;
}

export async function recordThreeWayInvoice(
  actor: ApprovedActor,
  input: {
    purchaseOrderId: string;
    invoiceNumber: string;
    invoiceDate: string;
    invoiceAmount: number;
    purchaseOrderAmount: number;
    receivedAmount: number;
  },
) {
  requireRole(actor, ["super_admin", "it_supervisor", "finance_manager"]);
  const { data, error } = await getAdminClient()
    .from("invoice_matches")
    .insert({
      purchase_order_id: input.purchaseOrderId,
      invoice_number: input.invoiceNumber,
      invoice_date: input.invoiceDate,
      invoice_amount: input.invoiceAmount,
      po_amount: input.purchaseOrderAmount,
      received_amount: input.receivedAmount,
      reviewed_by: actor.id,
    })
    .select("id, invoice_number, matched, mismatch_reason")
    .single();
  if (error) databaseError(error);
  return data;
}

export async function createTicket(
  actor: ApprovedActor,
  input: { subject: string; description: string; priority: "low" | "medium" | "high" | "critical" },
) {
  const { data, error } = await getAdminClient()
    .from("tickets")
    .insert({ ...input, requester_id: actor.id })
    .select("id, ticket_number, subject, priority, status")
    .single();
  if (error) databaseError(error);
  return data;
}

export async function moveAsset(
  actor: ApprovedActor,
  input: { assetId: string; movementType: "assigned" | "transferred" | "returned" | "maintenance" | "disposed"; toProfileId?: string; notes?: string },
) {
  requireRole(actor, ["super_admin", "it_supervisor", "asset_editor"]);
  const { data, error } = await getAdminClient()
    .from("asset_movements")
    .insert({ asset_id: input.assetId, movement_type: input.movementType, to_profile_id: input.toProfileId ?? null, notes: input.notes ?? null, performed_by: actor.id })
    .select("id, asset_id, movement_type, created_at")
    .single();
  if (error) databaseError(error);
  return data;
}

export async function issuePurchaseOrder(
  actor: ApprovedActor,
  input: { requisitionId: string; supplierId: string; expectedDeliveryDate?: string; totalAmount: number },
) {
  requireRole(actor, ["super_admin", "it_supervisor", "finance_manager"]);
  const { data, error } = await getAdminClient()
    .from("purchase_orders")
    .insert({ requisition_id: input.requisitionId, supplier_id: input.supplierId, issued_by: actor.id, expected_delivery_date: input.expectedDeliveryDate ?? null, total_amount: input.totalAmount })
    .select("id, po_number, status, total_amount")
    .single();
  if (error) databaseError(error);
  return data;
}

export async function recordGoodsReceipt(
  actor: ApprovedActor,
  input: { purchaseOrderId: string; notes?: string },
) {
  requireRole(actor, ["super_admin", "it_supervisor", "asset_editor"]);
  const { data, error } = await getAdminClient()
    .from("goods_receipts")
    .insert({ purchase_order_id: input.purchaseOrderId, received_by: actor.id, notes: input.notes ?? null })
    .select("id, grn_number, purchase_order_id, received_at")
    .single();
  if (error) databaseError(error);
  return data;
}

export async function createRenewal(
  actor: ApprovedActor,
  input: { name: string; category: string; renewalDate: string; cost?: number; notes?: string },
) {
  requireRole(actor, ["super_admin", "it_supervisor", "finance_manager"]);
  const { data, error } = await getAdminClient()
    .from("renewals")
    .insert({ name: input.name, category: input.category, renewal_date: input.renewalDate, cost: input.cost ?? null, notes: input.notes ?? null, owner_id: actor.id })
    .select("id, name, renewal_date, status")
    .single();
  if (error) databaseError(error);
  return data;
}

export async function createMeetingMinutes(
  actor: ApprovedActor,
  input: { meetingDate: string; title: string; notes: string; attendees: string[] },
) {
  const { data, error } = await getAdminClient()
    .from("meeting_minutes")
    .insert({ meeting_date: input.meetingDate, title: input.title, notes: input.notes, attendees: input.attendees, created_by: actor.id })
    .select("id, meeting_date, title")
    .single();
  if (error) databaseError(error);
  return data;
}
