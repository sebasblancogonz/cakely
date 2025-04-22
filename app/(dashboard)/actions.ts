'use server';

import { deleteOrderById, deleteCustomerById } from '@/lib/db';

export async function deleteOrder(orderId: number | undefined) {
  await deleteOrderById(orderId!);
}

export async function deleteCustomer(customerId: number | undefined) {
  await deleteCustomerById(customerId!);
}
