import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { orders, customers } from '@/lib/db';
import {
  eq,
  and,
  lte,
  count,
  sum,
  desc,
  sql,
  gt,
  inArray,
  gte
} from 'drizzle-orm';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ArrowRight,
  CalendarCheck,
  ClipboardList,
  Hourglass,
  ShoppingCart,
  Users,
  Euro,
  BellRing,
  PackageCheck,
  ListOrdered,
  PlusCircle,
  BarChart3,
  Settings
} from 'lucide-react';
import {
  format,
  startOfToday,
  endOfToday,
  addDays,
  startOfMonth,
  endOfMonth
} from 'date-fns';
import { es } from 'date-fns/locale';
import { displayData, formatCurrency, getStatusStyle } from '@/lib/utils';
import {
  Order,
  OrderStatus as OrderStatusType,
  PaymentStatus as PaymentStatusType
} from '@types';

interface OrderStats {
  upcomingDeliveriesNext7Days: number;
  deliveriesToday: number;
  pendingOrders: number;
  processingOrders: number;
  readyOrders: number;
}
interface FinancialStats {
  revenueThisMonth: number;
  pendingPaymentsAmount: number;
}

type RecentOrder = Pick<
  Order,
  | 'id'
  | 'description'
  | 'deliveryDate'
  | 'totalPrice'
  | 'orderStatus'
  | 'businessOrderNumber'
> & {
  customerName: string | null;
};

