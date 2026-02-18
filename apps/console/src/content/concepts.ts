export const concepts = {
  keys: {
    title: 'Keys & Identity',
    subtitle: 'Cryptographic keys are the foundation of your digital identity in Web5.',
    description: 'In Web5, you control your identity through cryptographic key pairs. A private key lets you sign messages and prove ownership, while the public key (shared as a DID Key) lets others verify your identity. No passwords, no central authority.',
    terms: [
      { term: 'Private Key', definition: 'A secret value that only you hold. Used to sign messages and prove identity.' },
      { term: 'Public Key', definition: 'Derived from your private key. Shared openly so others can verify your signatures.' },
      { term: 'DID Key', definition: 'A decentralized identifier format (did:key:...) that encodes your public key.' },
      { term: 'Digital Signature', definition: 'A cryptographic proof that a message was created by the holder of a specific private key.' },
    ],
  },
  dids: {
    title: 'Decentralized Identifiers',
    subtitle: 'DIDs give you a portable, self-owned identity anchored on the blockchain.',
    description: 'A Decentralized Identifier (DID) is like a username that you truly own. It is registered on the CKB blockchain, making it tamper-proof and censorship-resistant. Your DID document contains your public keys, handles, and service endpoints.',
    terms: [
      { term: 'DID', definition: 'A globally unique identifier (did:ckb:...) that you own and control, stored on-chain.' },
      { term: 'DID Document', definition: 'Metadata associated with your DID: public keys, handles, and linked services.' },
      { term: 'CKB Cell', definition: 'An on-chain storage unit on Nervos CKB that holds your DID data.' },
      { term: 'Handle', definition: 'A human-readable name (like alice.pds.example.com) linked to your DID.' },
    ],
  },
  pds: {
    title: 'Personal Data Server',
    subtitle: 'Your PDS is where your data lives -- under your control.',
    description: 'A Personal Data Server (PDS) stores your data in the AT Protocol ecosystem. You register with your DID, and your data is organized into collections of records. You can export your entire repository as a CAR file and move to a different PDS at any time.',
    terms: [
      { term: 'PDS', definition: 'A server that hosts your data repositories. You choose which PDS to use.' },
      { term: 'Repository', definition: 'Your personal data store on a PDS, identified by your DID.' },
      { term: 'Collection', definition: 'A namespace for records (e.g., app.actor.profile) within your repository.' },
      { term: 'CAR File', definition: 'Content Addressable Archive -- a portable export format for your entire repository.' },
    ],
  },
  explorer: {
    title: 'Data Explorer',
    subtitle: 'Browse and inspect decentralized data repositories.',
    description: 'The explorer lets you look up any user by handle or DID and browse their public repository data. You can see what collections they have, inspect individual records, and export their repository as a CAR file.',
    terms: [
      { term: 'Record', definition: 'A single data entry in a collection, identified by a URI.' },
      { term: 'CID', definition: 'Content Identifier -- a hash-based reference to a specific version of data.' },
      { term: 'AT URI', definition: 'An address in the AT Protocol (at://did/collection/rkey) pointing to a specific record.' },
    ],
  },
  feed: {
    title: 'Live Feed',
    subtitle: 'Watch the AT Protocol network in real time.',
    description: 'The relayer firehose streams every commit event happening across the AT Protocol network. Each event represents a create, update, or delete operation on a repository. This is how data propagates across the decentralized network.',
    terms: [
      { term: 'Relayer', definition: 'A service that aggregates and re-broadcasts events from PDS instances.' },
      { term: 'Firehose', definition: 'A WebSocket stream of all commit events happening on the network.' },
      { term: 'Commit Event', definition: 'A notification that a record was created, updated, or deleted in a repository.' },
    ],
  },
} as const
