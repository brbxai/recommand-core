import React, { useEffect, useMemo } from 'react'
import { toast, Toaster } from '../components/ui/sonner';
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from 'react-router'
import { routes } from 'virtual:recommand-file-based-router'
import './index.css'
import { useMenuItemActions } from '@core/lib/menu-store';
import { KeyRound, LogOut, Settings } from 'lucide-react';
import { useUserStore } from '@core/lib/user-store';
import { useUser } from '@core/hooks/use-user';

const renderRoute = (r: typeof routes[number]) => {
    return (
        <Route
            key={r.route}
            path={r.route}
            element={r.LayoutComponent ? <r.LayoutComponent /> : null}
        >
            {r.PageComponent ? <Route index element={<r.PageComponent />} /> : null}
            {r.children.map((child) => renderRoute(child))}
        </Route>
    )
}

export default function Main({ children }: { children: React.ReactNode }) {
    const { registerMenuItem } = useMenuItemActions();
    const logout = useUserStore(state => state.logout);
    
    useEffect(() => {

        registerMenuItem({
            id: 'user.session.api_keys',
            title: 'API Keys',
            icon: KeyRound,
            href: '/api-keys',
        });

        registerMenuItem({
            id: 'user.session.logout',
            title: 'Logout',
            icon: LogOut,
            onClick: async () => {
                try {
                    await logout();
                    toast.success("Logged out successfully");
                } catch (error) {
                    toast.error("Failed to log out");
                }
            }
        });
    }, [logout]);

    return <BrowserRouter>
        {children}
        <RouterInner />
        <Toaster richColors />
    </BrowserRouter>;
}

function getPublicPaths(routeTree: typeof routes[number][]) {
    const publicPaths: string[] = [];
    for (const route of routeTree) {
        if (route.relativePath.startsWith("app/(public)/")) {
            publicPaths.push(route.route);
        }
        if (route.children.length > 0) {
            const childrenPaths = getPublicPaths(route.children);
            publicPaths.push(...childrenPaths);
        }
    }
    return publicPaths;
}

const RouterInner = () => {
    const { user, isLoading } = useUser();
    const location = useLocation();
    const navigate = useNavigate();

    const publicPaths = useMemo(() => getPublicPaths(routes), [routes]);

    useEffect(() => {
        if (!isLoading && !user) {
            // If not on a public route, redirect to login
            if (!publicPaths.some(route => location.pathname.startsWith(route))) {
                console.log("Redirecting to login");
                navigate("/login");
            }
        }
    }, [user, isLoading]);

    return <Routes>
        {routes.map((route) => renderRoute(route))}
    </Routes>
}