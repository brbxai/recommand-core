import { type Column } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@core/components/ui/button";

interface SortableHeaderProps<TData, TValue> {
  column: Column<TData, TValue>;
  title: string;
}

export function SortableHeader<TData, TValue>({
  column,
  title,
}: SortableHeaderProps<TData, TValue>) {
  return (
    <Button
      variant="ghost"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      className="-ml-1 p-1!"
    >
      {title}
      <ArrowUpDown className="ml-2 h-4 w-4" />
    </Button>
  );
} 