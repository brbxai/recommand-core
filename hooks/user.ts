import { useUserStore } from "@core/lib/user-store";

export function useUser() {
  return useUserStore(x => x.user);
}

export function useActiveTeam() {
  return useUserStore(x => x.activeTeam);
}

export function useTeams() {
  return useUserStore(x => x.teams);
}