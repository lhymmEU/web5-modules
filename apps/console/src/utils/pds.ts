import { AtpAgent, FansWeb5CkbDirectWrites, FansWeb5CkbIndexAction, FansWeb5CkbPreCreateAccount, FansWeb5CkbPreDirectWrites } from "web5-api";
import type { UnsignedCommit } from "@atproto/repo";
import { CID } from "multiformats";
import { TID } from '@atproto/common-web'
import * as cbor from "@ipld/dag-cbor";
import { bytesFrom, bytesTo, hexFrom } from "@ckb-ccc/connector-react";

export function checkUsernameFormat(username: string): boolean {
  // username will be domain so it must follow the rules of domain name
  // it must start with a letter
  // it can only contain letters, numbers, and hyphens
  // it must end with a letter or number
  // it must be between 4 and 18 characters long
  if (username.length < 4 || username.length > 18) {
    return false;
  }
  const usernameRegex = /^[a-zA-Z][a-zA-Z0-9-]*[a-zA-Z0-9]$/;
  return usernameRegex.test(username);
}

export async function getDidByUsername(username: string, pdsAPIUrl: string): Promise<string | null> {
  try {
    // username in pds is lowercase
    const handle = `${username.toLowerCase()}.${pdsAPIUrl}`;
    const url = `https://${handle}/.well-known/atproto-did`;
    const response = await fetch(url);
    const text = await response.text();
    
    if (text.trim().startsWith('did:ckb')) {
      return text.trim();
    } else if (text.includes('User not found')) {
      return '';
    } else {
      return null;
    }
  } catch (e: unknown) {
    console.error(e);
    return null;
  }
}

export async function pdsPreCreateAccount(username: string, pdsAPIUrl: string, didKey: string, did: string): Promise<FansWeb5CkbPreCreateAccount.OutputSchema | null> {
  try {
    const agent = new AtpAgent({ service: `https://${pdsAPIUrl}` });
    // username in pds is lowercase
    const handle = `${username.toLowerCase()}.${pdsAPIUrl}`;
    const res = await agent.fans.web5.ckb.preCreateAccount({
      handle,
      signingKey: didKey,
      did,
    })
    if (res.success) {
      return res.data;
    } else {
      return null;
    }
  } catch (e: unknown) {
    console.error(e);
    return null;
  }
} 

export function buildPreCreateSignData(preCreateResult: FansWeb5CkbPreCreateAccount.OutputSchema) : Uint8Array | null {
  const uncommit: UnsignedCommit = {
    did: preCreateResult.did,
    version: 3,
    rev: preCreateResult.rev,
    prev: null, // added for backwards compatibility with v2
    data: CID.parse(preCreateResult.data),
  }

  const encoded = cbor.encode(uncommit)
  // remove 0x prefix
  const unSignBytesHex = hexFrom(encoded).slice(2);
  if (unSignBytesHex !== preCreateResult.unSignBytes) {
    console.error('sign bytes not consistent', unSignBytesHex, preCreateResult.unSignBytes);
    return null;
  }
  return encoded;
  // const sig = await keyPair.sign(encoded)
}

export type userInfo = {
    accessJwt: string;
    refreshJwt: string;
    handle: string;
    /** The DID of the new account. */
    did: string;
}

export async function pdsCreateAccount(preCreateResult: FansWeb5CkbPreCreateAccount.OutputSchema, sig: Uint8Array, username: string, pdsAPIUrl: string, didKey: string, ckbAddr: string) : Promise<userInfo | null> {
  const handle = `${username.toLowerCase()}.${pdsAPIUrl}`;
  
  const params = {
    handle,
    password: "", // unused
    signingKey: didKey,
    ckbAddr,
    root: {
      did: preCreateResult.did,
      version: 3,
      rev: preCreateResult.rev,
      prev: preCreateResult.prev,
      data: preCreateResult.data,
      signedBytes: hexFrom(sig),
    },
  }

  const agent = new AtpAgent({ service: `https://${pdsAPIUrl}` });
  const createRes = await agent.web5CreateAccount(params)
  if (createRes.success) {
    // add didMetadata to userInfo
    const userInfo: userInfo = {
      accessJwt: createRes.data.accessJwt,
      refreshJwt: createRes.data.refreshJwt,
      handle: createRes.data.handle,
      did: createRes.data.did
    }
    return userInfo;
  } else {
    console.error('create account failed', createRes);
    return null;
  }
}


