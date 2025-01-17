'use server';

import { deleteOrderById, deleteProductById } from '@/lib/db';
import { Order } from '@types';
import { revalidatePath } from 'next/cache';

export async function deleteProduct(formData: FormData) {
  let id = Number(formData.get('id'));
  await deleteProductById(id);
  revalidatePath('/');
}

export async function deleteOrder(orderId: number | undefined) {
  await deleteOrderById(orderId!);
}
