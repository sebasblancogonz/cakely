'use server';

import {
  deleteOrderById,
  deleteProductById,
  deleteCustomerById
} from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function deleteProduct(formData: FormData) {
  let id = Number(formData.get('id'));
  await deleteProductById(id);
  revalidatePath('/');
}

export async function deleteOrder(orderId: number | undefined) {
  await deleteOrderById(orderId!);
}

export async function deleteCustomer(customerId: number | undefined) {
  await deleteCustomerById(customerId!);
}
