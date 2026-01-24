import { AtpAgent, FansWeb5CkbDirectWrites, FansWeb5CkbIndexAction, FansWeb5CkbPreCreateAccount, FansWeb5CkbPreDirectWrites } from "web5-api";
import type { UnsignedCommit } from "@atproto/repo";
import { CID } from "multiformats";
import { TID } from '@atproto/common-web'
import * as cbor from "@ipld/dag-cbor";
import { bytesFrom, bytesTo, hexFrom } from "@ckb-ccc/connector-react";
import type { KeystoreClient } from "./KeystoreClient";

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


export type userInfo = {
    accessJwt: string;
    refreshJwt: string;
    handle: string;
    /** The DID of the new account. */
    did: string;
}

export async function pdsCreateAccount(agent: AtpAgent, pdsAPIUrl: string, username: string, didKey: string, did: string, ckbAddr: string, keyStoreClient: KeystoreClient): Promise<userInfo | null> {
  try {
    // username in handle is lowercase
    const handle = `${username.toLowerCase()}.${pdsAPIUrl}`;
    const res = await agent.fans.web5.ckb.preCreateAccount({
      handle,
      signingKey: didKey,
      did,
    })
    if (res.success) {
      const uncommit: UnsignedCommit = {
        did: res.data.did,
        version: 3,
        rev: res.data.rev,
        prev: null, // added for backwards compatibility with v2
        data: CID.parse(res.data.data),
      }

      const encoded = cbor.encode(uncommit)
      // remove 0x prefix
      const unSignBytesHex = hexFrom(encoded).slice(2);
      if (unSignBytesHex !== res.data.unSignBytes) {
        console.error('sign bytes not consistent', unSignBytesHex, res.data.unSignBytes);
        return null;
      }

      // sign the encoded data
      const sig = await keyStoreClient.signMessage(encoded);
      if (!sig) {
        console.error('sign failed');
        return null;
      }

      const params = {
        handle,
        password: "", // unused
        signingKey: didKey,
        ckbAddr,
        root: {
          did: res.data.did,
          version: 3,
          rev: res.data.rev,  
          prev: res.data.prev,
          data: res.data.data,
          signedBytes: hexFrom(sig),
        },
      }

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
    } else {
      console.error('pre create account failed', res);
      return null;
    }
  } catch (e: unknown) {
    console.error(e);
    return null;
  }
}


export async function pdsDeleteAccount(agent: AtpAgent, did: string, ckbAddr: string, didKey: string, keyStoreClient: KeystoreClient): Promise<boolean | null> {
  try {
    // pre delete account
    const preDelectIndex = {
      $type: 'fans.web5.ckb.preIndexAction#deleteAccount' as const,
    }
  
    const preDelete = await agent.fans.web5.ckb.preIndexAction({
      did,
      ckbAddr,
      index: preDelectIndex,
    })
    console.log('pre delete account params', preDelete);
    const deleteMessage = bytesFrom(preDelete.data.message, 'utf8');
  
    // sign the delete message
    const sig = await keyStoreClient.signMessage(deleteMessage);
    if (!sig) {
      console.error('sign failed');
      return null;
    }

    // delete account
    const deleteIndex = {
      $type: 'fans.web5.ckb.indexAction#deleteAccount' as const,
    }

    const deleteInfo = await agent.fans.web5.ckb.indexAction({
      did,
      message: preDelete.data.message,
      signingKey: didKey,
      signedBytes: hexFrom(sig),
      ckbAddr,
      index: deleteIndex,
    })
    if (deleteInfo.success) {
      return true;
    } else {
      console.error('delete account failed', deleteInfo);
      return false;
    }
  } catch (e: unknown) {
    console.error(e);
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

export async function pdsLogin(agent: AtpAgent, did: string, didKey: string, ckbAddr: string, keyStoreClient: KeystoreClient): Promise<sessionInfo | null> {
  const preLoginIndex = {
    $type: 'fans.web5.ckb.preIndexAction#createSession' as const,
  }

  const loginIndex = {
    $type: 'fans.web5.ckb.indexAction#createSession' as const,
  }

  try {
    const preLogin = await agent.fans.web5.ckb.preIndexAction({
      did,
      ckbAddr,
      index: preLoginIndex,
    })
    const preLoginMessage = bytesFrom(preLogin.data.message, 'utf8');

    const sig = await keyStoreClient.signMessage(preLoginMessage);
    if (!sig) {
      console.error('sign failed');
      return null;
    }

    const loginInfo = await agent.web5Login({
      did,
      message: preLogin.data.message,
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

export async function writePDS(agent: AtpAgent, accessJwt: string, didKey: string, keyStoreClient: KeystoreClient, params: {
  record: PostRecordType
  did: string
  rkey: string
  type?: 'update' | 'create'
}): Promise<boolean | null> {
  try {
    const operateType = params.type || 'create'
    agent.setHeader('Authorization', `Bearer ${accessJwt}`);

    const rkey = params.rkey || TID.next().toString()

    const newRecord = {
      created: new Date().toISOString(),
      ...params.record,
    }

    const preWriteTypeMap = {
      create: "fans.web5.ckb.preDirectWrites#create" as const,
      update: "fans.web5.ckb.preDirectWrites#update" as const,
    }

    const preWriteRes = await agent.fans.web5.ckb.preDirectWrites({
      repo: params.did,
      writes: [{
        $type: preWriteTypeMap[operateType],
        collection: newRecord.$type,
        rkey,
        value: newRecord
      }],
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
    const unSignBytes = cbor.encode(uncommit)
    // remove 0x prefix
    const unSignBytesHex = hexFrom(unSignBytes).slice(2);
    if (unSignBytesHex !== preWriterData.unSignBytes) {
      console.error('sign bytes not consistent', unSignBytesHex, preWriterData.unSignBytes)
      return null;
    }

    const sig = await keyStoreClient.signMessage(unSignBytes);

    const writeTypeMap = {
      create: "fans.web5.ckb.directWrites#create" as const,
      update: "fans.web5.ckb.directWrites#update" as const,
      delete: "fans.web5.ckb.directWrites#delete" as const,
    }

    const writeRes = await agent.fans.web5.ckb.directWrites({
      repo: params.did,
      validate: false,
      signingKey: didKey,
      writes: [{
        $type: writeTypeMap[operateType],
        collection: newRecord.$type,
        rkey: params.rkey,
        value: newRecord
      }],
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
