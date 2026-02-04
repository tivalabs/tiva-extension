/**
 * Injected Script Entry Point
 * 
 * This script is injected into web pages to provide the window.canton provider.
 * It runs in the page's context, not in the extension's isolated context.
 */

import './provider';

// The provider module handles everything
console.log('Tiva: Injected script loaded');
