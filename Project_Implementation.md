# Project Implementation: C-Gate (Canton Network Extension Wallet)

## 1. Project Overview
A Chrome Extension wallet for Canton Network, enabling users to manage private keys, sign Daml commands, and interact with decentralized applications (DApps) via an injected provider.

## 2. Tech Stack
- **Framework**: React + Vite + TypeScript (Antigravity optimized)
- **Manifest**: Chrome Extension Manifest V3
- **Canton SDKs**: 
    - `@canton-network/wallet-sdk` (Core interaction)
    - `@canton-network/ledger-api` (Command submission)
- **Cryptography**: `@noble/ed25519` or `ethers` for BIP-39/44 support.
- **Styling**: Tailwind CSS + Shadcn UI (for a sleek web3 look)

## 3. Project Structure
/src
  /apps
    /popup         # Wallet UI (Main interface)
    /options       # Settings (Node config, backup)
  /core
    /crypto        # Key derivation & Vault (AES encryption)
    /ledger        # Daml command preparation & signing logic
  /extension
    /background    # Service worker (State management, secure storage)
    /content       # Script to inject provider
    /injected      # window.canton provider implementation
  /ui              # Reusable components

## 4. Key Implementation Tasks

### Task 1: Secure Vault & Keyring
- Implement BIP-39 mnemonic generation.
- Implement Ed25519 key derivation.
- Securely store encrypted private keys in `chrome.storage.local` using a user-defined password.

### Task 2: Provider Injection (CIP-103)
- Create an `injected.ts` script that defines `window.canton`.
- Implement a message passing bridge: `Injected -> Content Script -> Background -> Popup`.
- Methods to implement:
    - `canton_requestAccounts`: Triggers popup for permission.
    - `canton_signAndSubmit`: Receives Daml command hash, signs locally, and returns submission result.

### Task 3: External Signing Workflow
- Integrate `@canton-network/wallet-sdk`.
- Workflow:
    1. Receive `command` from DApp.
    2. Call Participant Node's `Prepare` API to get the transaction hash.
    3. Display the "Transaction Confirmation" UI in the popup.
    4. Upon user approval, sign the hash using the local private key.
    5. Submit the signature to the node's `Submit` API.

### Task 4: Asset & Contract Viewer
- Implement a fetcher for CIP-56 compliant tokens.
- Query Active Contract Set (ACS) via the JSON API to display user holdings.

## 5. Implementation Roadmap (for Antigravity)

1. **Step 1: Scaffolding**
   - Initialize Vite + React + Manifest V3 structure.
   - Set up Tailwind CSS and basic UI routing.

2. **Step 2: Key Management**
   - Create the `CryptoService` for mnemonic and keypair handling.

3. **Step 3: Background Service Worker**
   - Implement the listener for DApp requests.
   - Manage the state (Unlocked/Locked, Current Account, Node URL).

4. **Step 4: Provider & Content Script**
   - Inject `window.canton` and handle the handshake with DApps.

5. **Step 5: Transaction UI**
   - Build the "Confirm Transaction" screen with Daml template visualization.

## 6. Critical Constraints
- **Privacy**: Never expose private keys to the content script.
- **Protocol**: Ensure all signing uses the correct Canton `HashPurpose` prefixes.
- **Compatibility**: Adhere to EIP-6963 for multiple wallet coexistence.