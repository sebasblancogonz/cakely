import {
  Setting as DbSetting,
  IngredientPrice as DbIngredientPrice,
  Recipe as DbRecipe,
  RecipeIngredient as DbRecipeIngredient
} from '@/lib/db';

export type Setting = DbSetting;
export type IngredientPrice = DbIngredientPrice;
export type Recipe = DbRecipe;
export type RecipeIngredient = DbRecipeIngredient;

export type RecipeWithIngredients = DbRecipe & {
  recipeIngredients: (DbRecipeIngredient & {
    ingredient: DbIngredientPrice;
  })[];
};

export interface RecipeIngredientFormItem {
  ingredientId: number;
  name: string;
  quantity: number;
  unit: string;
}

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
  Cancelado = 'Cancelado'
}

export enum PaymentMethod {
  Efectivo = 'Efectivo',
  Tarjeta = 'Tarjeta',
  'Transferencia' = 'Transferencia',
  Bizum = 'Bizum'
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

export interface Customer {
  id: number | undefined;
  name: string;
  email: string;
  phone: string;
  registrationDate: Date;
  notes: string;
}

export interface Order {
  id: number | undefined;
  description: string;
  customerName: string;
  customerContact: string;
  amount: number;
  orderDate: Date;
  deliveryDate: Date;
  orderStatus: OrderStatus;
  productType: ProductType;
  customizationDetails: string;
  quantity: number;
  sizeOrWeight: string;
  flavor: string;
  allergyInformation: string;
  totalPrice: number;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  notes: string;
  orderHistory: OrderHistory[];
  images: OrderImage[];
}

export interface OrderHistory {
  status: OrderStatus;
  timestamp: Date;
}

export interface OrderImage {
  id: string;
  url: string;
}

interface BreadcrumbItem {
  href: string;
  label: string;
}

export interface DashboardBreadcrumbProps {
  items: BreadcrumbItem[];
}

export const ORDER_STATUSES = [
  'Pendiente',
  'Preparando',
  'Listo',
  'Entregado'
] as const;
