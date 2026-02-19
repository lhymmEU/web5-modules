# @web5-modules/did

A **Module Federation remote** that implements DID operations for the `did:ckb` method. It exposes logic for creating, updating, transferring, and destroying DIDs anchored on the CKB (Nervos) blockchain.

## Architecture role

- **Type:** Module Federation remote (logic only, no UI)
- **Port:** 3002
- **Exposes:** `./logic`

## Exported API (`./logic`)

All functions are exported from `src/logic.ts`:

| Function | Description |
|---|---|
| `buildCreateTransaction` | Build a CKB transaction to create a new DID cell |
| `sendCkbTransaction` | Sign and submit a CKB transaction |
| `fetchDidCkbCellsInfo` | Fetch on-chain DID cell data for an address |
| `destroyDidCell` | Destroy an existing DID cell |
| `updateDidKey` | Update the key associated with a DID |
| `updateHandle` | Update the handle/alias of a DID |
| `transferDidCell` | Transfer a DID cell to a new owner |

## Shared dependencies

- `@ckb-ccc/ccc` — shared with the host via Module Federation to avoid duplicate instances

## Development

```bash
pnpm dev       # start dev server on port 3002
pnpm build     # type-check + build (outputs remoteEntry.js)
pnpm preview   # preview production build
pnpm lint      # run ESLint
```
