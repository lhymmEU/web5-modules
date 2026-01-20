import { AtpAgent, FansWeb5CkbPreCreateAccount } from "web5-api";
import type { UnsignedCommit } from "@atproto/repo";
import { CID } from "multiformats";
import * as cbor from "@ipld/dag-cbor";
import { bytesFrom, hexFrom } from "@ckb-ccc/connector-react";

export function checkUsernameFormat(username: string): boolean {
  // username will be domain so it must follow the rules of domain name
  // it must start with a lowercase letter
  // it can only contain lowercase letters, numbers, and hyphens
  // it must end with a lowercase letter or number
  // it must be between 4 and 18 characters long
  if (username.length < 4 || username.length > 18) {
    return false;
  }
  const usernameRegex = /^[a-z][a-z0-9-]*[a-z0-9]$/;
  return usernameRegex.test(username);
}

export async function checkUsernameAvailability(username: string, pdsAPIUrl: string): Promise<boolean | null> {
  try {
    const handle = `${username.toLowerCase()}.${pdsAPIUrl}`;
    const url = `https://${handle}/.well-known/atproto-did`;
    const response = await fetch(url);
    const text = await response.text();
    
    if (text.trim().startsWith('did:ckb')) {
      return false;
    } else if (text.includes('User not found')) {
      return true;
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

export interface userInfo {
    accessJwt: string;
    refreshJwt: string;
    handle: string;
    /** The DID of the new account. */
    did: string;
    /** Complete DID Metadata. */
    didMetadata: string;
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

  console.log('create account params', params);

  const agent = new AtpAgent({ service: `https://${pdsAPIUrl}` });
  const createRes = await agent.web5CreateAccount(params)
  if (createRes.success) {
    // add didMetadata to userInfo
    const userInfo: userInfo = {
      accessJwt: createRes.data.accessJwt,
      refreshJwt: createRes.data.refreshJwt,
      handle: createRes.data.handle,
      did: createRes.data.did,
      didMetadata: createRes.data.didDoc?.toString() ?? '',
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
      $type: 'fans.web5.ckb.preIndexAction#deleteAccount',
    }
  
    const preDelete = await agent.fans.web5.ckb.preIndexAction({
      did,
      ckbAddr,
      index: preDelectIndex,
    })
  
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
      $type: 'fans.web5.ckb.indexAction#deleteAccount',
    }

    const deleteInfo = await agent.fans.web5.ckb.indexAction({
      did,
      message: hexFrom(deleteMessage),
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