export async function pdsPreDeleteAccount(did: string, ckbAddr: string, pdsAPIUrl: string): Promise<Uint8Array | null> {
  try {
    const agent = new AtpAgent({ service: `https://${pdsAPIUrl}` });
    const preDelectIndex = {
      $type: 'fans.web5.ckb.preIndexAction#deleteAccount' as const,
    }
  
    const preDelete = await agent.fans.web5.ckb.preIndexAction({
      did,
      ckbAddr,
      index: preDelectIndex,
    })
    console.log('pre delete account params', preDelete);
    return bytesFrom(preDelete.data.message, 'utf8');
  } catch (e: unknown) {
    console.error(e);
    return null;
  }
}

export async function pdsDeleteAccount(did: string, ckbAddr: string, didKey: string, pdsAPIUrl: string, deleteMessage: Uint8Array, sig: Uint8Array): Promise<boolean | null> {
  try {
    const agent = new AtpAgent({ service: `https://${pdsAPIUrl}` });
    const deleteIndex = {
      $type: 'fans.web5.ckb.indexAction#deleteAccount' as const,
    }

    const deleteMessageStr = bytesTo(deleteMessage, 'utf8');
    console.log('delete message str', deleteMessageStr);
    const deleteInfo = await agent.fans.web5.ckb.indexAction({
      did,
      message: deleteMessageStr,
      signingKey: didKey,
      signedBytes: hexFrom(sig),
      ckbAddr,
      index: deleteIndex,
    })
    if (deleteInfo.success) {
      return true;
    } else {
      return false;
    }
  } catch (e: unknown) {
    console.error(e);
    return null;
  }
}

export async function pdsPreLogin(did: string, pdsAPIUrl: string, ckbAddr: string): Promise<Uint8Array | null> {
  const preLoginIndex = {
    $type: 'fans.web5.ckb.preIndexAction#createSession' as const,
  }

  try {
    const agent = new AtpAgent({ service: `https://${pdsAPIUrl}` });
    const preLogin = await agent.fans.web5.ckb.preIndexAction({
      did,
      ckbAddr,
      index: preLoginIndex,
    })
    return bytesFrom(preLogin.data.message, 'utf8');
  } catch (err: unknown) {
    console.error(err);
    return null;
  }
}

export type sessionInfo = {
  accessJwt: string;
  refreshJwt: string;
  handle: string;
  did: string;
  didMetadata: string;
}

export async function pdsLogin(did: string, pdsAPIUrl: string, didKey: string, ckbAddr: string, preLoginMessage: Uint8Array, sig: Uint8Array): Promise<sessionInfo | null> {
  const loginIndex = {
    $type: 'fans.web5.ckb.indexAction#createSession' as const,
  }

  try {
    const agent = new AtpAgent({ service: `https://${pdsAPIUrl}` });

    const loginInfo = await agent.web5Login({
      did,
      message: bytesTo(preLoginMessage, 'utf8'),
      signingKey: didKey,
      signedBytes: hexFrom(sig),
      ckbAddr,
      index: loginIndex,
    })
    if (loginInfo.success) {
      const loginInfoData = loginInfo.data.result as FansWeb5CkbIndexAction.CreateSessionResult
      const sessionInfo: sessionInfo = {
        accessJwt: loginInfoData.accessJwt,
        refreshJwt: loginInfoData.refreshJwt,
        handle: loginInfoData.handle,
        did: loginInfoData.did,
        didMetadata: JSON.stringify(loginInfoData.didDoc),
      }
      return sessionInfo;
    } else {
      return null;
    }
  } catch (err: unknown) {
    console.error(err);
    return null;
  }
}

