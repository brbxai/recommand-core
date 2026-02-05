export type Permission = {
  id: string;
  name: string;
  description?: string;
  prerequisiteActorPermissionIds: string[];
  hasAdminPrerequisite?: boolean;
  isAddedOnTeamCreation?: boolean;
}

const CORE_PERMISSIONS = [
  {
    id: "core.team.manage",
    name: "Manage Team",
    description: "Manage the team and its members",
    prerequisiteActorPermissionIds: ["core.team.manage"],
    hasAdminPrerequisite: false,
    isAddedOnTeamCreation: true,
  },
];

const registeredPermissions: Record<string, Permission> = {};

export function getRegisteredPermissions(): Permission[] {
  return Object.values(registeredPermissions);
}

export function getTeamCreationPermissions(): Permission[] {
  return Object.values(registeredPermissions).filter(p => p.isAddedOnTeamCreation);
}

export function getRegisteredPermission(permissionId: string): Permission | null {
  return registeredPermissions[permissionId] ?? null;
}

export function registerPermission(permission: Permission) {
  registeredPermissions[permission.id] = permission;
}

for (const permission of CORE_PERMISSIONS) {
  registerPermission(permission);
}