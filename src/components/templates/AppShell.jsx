/**
 * @fileoverview AppShell — Root layout wrapper providing persistent Sidebar + scrollable main content.
 *
 * Replaces the old TopBar pattern. All protected pages render inside this shell.
 */

import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '@organisms/Sidebar';

export default function AppShell() {
    const [collapsed, setCollapsed] = useState(false);

    return (
        <div className={`app-shell ${collapsed ? 'app-shell--collapsed' : ''}`}>
            <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
            <main className="app-shell__main">
                <Outlet />
            </main>
        </div>
    );
}
