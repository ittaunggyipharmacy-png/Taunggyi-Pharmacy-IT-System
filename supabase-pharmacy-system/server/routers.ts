import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import {
  authenticateApprovedActor,
  createAsset,
  createMeetingMinutes,
  createPurchaseRequisition,
  createRenewal,
  createTicket,
  issuePurchaseOrder,
  moveAsset,
  recordGoodsReceipt,
  recordThreeWayInvoice,
  transitionAccessRequest,
} from "./pharmacyWorkflow";
import { z } from "zod";
import { deleteScopedDocument, listScopedDocuments, uploadScopedDocument } from "./googleDrive";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  pharmacy: router({
    tickets: router({
      create: publicProcedure
        .input(z.object({ accessToken: z.string().min(1), subject: z.string().min(3), description: z.string().min(5), priority: z.enum(["low", "medium", "high", "critical"]) }))
        .mutation(async ({ input }) => createTicket(await authenticateApprovedActor(input.accessToken), input)),
    }),
    assets: router({
      create: publicProcedure
        .input(z.object({ accessToken: z.string().min(1), category: z.string().min(1), model: z.string().min(1), brand: z.string().optional(), serialNumber: z.string().optional(), notes: z.string().optional() }))
        .mutation(async ({ input }) => createAsset(await authenticateApprovedActor(input.accessToken), input)),
      move: publicProcedure
        .input(z.object({ accessToken: z.string().min(1), assetId: z.string().uuid(), movementType: z.enum(["assigned", "transferred", "returned", "maintenance", "disposed"]), toProfileId: z.string().uuid().optional(), notes: z.string().optional() }))
        .mutation(async ({ input }) => moveAsset(await authenticateApprovedActor(input.accessToken), input)),
    }),
    access: router({
      transition: publicProcedure
        .input(z.object({ accessToken: z.string().min(1), requestId: z.string().uuid(), toStatus: z.enum(["submitted", "manager_review", "it_review", "approved", "provisioning", "active", "revoked", "rejected"]), provisionReference: z.string().optional() }))
        .mutation(async ({ input }) => transitionAccessRequest(await authenticateApprovedActor(input.accessToken), input)),
    }),
    procurement: router({
      createRequisition: publicProcedure
        .input(z.object({ accessToken: z.string().min(1), purpose: z.string().min(3), requiredBy: z.string().date().optional(), currency: z.string().length(3).optional() }))
        .mutation(async ({ input }) => createPurchaseRequisition(await authenticateApprovedActor(input.accessToken), input)),
      issuePurchaseOrder: publicProcedure
        .input(z.object({ accessToken: z.string().min(1), requisitionId: z.string().uuid(), supplierId: z.string().uuid(), expectedDeliveryDate: z.string().date().optional(), totalAmount: z.number().nonnegative() }))
        .mutation(async ({ input }) => issuePurchaseOrder(await authenticateApprovedActor(input.accessToken), input)),
      recordGoodsReceipt: publicProcedure
        .input(z.object({ accessToken: z.string().min(1), purchaseOrderId: z.string().uuid(), notes: z.string().optional() }))
        .mutation(async ({ input }) => recordGoodsReceipt(await authenticateApprovedActor(input.accessToken), input)),
      recordInvoiceMatch: publicProcedure
        .input(z.object({ accessToken: z.string().min(1), purchaseOrderId: z.string().uuid(), invoiceNumber: z.string().min(1), invoiceDate: z.string().date(), invoiceAmount: z.number().nonnegative(), purchaseOrderAmount: z.number().nonnegative(), receivedAmount: z.number().nonnegative() }))
        .mutation(async ({ input }) => recordThreeWayInvoice(await authenticateApprovedActor(input.accessToken), input)),
    }),
    renewals: router({
      create: publicProcedure
        .input(z.object({ accessToken: z.string().min(1), name: z.string().min(1), category: z.string().min(1), renewalDate: z.string().date(), cost: z.number().nonnegative().optional(), notes: z.string().optional() }))
        .mutation(async ({ input }) => createRenewal(await authenticateApprovedActor(input.accessToken), input)),
    }),
    meetings: router({
      create: publicProcedure
        .input(z.object({ accessToken: z.string().min(1), meetingDate: z.string().date(), title: z.string().min(1), notes: z.string().min(1), attendees: z.array(z.string()).default([]) }))
        .mutation(async ({ input }) => createMeetingMinutes(await authenticateApprovedActor(input.accessToken), input)),
    }),
    documents: router({
      list: publicProcedure
        .input(z.object({ accessToken: z.string().min(1) }))
        .query(async ({ input }) => { await authenticateApprovedActor(input.accessToken); return listScopedDocuments(); }),
      upload: publicProcedure
        .input(z.object({ accessToken: z.string().min(1), name: z.string().min(1).max(180), mimeType: z.string().min(1).max(120), contentBase64: z.string().min(1) }))
        .mutation(async ({ input }) => uploadScopedDocument(await authenticateApprovedActor(input.accessToken), input)),
      delete: publicProcedure
        .input(z.object({ accessToken: z.string().min(1), fileId: z.string().min(1) }))
        .mutation(async ({ input }) => deleteScopedDocument(await authenticateApprovedActor(input.accessToken), input.fileId)),
    }),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
