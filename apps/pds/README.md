# @web5-modules/pds

A **Module Federation remote** that wraps ATProto Personal Data Server (PDS) operations. It exposes logic for account management, record read/write, and repository operations on an AT Protocol PDS.

## Architecture role

- **Type:** Module Federation remote (logic only, no UI)
- **Port:** 3003
- **Exposes:** `./logic`, `./constants`
- **Consumes remote:** `keystore` (for signing via iframe bridge)

## Exported API

### `./logic` (`src/logic.ts`)

| Function | Description |
|---|---|
| `createAccount` | Create a new ATProto account on a PDS |
| `login` | Authenticate with an existing PDS account |
| `fetchUserProfile` | Fetch a DID's profile record |
| `fetchRepoInfo` | Get repository metadata for a DID |
| `fetchRepoRecords` | List records in a collection |
| `createRecord` | Write a new record to the repo |
| `exportRepoCar` | Export the full repo as a CAR file |
| `importRepoCar` | Import a CAR file into the repo |

### `./constants` (`src/constants.ts`)

List of available public PDS endpoints.

## Shared dependencies

- `web5-api` — shared with the host via Module Federation

## Development

```bash
pnpm dev       # start dev server on port 3003
pnpm build     # type-check + build (outputs remoteEntry.js)
pnpm preview   # preview production build
pnpm lint      # run ESLint
```