export async function fetchUserProfile(did: string, pdsAPIUrl: string): Promise<string | null> {
  try {
    const url = new URL(`https://${pdsAPIUrl}/xrpc/com.atproto.repo.getRecord`);
    url.searchParams.append('repo', did);
    url.searchParams.append('collection', 'app.actor.profile');
    url.searchParams.append('rkey', 'self');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json; charset=utf-8',
    };

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      console.error(`Failed to fetch profile: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    const profile = JSON.stringify(data);
    console.log('user profile data', profile);
    return profile;
  } catch (e) {
    console.error('fetchUserProfile error:', e);
    return null;
  }
}

type PostRecordType = {
  $type: 'app.actor.profile'
  displayName: string;
  handle: string;
  [key: string]: string | number | boolean | null | undefined;
};

export async function preWritePDS(pdsAPIUrl: string, accessJwt: string, params: {
  record: PostRecordType
  did: string
  rkey?: string
  type?: 'update' | 'create'
}): Promise<{writerData: FansWeb5CkbPreDirectWrites.OutputSchema, rkey: string, newRecord: PostRecordType} | null> {
  try {
    const operateType = params.type || 'create'
    const agent = new AtpAgent({ service: `https://${pdsAPIUrl}` });
    agent.api.xrpc.setHeader('Authorization', `Bearer ${accessJwt}`);

    const rkey = params.rkey || TID.next().toString()

    const newRecord = {
      created: new Date().toISOString(),
      ...params.record,
    }

    const $typeMap = {
      create: "fans.web5.ckb.preDirectWrites#create" as const,
      update: "fans.web5.ckb.preDirectWrites#update" as const,
    }

    const writeRes = await agent.fans.web5.ckb.preDirectWrites({
      repo: params.did,
      writes: [{
        $type: $typeMap[operateType],
        collection: newRecord.$type,
        rkey,
        value: newRecord
      }],
      validate: false,
    });

    const writerData = writeRes.data

    return {writerData, rkey, newRecord};
    
  } catch (err: unknown) {
    console.error(err);
    return null;
  }
}

export function buildWriteSignData(writerData: FansWeb5CkbPreDirectWrites.OutputSchema): Uint8Array | null {
  const uncommit: UnsignedCommit = {
    did: writerData.did,
    version: 3,
    rev: writerData.rev,
    prev: writerData.prev ? CID.parse(writerData.prev) : null,
    data: CID.parse(writerData.data),
  };
  const unSignBytes = cbor.encode(uncommit)
  // remove 0x prefix
  const unSignBytesHex = hexFrom(unSignBytes).slice(2);
  if (unSignBytesHex !== writerData.unSignBytes) {
    console.error('sign bytes not consistent', unSignBytesHex, writerData.unSignBytes)
    return null;
  }
  return unSignBytes;
  // const sig = await keyPair.sign(unSignBytes)
}

export async function writePDS(pdsAPIUrl: string, accessJwt: string, didKey: string, writerData: FansWeb5CkbPreDirectWrites.OutputSchema, newRecord: PostRecordType, sig: Uint8Array, params: {
  record: PostRecordType
  did: string
  rkey: string
  type?: 'update' | 'create'
}): Promise<FansWeb5CkbDirectWrites.OutputSchema | null> {
  try {
    const agent = new AtpAgent({ service: `https://${pdsAPIUrl}` });
    agent.api.xrpc.setHeader('Authorization', `Bearer ${accessJwt}`);

    const $typeMap = {
      create: "fans.web5.ckb.directWrites#create" as const,
      update: "fans.web5.ckb.directWrites#update" as const,
      delete: "fans.web5.ckb.directWrites#delete" as const,
    }
    const operateType = params.type || 'create'

    const writeRes = await agent.fans.web5.ckb.directWrites({
      repo: params.did,
      validate: false,
      signingKey: didKey,
      writes: [{
        $type: $typeMap[operateType],
        collection: newRecord.$type,
        rkey: params.rkey,
        value: newRecord
      }],
      root: {
        did: writerData.did,
        version: 3,
        rev: writerData.rev,
        prev: writerData.prev,
        data: writerData.data,
        signedBytes: hexFrom(sig),
    },
    });

    return writeRes.data;
  } catch (err: unknown) {
    console.error(err);
    return null;
  }
}
