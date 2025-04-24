import { z } from 'zod';
import {
  Setting as SelectSetting,
  IngredientPrice as SelectIngredientPrice,
  Recipe as SelectRecipe,
  RecipeIngredient as SelectRecipeIngredient,
  SelectOrder as DbSelectOrder,
  SelectCustomer as DbSelectCustomer
} from '@/lib/db';

// --- Core Database Entity Types ---
export type Setting = SelectSetting;
export type IngredientPrice = SelectIngredientPrice;
export type Recipe = SelectRecipe;
export type RecipeIngredient = SelectRecipeIngredient;

// --- Frontend-Specific Types ---
export type Customer = DbSelectCustomer & {
  orders?: Order[];
};

export type Order = DbSelectOrder & {
  customer?: Customer;
  orderHistory?: OrderHistoryEntry[];
  images?: OrderImage[];
};

// --- Enums ---
export enum OrderStatus {
  pending = 'Pendiente',
  processing = 'Preparando',
  ready = 'Listo',
  delivered = 'Entregado'
}

export enum ProductType {
  Tarta = 'Tarta',
  Galletas = 'Galletas',
  Cupcakes = 'Cupcakes',
  Macarons = 'Macarons',
  Otros = 'Otros'
}

export enum PaymentStatus {
  Pendiente = 'Pendiente',
  Pagado = 'Pagado',
  Cancelado = 'Cancelado',
  Parcial = 'Parcial',
  Reembolsado = 'Reembolsado'
}

export enum PaymentMethod {
  Efectivo = 'Efectivo',
  Tarjeta = 'Tarjeta',
  Transferencia = 'Transferencia',
  Bizum = 'Bizum'
}

export type RecipeWithIngredients = Recipe & {
  recipeIngredients: (RecipeIngredient & {
    ingredient: IngredientPrice;
  })[];
};

export interface RecipeIngredientFormItem {
  ingredientId: number;
  name: string;
  quantity: number;
  unit: string;
}

export interface QuoteBreakdown {
  cogsIngredients: number;
  cogsPackaging: number;
  directLaborCost: number;
  allocatedOverhead: number;
  totalCost: number;
  profitAmount: number;
  basePrice: number;
  ivaAmount: number;
  finalPrice: number;
}

export interface OrderHistoryEntry {
  status: OrderStatus;
  timestamp: string | Date;
  notes?: string;
}

export interface OrderImage {
  id: string;
  url: string;
  thumbnailUrl?: string;
}

interface BreadcrumbItem {
  href: string;
  label: string;
}
export interface DashboardBreadcrumbProps {
  items: BreadcrumbItem[];
}

export const recipeFormSchema = z.object({
  id: z.coerce.number().optional(),
  name: z.string().min(1, 'Nombre de receta requerido'),
  productType: z.nativeEnum(ProductType, {
    errorMap: () => ({ message: 'Selecciona un tipo de producto' })
  }),
  baseLaborHours: z.coerce.number().min(0, 'Horas deben ser >= 0'),
  notes: z.string().optional(),
  recipeIngredients: z
    .array(
      z.object({
        ingredientId: z.coerce
          .number()
          .int()
          .positive('Selecciona un ingrediente'),
        quantity: z.coerce.number().positive('Cantidad debe ser positiva'),
        unit: z.string().min(1, 'Unidad requerida')
      })
    )
    .min(1, 'Añade al menos un ingrediente')
});
export type RecipeFormData = z.infer<typeof recipeFormSchema>;

export const orderFormSchema = z.object({
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
  notes: z.string().optional()
});
export type OrderFormData = z.infer<typeof orderFormSchema>;
