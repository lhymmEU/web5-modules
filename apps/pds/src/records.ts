import { AtpAgent } from "web5-api";
import type { UnsignedCommit } from "@atproto/repo";
import { CID } from "multiformats";
import { TID } from '@atproto/common-web';
import * as cbor from "@ipld/dag-cbor";
import { KeystoreClient } from "keystore/KeystoreClient";
import { hexFrom } from "@web5-modules/utils";

export type userProfile = {
  uri: string;
  cid: string;
  value: Record<string, any>;
};

export async function fetchUserProfile(did: string, pdsAPIUrl: string): Promise<userProfile | null> {
  try {
    const url = new URL(`https://${pdsAPIUrl}/xrpc/com.atproto.repo.getRecord`);
    url.searchParams.append('repo', did);
    url.searchParams.append('collection', 'app.actor.profile');
    url.searchParams.append('rkey', 'self');

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });

    if (!response.ok) {
      console.error(`Failed to fetch profile: ${response.status} ${response.statusText}`);
      return null;
    }
    return await response.json() as userProfile;
  } catch (e) {
    console.error('fetchUserProfile error:', e);
    return null;
  }
}

export type RecordType = {
  $type: string;
  [key: string]: unknown;
};

export async function writePDS(
  agent: AtpAgent, accessJwt: string, didKey: string, keyStoreClient: KeystoreClient,
  params: { record: RecordType; did: string; rkey: string; type?: 'update' | 'create' | 'delete' },
): Promise<boolean | null> {
  try {
    const operateType = params.type || 'create';
    agent.setHeader('Authorization', `Bearer ${accessJwt}`);

    const rkey = params.rkey || TID.next().toString();
    const newRecord = { created: new Date().toISOString(), ...params.record };

    const preWriteTypeMap = {
      create: "fans.web5.ckb.preDirectWrites#create" as const,
      update: "fans.web5.ckb.preDirectWrites#update" as const,
      delete: "fans.web5.ckb.preDirectWrites#delete" as const,
    };

    const preWriteRes = await agent.fans.web5.ckb.preDirectWrites({
      repo: params.did,
      writes: [{ $type: preWriteTypeMap[operateType], collection: newRecord.$type, rkey, value: newRecord }],
      validate: false,
    });

    const preWriterData = preWriteRes.data;
    const uncommit: UnsignedCommit = {
      did: preWriterData.did,
      version: 3,
      rev: preWriterData.rev,
      prev: preWriterData.prev ? CID.parse(preWriterData.prev) : null,
      data: CID.parse(preWriterData.data),
    };

    const unSignBytes = cbor.encode(uncommit);
    const unSignBytesHex = hexFrom(unSignBytes).slice(2);
    if (unSignBytesHex !== preWriterData.unSignBytes) {
      console.error('sign bytes not consistent', unSignBytesHex, preWriterData.unSignBytes);
      return null;
    }

    const sig = await keyStoreClient.signMessage(unSignBytes);

    const writeTypeMap = {
      create: "fans.web5.ckb.directWrites#create" as const,
      update: "fans.web5.ckb.directWrites#update" as const,
      delete: "fans.web5.ckb.directWrites#delete" as const,
    };

    const writeRes = await agent.fans.web5.ckb.directWrites({
      repo: params.did,
      validate: false,
      signingKey: didKey,
      writes: [{ $type: writeTypeMap[operateType], collection: newRecord.$type, rkey: params.rkey, value: newRecord }],
      root: {
        did: preWriterData.did,
        version: 3,
        rev: preWriterData.rev,
        prev: preWriterData.prev,
        data: preWriterData.data,
        signedBytes: hexFrom(sig),
      },
    });

    return writeRes.success;
  } catch (err: unknown) {
    console.error(err);
    return null;
  }
}

export type RepoInfo = {
  handle: string;
  did: string;
  didDoc: {
    verificationMethods: Record<string, string>;
    alsoKnownAs: string[];
    services: Record<string, { type: string; endpoint: string }>;
  };
  collections: string[];
  handleIsCorrect: boolean;
};

export async function fetchRepoInfo(did: string, pdsAPIUrl: string): Promise<RepoInfo | null> {
  try {
    const url = new URL(`https://${pdsAPIUrl}/xrpc/com.atproto.repo.describeRepo`);
    url.searchParams.append('repo', did);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });

    if (!response.ok) {
      console.error(`Failed to fetch repo info: ${response.status} ${response.statusText}`);
      return null;
    }
    return await response.json();
  } catch (e) {
    console.error('fetchRepoInfo error:', e);
    return null;
  }
}

export type RepoRecords = {
  cursor?: string;
  records: { uri: string; cid: string; value: Record<string, unknown> }[];
};

export async function fetchRepoRecords(
  did: string, collection: string, pdsAPIUrl: string, limit?: number, cursor?: string,
): Promise<RepoRecords | null> {
  try {
    const url = new URL(`https://${pdsAPIUrl}/xrpc/com.atproto.repo.listRecords`);
    url.searchParams.append('repo', did);
    url.searchParams.append('collection', collection);
    url.searchParams.append('limit', limit?.toString() || '10');
    if (cursor) url.searchParams.append('cursor', cursor);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });

    if (!response.ok) {
      console.error(`Failed to fetch repo records: ${response.status} ${response.statusText}`);
      return null;
    }
    return await response.json();
  } catch (e) {
    console.error('fetchRepoRecords error:', e);
    return null;
  }
}
