/**
 * Popup App - Main Application Component
 */

import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import {
    WelcomePage,
    CreateWalletPage,
    ImportWalletPage,
    UnlockPage,
    DashboardPage,
    SettingsPage,
    ContractsPage,
    ConnectPage,
    ConfirmPage,
    ConnectedSitesPage,
    SendPage,
    ReceivePage,
    ActivityPage,
    ChangePasswordPage,
    AccountsPage,
    LoginPage
} from './pages';
import { usePopupStore } from './store';
import { LoadingScreen } from '../../ui';

function AppRoutes() {
    const { isInitialized, isLocked, loading, initialize, theme } = usePopupStore();
    const navigate = useNavigate();
    const [initialRouteChecked, setInitialRouteChecked] = useState(false);

    useEffect(() => {
        initialize();
        // Sync theme
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [initialize, theme]);

    // Check for popup route from background script
    useEffect(() => {
        if (!loading && !initialRouteChecked) {
            chrome.storage.session.get(['popupRoute', 'popupParams']).then((result) => {
                if (result.popupRoute) {
                    // Navigate to the requested route
                    navigate(`/${result.popupRoute}`);
                    // Clear the route
                    chrome.storage.session.remove(['popupRoute', 'popupParams']);
                }
                setInitialRouteChecked(true);
            });
        }
    }, [loading, initialRouteChecked, navigate]);

    if (loading) {
        return <LoadingScreen message="Loading wallet..." />;
    }

    // Not initialized (No Session) - show Login
    if (!isInitialized) {
        return (
            <Routes>
                <Route path="/" element={<LoginPage />} />
                {/* Fallback for any other route to Login */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        );
    }

    // Initialized but locked - show unlock
    // Initialized but locked - show unlock
    if (isLocked) {
        return (
            <Routes>
                <Route path="/unlock" element={<UnlockPage />} />
                <Route path="/" element={<Navigate to="/unlock" replace />} />
                <Route path="*" element={<Navigate to="/unlock" replace />} />
            </Routes>
        );
    }

    // Unlocked - show main app
    return (
        <Routes>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/send" element={<SendPage />} />
            <Route path="/receive" element={<ReceivePage />} />
            <Route path="/activity" element={<ActivityPage />} />
            <Route path="/contracts" element={<ContractsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/accounts" element={<AccountsPage />} />
            <Route path="/change-password" element={<ChangePasswordPage />} />
            <Route path="/connected-sites" element={<ConnectedSitesPage />} />
            <Route path="/connect" element={<ConnectPage />} />
            <Route path="/connect" element={<ConnectPage />} />
            <Route path="/confirm" element={<ConfirmPage />} />
            {/* Allow Re-onboarding/Reset */}
            <Route path="/items" element={<ImportWalletPage />} />
            <Route path="/create" element={<CreateWalletPage />} />
            <Route path="/import" element={<ImportWalletPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
    );
}

export function App() {
    return (
        <HashRouter>
            <AppRoutes />
        </HashRouter>
    );
}
