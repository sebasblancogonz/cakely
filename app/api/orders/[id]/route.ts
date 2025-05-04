import { NextRequest, NextResponse } from 'next/server';
import {
  db,
  updateOrder,
  orders,
  customers,
  teamMembers,
  users,
  TeamMemberWithUser,
  SelectOrder
} from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import {
  UpdateOrderFormData,
  updateOrderFormSchema
} from '@/lib/validators/orders';
import {
  calculateEndTime,
  callCreateCalendarEvent,
  callDeleteCalendarEvent,
  callModifyCalendarEvent
} from '@/lib/calendar-integration';
import { getGoogleAuthClient } from '@/lib/auth/google-auth';
import { format } from 'date-fns';
import { checkPermission, getSessionInfo } from '@/lib/auth/utils';
import { OrderImage } from '@/types/types';

export async function GET(request: NextRequest) {
  console.log(await request.text());
  const session = await auth();
  const businessId = session?.user?.businessId;

  if (!businessId) {
    return NextResponse.json(
      { message: 'Not authorized or no business associated' },
      { status: 403 }
    );
  }

  const { pathname } = request.nextUrl;
  const orderId = Number(pathname.split('/').pop());

  try {
    if (isNaN(orderId)) {
      return NextResponse.json(
        { message: 'Invalid Order ID' },
        { status: 400 }
      );
    }

    const orderResult = await db.query.orders.findFirst({
      where: and(eq(orders.id, orderId), eq(orders.businessId, businessId)),
      with: {
        customer: true
      }
    });

    if (!orderResult) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json(orderResult);
  } catch (error) {
    console.error(
      `API Error fetching order ${orderId} for business ${businessId}:`,
      error
    );
    return NextResponse.json(
      { message: 'Failed to fetch order' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const sessionInfo = await getSessionInfo(request);
  if (sessionInfo instanceof NextResponse) return sessionInfo;
  const { userId, businessId, session } = sessionInfo;
  const userEmail = session.user?.email;

  const permissionCheck = await checkPermission(userId, businessId, [
    'OWNER',
    'ADMIN',
    'EDITOR'
  ]);
  if (permissionCheck instanceof NextResponse) return permissionCheck;

  const { pathname } = request.nextUrl;
  const orderIdNum = Number(pathname.split('/').pop());

  if (isNaN(orderIdNum)) {
    return NextResponse.json(
      { message: 'ID de pedido inválido' },
      { status: 400 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    console.log(e);
    return NextResponse.json({ message: 'Cuerpo inválido' }, { status: 400 });
  }

  const validationResult = updateOrderFormSchema.safeParse(body);
  if (!validationResult.success) {
    return NextResponse.json(
      { message: 'Datos inválidos', errors: validationResult.error.format() },
      { status: 400 }
    );
  }
  const validatedData = validationResult.data;

  let finalDeliveryDateTime: Date | null = null;
  let dateUpdated = false;
  if (
    validatedData.deliveryDate !== undefined ||
    validatedData.deliveryTime !== undefined
  ) {
    dateUpdated = true;
    const datePart = validatedData.deliveryDate
      ? format(validatedData.deliveryDate, 'yyyy-MM-dd')
      : null;
    const timePart = validatedData.deliveryTime || null;

    if (datePart) {
      const dateTimeString = timePart
        ? `${datePart}T${timePart}:00`
        : `${datePart}T00:00:00`;

      const combinedDate = new Date(dateTimeString);
      if (!isNaN(combinedDate.getTime())) {
        finalDeliveryDateTime = combinedDate;
      } else {
        console.warn(
          `[Order PATCH] Invalid date created for order ${orderIdNum}`
        );

        finalDeliveryDateTime = null;
        dateUpdated = false;
      }
    } else {
      finalDeliveryDateTime = null;
    }
  }

  const [currentOrder]: SelectOrder[] = await db
    .select({
      deliveryDate: orders.deliveryDate,
      googleCalendarEventId: orders.googleCalendarEventId
    })
    .from(orders)
    .where(and(eq(orders.id, orderIdNum), eq(orders.businessId, businessId)))
    .limit(1);

  if (!currentOrder) {
    return NextResponse.json(
      { message: 'Pedido no encontrado o no pertenece a este negocio' },
      { status: 404 }
    );
  }

  const dataToUpdateInDb = {
    ...validatedData,
    ...(dateUpdated && { deliveryDate: finalDeliveryDateTime }),
    updatedAt: new Date()
  };

  delete (dataToUpdateInDb as any).deliveryTime;

  Object.keys(dataToUpdateInDb).forEach((key) => {
    if (dataToUpdateInDb[key as keyof typeof dataToUpdateInDb] === undefined) {
      delete dataToUpdateInDb[key as keyof typeof dataToUpdateInDb];
    }
  });

  try {
    const [updatedOrderDb] = await db
      .update(orders)
      .set(dataToUpdateInDb)
      .where(and(eq(orders.id, orderIdNum), eq(orders.businessId, businessId)))
      .returning();

    if (!updatedOrderDb) {
      throw new Error('No se pudo actualizar el pedido en la base de datos.');
    }
    console.log(`Pedido ${orderIdNum} actualizado en BBDD.`);

    let finalGoogleEventId = currentOrder.googleCalendarEventId;

    const oldDeliveryTime = currentOrder.deliveryDate
      ? new Date(currentOrder.deliveryDate).getTime()
      : null;
    const newDeliveryTime = finalDeliveryDateTime
      ? finalDeliveryDateTime.getTime()
      : null;
    const calendarNeedsUpdate =
      dateUpdated && oldDeliveryTime !== newDeliveryTime;
    const existingEventId = currentOrder.googleCalendarEventId;
    const newDateTime = finalDeliveryDateTime;

    if (calendarNeedsUpdate && existingEventId) {
      console.log(
        `Cambio detectado en fecha/hora para pedido ${orderIdNum}. Actualizando GCal...`
      );
      const authClient = await getGoogleAuthClient(userId);

      if (authClient) {
        const customer = await db.query.customers.findFirst({
          where: eq(customers.id, updatedOrderDb.customerId)
        });
        const customerName = customer?.name || 'Cliente Desconocido';
        const eventTitle = `Entrega Pedido #${orderIdNum} - ${customerName}`;
        const eventDescription = `Producto: ${updatedOrderDb.description || ''}\nVer: ${process.env.NEXT_PUBLIC_APP_URL}/pedidos/${orderIdNum}`;

        const teamMembersWithData = await db
          .select({ user: { email: users.email } })
          .from(teamMembers)
          .innerJoin(users, eq(teamMembers.userId, users.id))
          .where(eq(teamMembers.businessId, businessId));
        const collaboratorEmails = teamMembersWithData
          .map((m: TeamMemberWithUser) => m.user?.email)
          .filter((e: string) => !!e);

        const attendees = Array.from(
          new Set([userEmail, ...collaboratorEmails])
        );

        if (newDateTime) {
          console.log(`Modificando evento GCal ID: ${existingEventId}`);
          const startDateTime = newDateTime;
          const endDateTime = calculateEndTime(startDateTime, '1h');
          const modifyResult = await callModifyCalendarEvent({
            authClient,
            eventId: existingEventId,
            title: eventTitle,
            description: eventDescription,
            startDateTime,
            endDateTime,
            attendees
          });
          if (!modifyResult.success)
            console.warn(`Fallo GCal Modify: ${modifyResult.error}`);

          finalGoogleEventId = existingEventId;
        } else {
          console.log(
            `Eliminando evento GCal ID: ${existingEventId} porque se quitó la fecha.`
          );
          const deleteResult = await callDeleteCalendarEvent({
            authClient,
            eventId: existingEventId
          });
          if (deleteResult.success) {
            finalGoogleEventId = null;
            console.log(`Evento GCal eliminado. Actualizando BBDD...`);

            await db
              .update(orders)
              .set({ googleCalendarEventId: null, updatedAt: new Date() })
              .where(eq(orders.id, orderIdNum));
          } else {
            console.warn(`Fallo GCal Delete: ${deleteResult.error}`);
          }
        }
      } else {
        console.warn(`Usuario ${userId} sin credenciales Google válidas.`);
      }
    }
    const finalOrderData = await db.query.orders.findFirst({
      where: eq(orders.id, orderIdNum),
      with: {
        customer: {
          columns: {
            name: true
          }
        }
      }
    });
    const finalResponse = {
      ...finalOrderData,
      googleCalendarEventId: finalGoogleEventId
    };
    return NextResponse.json(finalResponse);
  } catch (error: any) {
    console.error(
      `API Error actualizando pedido ${orderIdNum} para business ${businessId}:`,
      error
    );

    return NextResponse.json(
      { message: 'Failed to update order', error: error.message },
      { status: 500 }
    );
  }
}
