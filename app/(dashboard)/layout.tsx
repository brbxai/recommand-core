import { AppSidebar } from "@core/components/app-sidebar"
import {
  SidebarInset,
  SidebarProvider,
} from "@core/components/ui/sidebar"
import { useUncompletedOnboardingSteps } from "@core/lib/onboarding-store";
import { useState } from "react"
import { Outlet } from "react-router"
import Onboarding from "./onboarding";
import { useUser } from "@core/hooks/user";

export default function Layout() {
  const defaultOpen = localStorage.getItem("sidebar_state") !== "closed";
  const [open, setOpen] = useState(defaultOpen);
  const user = useUser();
  const onboardingSteps = useUncompletedOnboardingSteps();

  if (user && onboardingSteps.length > 0) {
    return <Onboarding step={onboardingSteps[0]} />;
  }

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
