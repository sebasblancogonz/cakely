'use server';

import { deleteOrderById, deleteProductById } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function deleteProduct(formData: FormData) {
  let id = Number(formData.get('id'));
  await deleteProductById(id);
  revalidatePath('/');
}

export async function deleteOrder(formData: FormData) {
  let id = Number(formData.get('id'));
  await deleteOrderById(id);
  revalidatePath('/');
}
