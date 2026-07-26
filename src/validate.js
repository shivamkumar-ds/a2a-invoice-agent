const { z } = require('zod');

const ALLOWED_ACTIONS = [
  'settle_invoice',
  'request_approval',
  'hold_invoice',
  'reject_duplicate',
  'open_exception',
];

// A package's exact field set beyond packageId isn't fully given, so this
// stays permissive (passthrough) while requiring the one field we know is
// load-bearing (packageId, used for dedup/uniqueness/reference).
const PackageSchema = z.object({ packageId: z.string().min(1) }).passthrough();

const InvoiceBatchDataSchema = z.object({
  batchId: z.string().min(1),
  policyRevision: z.string().min(1).optional(),
  packages: z.array(PackageSchema).min(1),
});

const ResultItemSchema = z
  .object({
    packageId: z.string().min(1),
    actionId: z.string().min(1),
    action: z.enum(ALLOWED_ACTIONS),
    outcome: z.enum(['ACCEPTED', 'REJECTED']),
    receiptNonce: z.string().min(1),
  })
  .passthrough();

const InvoiceResultsDataSchema = z.object({
  batchId: z.string().min(1),
  results: z.array(ResultItemSchema).min(1),
});

const PartSchema = z.object({
  mediaType: z.string().min(1),
  data: z.any(),
});

const MessageSchema = z
  .object({
    messageId: z.string().min(1),
    role: z.string().min(1),
    taskId: z.string().min(1).optional(),
    contextId: z.string().min(1).optional(),
    parts: z.array(PartSchema).min(1),
  })
  .passthrough();

const MessageSendRequestSchema = z
  .object({
    message: MessageSchema,
    configuration: z.record(z.any()).optional(),
  })
  .passthrough();

const FactsSchema = z
  .object({
    vendorName: z.string().min(1),
    invoiceNumber: z.string().min(1),
    amountMinor: z.number().int(),
    currency: z.string().min(1),
  })
  .passthrough();

const ProposalSchema = z.object({
  packageId: z.string().min(1),
  actionId: z.string().min(12),
  action: z.enum(ALLOWED_ACTIONS),
  facts: FactsSchema,
  evidenceRefs: z.array(z.string().min(1)).min(1),
  rationale: z.string().min(60).max(1500),
});

module.exports = {
  ALLOWED_ACTIONS,
  PackageSchema,
  InvoiceBatchDataSchema,
  InvoiceResultsDataSchema,
  MessageSendRequestSchema,
  ProposalSchema,
  FactsSchema,
};
