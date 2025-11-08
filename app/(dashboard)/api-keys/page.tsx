import { PageTemplate } from "@core/components/page-template";
import { rc } from "@recommand/lib/client";
import type { ApiKeys } from "api/api-keys";
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
import type { ApiKey } from "@core/data/api-keys";
import { useActiveTeam } from "@core/hooks/user";
import { Trash2, Loader2, Copy, ChevronDown } from "lucide-react";
import { ColumnHeader } from "@core/components/data-table/column-header";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@core/components/ui/collapsible";

const client = rc<ApiKeys>("core");

export default function Page() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [newKey, setNewKey] = useState<{ key: string; secret: string } | null>(
    null
  );
  const [sorting, setSorting] = useState<SortingState>([]);
  const activeTeam = useActiveTeam();

  const fetchApiKeys = useCallback(async () => {
    if (!activeTeam?.id) {
      setApiKeys([]);
      setIsLoading(false);
      return;
    }

    try {
      const response = await client[":teamId"]["api-keys"].$get({
        param: { teamId: activeTeam.id },
      });
      const json = await response.json();

      if (!json.success || !Array.isArray(json.apiKeys)) {
        console.error("Invalid API response format:", json);
        toast.error("Failed to load API keys");
        setApiKeys([]);
      } else {
        setApiKeys(
          json.apiKeys.map((key) => ({
            ...key,
            createdAt: new Date(key.createdAt),
            updatedAt: new Date(key.updatedAt),
          }))
        );
      }
    } catch (error) {
      console.error("Error fetching API keys:", error);
      toast.error("Failed to load API keys");
      setApiKeys([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeTeam?.id]);

  useEffect(() => {
    fetchApiKeys();
  }, [fetchApiKeys]);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTeam?.id || !newKeyName.trim()) {
      toast.error("Please enter a valid name for the API key");
      return;
    }

    try {
      const response = await client[":teamId"]["api-keys"].$post({
        param: { teamId: activeTeam.id },
        json: { name: newKeyName },
      });

      const json = await response.json();
      if (!json.success) {
        throw new Error(
          "Invalid response format: " + stringifyActionFailure(json.errors)
        );
      }

      const newApiKey = {
        id: json.apiKey.id,
        name: json.apiKey.name,
        teamId: json.apiKey.teamId,
        userId: json.apiKey.userId,
        secretHash: json.apiKey.secretHash,
        createdAt: new Date(json.apiKey.createdAt),
        updatedAt: new Date(json.apiKey.updatedAt),
      };
      setApiKeys((prev) => [...prev, newApiKey]);
      setNewKeyName("");
      setNewKey({
        key: json.apiKey.id,
        secret: json.apiKey.secret,
      });
      toast.success("API key created successfully");
    } catch (error) {
      console.error("Error creating API key:", error);
      toast.error("Failed to create API key");
    }
  };

  const columns: ColumnDef<ApiKey>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => <ColumnHeader column={column} title="Name" />,
      cell: ({ row }) => (row.getValue("name") as string) ?? "N/A",
    },
    {
      accessorKey: "id",
      header: ({ column }) => <ColumnHeader column={column} title="API Key" />,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <pre className="font-mono">{row.getValue("id") as string}</pre>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              navigator.clipboard.writeText(row.getValue("id") as string);
              toast.success("API Key copied to clipboard");
            }}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <ColumnHeader column={column} title="Created At" />
      ),
      cell: ({ row }) => {
        const date = row.getValue("createdAt") as string;
        return date ? new Date(date).toLocaleDateString() : "N/A";
      },
      sortingFn: "datetime",
    },
    {
      id: "actions",
      header: "",
      size: 100,
      cell: ({ row }) => {
        const id = row.getValue("id") as string;
        if (!id) return null;

        return (
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (!activeTeam?.id) return;

                client[":teamId"]["api-keys"][":apiKeyId"]
                  .$delete({
                    param: {
                      teamId: activeTeam.id,
                      apiKeyId: id,
                    },
                  })
                  .then(async (res: Response) => {
                    const json = await res.json();
                    if (json.success) {
                      toast.success("API key deleted successfully");
                      fetchApiKeys();
                    } else {
                      toast.error(stringifyActionFailure(json.errors));
                    }
                  })
                  .catch((error) => {
                    console.error("Error deleting API key:", error);
                    toast.error("Failed to delete API key");
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
    data: apiKeys,
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
      breadcrumbs={[{ label: "User Settings" }, { label: "API Keys" }]}
    >
      <div className="space-y-6">
        <div className="flex items-center gap-4 max-w-xl">
          <Input
            placeholder="New API Key Name"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleCreateKey(e);
              }
            }}
          />
          <Button onClick={handleCreateKey}>Create API Key</Button>
        </div>
        <div className="rounded-lg border p-4 space-y-4 max-w-xl bg-muted">
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
        {newKey && (
          <div className="rounded-lg border p-4 space-y-4 max-w-xl bg-muted">
            <div className="space-y-2">
              <h3 className="font-medium">New API Key Created</h3>
              <p className="text-sm text-muted-foreground">
                Please save these credentials. They will only be shown once.
              </p>
            </div>
            <div className="space-y-2">
              <div>
                <label className="text-sm font-medium">API Key</label>
                <div className="flex items-center gap-2">
                  <Input value={newKey.key} readOnly className="font-mono" />
                  <Button
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(newKey.key);
                      toast.success("API Key copied to clipboard");
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Secret</label>
                <div className="flex items-center gap-2">
                  <Input value={newKey.secret} readOnly className="font-mono" />
                  <Button
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(newKey.secret);
                      toast.success("Secret copied to clipboard");
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full font-normal [&[data-state=open]>svg]:rotate-180"
                  >
                    <label className="text-sm font-medium">
                      View Authorization Header
                    </label>
                    <ChevronDown className="h-4 w-4 transition-transform duration-200" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="pt-2">
                    <label className="text-sm font-medium">Authorization Header</label>
                    <div className="flex items-center gap-2 mt-2">
                      <Input
                        value={`Authorization: Basic ${btoa(`${newKey.key}:${newKey.secret}`)}`}
                        readOnly
                        className="font-mono"
                      />
                      <Button
                        variant="outline"
                        onClick={() => {
                          const authHeader = `Authorization: Basic ${btoa(`${newKey.key}:${newKey.secret}`)}`;
                          navigator.clipboard.writeText(authHeader);
                          toast.success("Authorization header copied to clipboard");
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
            <Button variant="outline" onClick={() => setNewKey(null)}>
              Close
            </Button>
          </div>
        )}
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
