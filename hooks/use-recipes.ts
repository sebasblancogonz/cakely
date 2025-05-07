import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import type { RecipeWithIngredients } from '@/types/types';

export function useRecipes(canFetch: boolean = true) {
  const { data, error, isLoading, mutate } = useSWR<RecipeWithIngredients[]>(
    canFetch ? '/api/recipes' : null,
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
    recipes: finalData,
    isLoadingRecipes: isLoadingFinal,
    isErrorRecipes: finalError,
    mutateRecipes: mutate
  };
}
