import React from 'react'
import { Toaster } from '../components/ui/sonner';
import { BrowserRouter, Route, Routes } from 'react-router'
import { routes } from 'virtual:recommand-file-based-router'
import './index.css'

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
    return <BrowserRouter>
        {children}
        <Routes>
            {routes.map((route) => renderRoute(route))}
        </Routes>
        <Toaster richColors />
    </BrowserRouter>;
}
