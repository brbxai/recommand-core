import { AppSidebar } from "@core/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@core/components/ui/breadcrumb"
import { Separator } from "@core/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
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
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            {/* TODO: Implement a proper way to show dynamic breadcrumbs */}
            {/* <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="#">
                    Building Your Application
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Data Fetching</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb> */}
          </div>
        </header>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  )
}
