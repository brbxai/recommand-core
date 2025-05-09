import { create } from 'zustand';
import { useMemo } from 'react';
import type { LucideIcon } from 'lucide-react';

export interface MenuGroup {
    id: string; // E.g. "main.general" or "main.admin", where "main" indicates the main menu
    title: string;
}

export interface MenuItem {
    id: string; // E.g. "main.parent" or "main.invoice", where "main" indicates the main menu
    title: string;
    icon?: LucideIcon;
    onClick?: () => void;
    href?: string;
    isActive?: boolean;
    groupId?: string;
}

interface MenuStore {
    items: MenuItem[];
    groups: MenuGroup[];
    registerMenuItem: (item: MenuItem) => void;
    registerMenuGroup: (group: MenuGroup) => void;
}

const useMenuStore = create<MenuStore>((set, get) => ({
    items: [],
    groups: [],
    registerMenuItem: (item: MenuItem) => {
        set((state) => {
            const existingIndex = state.items.findIndex(existingItem => existingItem.id === item.id);
            if (existingIndex >= 0) {
                const newItems = [...state.items];
                newItems[existingIndex] = item;
                return { items: newItems };
            }
            return { items: [...state.items, item] };
        });
    },
    registerMenuGroup: (group: MenuGroup) => {
        set((state) => {
            const existingIndex = state.groups.findIndex(existingGroup => existingGroup.id === group.id);
            if (existingIndex >= 0) {
                const newGroups = [...state.groups];
                newGroups[existingIndex] = group;
                return { groups: newGroups };
            }
            return { groups: [...state.groups, group] };
        });
    },
}));

export const useMenuItems = (): MenuItem[] => {
    return useMenuStore((state) => state.items);
}

export const useGroupedMenuItems = (): Record<string, MenuItem[]> => {
    return useMenuStore((state) => {
        const items = state.items;
        const groupedItems: Record<string, MenuItem[]> = {};
        items.forEach(item => {
            const groupId = item.groupId ?? "_default";
            if (!groupedItems[groupId]) {
                groupedItems[groupId] = [];
            }
            groupedItems[groupId].push(item);
        });
        return groupedItems;
    });
}

export const useMenuItemActions = (): { registerMenuItem: (item: MenuItem) => void, registerMenuGroup: (group: MenuGroup) => void } => {
    const registerMenuItem = useMenuStore((state) => state.registerMenuItem);
    const registerMenuGroup = useMenuStore((state) => state.registerMenuGroup);
    return useMemo(() => ({
        registerMenuItem,
        registerMenuGroup,
    }), [registerMenuItem, registerMenuGroup]);
}

export const useMenuGroups = (): MenuGroup[] => {
    return useMenuStore((state) => state.groups);
}