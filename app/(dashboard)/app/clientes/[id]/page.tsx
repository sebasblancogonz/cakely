import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { customers, orders } from '@/lib/db';
import { eq, and, desc } from 'drizzle-orm';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type {
  Customer,
  Order,
  OrderStatus as OrderStatusType,
  PaymentStatus as PaymentStatusType
} from '@types';

import {
  User,
  Mail,
  Phone,
  Instagram,
  StickyNote,
  ListOrdered,
  MessageSquare,
  Eye
} from 'lucide-react';
import { formatCurrency, getStatusStyle } from '@/lib/utils';
import { CustomerDetailActions } from '@/components/customers/CustomerDetailActions';

export async function generateMetadata({
  params
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const p = await params;
  const customerId = parseInt(p.id, 10);
  let customerName = `Cliente #${customerId}`;
  try {
    const session = await auth();
    const businessId = session?.user?.businessId;
    if (businessId && !isNaN(customerId)) {
      const customer = await db.query.customers.findFirst({
        columns: { name: true },
        where: and(
          eq(customers.id, customerId),
          eq(customers.businessId, businessId)
        )
      });
      if (customer?.name) customerName = customer.name;
    }
  } catch (error) {
    console.error('Metadata fetch failed:', error);
  }

  const title = `${customerName} | Ficha de Cliente | Cakely`;
  return {
    title: title,
    description: `Información detallada y historial de pedidos para ${customerName}.`
  };
}

type OrderForCustomerList = Pick<
  Order,
  | 'id'
  | 'description'
  | 'deliveryDate'
  | 'totalPrice'
  | 'orderStatus'
  | 'paymentStatus'
>;
type CustomerWithOrders = Customer & {
  orders: OrderForCustomerList[];
};

export default async function CustomerDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const businessId = session?.user?.businessId;
  const p = await params;
  const customerId = parseInt(p.id, 10);

  if (!businessId) {
    notFound();
  }
  if (isNaN(customerId)) {
    notFound();
  }

  const customerData: CustomerWithOrders | undefined =
    await db.query.customers.findFirst({
      where: and(
        eq(customers.id, customerId),
        eq(customers.businessId, businessId)
      ),
      with: {
        orders: {
          orderBy: [desc(orders.orderDate)],
          columns: {
            id: true,
            description: true,
            deliveryDate: true,
            totalPrice: true,
            orderStatus: true,
            paymentStatus: true
          }
        }
      }
    });

  if (!customerData) {
    notFound();
  }

  const displayData = (
    data: string | number | null | undefined,
    fallback = '-'
  ) => data ?? fallback;
  const displayDate = (
    date: Date | string | null | undefined,
    formatString = 'PPP'
  ) => {
    if (!date) return '-';
    try {
      return format(new Date(date), formatString, { locale: es });
    } catch {
      return 'Inválida';
    }
  };

  const cleanInstagramHandle = (handle: string | null | undefined) =>
    handle?.replace(/^@/, '') || '';

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 lg:space-y-8 overflow-hidden">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <User className="h-7 w-7 text-primary" /> {customerData.name}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Cliente desde: {displayDate(customerData.registrationDate)}
          </p>
        </div>
        <div className="flex flex-shrink-0 gap-2">
          <CustomerDetailActions customer={customerData} />
        </div>
      </div>

      <Separator />

      <div className="space-y-6 lg:space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Información y Contacto</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <div className="space-y-3 text-sm">
              <h3 className="font-semibold mb-1 border-b pb-1">
                Contacto Directo
              </h3>
              {customerData.email && (
                <p className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />{' '}
                  <a
                    href={`mailto:${customerData.email}`}
                    className="hover:underline break-all"
                  >
                    {customerData.email}
                  </a>
                </p>
              )}
              {customerData.phone && (
                <p className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />{' '}
                  <a
                    href={`tel:${customerData.phone}`}
                    className="hover:underline"
                  >
                    {customerData.phone}
                  </a>
                </p>
              )}
              {customerData.instagramHandle && (
                <p className="flex items-center gap-2">
                  <Instagram className="h-4 w-4 text-muted-foreground flex-shrink-0" />{' '}
                  <a
                    href={`https://instagram.com/${cleanInstagramHandle(customerData.instagramHandle)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    @{cleanInstagramHandle(customerData.instagramHandle)}
                  </a>
                </p>
              )}
              <div className="flex flex-wrap gap-x-4 gap-y-1 pt-2">
                {customerData.phone && (
                  <a
                    href={`https://wa.me/${customerData.phone}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-xs inline-flex items-center gap-1 text-green-600 hover:underline"
                  >
                    <MessageSquare className="h-3 w-3" /> WhatsApp
                  </a>
                )}
                {customerData.instagramHandle && (
                  <a
                    href={`https://ig.me/m/${cleanInstagramHandle(customerData.instagramHandle)}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-xs inline-flex items-center gap-1 text-purple-600 hover:underline"
                  >
                    <Instagram className="h-3 w-3" /> Instagram DM
                  </a>
                )}
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <h3 className="font-semibold mb-1 border-b pb-1 flex items-center gap-2">
                <StickyNote className="h-4 w-4" />
                Notas / Preferencias
              </h3>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {displayData(customerData.notes, 'Sin notas.')}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListOrdered className="h-5 w-5" /> Historial de Pedidos
            </CardTitle>
            <CardDescription>
              Pedidos más recientes ordenados por fecha de pedido.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {customerData.orders && customerData.orders.length > 0 ? (
              <div className="overflow-x-auto relative border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">ID</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Entrega</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Estado Ped.</TableHead>
                      <TableHead>Estado Pago</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customerData.orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">
                          <Link
                            href={`/app/pedidos/${order.id}`}
                            className="hover:underline"
                          >
                            #{order.id}
                          </Link>
                        </TableCell>
                        <TableCell
                          className="max-w-[200px] truncate"
                          title={order.description ?? ''}
                        >
                          {displayData(order.description)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {displayDate(order.deliveryDate)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {formatCurrency(Number(order.totalPrice))}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={getStatusStyle(
                              order.orderStatus as OrderStatusType
                            )}
                          >
                            {displayData(order.orderStatus)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={getStatusStyle(
                              order.paymentStatus as PaymentStatusType
                            )}
                          >
                            {displayData(order.paymentStatus)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/app/pedidos/${order.id}`}>
                              <Eye className="h-4 w-4 mr-1 sm:mr-0" />{' '}
                              <span className="hidden sm:inline ml-1">Ver</span>
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">
                Este cliente aún no tiene pedidos registrados.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
