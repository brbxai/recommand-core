import { useCallback } from "react";
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

export function useTeamPermissions() {
  return useUserStore(x => x.teamPermissions);
}

export function usePermissionChecker() {
  const activeTeam = useUserStore(x => x.activeTeam);
  const teamPermissions = useUserStore(x => x.teamPermissions);
  const user = useUserStore(x => x.user);

  return useCallback((permissionId: string) => {
    // Admins have all permissions
    if (user?.isAdmin) {
      return true;
    }
    
    if (!activeTeam?.id) {
      return false;
    }
    
    const permissions = teamPermissions[activeTeam.id] ?? [];
    return permissions.includes(permissionId);
  }, [user?.isAdmin, activeTeam?.id, teamPermissions]);
}

export function useHasPermission(permissionId: string) {
  const hasPermission = usePermissionChecker();
  return hasPermission(permissionId);
}