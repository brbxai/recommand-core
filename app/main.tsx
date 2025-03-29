import React, { useEffect } from 'react'
import { toast, Toaster } from '../components/ui/sonner';
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from 'react-router'
import { routes } from 'virtual:recommand-file-based-router'
import './index.css'
import { useMenuItemActions } from '@core/lib/menu-store';
import { LogOut } from 'lucide-react';
import { useUserStore } from '@core/lib/user-store';
import { useUser } from '@core/hooks/use-user';

const PUBLIC_ROUTES = ["/login", "/register", "/forgot-password", "/reset-password"];

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
            id: 'user.session.logout',
            title: 'Logout',
            icon: LogOut,
            onClick: async () => {
                toast.success("Logging out...");

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


const RouterInner = () => {
    const { user, isLoading } = useUser();
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        if (!isLoading && !user) {
            // If not on a public route, redirect to login
            if (!PUBLIC_ROUTES.some(route => location.pathname.startsWith(route))) {
                console.log("Redirecting to login");
                navigate("/login");
            }
        }
    }, [user, isLoading]);

    return <Routes>
        {routes.map((route) => renderRoute(route))}
    </Routes>
}