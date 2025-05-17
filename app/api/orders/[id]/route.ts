import { NextRequest, NextResponse } from 'next/server';
import {
  db,
  orders,
  customers,
  teamMembers,
  users,
  TeamMemberWithUser,
  SelectOrder,
  deleteOrderById,
  productTypes
} from '@/lib/db';
import { eq, and, sql } from 'drizzle-orm';
import { updateOrderFormSchema } from '@/lib/validators/orders';
import {
  calculateEndTime,
  callDeleteCalendarEvent,
  callModifyCalendarEvent
} from '@/lib/calendar-integration';
import { getGoogleAuthClient } from '@/lib/auth/google-auth';
import { format } from 'date-fns';
import { checkPermission, getSessionInfo } from '@/lib/auth/utils';
import { withApiProtection } from '@/lib/api/withApiProtection';
import { AuthenticatedRequestContext } from '@/lib/api/authTypes';

async function getOrderHandler(
  request: NextRequest,
  authContext: AuthenticatedRequestContext
) {
  const { businessId } = authContext;

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
        customer: true,
        productType: true
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

export const GET = withApiProtection(getOrderHandler, {
  requiredRole: ['OWNER', 'ADMIN', 'EDITOR']
});

async function deleteOrderHandler(
  request: NextRequest,
  authContext: AuthenticatedRequestContext
) {
  const { session, userId, businessId } = authContext;
  const permissionCheck = await checkPermission(userId, businessId, [
    'OWNER',
    'ADMIN',
    'EDITOR'
  ]);
  if (permissionCheck instanceof NextResponse) return permissionCheck;

  const { pathname } = request.nextUrl;
  const orderIdNum = Number(pathname.split('/').pop());

  try {
    if (isNaN(orderIdNum)) {
      return NextResponse.json(
        { message: 'ID de pedido inválido' },
        { status: 400 }
      );
    }

    await deleteOrderById(businessId, orderIdNum);
    return NextResponse.json(
      { message: 'Order deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      `API Error deleting order ${orderIdNum} for business ${businessId}:`,
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

  const currentOrder = await db.query.orders.findFirst({
    where: eq(orders.id, orderIdNum),
    with: {
      productType: true
    }
  });

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

  let resolvedProductTypeId: number | null | undefined =
    currentOrder.productTypeId;

  try {
    const updatedOrderDb = await db.transaction(async (tx: any) => {
      if (
        validatedData.productType &&
        typeof validatedData.productType === 'string'
      ) {
        const productTypeNameFromForm = validatedData.productType.trim();
        if (
          productTypeNameFromForm !== (currentOrder.productType?.name ?? '') ||
          !currentOrder.productTypeId
        ) {
          console.log(
            `[Order PATCH ${orderIdNum}] Resolviendo productType: "${productTypeNameFromForm}"`
          );
          const [existingPT] = await tx
            .select({ id: productTypes.id })
            .from(productTypes)
            .where(
              and(
                eq(productTypes.businessId, businessId),
                eq(
                  sql`lower(${productTypes.name})`,
                  productTypeNameFromForm.toLowerCase()
                )
              )
            )
            .limit(1);
          if (existingPT) {
            resolvedProductTypeId = existingPT.id;
          } else {
            const [newPT] = await tx
              .insert(productTypes)
              .values({ name: productTypeNameFromForm, businessId })
              .returning({ id: productTypes.id });
            if (!newPT?.id)
              throw new Error('No se pudo crear el nuevo tipo de producto.');
            resolvedProductTypeId = newPT.id;
          }
          console.log(
            `[Order PATCH ${orderIdNum}] Usando productTypeId: ${resolvedProductTypeId}`
          );
        }
      } else if (
        validatedData.productType === null ||
        validatedData.productType === ''
      ) {
        resolvedProductTypeId = null;
      }

      const {
        deliveryTime,
        createCalendarEvent,
        productType: productTypeNameString,
        images: imagesFromForm,
        amount,
        totalPrice,
        depositAmount,
        deliveryDate,
        ...restOfValidatedFields
      } = validatedData;

      const dataToSet: Partial<typeof orders.$inferInsert> = {
        ...restOfValidatedFields
      };

      if (dateUpdated) {
        dataToSet.deliveryDate = finalDeliveryDateTime;
      }
      if (resolvedProductTypeId !== currentOrder.productTypeId) {
        dataToSet.productTypeId = resolvedProductTypeId;
      }

      if (amount !== undefined) dataToSet.amount = amount.toString();
      if (totalPrice !== undefined)
        dataToSet.totalPrice = totalPrice.toString();
      if (depositAmount !== undefined)
        dataToSet.depositAmount = depositAmount.toString();

      Object.keys(dataToSet).forEach((key) => {
        if (dataToSet[key as keyof typeof dataToSet] === undefined) {
          delete dataToSet[key as keyof typeof dataToSet];
        }
      });

      if (
        Object.keys(dataToSet).length <= 1 &&
        resolvedProductTypeId === currentOrder.productTypeId &&
        !dateUpdated
      ) {
        console.log(
          `[Order PATCH ${orderIdNum}] No hay campos de pedido significativos que actualizar en DB.`
        );
        return currentOrder as typeof orders.$inferSelect;
      }

      console.log(
        `[Order PATCH ${orderIdNum}] Updating orders table with:`,
        dataToSet
      );
      const [result] = await tx
        .update(orders)
        .set(dataToSet)
        .where(
          and(eq(orders.id, orderIdNum), eq(orders.businessId, businessId))
        )
        .returning();
      if (!result)
        throw new Error('Fallo al actualizar el pedido en la base de datos.');
      console.log(`[Order PATCH ${orderIdNum}] Pedido actualizado en BBDD.`);
      return result;
    });

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
        const eventTitle = `Entrega Pedido #${updatedOrderDb.businessOrderNumber} - ${customerName}`;
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
        },
        productType: {
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

export const DELETE = withApiProtection(deleteOrderHandler, {
  requiredRole: ['OWNER', 'ADMIN', 'EDITOR']
});
