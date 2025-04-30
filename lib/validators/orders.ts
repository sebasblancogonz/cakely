import { PaymentMethod, PaymentStatus, ProductType } from '@/types/types';
import { z } from 'zod';

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
  productType: z.nativeEnum(ProductType),
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
  notes: z.string().optional()
});

export const updateOrderFormSchema = createOrderFormSchema
  .omit({ customerId: true })
  .partial()
  .refine(
    (data) => Object.keys(data).length > 0,

    {
      message: 'Al menos un campo debe ser proporcionado'
    }
  );

export type OrderFormData = z.infer<typeof createOrderFormSchema>;
export type UpdateOrderFormData = z.infer<typeof updateOrderFormSchema>;
