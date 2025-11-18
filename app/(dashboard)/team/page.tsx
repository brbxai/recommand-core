import { PageTemplate } from "@core/components/page-template";
import { rc } from "@recommand/lib/client";
import type { TeamMembers } from "api/team-members";
import type { Auth } from "api/auth";
import { useEffect, useState, useCallback } from "react";
import { DataTable } from "@core/components/data-table";
import {
  type ColumnDef,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { SortingState } from "@tanstack/react-table";
import { Button } from "@core/components/ui/button";
import { Input } from "@core/components/ui/input";
import { toast } from "@core/components/ui/sonner";
import { stringifyActionFailure } from "@recommand/lib/utils";
import type { MinimalTeamMember } from "@core/data/team-members";
import { useActiveTeam } from "@core/hooks/user";
import { Trash2, Loader2, Copy } from "lucide-react";
import { ColumnHeader } from "@core/components/data-table/column-header";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@core/components/ui/alert-dialog";
import { useNavigate } from "react-router";
import { useUserStore } from "@core/lib/user-store";

const client = rc<TeamMembers>("core");
const authClient = rc<Auth>("core");

export default function Page() {
  const [teamMembers, setTeamMembers] = useState<MinimalTeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [isDeletingTeam, setIsDeletingTeam] = useState(false);
  const activeTeam = useActiveTeam();
  const navigate = useNavigate();

  const fetchTeamMembers = useCallback(async () => {
    if (!activeTeam?.id) {
      setTeamMembers([]);
      setIsLoading(false);
      return;
    }

    try {
      const response = await client["auth"]["teams"][":teamId"]["members"].$get({
        param: { teamId: activeTeam.id },
      });
      const json = await response.json();

      if (!json.success || !Array.isArray(json.members)) {
        console.error("Invalid API response format:", json);
        toast.error("Failed to load team members");
        setTeamMembers([]);
      } else {
        setTeamMembers(
          json.members.map((member) => ({
            ...member,
            createdAt: new Date(member.createdAt),
            updatedAt: new Date(member.updatedAt),
            user: {
              ...member.user,
              createdAt: new Date(member.user.createdAt),
              updatedAt: new Date(member.user.updatedAt),
            },
          }))
        );
      }
    } catch (error) {
      console.error("Error fetching team members:", error);
      toast.error("Failed to load team members");
      setTeamMembers([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeTeam?.id]);

  useEffect(() => {
    fetchTeamMembers();
  }, [fetchTeamMembers]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTeam?.id || !newMemberEmail.trim()) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsAddingMember(true);
    try {
      const response = await client["auth"]["teams"][":teamId"]["members"].$post({
        param: { teamId: activeTeam.id },
        json: { email: newMemberEmail },
      });

      const json = await response.json();
      if (!json.success) {
        throw new Error(stringifyActionFailure(json.errors));
      }

      setNewMemberEmail("");
      toast.success(json.message || "Team member added successfully");
      fetchTeamMembers();
    } catch (error) {
      console.error("Error adding team member:", error);
      toast.error("Failed to add team member");
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleDeleteTeam = async () => {
    if (!activeTeam?.id) {
      toast.error("No active team selected");
      return;
    }

    setIsDeletingTeam(true);
    try {
      const response = await authClient["auth"]["teams"][":teamId"].$delete({
        param: { teamId: activeTeam.id },
      });

      const json = await response.json();
      if (!json.success) {
        throw new Error(stringifyActionFailure(json.errors));
      }

      toast.success("Team deleted successfully");
      // Clear the current active team
      useUserStore.getState().removeTeam(activeTeam.id);
      // Navigate to a safe location after team deletion
      navigate("/");
    } catch (error) {
      console.error("Error deleting team:", error);
      toast.error("Failed to delete team");
    } finally {
      setIsDeletingTeam(false);
    }
  };

  const columns: ColumnDef<MinimalTeamMember>[] = [
    {
      accessorKey: "user.email",
      header: ({ column }) => <ColumnHeader column={column} title="Email" />,
      cell: ({ row }) => row.original.user.email ?? "N/A",
    },
    {
      accessorKey: "user.id",
      header: ({ column }) => <ColumnHeader column={column} title="User ID" />,
      cell: ({ row }) => {
        const userId = row.original.user.id;
        if (!userId) return <div className="text-muted-foreground">N/A</div>;
        
        return (
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs">
              {userId.length > 12
                ? `${userId.slice(0, 6)}...${userId.slice(-6)}`
                : userId}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                navigator.clipboard.writeText(userId);
                toast.success("User ID copied to clipboard");
              }}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
    {
      accessorKey: "user.emailVerified",
      header: ({ column }) => <ColumnHeader column={column} title="Verified" />,
      cell: ({ row }) => (
        <div className="flex items-center">
          {row.original.user.emailVerified ? (
            <span className="text-green-600">✓ Verified</span>
          ) : (
            <span className="text-orange-600">⚠ Unverified</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <ColumnHeader column={column} title="Joined At" />
      ),
      cell: ({ row }) => {
        const date = row.getValue("createdAt") as Date;
        return date ? date.toLocaleDateString() : "N/A";
      },
      sortingFn: "datetime",
    },
    {
      id: "actions",
      header: "",
      size: 100,
      cell: ({ row }) => {
        const userId = row.original.user.id;
        if (!userId) return null;

        return (
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (!activeTeam?.id) return;

                client["auth"]["teams"][":teamId"]["members"][":userId"]
                  .$delete({
                    param: {
                      teamId: activeTeam.id,
                      userId: userId,
                    },
                  })
                  .then(async (res: Response) => {
                    const json = await res.json();
                    if (json.success) {
                      toast.success("Team member removed successfully");
                      fetchTeamMembers();
                    } else {
                      toast.error(stringifyActionFailure(json.errors));
                    }
                  })
                  .catch((error) => {
                    console.error("Error removing team member:", error);
                    toast.error("Failed to remove team member");
                  });
              }}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: teamMembers,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  });

  return (
    <PageTemplate
      breadcrumbs={[{ label: "User Settings" }, { label: "Team" }]}
      buttons={[
        <AlertDialog key="delete-team-dialog">
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={isDeletingTeam}>
              {isDeletingTeam ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Team
                </>
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Team</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete the team "{activeTeam?.name}"? This action cannot be undone. 
                All team members, API keys, and associated data will be permanently removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeletingTeam}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteTeam}
                disabled={isDeletingTeam}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeletingTeam ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete Team"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>,
      ]}
    >
      <div className="space-y-6">
        <div className="flex items-center gap-4 max-w-xl">
          <Input
            placeholder="Email address to invite"
            value={newMemberEmail}
            onChange={(e) => setNewMemberEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleAddMember(e);
              }
            }}
            disabled={isAddingMember}
          />
          <Button 
            onClick={handleAddMember} 
            disabled={isAddingMember || !newMemberEmail.trim()}
          >
            {isAddingMember ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Inviting...
              </>
            ) : (
              "Invite Member"
            )}
          </Button>
        </div>
        <div className="rounded-lg border p-4 space-y-4 max-w-xl bg-muted">
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Team Name</label>
              <div className="flex items-center gap-2">
                <Input
                  value={activeTeam?.name ?? ""}
                  readOnly
                  className="font-mono"
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    if (activeTeam?.name) {
                      navigator.clipboard.writeText(activeTeam.name);
                      toast.success("Team name copied to clipboard");
                    }
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div>
              <div className="space-y-2">
                <h3 className="font-medium">Team ID</h3>
                <p className="text-sm text-muted-foreground">
                  This is your unique team identifier (
                  <code className="font-mono">teamId</code>).
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  value={activeTeam?.id ?? ""}
                  readOnly
                  className="font-mono"
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    if (activeTeam?.id) {
                      navigator.clipboard.writeText(activeTeam.id);
                      toast.success("Team ID copied to clipboard");
                    }
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <DataTable columns={columns} table={table} />
        )}
      </div>
    </PageTemplate>
  );
}