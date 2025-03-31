import { AppSidebar } from "@core/components/app-sidebar"
import {
  SidebarInset,
  SidebarProvider,
} from "@core/components/ui/sidebar"
import { useState } from "react"
import { Outlet } from "react-router"

export default function Layout() {
  const defaultOpen = localStorage.getItem("sidebar_state") !== "closed";
  const [open, setOpen] = useState(defaultOpen);

  return (
    <SidebarProvider defaultOpen={defaultOpen} open={open} onOpenChange={(open) => {
      localStorage.setItem("sidebar_state", open ? "open" : "closed")
      setOpen(open)
    }}>
      <AppSidebar />
      <SidebarInset>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  )
}
