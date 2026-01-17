import { ChevronsUpDown, Plus, GalleryVerticalEnd, Pencil, Search } from "lucide-react";
import { Link } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@core/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@core/components/ui/sidebar";
import type { Team } from "@core/data/teams";
import { Skeleton } from "@core/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@core/components/ui/dialog";
import { Button } from "@core/components/ui/button";
import { Input } from "@core/components/ui/input";
import { useState } from "react";
import { useUserStore } from "@core/lib/user-store";
import { toast } from "@core/components/ui/sonner";
import { rc } from "@recommand/lib/client";
import { stringifyActionFailure } from "@recommand/lib/utils";
import type { Auth } from "@core/api/auth";
import type { MenuItem } from "@core/lib/menu-store";

const client = rc<Auth>("core");

export function TeamSwitcher({
  teams,
  activeTeam,
  setActiveTeam,
  menuItems,
}: {
  teams: Team[];
  activeTeam: Team | null;
  setActiveTeam: (team: Team) => void;
  menuItems: Record<string, MenuItem[]>;
}) {
  const { isMobile } = useSidebar();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCreateTeamDialogOpen, setIsCreateTeamDialogOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isEditTeamDialogOpen, setIsEditTeamDialogOpen] = useState(false);
  const [editTeamName, setEditTeamName] = useState("");
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const fetchTeams = useUserStore((x) => x.fetchTeams);
  const [searchQuery, setSearchQuery] = useState("");

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) {
      toast.error("Please enter a team name");
      return;
    }

    setIsCreating(true);
    try {
      const response = await client.auth.teams.$post({
        json: {
          name: newTeamName,
        },
      });
      const json = await response.json();

      if (json.success) {
        const newTeam = {
          ...json.data,
          createdAt: new Date(json.data.createdAt),
          updatedAt: new Date(json.data.updatedAt || json.data.createdAt),
        };
        await fetchTeams();
        setActiveTeam(newTeam);
        setIsCreateTeamDialogOpen(false);
        setNewTeamName("");
        toast.success("Team created successfully");
      } else {
        throw new Error(stringifyActionFailure(json.errors));
      }
    } catch (error) {
      console.error("Error creating team:", error);
      toast.error("Failed to create team");
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditTeam = (team: Team) => {
    setEditingTeam(team);
    setEditTeamName(team.name);
    setIsEditTeamDialogOpen(true);
    setIsDropdownOpen(false); // Close dropdown when opening edit dialog
  };

  const handleUpdateTeam = async () => {
    if (!editTeamName.trim() || !editingTeam) {
      toast.error("Please enter a team name");
      return;
    }

    setIsUpdating(true);
    try {
      const response = await client.auth.teams[":teamId"].$put({
        param: { teamId: editingTeam.id },
        json: {
          name: editTeamName,
        },
      });
      const json = await response.json();

      if (json.success) {
        const updatedTeam = {
          ...json.data,
          createdAt: new Date(json.data.createdAt),
          updatedAt: new Date(json.data.updatedAt || json.data.createdAt),
        };
        await fetchTeams();
        if (activeTeam?.id === editingTeam.id) {
          setActiveTeam(updatedTeam);
        }
        setIsEditTeamDialogOpen(false);
        setEditTeamName("");
        setEditingTeam(null);
        toast.success("Team name updated successfully");
      } else {
        throw new Error(stringifyActionFailure(json.errors));
      }
    } catch (error) {
      console.error("Error updating team:", error);
      toast.error("Failed to update team name");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  if (!activeTeam) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            size="lg"
            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          >
            <Skeleton className="size-8 rounded-lg" />
            <div className="grid flex-1 text-left text-sm leading-tight">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-1 h-3 w-16" />
            </div>
            <ChevronsUpDown className="ml-auto" />
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  // Transform team data for display
  const transformedTeams = teams.map((team) => ({
    name: team.name,
    logo: GalleryVerticalEnd,
    plan: team.teamDescription,
  }));

  const transformedActiveTeam = {
    name: activeTeam.name,
    logo: GalleryVerticalEnd,
    plan: activeTeam.teamDescription,
  };

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu
            open={isDropdownOpen}
            onOpenChange={(open) => {
              setIsDropdownOpen(open);
              if (!open) {
                setSearchQuery("");
              }
            }}
          >
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <transformedActiveTeam.logo className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">
                    {transformedActiveTeam.name}
                  </span>
                  <span className="truncate text-xs">
                    {transformedActiveTeam.plan}
                  </span>
                </div>
                <ChevronsUpDown className="ml-auto" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
              align="start"
              side={isMobile ? "bottom" : "right"}
              sideOffset={4}
            >
              <div className="px-2 py-2 border-b">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Search teams..."
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-8 h-9"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  />
                </div>
              </div>

              <>
                <DropdownMenuLabel className="text-muted-foreground text-xs px-2 py-2">
                  My Teams
                </DropdownMenuLabel>
                  {teams
                    .filter((team: any) =>
                      (team.isMember === true || team.isMember === undefined) &&
                      (!searchQuery.trim() ||
                        team.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    )
                    .map((team, index) => (
                      <DropdownMenuItem
                        key={team.id}
                        className="gap-2 p-2 flex justify-between group"
                        onSelect={(e) => e.preventDefault()}
                      >
                        <div
                          className="flex gap-2 items-center flex-1 cursor-pointer"
                          onClick={() => {
                            setActiveTeam(team);
                            setIsDropdownOpen(false);
                            setSearchQuery("");
                          }}
                        >
                          <div className="flex size-6 items-center justify-center rounded-md border">
                            <GalleryVerticalEnd className="size-3.5 shrink-0" />
                          </div>
                          {team.name}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditTeam(team);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-2 hover:bg-accent rounded transition-all"
                        >
                          <Pencil className="size-3" />
                        </button>
                      </DropdownMenuItem>
                    ))}

                  {teams.filter((team: any) =>
                    team.isMember === false &&
                    (!searchQuery.trim() ||
                      team.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  ).length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel className="text-muted-foreground text-xs px-2 py-2">
                        Other Teams
                      </DropdownMenuLabel>
                      {teams
                        .filter((team: any) =>
                          team.isMember === false &&
                          (!searchQuery.trim() ||
                            team.name.toLowerCase().includes(searchQuery.toLowerCase()))
                        )
                        .map((team) => (
                          <DropdownMenuItem
                            key={team.id}
                            className="gap-2 p-2"
                            onClick={() => {
                              setActiveTeam(team);
                              setIsDropdownOpen(false);
                              setSearchQuery("");
                            }}
                          >
                            <div className="flex size-6 items-center justify-center rounded-md border">
                              <GalleryVerticalEnd className="size-3.5 shrink-0" />
                            </div>
                            {team.name}
                          </DropdownMenuItem>
                        ))}
                    </>
                  )}

                  {searchQuery.trim() &&
                   teams.filter((t: any) => t.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                      No teams found
                    </div>
                  )}

                  {!searchQuery.trim() && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="gap-2 p-2"
                        onClick={() => {
                          setIsCreateTeamDialogOpen(true);
                          setIsDropdownOpen(false);
                        }}
                      >
                        <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                          <Plus className="size-4" />
                        </div>
                        <div>Add team</div>
                      </DropdownMenuItem>
                    </>
                  )}

                  {!searchQuery.trim() && menuItems &&
                    Object.entries(menuItems).map(([group, items]) => (
                      <DropdownMenuGroup key={group}>
                        {items.map((item) => {
                          if (item.href && !item.onClick) {
                            return (
                              <DropdownMenuItem
                                key={item.id}
                                asChild
                                className="gap-2 p-2"
                              >
                                <Link to={item.href}>
                                  {item.icon && (
                                    <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                                      <item.icon className="size-4" />
                                    </div>
                                  )}
                                  <span>{item.title}</span>
                                </Link>
                              </DropdownMenuItem>
                            );
                          } else {
                            return (
                              <DropdownMenuItem
                                key={item.id}
                                onClick={item.onClick}
                                className="gap-2 p-2"
                              >
                                {item.icon && (
                                  <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                                    <item.icon className="size-4" />
                                  </div>
                                )}
                                <span>{item.title}</span>
                              </DropdownMenuItem>
                            );
                          }
                        })}
                      </DropdownMenuGroup>
                    ))}
              </>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <Dialog
        open={isCreateTeamDialogOpen}
        onOpenChange={setIsCreateTeamDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a new team</DialogTitle>
            <DialogDescription>
              Add a new team to collaborate with others.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Input
                id="name"
                placeholder="Team name"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCreateTeam();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateTeamDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateTeam}
              disabled={isCreating || !newTeamName.trim()}
            >
              {isCreating ? "Creating..." : "Create team"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isEditTeamDialogOpen}
        onOpenChange={setIsEditTeamDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit team name</DialogTitle>
            <DialogDescription>
              Update the name of "{editingTeam?.name}".
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Input
                id="editName"
                placeholder="Team name"
                value={editTeamName}
                onChange={(e) => setEditTeamName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleUpdateTeam();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditTeamDialogOpen(false);
                setEditTeamName("");
                setEditingTeam(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateTeam}
              disabled={
                isUpdating ||
                !editTeamName.trim() ||
                editTeamName === editingTeam?.name
              }
            >
              {isUpdating ? "Updating..." : "Update team"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
