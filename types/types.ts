import { z } from 'zod';
import {
  Setting as SelectSetting,
  IngredientPrice as SelectIngredientPrice,
  Recipe as SelectRecipe,
  RecipeIngredient as SelectRecipeIngredient,
  SelectOrder as DbSelectOrder,
  SelectCustomer as DbSelectCustomer,
  SelectProductType
} from '@/lib/db';
import { teamRoleEnum, invitationStatusEnum } from '@/lib/db';

export type InvitationStatus = (typeof invitationStatusEnum.enumValues)[number];

export type PendingInvitation = {
  id: number;
  email: string;
  role: TeamRole;
  status: InvitationStatus;
  expiresAt: Date | null;
  createdAt: Date | null;
};

export type TeamMemberUser = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
};
export type TeamMemberWithUser = {
  userId: string;
  role: TeamRole;
  joinedAt: Date | null;
  name: string;
  email: string;
};

export type TeamRole = (typeof teamRoleEnum.enumValues)[number];

export type Setting = SelectSetting;
export type IngredientPrice = SelectIngredientPrice;
export type Recipe = SelectRecipe;
export type RecipeIngredient = SelectRecipeIngredient;
export type ProductType = SelectProductType;

export type Customer = DbSelectCustomer & {
  orders?: Order[];
};

export type Order = DbSelectOrder & {
  customer?: Customer;
  orderHistory?: OrderHistoryEntry[];
  images?: OrderImage[];
  productType: ProductType;
};

export enum OrderStatus {
  Pendiente = 'Pendiente',
  Preparando = 'Preparando',
  Listo = 'Listo',
  Entregado = 'Entregado'
}

export enum ProductTypeEnum {
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

export interface RecipeIngredientPrice extends RecipeIngredient {
  ingredient: IngredientPrice;
}

export type RecipeWithIngredients = Recipe & {
  recipeIngredients: RecipeIngredientPrice[];
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

export interface BusinessProfileData {
  name: string | null;
  logoUrl: string | null;
}
