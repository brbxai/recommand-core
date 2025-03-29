"use client"

import * as React from "react"
import {
  AudioWaveform,
  Command,
  GalleryVerticalEnd,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { NavMain } from "@core/components/nav-main"
import { NavUser } from "@core/components/nav-user"
import { TeamSwitcher } from "@core/components/team-switcher"
import { useMenuItems } from "@core/lib/menu-store"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@core/components/ui/sidebar"
import { useLocation } from "react-router-dom"

// This is sample data.
const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  teams: [
    {
      name: "Acme Inc",
      logo: GalleryVerticalEnd,
      plan: "Enterprise",
    },
    {
      name: "Acme Corp.",
      logo: AudioWaveform,
      plan: "Startup",
    },
    {
      name: "Evil Corp.",
      logo: Command,
      plan: "Free",
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const menuItems = useMenuItems();
  const location = useLocation();

  // Build the menu hierarchy for main items
  const mainItems = menuItems
    .filter(item => item.id.startsWith("main."))
    .reduce((acc, item) => {
      const parts = item.id.split(".");
      if (parts.length <= 2) {
        // This is a root item
        acc.push({
          title: item.title,
          url: item.href || "#",
          onClick: item.onClick,
          icon: item.icon as LucideIcon,
          isActive: item.isActive || item.href === location.pathname,
          items: menuItems
            .filter(subItem => 
              subItem.id.startsWith("main.") && 
              subItem.id.split(".").length > 2 &&
              subItem.id.split(".").slice(0, -1).join(".") === item.id
            )
            .map(subItem => ({
              title: subItem.title,
              url: subItem.href || "#",
              onClick: subItem.onClick,
            }))
        });
      }
      return acc;
    }, [] as Array<{
      title: string;
      url: string;
      onClick?: () => void;
      icon?: LucideIcon;
      isActive?: boolean;
      items?: Array<{
        title: string;
        url: string;
        onClick?: () => void;
      }>;
    }>);

  // Group user menu items by their group (second part of the ID)
  const userMenuItems = menuItems
    .filter(item => item.id.startsWith("user."))
    .reduce((groups, item) => {
      const parts = item.id.split(".");
      const group = parts.length > 2 ? parts[1] : "default";
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(item);
      return groups;
    }, {} as Record<string, typeof menuItems>);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={mainItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} userMenuItems={userMenuItems} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
