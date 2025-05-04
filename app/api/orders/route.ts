import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, Order } from '@/lib/db';
import {
  orders,
  customers,
  accounts,
  teamMembers,
  users,
  TeamMemberWithUser
} from '@/lib/db';
import { getOrders, saveOrder } from '@/lib/db';
import { OrderStatus } from '@types';
import { createOrderFormSchema, OrderFormData } from '@/lib/validators/orders';
import { and, eq } from 'drizzle-orm';
import { getGoogleAuthClient } from '@/lib/auth/google-auth';
import {
  calculateEndTime,
  callCreateCalendarEvent
} from '@/lib/calendar-integration';

export async function GET(request: NextRequest) {
  const session = await auth();
  const businessId = session?.user?.businessId;

  if (!businessId) {
    return NextResponse.json(
      { message: 'Not authorized or no business associated' },
      { status: 403 }
    );
  }

  const { searchParams } = request.nextUrl;
  const search = searchParams.get('q') || '';
  const offset = parseInt(searchParams.get('offset') || '0', 10);
  const limit = parseInt(searchParams.get('limit') || '10', 10);
  const status = searchParams.get('status');

  try {
    const { orders, newOffset, totalOrders } = await getOrders(
      businessId,
      search,
      offset,
      limit,
      status
    );
    return NextResponse.json({ orders, newOffset, totalOrders });
  } catch (error: any) {
    console.error(
      `API Error fetching orders for business ${businessId}:`,
      error
    );
    return NextResponse.json(
      { message: 'Failed to fetch orders', error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  const businessId = session?.user?.businessId;
  const userId = session?.user?.id;
  const userEmail = session?.user?.email;

  if (!userId || !userEmail || !businessId) {
    return NextResponse.json(
      { message: 'No autenticado o falta información requerida' },
      { status: 401 }
    );
  }

  try {
    const orderInput: unknown = await request.json();
    const validationResult = createOrderFormSchema.safeParse(orderInput);

    if (!validationResult.success) {
      console.error(
        'API Order POST Validation Error:',
        validationResult.error.format()
      );
      return NextResponse.json(
        { message: 'Datos inválidos', errors: validationResult.error.format() },
        { status: 400 }
      );
    }
    const validatedData = validationResult.data;

    let finalDeliveryDateTime: Date | null = null;
    if (validatedData.deliveryDate) {
      const combinedDate = new Date(validatedData.deliveryDate);
      if (
        validatedData.deliveryTime &&
        typeof validatedData.deliveryTime === 'string' &&
        /^\d{2}:\d{2}$/.test(validatedData.deliveryTime)
      ) {
        const [hours, minutes] = validatedData.deliveryTime
          .split(':')
          .map(Number);
        combinedDate.setHours(hours, minutes, 0, 0);
      }
      if (!isNaN(combinedDate.getTime())) {
        finalDeliveryDateTime = combinedDate;
      } else {
        console.warn('[Order POST] Invalid date created.');
      }
    }

    const dataToSaveInDb = {
      ...validatedData,
      deliveryDate: finalDeliveryDateTime,
      businessId: businessId,
      orderStatus: OrderStatus.pending
    };
    delete (dataToSaveInDb as any).deliveryTime;
    delete (dataToSaveInDb as any).createCalendarEvent;

    console.log('Data prepared for DB save:', dataToSaveInDb);

    const [orderCreated] = await db
      .insert(orders)
      .values(dataToSaveInDb)
      .returning();
    const orderId = orderCreated.id;
    console.log(`Pedido ${orderId} guardado en BBDD.`);

    let googleEventId: string | null =
      orderCreated.googleCalendarEventId || null;

    if (finalDeliveryDateTime && validatedData.createCalendarEvent) {
      console.log(
        `[Order Create ${orderId}] Checkbox marcado y hay fecha. Intentando crear evento GCal...`
      );
      try {
        const authClient = await getGoogleAuthClient(userId);
        if (authClient) {
          const customer = await db.query.customers.findFirst({
            where: eq(customers.id, orderCreated.customerId)
          });
          const customerName = customer?.name || 'Cliente Desconocido';
          const eventTitle = `Entrega Pedido #${orderId} - ${customerName}`;
          const eventDescription = `Producto: ${orderCreated.description || 'Sin descripción'}\nVer en App: ${process.env.NEXT_PUBLIC_APP_URL}/pedidos/${orderId}`;
          const teamMembersWithData = await db
            .select({ user: { email: users.email } })
            .from(teamMembers)
            .innerJoin(users, eq(teamMembers.userId, users.id))
            .where(eq(teamMembers.businessId, businessId));
          const collaboratorEmails = teamMembersWithData
            .map((m: TeamMemberWithUser) => m.user?.email)
            .filter((e: string) => !!e);
          const allAttendees = Array.from(
            new Set([userEmail, ...collaboratorEmails])
          );
          const startDateTime = finalDeliveryDateTime;
          const duration = '15m';
          const endDateTime = calculateEndTime(startDateTime, duration);

          const calendarResult = await callCreateCalendarEvent({
            authClient,
            title: eventTitle,
            description: eventDescription,
            startDateTime,
            endDateTime,
            attendees: allAttendees
          });

          if (calendarResult.success && calendarResult.eventId) {
            googleEventId = calendarResult.eventId;
            console.log(
              `Evento GCal creado: ${googleEventId}. Actualizando pedido en BBDD...`
            );
            await db
              .update(orders)
              .set({
                googleCalendarEventId: googleEventId,
                updatedAt: new Date()
              }) // Actualiza también updatedAt
              .where(eq(orders.id, orderId));
          } else {
            console.warn(
              `No se pudo crear evento GCal para pedido ${orderId}: ${calendarResult.error || 'Razón desconocida.'}`
            );
          }
        } else {
          console.warn(
            `Usuario ${userId} sin credenciales Google válidas. No se crea evento.`
          );
        }
      } catch (calendarError) {
        console.error(
          `Error en bloque Google Calendar para pedido ${orderId}:`,
          calendarError
        );
      }
    } else {
      console.log(
        `[Order Create ${orderId}] No se crea evento GCal (Checkbox: ${validatedData.createCalendarEvent}, Fecha Válida: ${!!finalDeliveryDateTime})`
      );
    }
    const finalOrderData = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: { customer: { columns: { name: true } } }
    });

    return NextResponse.json(finalOrderData ?? orderCreated, { status: 201 });
  } catch (error: any) {
    console.error(
      `API Error creando pedido para business ${businessId}:`,
      error
    );
    return NextResponse.json(
      { message: 'Failed to create order', error: error.message },
      { status: 500 }
    );
  }
}
