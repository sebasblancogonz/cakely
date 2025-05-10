'use server';

import { revalidatePath } from 'next/cache';
import { eq, and } from 'drizzle-orm';
import { orders, db } from '@/lib/db';
import { checkPermission, getSessionInfo } from '@/lib/auth/utils';
import { OrderStatus, PaymentStatus } from '@types';

export async function updateOrderStatusAction(
  orderId: number,
  newStatus: OrderStatus
): Promise<{ success: boolean; message: string }> {
  console.log(
    `Server Action: Updating order ${orderId} status to ${newStatus}`
  );

  const sessionInfo = await getSessionInfo();
  if (sessionInfo instanceof Response)
    return { success: false, message: 'No autorizado' };
  const { userId, businessId } = sessionInfo;

  const permissionCheck = await checkPermission(userId, businessId, [
    'OWNER',
    'ADMIN',
    'EDITOR'
  ]);

  if (typeof permissionCheck !== 'object' || !('role' in permissionCheck)) {
    return { success: false, message: 'Permiso denegado o error de sesión.' };
  }

  const validStatuses = Object.values(OrderStatus);
  if (!validStatuses.includes(newStatus)) {
    return {
      success: false,
      message: `Estado de pedido inválido: ${newStatus}`
    };
  }

  try {
    const result = await db
      .update(orders)
      .set({
        orderStatus: newStatus,
        updatedAt: new Date()
      })
      .where(and(eq(orders.id, orderId), eq(orders.businessId, businessId)))
      .returning({ id: orders.id });

    if (result.length === 0) {
      return {
        success: false,
        message: 'Pedido no encontrado o no se pudo actualizar.'
      };
    }

    revalidatePath(`/app/pedidos/${orderId}`);
    revalidatePath('/app/pedidos');

    console.log(`Server Action: Order ${orderId} status updated successfully.`);
    return { success: true, message: 'Estado del pedido actualizado.' };
  } catch (error) {
    console.error(
      `Server Action Error updating order status for ${orderId}:`,
      error
    );
    return {
      success: false,
      message: 'Error interno al actualizar el estado del pedido.'
    };
  }
}

export async function updatePaymentStatusAction(
  orderId: number,
  newStatus: PaymentStatus
): Promise<{ success: boolean; message: string }> {
  console.log(
    `Server Action: Updating order ${orderId} payment status to ${newStatus}`
  );

  const sessionInfo = await getSessionInfo();
  if (sessionInfo instanceof Response)
    return { success: false, message: 'No autorizado' };
  const { userId, businessId } = sessionInfo;
  const permissionCheck = await checkPermission(userId, businessId, [
    'OWNER',
    'ADMIN',
    'EDITOR'
  ]);
  if (typeof permissionCheck !== 'object' || !('role' in permissionCheck)) {
    return { success: false, message: 'Permiso denegado o error de sesión.' };
  }

  const validStatuses = Object.values(PaymentStatus);
  if (!validStatuses.includes(newStatus)) {
    return { success: false, message: `Estado de pago inválido: ${newStatus}` };
  }

  try {
    const result = await db
      .update(orders)
      .set({
        paymentStatus: newStatus,
        updatedAt: new Date()
      })
      .where(and(eq(orders.id, orderId), eq(orders.businessId, businessId)))
      .returning({ id: orders.id });

    if (result.length === 0) {
      return {
        success: false,
        message: 'Pedido no encontrado o no se pudo actualizar.'
      };
    }

    revalidatePath(`/app/pedidos/${orderId}`);
    revalidatePath('/app/pedidos');

    console.log(
      `Server Action: Order ${orderId} payment status updated successfully.`
    );
    return { success: true, message: 'Estado de pago actualizado.' };
  } catch (error) {
    console.error(
      `Server Action Error updating payment status for ${orderId}:`,
      error
    );
    return {
      success: false,
      message: 'Error interno al actualizar el estado de pago.'
    };
  }
}
