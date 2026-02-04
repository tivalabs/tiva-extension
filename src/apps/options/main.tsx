/**
 * Options Page Entry Point
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import '../../styles/globals.css';

function OptionsApp() {
    return (
        <div className="min-h-screen p-8">
            <div className="max-w-2xl mx-auto">
                <h1 className="text-2xl font-bold gradient-text mb-6">Tiva Wallet Settings</h1>

                <div className="glass-card p-6">
                    <h2 className="text-lg font-semibold text-white mb-4">Advanced Settings</h2>
                    <p className="text-slate-400">
                        For most settings, please use the popup interface directly.
                    </p>
                </div>
            </div>
        </div>
    );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <OptionsApp />
    </React.StrictMode>
);
