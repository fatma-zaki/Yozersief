export {
  applyTransition,
  type TransitionActor,
  type TransitionInput,
} from "./application/apply-transition";
export {
  advanceOrderStage,
  countNewOrders,
  decideOrder,
  getAdminOrders,
  saveInternalNote,
  type AdminOrderFile,
  type AdminOrdersData,
  type AdminOrderView,
  type StaffActionResult,
} from "./application/admin-orders";
export {
  getDesignQueue,
  flagCustomerFiles,
  submitMockup,
  type DesignData,
  type DesignJobView,
} from "./application/design-workspace";
export {
  finishPrinting,
  getProductionBoard,
  passQc,
  setPieceDone,
  setPrintedCount,
  setQcCheck,
  startPrinting,
  type NamesSheet,
  type ProductionCard,
  type ProductionData,
} from "./application/production-workspace";
export {
  confirmHandover,
  getDeliveryBoard,
  recordPayment,
  type DeliveryData,
  type HandoverResult,
  type HandoverView,
} from "./application/delivery-workspace";
export { countWorkspaceBadges } from "./application/workspace-badges";
export {
  customerWhatsappLink,
  draftQuote,
  forwardToAdmin,
  getDeskQueue,
  recordMockupDecision,
  sendMockupToCustomer,
  type DeskActionResult,
  type DeskData,
  type DeskOrderView,
} from "./application/desk";
export type { DeskState } from "./domain/desk";
export type { FileStorage, StoredBlobContent, StoredBlobMeta } from "./application/file-storage";
export { cleanupExpiredUploadDrafts } from "./application/cleanup-drafts";
export { countOrderFunnel } from "./application/funnel";
export { submitOrder, type SubmitOrderResult } from "./application/submit-order";
export {
  authorizeUpload,
  completeUploadedFile,
  recordUploadedFile,
  recordUploadDraft,
  uploadPayloadSchema,
  DRAFT_TTL_MS,
  MAX_DRAFTS_PER_SUBMISSION,
  type UploadCompletionBlob,
  type UploadCompletionPayload,
  type UploadPayload,
} from "./application/uploads";
export * from "./domain/files";
export * from "./domain/lifecycle";
export type { AdminStatus, Decision } from "./domain/admin-view";
export * from "./domain/request";
export { blobUploadMode, createFileStorage } from "./infrastructure/vercel-blob-storage";
export { orderExists } from "./infrastructure/order-repository";
export { RequestBuilder } from "./ui/request-builder/RequestBuilder.client";
export { ReadinessPanel, type ReadinessItem } from "./ui/ReadinessPanel";
export { readOrderFile, type OrderFileContent } from "./application/file-access";
