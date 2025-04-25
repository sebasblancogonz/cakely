export class FetchError extends Error {
  info?: any;
  status?: number;

  constructor(message: string) {
    super(message);
    this.name = 'FetchError';
  }
}

export const fetcher = async <T>(
  ...args: Parameters<typeof fetch>
): Promise<T> => {
  const res = await fetch(...args);
  if (!res.ok) {
    const error = new FetchError('Ocurrió un error al cargar los datos.');
    try {
      error.info = await res.json();
    } catch (e) {
      error.info = { message: (await res.text()) || 'Sin detalles de error' };
    }
    error.status = res.status;
    throw error;
  }
  return res.json() as Promise<T>;
};
