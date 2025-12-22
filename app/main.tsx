import React, { useEffect, useMemo, useState } from 'react'
import { toast, Toaster } from '../components/ui/sonner';
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from 'react-router'
import { routes } from 'virtual:recommand-file-based-router'
import './index.css'
import { useMenuItemActions } from '@core/lib/menu-store';
import { KeyRound, Lock, LogOut, Users } from 'lucide-react';
import { useUserStore } from '@core/lib/user-store';
import { rc } from '@recommand/lib/client';
import type { Auth } from '@core/api/auth';
import { stringifyActionFailure } from '@recommand/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@core/components/ui/dialog';
import { Button } from '@core/components/ui/button';

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

const client = rc<Auth>("core");

export default function Main({ children }: { children: React.ReactNode }) {
    const { registerMenuItem } = useMenuItemActions();
    const logout = useUserStore(state => state.logout);
    const user = useUserStore(state => state.user);
    const [passwordResetDialog, setPasswordResetDialog] = useState<{
        open: boolean;
        title: string;
        description: string;
    }>({
        open: false,
        title: '',
        description: '',
    });
    
    useEffect(() => {

        registerMenuItem({
            id: 'user.api.api_keys',
            title: 'API Keys',
            icon: KeyRound,
            href: '/api-keys',
        });

        registerMenuItem({
            id: 'user.api.team',
            title: 'Team',
            icon: Users,
            href: '/team',
        });

        registerMenuItem({
            id: 'user.session.change_password',
            title: 'Change password',
            icon: Lock,
            onClick: async () => {
                if (!user?.email) {
                    setPasswordResetDialog({
                        open: true,
                        title: 'Unable to change password',
                        description: 'User email not available',
                    });
                    return;
                }

                try {
                    const res = await client.auth["request-password-reset"].$post({
                        json: { email: user.email },
                    });
                    const data = await res.json();

                    if (data.success) {
                        setPasswordResetDialog({
                            open: true,
                            title: 'Password reset email sent',
                            description: 'Check your email for instructions to reset your password',
                        });
                    } else {
                        setPasswordResetDialog({
                            open: true,
                            title: 'Failed to send reset link',
                            description: stringifyActionFailure(data.errors),
                        });
                    }
                } catch (err) {
                    setPasswordResetDialog({
                        open: true,
                        title: 'Failed to send reset link',
                        description:
                            err instanceof Error ? err.message : "An unexpected error occurred",
                    });
                }
            }
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

    }, [logout, user]);

    return <BrowserRouter>
        {children}
        <RouterInner />
        <Toaster richColors />
        <Dialog open={passwordResetDialog.open} onOpenChange={(open) => setPasswordResetDialog(prev => ({ ...prev, open }))}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{passwordResetDialog.title}</DialogTitle>
                    <DialogDescription>{passwordResetDialog.description}</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button onClick={() => setPasswordResetDialog(prev => ({ ...prev, open: false }))}>
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
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
    const { user, isLoading, fetchUser } = useUserStore();
    const location = useLocation();
    const navigate = useNavigate();

    const publicPaths = useMemo(() => getPublicPaths(routes), [routes]);

    useEffect(() => {
        // On mount, get the current user
        fetchUser();
    }, [])

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