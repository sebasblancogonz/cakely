import {
  Setting as SelectSetting,
  IngredientPrice as SelectIngredientPrice,
  Recipe as SelectRecipe,
  RecipeIngredient as SelectRecipeIngredient,
  SelectOrder as DbSelectOrder,
  SelectCustomer as DbSelectCustomer
} from '@/lib/db';

export type Setting = SelectSetting;
export type IngredientPrice = SelectIngredientPrice;
export type Recipe = SelectRecipe;
export type RecipeIngredient = SelectRecipeIngredient;

export type Customer = DbSelectCustomer & {
  orders?: Order[];
};

export type Order = DbSelectOrder & {
  customer?: Customer;
  orderHistory?: OrderHistoryEntry[];
  images?: OrderImage[];
};

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
