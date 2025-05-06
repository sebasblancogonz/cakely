import { OrderStatus } from '@/types/types';
import { OrderFormData } from './validators/orders';
import { customers, db, orders, TeamMemberWithUser, users } from './db';
import { getGoogleAuthClient } from './auth/google-auth';
import { eq } from 'drizzle-orm';
import {
  calculateEndTime,
  callCreateCalendarEvent
} from './calendar-integration';

export function combineDeliveryDateAndTime(
  date: Date | null | undefined,
  time: string | null | undefined
): Date | null {
  if (!date) return null;
  const combined = new Date(date);
  if (time && /^\d{2}:\d{2}$/.test(time)) {
    const [h, m] = time.split(':').map(Number);
    combined.setHours(h, m, 0, 0);
  } else {
    combined.setHours(0, 0, 0, 0);
  }
  return isNaN(combined.getTime()) ? null : combined;
}

export function prepareOrderDataForInsert(
  validatedData: OrderFormData,
  deliveryDate: Date | null,
  businessId: number,
  orderNumber: number
) {
  const { createCalendarEvent, deliveryTime, ...rest } = validatedData;
  return {
    ...rest,
    deliveryDate,
    businessId,
    orderStatus: OrderStatus.Pendiente,
    businessOrderNumber: orderNumber,
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

export async function createCalendarEventIfNeeded({
  order,
  deliveryDate,
  userEmail,
  userId,
  createCalendarEvent
}: {
  order: typeof orders.$inferSelect;
  deliveryDate: Date | null;
  userEmail: string;
  userId: string;
  createCalendarEvent: boolean;
}) {
  if (!deliveryDate || !createCalendarEvent) return null;
  console.log(`[Order Create ${order.id}] Intentando crear evento GCal...`);

  try {
    const authClient = await getGoogleAuthClient(userId);
    if (!authClient) {
      console.warn(`Usuario ${userId} sin credenciales Google válidas.`);
      return null;
    }

    const customer = await db.query.customers.findFirst({
      where: eq(customers.id, order.customerId)
    });
    const customerName = customer?.name || 'Cliente Desconocido';
    const eventTitle = `Entrega Pedido #${order.businessOrderNumber} - ${customerName}`;
    const eventDescription = `Producto: ${order.description || ''}\nPedido ID Interno: ${order.id}\nVer: ${process.env.NEXT_PUBLIC_APP_URL}/pedidos/${order.id}`;

    const teamMembers = await db
      .select({ user: { email: users.email } })
      .from(users)
      .where(eq(users.businessId, order.businessId)); // Ajusta si tienes tabla intermedia
    const collaboratorEmails = teamMembers
      .map((m: TeamMemberWithUser) => m.user?.email)
      .filter((e: string) => !!e);
    const allAttendees = Array.from(
      new Set([userEmail, ...collaboratorEmails])
    );

    const calendarResult = await callCreateCalendarEvent({
      authClient,
      title: eventTitle,
      description: eventDescription,
      startDateTime: deliveryDate,
      endDateTime: calculateEndTime(deliveryDate, '15m'),
      attendees: allAttendees
    });

    if (calendarResult.success && calendarResult.eventId) {
      await db
        .update(orders)
        .set({
          googleCalendarEventId: calendarResult.eventId,
          updatedAt: new Date()
        })
        .where(eq(orders.id, order.id));
      return calendarResult.eventId;
    } else {
      console.warn(`Fallo al crear evento GCal: ${calendarResult.error}`);
    }
  } catch (err) {
    console.error(`Error creando evento GCal:`, err);
  }

  return null;
}
