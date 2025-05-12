import { z } from 'zod';
import { teamRoleEnum } from '@/lib/db';

export const adminCreateBusinessSchema = z.object({
  name: z
    .string()
    .min(3, 'El nombre del negocio debe tener al menos 3 caracteres.'),
  ownerEmail: z.string().email('Email del propietario inválido.')
  // Opcional: asignar un plan y estado inicial desde admin
  // planId: z.string().optional(),
  // subscriptionStatus: z.string().optional(),
  // isLifetime: z.boolean().optional(),
});
export type AdminCreateBusinessData = z.infer<typeof adminCreateBusinessSchema>;

export const adminUpdateBusinessSchema = z
  .object({
    name: z.string().min(3).optional(),
    ownerUserId: z.string().uuid().optional()
    // planId: z.string().optional(),
    // subscriptionStatus: z.string().optional(),
    // isLifetime: z.boolean().optional(),
    // stripeCustomerId: z.string().nullable().optional(),
    // stripeSubscriptionId: z.string().nullable().optional(),
    // currentPeriodEnd: z.date().nullable().optional(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Se necesita al menos un campo para actualizar.'
  });
export type AdminUpdateBusinessData = z.infer<typeof adminUpdateBusinessSchema>;

export const adminUpdateUserSchema = z
  .object({
    name: z.string().min(2).optional(),
    email: z.string().email().optional(),
    isSuperAdmin: z.boolean().optional()
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Se necesita al menos un campo para actualizar.'
  });
export type AdminUpdateUserData = z.infer<typeof adminUpdateUserSchema>;

export const adminManageTeamMemberSchema = z.object({
  userId: z.string().uuid('ID de usuario inválido.'),
  role: z.enum(['OWNER', 'ADMIN', 'EDITOR'])
});
export type AdminManageTeamMemberData = z.infer<
  typeof adminManageTeamMemberSchema
>;

export const adminCreateUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres.')
    .optional()
    .or(z.literal('')), // Permite string vacío
  email: z.string().email('Email inválido.'),
  isSuperAdmin: z.boolean().optional().default(false)
});
export type AdminCreateUserData = z.infer<typeof adminCreateUserSchema>;
