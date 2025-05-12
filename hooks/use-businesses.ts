import { AdminBusiness } from '@/types/types';
import { fetcher } from '@/lib/fetcher';
import useSWR from 'swr';

export function useBusinesses(canFetch: boolean = true) {
  const {
    data,
    error,
    isLoading,
    mutate: mutateBusinesses
  } = useSWR<AdminBusiness[]>(
    canFetch ? '/api/admin/businesses' : null,
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
    businesses: finalData,
    isErrorBusinesses: finalError,
    isLoadingBusinesses: isLoadingFinal,
    mutateBusinesses: mutateBusinesses
  };
}
