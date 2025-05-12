import { NextRequest, NextResponse } from 'next/server';
import { getSessionInfo, checkPermission } from '@/lib/auth/utils';
import { db } from '@/lib/db';
import { orders, businessSettings } from '@/lib/db';
import { PaymentStatus as DbPaymentStatus } from '@/types/types';
import { eq, and, gte, lte, sql, sum, or } from 'drizzle-orm';
import { startOfMonth, endOfMonth, parse, isValid } from 'date-fns';

function getMonthDateRange(
  dateString: string
): { startDate: Date; endDate: Date } | null {
  const parsedDate = parse(dateString + '-01', 'yyyy-MM-dd', new Date());
  if (!isValid(parsedDate)) return null;
  return {
    startDate: startOfMonth(parsedDate),
    endDate: endOfMonth(parsedDate)
  };
}

export async function GET(request: NextRequest) {
  const sessionInfo = await getSessionInfo(request);
  if (sessionInfo instanceof NextResponse) return sessionInfo;
  const { userId, businessId } = sessionInfo;
  const permissionCheck = await checkPermission(userId, businessId, [
    'OWNER',
    'ADMIN'
  ]);
  if (permissionCheck instanceof NextResponse) return permissionCheck;

  const { searchParams } = request.nextUrl;
  const monthQuery = searchParams.get('month');
  if (!monthQuery)
    return NextResponse.json(
      { message: "Parámetro 'month' (YYYY-MM) es requerido." },
      { status: 400 }
    );
  const dateRange = getMonthDateRange(monthQuery);
  if (!dateRange)
    return NextResponse.json(
      { message: "Formato de 'month' inválido. Usa YYYY-MM." },
      { status: 400 }
    );
  const { startDate, endDate } = dateRange;
  console.log(
    `[API MonthlyProfit] Calculando para mes: ${monthQuery}, Rango: ${startDate.toISOString()} - ${endDate.toISOString()}`
  );

  try {
    const revenueResult = await db
      .select({
        total: sum(
          sql<number>`CASE WHEN ${orders.paymentStatus} = ${DbPaymentStatus.Pagado} THEN ${orders.totalPrice} ELSE ${orders.depositAmount} END`
        ).mapWith(Number)
      })
      .from(orders)
      .where(
        and(
          eq(orders.businessId, businessId),
          gte(orders.orderDate, startDate),
          lte(orders.orderDate, endDate),
          or(
            eq(orders.paymentStatus, DbPaymentStatus.Pagado),
            and(
              or(
                eq(orders.paymentStatus, DbPaymentStatus.Pendiente),
                eq(orders.paymentStatus, DbPaymentStatus.Parcial)
              ),
              sql`${orders.depositAmount} > 0`
            )
          )
        )
      );
    const totalRevenue = revenueResult[0]?.total ?? 0;
    console.log(`[API MonthlyProfit] Total Revenue: ${totalRevenue}`);

    const [settings] = await db
      .select({
        rentMonthly: businessSettings.rentMonthly,
        otherMonthlyOverhead: businessSettings.otherMonthlyOverhead
      })
      .from(businessSettings)
      .where(eq(businessSettings.businessId, businessId))
      .limit(1);

    const rent = Number(settings?.rentMonthly ?? 0);
    const otherOverhead = Number(settings?.otherMonthlyOverhead ?? 0);
    const totalOperationalExpenses = rent + otherOverhead;
    console.log(
      `[API MonthlyProfit] Operational Expenses: ${totalOperationalExpenses}`
    );

    const grossProfit = totalRevenue;
    const netProfit = grossProfit - totalOperationalExpenses;
    console.log(
      `[API MonthlyProfit] GrossProfit (Revenue): ${grossProfit}, NetProfit: ${netProfit}`
    );

    return NextResponse.json({
      month: monthQuery,
      revenue: totalRevenue,
      grossProfit: grossProfit,
      operationalExpenses: {
        rent: rent,
        other: otherOverhead,
        total: totalOperationalExpenses
      },
      netProfit: netProfit
    });
  } catch (error: any) {
    console.error(
      `[API MonthlyProfit] Error para business ${businessId}, month ${monthQuery}:`,
      error
    );
    return NextResponse.json(
      {
        message: 'Error al calcular el reporte de beneficio.',
        error: error.message
      },
      { status: 500 }
    );
  }
}
