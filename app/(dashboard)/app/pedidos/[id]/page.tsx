import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { orders, customers } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency, getStatusStyle, cn } from '@/lib/utils';
import type {
  Order,
  Customer,
  OrderImage,
  OrderStatus as OrderStatusType,
  PaymentStatus as PaymentStatusType,
  TeamRole
} from '@types';

import {
  CalendarDays,
  User,
  Mail,
  Phone,
  Instagram,
  Tag,
  Hash,
  Weight,
  Cookie,
  Info,
  StickyNote,
  ImageIcon,
  Package,
  Euro,
  CircleHelp,
  BotMessageSquare,
  ArrowLeft
} from 'lucide-react';

import OrderImagesClient from '@/components/orders/OrderImagesClient';
import { Label } from '@/components/ui/label';
import { Status } from '@/components/common/OrderStatusCell';
import { PaymentStatusSelector } from '@/components/orders/PaymentStatusSelector';
import { OrderStatusSelector } from '@/components/orders/OrderStatusSelector';
import { BackButton } from '@/components/common/BackButton';
import { OrderDetailActions } from '@/components/orders/OrderDetailActions';

export async function generateMetadata({
  params
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const p = await params;
  const orderId = parseInt(p.id, 10);
  let pageTitle = `Pedido | Detalles | Cakely`;
  try {
    const session = await auth();
    const businessId = session?.user?.businessId;
    if (!isNaN(orderId) && businessId) {
      const orderInfo = await db.query.orders.findFirst({
        columns: { businessOrderNumber: true, customerId: true }, // Selecciona el número guardado
        where: and(eq(orders.id, orderId), eq(orders.businessId, businessId)),
        with: { customer: { columns: { name: true } } }
      });
      if (orderInfo?.businessOrderNumber) {
        pageTitle = `Pedido #${orderInfo.businessOrderNumber}${orderInfo.customer?.name ? ` - ${orderInfo.customer.name}` : ''} | Cakely`;
      }
    }
  } catch (error) {
    console.error('Metadata generation error:', error);
  }

  return { title: pageTitle };
}

type OrderWithCustomer = Order & {
  customer: Customer | null;
  images: OrderImage[];
};

export default async function OrderDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const businessId = session?.user?.businessId;
  const currentUserRole = session?.user?.role as TeamRole | undefined | null;
  const p = await params;
  const orderId = parseInt(p.id, 10);
  if (!businessId || isNaN(orderId)) {
    notFound();
  }

  const order: OrderWithCustomer | undefined = await db.query.orders.findFirst({
    where: and(eq(orders.id, orderId), eq(orders.businessId, businessId)),
    with: { customer: true }
  });
  if (!order) {
    notFound();
  }

  const canEditStatuses =
    currentUserRole === 'OWNER' ||
    currentUserRole === 'ADMIN' ||
    currentUserRole === 'EDITOR';

  const orderImages = order.images ?? [];

  const displayData = (
    data: string | number | null | undefined,
    fallback = '-'
  ) => data ?? fallback;
  const formatDateFull = (date: Date | string | null | undefined) => {
    if (!date) return '-';
    try {
      return format(new Date(date), 'PPPP', { locale: es });
    } catch {
      return 'Inválida';
    }
  };
  const formatTime = (date: Date | string | null | undefined) => {
    if (!date) return '-';
    try {
      return format(new Date(date), 'p', { locale: es });
    } catch {
      return 'Inválida';
    }
  };
  const totalPriceNum = Number(order.totalPrice || '0');
  const depositAmountNum = Number(order.depositAmount || '0');
  const pendingAmount = totalPriceNum - depositAmountNum;
  const canEditOrder =
    currentUserRole === 'OWNER' ||
    currentUserRole === 'ADMIN' ||
    currentUserRole === 'EDITOR';

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 lg:space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Package className="h-7 w-7 text-primary" /> Pedido #
            {order.businessOrderNumber}
          </h1>
          <p className="text-muted-foreground mt-1">
            Cliente:{' '}
            <strong className="text-foreground">
              {order.customer?.name ?? 'Desconocido'}
            </strong>{' '}
            | Pedido el: {formatDateFull(order.orderDate)}
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                Estado:
              </span>
              {canEditStatuses ? (
                <OrderStatusSelector
                  orderId={order.id}
                  currentStatus={order.orderStatus as OrderStatusType}
                />
              ) : (
                <Badge
                  variant="outline"
                  className={getStatusStyle(
                    order.orderStatus as OrderStatusType
                  )}
                >
                  {displayData(order.orderStatus)}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                Pago:
              </span>
              {canEditStatuses ? (
                <PaymentStatusSelector
                  orderId={order.id}
                  currentStatus={order.paymentStatus as PaymentStatusType}
                />
              ) : (
                <Badge
                  variant="outline"
                  className={getStatusStyle(
                    order.paymentStatus as PaymentStatusType
                  )}
                >
                  {displayData(order.paymentStatus)}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-shrink-0 gap-2">
          <BackButton />
          <div className="flex flex-shrink-0 gap-2 self-start sm:self-center">
            {canEditOrder && <OrderDetailActions order={order} />}{' '}
          </div>
        </div>
      </div>

      <Separator />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-start">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Detalles del Pedido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <CalendarDays className="h-5 w-5 text-primary flex-shrink-0" />
                <span>Entrega:</span>
                <span className="text-foreground font-semibold">
                  {order.deliveryDate
                    ? `${formatDateFull(order.deliveryDate)} a las ${formatTime(order.deliveryDate)}`
                    : 'Fecha no especificada'}
                </span>
              </div>
              <Separator />
              <div>
                <Label className="text-sm font-medium text-muted-foreground">
                  Descripción General
                </Label>
                <p className="text-sm whitespace-pre-wrap mt-1">
                  {displayData(order.description)}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm pt-2">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <strong>Tipo:</strong> {displayData(order.productType)}
                </div>
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <strong>Cantidad:</strong> {displayData(order.quantity)}
                </div>
                <div className="flex items-center gap-2">
                  <Weight className="h-4 w-4 text-muted-foreground" />
                  <strong>Tamaño/Peso:</strong>{' '}
                  {displayData(order.sizeOrWeight)}
                </div>
                <div className="flex items-center gap-2">
                  <Cookie className="h-4 w-4 text-muted-foreground" />
                  <strong>Sabor:</strong> {displayData(order.flavor)}
                </div>
              </div>
              {order.customizationDetails && (
                <div className="pt-2">
                  <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Detalles Personalización
                  </Label>
                  <p className="text-sm whitespace-pre-wrap mt-1">
                    {order.customizationDetails}
                  </p>
                </div>
              )}
              {order.allergyInformation && (
                <div className="pt-2">
                  <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <CircleHelp className="h-4 w-4" />
                    Info Alergias
                  </Label>
                  <p className="text-sm whitespace-pre-wrap mt-1">
                    {order.allergyInformation}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" /> Imágenes de Referencia
              </CardTitle>
            </CardHeader>
            <CardContent>
              <OrderImagesClient images={orderImages} />
            </CardContent>
          </Card>

          {order.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <StickyNote className="h-5 w-5" />
                  Notas Internas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{order.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" /> Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-medium text-base">
                {displayData(order.customer?.name)}
              </p>
              {order.customer?.email && (
                <p className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />{' '}
                  <span className="truncate">{order.customer.email}</span>
                </p>
              )}
              {order.customer?.phone && (
                <p className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />{' '}
                  {order.customer.phone}
                </p>
              )}
              {order.customer?.instagramHandle && (
                <p className="flex items-center gap-2">
                  <Instagram className="h-4 w-4 text-muted-foreground flex-shrink-0" />{' '}
                  {order.customer.instagramHandle}
                </p>
              )}
              <div className="flex flex-wrap gap-x-4 gap-y-1 pt-2">
                {order.customer?.phone && (
                  <a
                    href={`https://wa.me/${order.customer.phone.replace(/\s/g, '')}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-xs inline-flex items-center gap-1 text-green-600 hover:underline"
                  >
                    <BotMessageSquare className="h-3 w-3" /> WhatsApp
                  </a>
                )}
                {order.customer?.instagramHandle && (
                  <a
                    href={`https://ig.me/m/${order.customer.instagramHandle.replace(/^@/, '')}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-xs inline-flex items-center gap-1 text-purple-600 hover:underline"
                  >
                    <Instagram className="h-3 w-3" /> Instagram DM
                  </a>
                )}
              </div>
              {order.customerId && (
                <div className="pt-3 border-t mt-3">
                  <Button variant="secondary" size="sm" asChild>
                    <Link href={`/app/clientes/${order.customerId}`}>
                      Ver Ficha Cliente
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Euro className="h-5 w-5" /> Pago
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {order.amount && Number(order.amount) !== totalPriceNum && (
                <p>
                  <strong>Importe Original:</strong>{' '}
                  {formatCurrency(Number(order.amount))}
                </p>
              )}
              <p>
                <strong>Precio Total:</strong>{' '}
                <strong className="text-lg font-semibold">
                  {formatCurrency(totalPriceNum)}
                </strong>
              </p>
              <p>
                <strong>Señal Recibida:</strong>{' '}
                {formatCurrency(depositAmountNum)}
              </p>
              <p>
                <strong>Importe Pendiente:</strong>{' '}
                <strong className="text-lg font-semibold text-primary">
                  {formatCurrency(pendingAmount)}
                </strong>
              </p>
              <Separator className="my-3" />
              <p>
                <strong>Método Pago:</strong> {displayData(order.paymentMethod)}
              </p>
              <div className="flex items-center gap-2">
                <strong className="text-muted-foreground">Estado Pago:</strong>
                <Badge
                  variant="outline"
                  className={getStatusStyle(
                    order.paymentStatus as PaymentStatusType
                  )}
                >
                  {displayData(order.paymentStatus)}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
