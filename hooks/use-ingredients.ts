import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import type { IngredientPrice } from '@/types/types';

export function useIngredients(canFetch: boolean = true) {
  const { data, error, isLoading, mutate } = useSWR<IngredientPrice[]>(
    canFetch ? '/api/ingredient-prices' : null,
    fetcher,
    {
      fallbackData: [],
      revalidateOnFocus: false
    }
  );

  const isLoadingFinal = !canFetch ? false : isLoading;
  const finalData = !canFetch ? [] : (data ?? []);
  const finalError = !canFetch ? null : error;

  return {
    ingredients: finalData,
    isLoadingIngredients: isLoadingFinal,
    isErrorIngredients: finalError,
    mutateIngredients: mutate
  };
}
