import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
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
      {
        message:
          'No autenticado o falta información requerida (userId, userEmail, businessId)'
      },
      { status: 401 }
    );
  }

  try {
    const orderInput: unknown = await request.json();
    const validationResult = createOrderFormSchema.safeParse(orderInput);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          message: 'Invalid input data',
          errors: validationResult.error.format()
        },
        { status: 400 }
      );
    }

    const dataToSave: OrderFormData & {
      businessId: number;
      orderStatus: OrderStatus;
    } = {
      ...validationResult.data,
      businessId: businessId,
      orderStatus: OrderStatus.pending,
      deliveryDate:
        validationResult.data.deliveryDate instanceof Date
          ? validationResult.data.deliveryDate
          : null
    };

    console.log('Received and validated order data for save:', dataToSave);

    const orderCreated = await saveOrder(dataToSave);
    const orderId = orderCreated.id;
    console.log(`Pedido ${orderId} guardado en BBDD.`);

    let googleEventId: string | null = null;

    if (orderCreated.deliveryDate) {
      try {
        const authClient = await getGoogleAuthClient(userId);

        if (authClient) {
          console.log(
            `Cliente Google Auth obtenido para usuario ${userId}. Preparando evento...`
          );
          const customer = await db.query.customers.findFirst({
            where: eq(customers.id, orderCreated.customerId)
          });
          const customerName = customer?.name || 'Cliente Desconocido';
          const eventTitle = `Entrega Pedido #${orderId} - ${customerName}`;
          const eventDescription = `Producto: ${orderCreated.description || 'Sin descripción'}\nVer en App: https://tu-app.com/pedidos/${orderId}`;

          const teamMembersWithData = await db
            .select({ user: { email: users.email } })
            .from(teamMembers)
            .innerJoin(users, eq(teamMembers.userId, users.id))
            .where(eq(teamMembers.businessId, businessId));

          const collaboratorEmails = teamMembersWithData
            .map((member: TeamMemberWithUser) => member.user?.email)
            .filter((email: string) => !!email);

          const allAttendees = Array.from(
            new Set([userEmail, ...collaboratorEmails])
          );

          const startDateTime = new Date(orderCreated.deliveryDate);
          const duration = '15m';
          const endDateTime = calculateEndTime(startDateTime, duration);

          const calendarResult = await callCreateCalendarEvent({
            authClient: authClient,
            title: eventTitle,
            description: eventDescription,
            startDateTime: startDateTime,
            endDateTime: endDateTime,
            attendees: allAttendees
          });

          if (calendarResult.success && calendarResult.eventId) {
            googleEventId = calendarResult.eventId;
            console.log(
              `Evento creado con ID: ${googleEventId}. Actualizando pedido ${orderId}...`
            );
            await db
              .update(orders)
              .set({ googleCalendarEventId: googleEventId }) // Asegúrate que esta columna exista
              .where(eq(orders.id, orderId));
          } else {
            console.warn(
              `No se pudo crear evento de Google Calendar para pedido ${orderId}: ${calendarResult.error || 'Razón desconocida.'}`
            );
          }
        } else {
          console.warn(
            `Usuario ${userId} no tiene credenciales Google válidas recuperables. No se crea evento.`
          );
        }
      } catch (calendarError) {
        console.error(
          `Error general durante la integración de calendario para pedido ${orderId}:`,
          calendarError
        );
      }
    } else {
      console.log(
        `Pedido ${orderId} no tiene fecha de entrega válida, no se crea evento de calendario.`
      );
    }
    const finalOrderResponse = {
      ...orderCreated,
      googleCalendarEventId: googleEventId
    };
    return NextResponse.json(finalOrderResponse, { status: 201 });
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
