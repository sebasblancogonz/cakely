import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ProductType
} from '@/types/types';
import { z } from 'zod';

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const createOrderFormSchema = z.object({
  customerId: z.coerce
    .number()
    .int()
    .positive({ message: 'Selecciona un cliente' }),
  description: z
    .string()
    .trim()
    .min(1, { message: 'La descripción es requerida' }),
  amount: z.coerce
    .number()
    .positive({ message: 'Importe original debe ser positivo' }),
  deliveryDate: z.coerce
    .date({ invalid_type_error: 'Fecha de entrega inválida' })
    .nullable()
    .optional(),
  deliveryTime: z
    .string()
    .regex(timeRegex, { message: 'Hora inválida (formato HH:MM)' })
    .nullable()
    .optional()
    .or(z.literal('')),
  productType: z
    .string()
    .trim()
    .min(1, { message: 'El tipo de producto es requerido' }),
  customizationDetails: z.string().optional(),
  quantity: z.coerce
    .number()
    .int()
    .positive({ message: 'Cantidad debe ser positiva' }),
  sizeOrWeight: z.string().min(1, { message: 'Tamaño/Peso es requerido' }),
  flavor: z.string().min(1, { message: 'Sabor es requerido' }),
  allergyInformation: z.string().optional(),
  totalPrice: z.coerce
    .number()
    .positive({ message: 'Precio total debe ser positivo' }),
  paymentStatus: z.nativeEnum(PaymentStatus),
  paymentMethod: z.nativeEnum(PaymentMethod),
  depositAmount: z.coerce
    .number()
    .min(0, { message: 'La señal no puede ser negativa' })
    .optional(),
  notes: z.string().optional(),
  createCalendarEvent: z.boolean().default(false)
});

export const updateOrderFormSchema = createOrderFormSchema
  .omit({ customerId: true })
  .partial()
  .extend({
    productType: z.string().trim().min(1, 'El tipo es requerido').optional(),
    images: z
      .array(
        z.object({
          id: z.string(),
          url: z.string().url()
        })
      )
      .optional(),
    orderStatus: z.nativeEnum(OrderStatus).optional()
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Al menos un campo debe ser proporcionado'
  });

export type OrderFormData = z.infer<typeof createOrderFormSchema>;
export type UpdateOrderFormData = z.infer<typeof updateOrderFormSchema>;