export default async function DashboardHomePage() {
  const session = await auth();

  if (!session?.user?.id || !session.user.businessId) {
    redirect('/login');
  }

  const { businessId, name: userName } = session.user;

  const serverTodayStart = startOfToday();
  const serverTodayEnd = endOfToday();
  const next7DaysEnd = addDays(endOfToday(), 6);
  const startOfCurrentMonth = startOfMonth(serverTodayStart);
  const endOfCurrentMonth = endOfMonth(serverTodayStart);

  const [
    upcomingDeliveriesData,
    deliveriesTodayData,
    pendingOrdersData,
    processingOrdersData,
    readyOrdersData,
    paidTotal,
    depositTotal,
    pendingPaymentsData,
    recentOrdersRaw
  ] = await Promise.all([
    db
      .select({ value: count() })
      .from(orders)
      .where(
        and(
          eq(orders.businessId, businessId),
          gt(orders.deliveryDate, serverTodayEnd),
          lte(orders.deliveryDate, next7DaysEnd),
          sql`${orders.orderStatus} NOT IN ('Entregado')`
        )
      ),

    db
      .select({ value: count() })
      .from(orders)
      .where(
        and(
          eq(orders.businessId, businessId),
          gte(orders.deliveryDate, serverTodayStart),
          lte(orders.deliveryDate, serverTodayEnd),
          sql`${orders.orderStatus} NOT IN ('Entregado')`
        )
      ),

    db
      .select({ value: count() })
      .from(orders)
      .where(
        and(
          eq(orders.businessId, businessId),
          eq(orders.orderStatus, OrderStatusType.Pendiente)
        )
      ),

    db
      .select({ value: count() })
      .from(orders)
      .where(
        and(
          eq(orders.businessId, businessId),
          eq(orders.orderStatus, OrderStatusType.Preparando)
        )
      ),

    db
      .select({ value: count() })
      .from(orders)
      .where(
        and(
          eq(orders.businessId, businessId),
          eq(orders.orderStatus, OrderStatusType.Listo)
        )
      ),

    db
      .select({ value: sum(orders.totalPrice) })
      .from(orders)
      .where(
        and(
          eq(orders.businessId, businessId),
          eq(orders.paymentStatus, PaymentStatusType.Pagado),
          gte(orders.deliveryDate, startOfCurrentMonth),
          lte(orders.deliveryDate, endOfCurrentMonth)
        )
      ),

    db
      .select({ value: sum(orders.depositAmount) })
      .from(orders)
      .where(
        and(
          eq(orders.businessId, businessId),
          inArray(orders.paymentStatus, [
            PaymentStatusType.Parcial,
            PaymentStatusType.Pendiente
          ]),
          gte(orders.deliveryDate, startOfCurrentMonth),
          lte(orders.deliveryDate, endOfCurrentMonth),
          gt(orders.depositAmount, sql`0`)
        )
      ),

    db
      .select({
        value: sum(
          sql<number>`COALESCE(${orders.totalPrice}, 0)::numeric - COALESCE(${orders.depositAmount}, 0)::numeric`
        )
      })
      .from(orders)
      .where(
        and(
          eq(orders.businessId, businessId),
          sql`${orders.paymentStatus} IN ('Pendiente', 'Parcial')`,
          gte(orders.deliveryDate, startOfCurrentMonth),
          lte(orders.deliveryDate, endOfCurrentMonth)
        )
      ),

    db
      .select({
        id: orders.id,
        description: orders.description,
        deliveryDate: orders.deliveryDate,
        totalPrice: orders.totalPrice,
        orderStatus: orders.orderStatus,
        businessOrderNumber: orders.businessOrderNumber,
        customerName: customers.name
      })
      .from(orders)
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .where(eq(orders.businessId, businessId))
      .orderBy(desc(orders.orderDate), desc(orders.id))
      .limit(3)
  ]);

  const orderStats: OrderStats = {
    upcomingDeliveriesNext7Days: upcomingDeliveriesData[0]?.value ?? 0,
    deliveriesToday: deliveriesTodayData[0]?.value ?? 0,
    pendingOrders: pendingOrdersData[0]?.value ?? 0,
    processingOrders: processingOrdersData[0]?.value ?? 0,
    readyOrders: readyOrdersData[0]?.value ?? 0
  };
  const financialStats: FinancialStats = {
    revenueThisMonth:
      Number(paidTotal[0]?.value ?? 0) + Number(depositTotal[0]?.value ?? 0),
    pendingPaymentsAmount: Number(pendingPaymentsData[0]?.value ?? 0)
  };

  const recentOrders: RecentOrder[] = recentOrdersRaw.map((o: RecentOrder) => ({
    id: o.id,
    description: o.description,
    deliveryDate: o.deliveryDate,
    totalPrice: o.totalPrice,
    orderStatus: o.orderStatus as OrderStatusType,
    paymentStatus: PaymentStatusType.Pendiente,
    businessOrderNumber: o.businessOrderNumber,
    customerName: o.customerName
  }));

  const StatCard = ({
    title,
    value,
    icon,
    link,
    linkText = 'Ver más'
  }: {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    link?: string;
    linkText?: string;
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {link && (
          <Link
            href={link}
            className="text-xs text-muted-foreground hover:text-primary flex items-center mt-1"
          >
            {linkText} <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
      <div className="mb-2">
        <h1 className="text-3xl font-bold tracking-tight">
          ¡Hola, {userName || 'Usuario'}!
        </h1>
        <p className="text-muted-foreground">
          Aquí tienes un resumen de la actividad de tu negocio.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Entregas Hoy"
          value={orderStats.deliveriesToday}
          icon={<CalendarCheck className="h-4 w-4 text-muted-foreground" />}
          link={`/pedidos?status=upcoming&filterDate=${format(serverTodayStart, 'yyyy-MM-dd')}&sortBy=deliveryDate&sortOrder=asc`}
          linkText="Ver Entregas de Hoy"
        />
        <StatCard
          title="Próximas Entregas (7 días)"
          value={orderStats.upcomingDeliveriesNext7Days}
          icon={<BellRing className="h-4 w-4 text-muted-foreground" />}
          link="/pedidos?status=upcoming&sortBy=upcoming&sortOrder=asc"
        />
        <StatCard
          title="Pedidos Pendientes"
          value={orderStats.pendingOrders}
          icon={<Hourglass className="h-4 w-4 text-muted-foreground" />}
          link="/pedidos?status=Pendiente&sortBy=deliveryDate&sortOrder=asc"
        />
        <StatCard
          title="Listos para Entregar"
          value={orderStats.readyOrders}
          icon={<PackageCheck className="h-4 w-4 text-muted-foreground" />}
          link="/pedidos?status=Listo&sortBy=deliveryDate&sortOrder=asc"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-xl">
              Resumen Financiero (Este Mes)
            </CardTitle>
            <CardDescription>
              Ingresos basados en pedidos pagados y pagos pendientes del mes
              actual.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
              <div>
                <p className="text-sm font-medium text-green-700 dark:text-green-300">
                  Ingresos Realizados
                </p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(financialStats.revenueThisMonth)}
                </p>
              </div>
              <Euro className="h-8 w-8 text-green-500" />
            </div>
            <div className="flex justify-between items-center p-4 bg-amber-50 dark:bg-amber-950 rounded-lg">
              <div>
                <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                  Pagos Pendientes
                </p>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {formatCurrency(financialStats.pendingPaymentsAmount)}
                </p>
              </div>
              <Hourglass className="h-8 w-8 text-amber-500" />
            </div>
            <Button variant="outline" size="sm" asChild className="w-full mt-2">
              <Link href="/ajustes?tab=finances">
                Ver Resumen Financiero Detallado
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-xl">Últimos Pedidos</CardTitle>
            <CardDescription>
              Un vistazo a los pedidos más recientes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentOrders.length > 0 ? (
              <ul className="space-y-3">
                {recentOrders.map((order) => (
                  <li
                    key={order.id}
                    className="flex items-center justify-between text-sm border-b pb-2 last:border-b-0 last:pb-0"
                  >
                    <div>
                      <Link
                        href={`/pedidos/${order.id}`}
                        className="font-medium hover:underline"
                      >
                        Pedido #{order.businessOrderNumber ?? order.id}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {order.customerName ?? 'Cliente Anónimo'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {displayData(
                          order.description,
                          'Sin descripción'
                        ).substring(0, 50)}
                        ...
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        {formatCurrency(Number(order.totalPrice))}
                      </p>
                      <Badge
                        variant="outline"
                        className={getStatusStyle(
                          order.orderStatus as OrderStatusType
                        )}
                      >
                        {order.orderStatus}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay pedidos recientes.
              </p>
            )}
            <Button variant="default" size="sm" asChild className="w-full mt-4">
              <Link href="/pedidos">Ver Todos los Pedidos</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Accesos Rápidos</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Button variant="outline" asChild className="flex-col h-auto py-4">
            <Link href="/pedidos/nuevo">
              <PlusCircle className="h-6 w-6 mb-1" /> Nuevo Pedido
            </Link>
          </Button>
          <Button variant="outline" asChild className="flex-col h-auto py-4">
            <Link href="/clientes/nuevo">
              <Users className="h-6 w-6 mb-1" /> Nuevo Cliente
            </Link>
          </Button>
          <Button variant="outline" asChild className="flex-col h-auto py-4">
            <Link href="/calendario">
              <CalendarCheck className="h-6 w-6 mb-1" /> Calendario
            </Link>
          </Button>
          <Button variant="outline" asChild className="flex-col h-auto py-4">
            <Link href="/estadisticas">
              <BarChart3 className="h-6 w-6 mb-1" /> Estadísticas
            </Link>
          </Button>
          <Button variant="outline" asChild className="flex-col h-auto py-4">
            <Link href="/presupuesto">
              <ShoppingCart className="h-6 w-6 mb-1" /> Presupuestos
            </Link>
          </Button>
          <Button variant="outline" asChild className="flex-col h-auto py-4">
            <Link href="/ajustes">
              <Settings className="h-6 w-6 mb-1" /> Ajustes
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
