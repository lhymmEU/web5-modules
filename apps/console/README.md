# @web5-modules/console

The **host application** and demo UI for the Web5 Modules monorepo. It consumes the three remote modules (`did`, `keystore`, `pds`) via Vite Module Federation and provides a unified interface for identity management, key management, and Personal Data Server interactions.

## Architecture role

- **Type:** Module Federation host
- **Port:** 3000
- **Consumes remotes:** `did_module` (3002), `keystore` (3001), `pds_module` (3003)

## Pages

| Page | Description |
|---|---|
| Overview | Landing dashboard |
| Identity | DID creation and management via did_module |
| Explorer | Browse ATProto repo records |
| Feed | Firehose feed viewer |
| Playground | Interactive API playground |

## Key directories

```
src/
  components/   UI components (DidManager, KeyManager, PdsManager, etc.)
  contexts/     React contexts (KeystoreContext, PdsContext)
  hooks/        Custom hooks (use-async-action, use-ckb-wallet, use-mobile)
  pages/        Page-level route components
  types/        Shared TypeScript types
  lib/utils.ts  Tailwind class utility (cn)
```

## Environment variables

Copy `.env.example` to `.env` and configure remote module URLs for non-localhost deployments:

```
VITE_DID_MODULE_URL=http://localhost:3002/assets/remoteEntry.js
VITE_PDS_MODULE_URL=http://localhost:3003/assets/remoteEntry.js
VITE_KEYSTORE_MODULE_URL=http://localhost:3001/assets/remoteEntry.js
```

## Development

```bash
pnpm dev       # start dev server on port 3000
pnpm build     # type-check + build
pnpm preview   # preview production build
pnpm lint      # run ESLint
```
