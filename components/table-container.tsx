import React from "react";

interface TableContainerProps {
  children: React.ReactNode;
}

export function TableContainer({ children }: TableContainerProps) {
  return <div className="rounded-md border">{children}</div>;
} 