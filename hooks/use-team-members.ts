import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { TeamMemberWithUser } from '@/types/types';

interface TeamMembersApiResponse {
  members: TeamMemberWithUser[];
}

export function useTeamMembers() {
  const { data, error, isLoading, mutate } = useSWR<TeamMembersApiResponse>(
    '/api/team-members',
    fetcher,
    {
      revalidateOnFocus: false,
      errorRetryCount: 2
    }
  );

  return {
    teamMembers: data?.members ?? [],
    isLoadingMembers: isLoading,
    isErrorMembers: error,
    mutateMembers: mutate
  };
}
