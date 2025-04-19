import { type Table } from "@tanstack/react-table";
import { X } from "lucide-react";
import { Button } from "@core/components/ui/button";
import { Input } from "@core/components/ui/input";
import { DataTableViewOptions } from "./view-options";
import { DataTableFacetedFilter } from "./faceted-filter";
import React from "react";

// Define the structure for filter configurations
export interface FilterConfig<TData> {
  id: keyof TData | string;
  title: string;
  options?: {
    label: string;
    value: string;
    icon?: React.ComponentType<{ className?: string }>;
  }[];
  component?: React.ReactNode; // To render custom filter components
}

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  searchColumn?: keyof TData | string;
  enableGlobalSearch?: boolean; // global search makes the search field work for all columns
  searchPlaceholder?: string;
  filterColumns?: FilterConfig<TData>[];
}

export function DataTableToolbar<TData>({
  table,
  searchColumn,
  enableGlobalSearch,
  searchPlaceholder = "Search...",
  filterColumns,
}: DataTableToolbarProps<TData>) {
  const isFiltered =
    table.getState().columnFilters.length > 0 ||
    Boolean(table.getState().globalFilter);

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        {searchColumn && !enableGlobalSearch && (
          <Input
            placeholder={searchPlaceholder}
            value={
              (table
                .getColumn(searchColumn as string)
                ?.getFilterValue() as string) ?? ""
            }
            onChange={(event) =>
              table
                .getColumn(searchColumn as string)
                ?.setFilterValue(event.target.value)
            }
            className="h-8 w-[150px] lg:w-[250px]"
          />
        )}
        {enableGlobalSearch && (
          <Input
            placeholder={searchPlaceholder}
            value={table.getState().globalFilter ?? ""}
            onChange={(event) => table.setGlobalFilter(event.target.value)}
            className="h-8 w-[150px] lg:w-[250px]"
          />
        )}
        {filterColumns?.map((filterConfig) => {
          if (filterConfig.component) {
            return (
              <React.Fragment key={filterConfig.id as string}>
                {filterConfig.component}
              </React.Fragment>
            );
          }
          if (filterConfig.options) {
            return (
              <DataTableFacetedFilter
                key={filterConfig.id as string}
                column={table.getColumn(filterConfig.id as string)}
                title={filterConfig.title}
                options={filterConfig.options}
              />
            );
          }
          return null;
        })}
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => {
              table.resetColumnFilters();
              if (enableGlobalSearch) {
                table.setGlobalFilter("");
              } else if (searchColumn) {
                table.getColumn(searchColumn as string)?.setFilterValue("");
              }
            }}
            className="h-8 px-2 lg:px-3"
          >
            Reset
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
      <DataTableViewOptions table={table} />
    </div>
  );
}
