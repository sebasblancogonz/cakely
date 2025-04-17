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
  images: string[];
}

export interface OrderHistory {
  status: OrderStatus;
  timestamp: Date;
}

interface BreadcrumbItem {
  href: string;
  label: string;
}

export interface DashboardBreadcrumbProps {
  items: BreadcrumbItem[];
}
