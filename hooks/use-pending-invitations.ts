import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import type { PendingInvitation } from '@/types/types';

interface PendingInvitationsApiResponse {
  invitations: PendingInvitation[];
}

export function usePendingInvitations(canFetch: boolean = true) {
  const { data, error, isLoading, mutate } =
    useSWR<PendingInvitationsApiResponse>(
      canFetch ? '/api/invitations/pending' : null,
      fetcher,
      { revalidateOnFocus: false }
    );

  const isLoadingFinal = !canFetch ? false : isLoading;
  const finalData = !canFetch ? [] : (data?.invitations ?? []);
  const finalError = !canFetch ? null : error;

  return {
    pendingInvitations: finalData,
    isLoadingInvitations: isLoadingFinal,
    isErrorInvitations: finalError,
    mutatePendingInvitations: mutate
  };
}
