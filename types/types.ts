export enum OrderStatus {
  Pendiente = 'Pendiente',
  'En Preparación' = 'En Preparación',
  Listo = 'Listo',
  Entregado = 'Entregado'
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
  'Transferencia Bancaria' = 'Transferencia Bancaria',
  Bizum = 'Bizum'
}

export interface Order {
  id: number;
  customerName: string;
  customerContact: string;
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
}

export interface OrderHistory {
  status: OrderStatus;
  timestamp: Date;
}

interface BreadcrumbItem {
  href: string;
  label: string;
}

interface DashboardBreadcrumbProps {
  items: BreadcrumbItem[];
  current: string;
}
