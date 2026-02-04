# Tiva - Canton Network Browser Extension Wallet

<p align="center">
  <img src="public/icons/icon128.png" alt="Tiva Logo" width="128" height="128">
</p>

<p align="center">
  <strong>Your gateway to the Canton Network</strong>
</p>

---

## Overview

Tiva is a Chrome extension wallet for Canton Network, similar to MetaMask for Ethereum. It enables users to:

- **Manage Private Keys**: Securely generate and store Ed25519 keypairs using BIP-39 mnemonics
- **Sign Daml Commands**: Approve and sign Canton Network transactions locally
- **Interact with DApps**: Seamless integration with decentralized applications via CIP-103 provider

## Features

- 🔐 **Secure Key Management**: BIP-39 mnemonic generation with AES-256-GCM encrypted storage
- 🔗 **CIP-103 Provider**: `window.canton` provider for DApp integration
- 📜 **Daml Contract Viewer**: Browse active contracts on the ledger
- 🎨 **Modern UI**: Sleek dark theme with glassmorphism effects
- 🛡️ **Privacy First**: Private keys never leave the extension

## Tech Stack

- **Framework**: React 18 + TypeScript + Vite
- **Extension**: Chrome Extension Manifest V3
- **Cryptography**: `@noble/ed25519`, `bip39`
- **State Management**: Zustand
- **Styling**: Tailwind CSS

## Project Structure

```
src/
├── apps/
│   ├── popup/          # Main wallet UI
│   └── options/        # Settings page
├── core/
│   ├── crypto/         # Cryptographic operations
│   │   ├── mnemonic.ts # BIP-39 mnemonic handling
│   │   ├── ed25519.ts  # Ed25519 key derivation (SLIP-0010)
│   │   ├── vault.ts    # AES-GCM encrypted storage
│   │   └── keyring.ts  # Wallet management
│   ├── types/          # TypeScript definitions
│   └── config.ts       # Network configuration
├── extension/
│   ├── background/     # Service worker
│   ├── content/        # Content script (message bridge)
│   └── injected/       # window.canton provider
├── ui/                 # Reusable components
└── styles/             # Global styles
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm

# Clone the repository
git clone https://github.com/tivalabs/tiva-extension.git
cd tiva-extension

# Install dependencies
npm install

# Build the extension
npm run build
```

### Load in Chrome

1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `dist` folder

### Development

```bash
# Start development server
npm run dev
```

## DApp Integration

DApps can interact with Tiva using the `window.canton` provider:

```javascript
// Check if Tiva is installed
if (window.canton) {
  // Request account access
  const accounts = await window.canton.requestAccounts();
  console.log('Connected accounts:', accounts);
  
  // Sign and submit a Daml command
  const result = await window.canton.signAndSubmit({
    templateId: {
      packageId: 'abc123...',
      moduleName: 'MyModule',
      entityName: 'MyTemplate'
    },
    choice: 'MyChoice',
    argument: { /* Daml choice arguments */ }
  });
}
```

### Available Methods

| Method | Description |
|--------|-------------|
| `requestAccounts()` | Request user's accounts with permission prompt |
| `getAccounts()` | Get connected accounts (no prompt) |
| `signAndSubmit(command)` | Sign and submit a Daml command |
| `prepareTransaction(command)` | Prepare a transaction for signing |
| `signTransaction(txHash)` | Sign a prepared transaction hash |
| `getBalances()` | Get CIP-56 token balances |
| `getActiveContracts(filter?)` | Query active contracts |

### Events

```javascript
window.canton.on('connect', ({ networkId }) => {
  console.log('Connected to:', networkId);
});

window.canton.on('accountsChanged', (accounts) => {
  console.log('Accounts changed:', accounts);
});

window.canton.on('disconnect', () => {
  console.log('Disconnected');
});
```

## Security

- Private keys are encrypted with AES-256-GCM and stored in `chrome.storage.local`
- Keys are derived from user password using PBKDF2 (100,000 iterations)
- Private keys only exist in decrypted form in the background service worker memory
- Auto-lock after 15 minutes of inactivity

## Network Configuration

Tiva supports multiple networks:

- **Canton TestNet** (default)
- **Canton MainNet**
- **Local Development**

## License

MIT License

---

<p align="center">
  Built with ❤️ for the Canton Network ecosystem
</p>
