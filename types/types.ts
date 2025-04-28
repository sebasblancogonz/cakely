import { z } from 'zod';
import {
  Setting as SelectSetting,
  IngredientPrice as SelectIngredientPrice,
  Recipe as SelectRecipe,
  RecipeIngredient as SelectRecipeIngredient,
  SelectOrder as DbSelectOrder,
  SelectCustomer as DbSelectCustomer
} from '@/lib/db';
import { teamRoleEnum, invitationStatusEnum } from '@/lib/db'; // Ajusta ruta a tu schema

export type InvitationStatus = (typeof invitationStatusEnum.enumValues)[number];

export type PendingInvitation = {
  id: number; // O string si usas UUID
  email: string;
  role: TeamRole; // Usa el tipo alias o directo del enum
  status: InvitationStatus; // Añade status si tu API lo devuelve
  expiresAt: Date | null; // El tipo Date es correcto si la API devuelve objetos Date o strings ISO 8601 parseables
  createdAt: Date | null;
};

// Define aquí también TeamMemberWithUser si lo usas en el mismo componente
export type TeamMemberUser = {
  id: string; // Asumiendo UUID string
  name: string | null;
  email: string;
  image: string | null;
};
export type TeamMemberWithUser = {
  userId: string; // Asumiendo UUID string
  role: TeamRole;
  joinedAt: Date | null;
  name: string;
  email: string; // Asegúrate que el JOIN no permita user null o ajústalo
};

export type TeamRole = (typeof teamRoleEnum.enumValues)[number];

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

export interface BusinessProfileData {
  name: string | null;
  logoUrl: string | null;
}
