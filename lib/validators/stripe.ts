import { z } from 'zod';

export const createCheckoutSessionSchema = z.object({
  priceId: z.string().trim().min(1, 'El ID del precio (plan) es requerido.'),
  isTrial: z.boolean().optional()
});

export type CreateCheckoutSessionData = z.infer<
  typeof createCheckoutSessionSchema
>;
