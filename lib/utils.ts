import { type ClassValue, clsx } from 'clsx';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function displayData(
  data: string | null | undefined,
  fallback: string = '-'
): string {
  return data ?? fallback;
}

const statusStyles: Record<string, string> = {
  pendiente: 'bg-pending text-pending-text',
  preparando: 'bg-wip text-wip-text',
  parcial: 'bg-wip text-wip-text',
  pagado: 'bg-delivered  text-delivered-text',
  cancelado: 'bg-cancelled text-cancelled-text',
  reembolsado: 'bg-refunded text-refunded-text',
  listo: 'bg-ready text-ready-text',
  entregado: 'bg-delivered  text-delivered-text'
};

export const getStatusStyle = (status: string) =>
  statusStyles[
    status
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase()
  ];

export function formatCurrency(
  value: number | null | undefined | string,
  fallback: string = '-'
): string {
  const numericValue = typeof value === 'string' ? parseFloat(value) : value;

  if (numericValue == null || isNaN(numericValue)) {
    return fallback;
  }

  try {
    const formatter = new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return formatter.format(numericValue);
  } catch (error) {
    console.error('Error formatting currency:', error);
    return fallback;
  }
}

export function displayDate(
  date: Date | string | number | null | undefined,
  formatString: string = 'PPP',
  fallback: string = '-'
): string {
  if (!date) return fallback;
  try {
    const dateObj = new Date(date);

    if (isNaN(dateObj.getTime())) {
      throw new Error('Invalid date value');
    }
    return format(dateObj, formatString, { locale: es });
  } catch (error) {
    console.warn('displayDate formatting error:', error);
    return 'Inválida';
  }
}
