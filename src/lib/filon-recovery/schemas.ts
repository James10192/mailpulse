import { z } from "zod";

export const filonRecoveryPayloadSchema = z.object({
  source: z.literal("filon"),
  opportunityId: z.string().min(1),
  workspaceId: z.string().min(1).optional(),
  userId: z.string().min(1).optional(),
  clientName: z.string().min(1),
  clientEmail: z.string().email(),
  clientPhone: z.string().min(3).optional().or(z.literal("")),
  opportunityTitle: z.string().min(1),
  amountDue: z.coerce.number().nonnegative(),
  currency: z.string().min(2).max(8),
  dueDate: z.coerce.date(),
});

export type FilonRecoveryPayload = z.infer<typeof filonRecoveryPayloadSchema>;

export function validationErrorPayload(error: z.ZodError) {
  return {
    error: "Payload Filon invalide",
    fieldErrors: error.flatten().fieldErrors,
  };
}
