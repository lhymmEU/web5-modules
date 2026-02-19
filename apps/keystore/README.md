# @web5-modules/keystore

A **secure key management module** with a sandboxed Web UI. It runs in an isolated iframe and communicates with the host via a postMessage bridge, ensuring private keys never leave the iframe context.

## Architecture role

- **Type:** Module Federation remote + standalone Web UI
- **Port:** 3001
- **Exposes:** `./KeystoreClient`, `./constants`

## Two entry points

| Entry | File | Purpose |
|---|---|---|
| `index.html` | Main keystore UI | Full key management interface (wallet) |
| `bridge.html` | Postage bridge | Embedded in host via `<iframe>` for secure signing |

## Exported API

### `KeystoreClient` (`./KeystoreClient`)

Client class consumed by the host app. Sends requests to the keystore iframe bridge via postMessage:

- `requestSign(data)` — request a signature from the sandboxed keystore
- `requestPublicKey()` — get the active public key

### `constants` (`./constants`)

Shared configuration values (iframe URLs, message types).

## Key source files

```
src/
  KeystoreClient.ts     Module Federation export — host-side bridge client
  bridge.ts             Iframe-side postMessage handler
  constants.ts          Module Federation export — shared config constants
  components/
    KeyStore.tsx         Main keystore UI component
    Signer.tsx           Signing request UI
    WhitelistSettings.tsx Allowed origins management
  utils/
    crypto.ts            Key generation, signing, encryption utilities
    storage.ts           LocalStorage key management
```

## Development

```bash
pnpm dev       # start dev server on port 3001
pnpm build     # type-check + build (outputs both index + bridge entry points)
pnpm preview   # preview production build
pnpm lint      # run ESLint
```
