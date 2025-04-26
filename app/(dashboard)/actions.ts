'use server';

export const runtime = 'nodejs';
import { auth } from '@/lib/auth';
import { deleteOrderById, deleteCustomerById } from '@/lib/db';

export async function deleteOrder(orderId: number | undefined) {
  const session = await auth();
  const businessId = session?.user?.businessId;

  if (!businessId) {
    throw Error('Business ID is required');
  }
  await deleteOrderById(businessId, orderId!);
}

export async function deleteCustomer(customerId: number | undefined) {
  const session = await auth();
  const businessId = session?.user?.businessId;

  if (!businessId) {
    throw Error('Business ID is required');
  }
  await deleteCustomerById(businessId, customerId!);
}
