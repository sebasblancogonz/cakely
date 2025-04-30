import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { BusinessProfileData } from '@/types/types';

const defaultProfileData: BusinessProfileData = { name: null, logoUrl: null };

export function useBusinessProfile() {
  const { data, error, isLoading, mutate } = useSWR<BusinessProfileData>(
    '/api/business-profile',
    fetcher,
    { fallbackData: defaultProfileData, revalidateOnFocus: false }
  );

  return {
    profile: data ?? defaultProfileData,
    isLoadingProfile: isLoading,
    isErrorProfile: error,
    mutateProfile: mutate
  };
}
