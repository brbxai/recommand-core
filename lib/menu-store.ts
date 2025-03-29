import { create } from 'zustand';
import { useMemo } from 'react';
import type { LucideIcon } from 'lucide-react';

export interface MenuItem {
    id: string; // E.g. "main.parent" or "main.invoice", where "main" indicates the main menu
    title: string;
    icon?: LucideIcon;
    onClick?: () => void;
    href?: string;
    isActive?: boolean;
}

interface MenuStore {
    items: MenuItem[];
    registerMenuItem: (item: MenuItem) => void;
}

const useMenuStore = create<MenuStore>((set, get) => ({
    items: [],
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
}));

export const useMenuItems = (): MenuItem[] => {
    return useMenuStore((state) => state.items);
}

export const useMenuItemActions = (): { registerMenuItem: (item: MenuItem) => void } => {
    const registerMenuItem = useMenuStore((state) => state.registerMenuItem);
    return useMemo(() => ({
        registerMenuItem,
    }), [registerMenuItem]);
}