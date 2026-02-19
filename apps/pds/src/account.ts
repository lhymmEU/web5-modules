import { AtpAgent, FansWeb5CkbIndexAction } from "web5-api";
import type { UnsignedCommit } from "@atproto/repo";
import { CID } from "multiformats";
import * as cbor from "@ipld/dag-cbor";
import { KeystoreClient } from "keystore/KeystoreClient";
import { bytesFrom, hexFrom } from "@web5-modules/utils";

export type userInfo = {
  accessJwt: string;
  refreshJwt: string;
  handle: string;
  did: string;
};

export async function pdsCreateAccount(
  agent: AtpAgent, pdsAPIUrl: string, username: string,
  didKey: string, did: string, ckbAddr: string, keyStoreClient: KeystoreClient,
): Promise<userInfo | null> {
  try {
    const handle = `${username.toLowerCase()}.${pdsAPIUrl}`;
    const res = await agent.fans.web5.ckb.preCreateAccount({ handle, signingKey: didKey, did });
    if (!res.success) {
      console.error('pre create account failed', res);
      return null;
    }

    const uncommit: UnsignedCommit = {
      did: res.data.did,
      version: 3,
      rev: res.data.rev,
      prev: null,
      data: CID.parse(res.data.data),
    };

    const encoded = cbor.encode(uncommit);
    const unSignBytesHex = hexFrom(encoded).slice(2);
    if (unSignBytesHex !== res.data.unSignBytes) {
      console.error('sign bytes not consistent', unSignBytesHex, res.data.unSignBytes);
      return null;
    }

    const sig = await keyStoreClient.signMessage(encoded);
    if (!sig) {
      console.error('sign failed');
      return null;
    }

    const createRes = await agent.web5CreateAccount({
      handle,
      password: "",
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
    });

    if (!createRes.success) {
      console.error('create account failed', createRes);
      return null;
    }

    return {
      accessJwt: createRes.data.accessJwt,
      refreshJwt: createRes.data.refreshJwt,
      handle: createRes.data.handle,
      did: createRes.data.did,
    };
  } catch (e: unknown) {
    console.error(e);
    return null;
  }
}

export async function pdsDeleteAccount(
  agent: AtpAgent, did: string, ckbAddr: string, didKey: string, keyStoreClient: KeystoreClient,
): Promise<boolean | null> {
  try {
    const preDelete = await agent.fans.web5.ckb.preIndexAction({
      did, ckbAddr,
      index: { $type: 'fans.web5.ckb.preIndexAction#deleteAccount' as const },
    });
    const deleteMessage = bytesFrom(preDelete.data.message, 'utf8');

    const sig = await keyStoreClient.signMessage(deleteMessage);
    if (!sig) {
      console.error('sign failed');
      return null;
    }

    const deleteInfo = await agent.fans.web5.ckb.indexAction({
      did,
      message: preDelete.data.message,
      signingKey: didKey,
      signedBytes: hexFrom(sig),
      ckbAddr,
      index: { $type: 'fans.web5.ckb.indexAction#deleteAccount' as const },
    });

    if (!deleteInfo.success) {
      console.error('delete account failed', deleteInfo);
      return false;
    }
    return true;
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
};

export async function pdsLogin(
  agent: AtpAgent, did: string, didKey: string, ckbAddr: string, keyStoreClient: KeystoreClient,
): Promise<sessionInfo | null> {
  try {
    const preLogin = await agent.fans.web5.ckb.preIndexAction({
      did, ckbAddr,
      index: { $type: 'fans.web5.ckb.preIndexAction#createSession' as const },
    });
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
      index: { $type: 'fans.web5.ckb.indexAction#createSession' as const },
    });

    if (!loginInfo.success) return null;

    const result = loginInfo.data.result as FansWeb5CkbIndexAction.CreateSessionResult;
    return {
      accessJwt: result.accessJwt,
      refreshJwt: result.refreshJwt,
      handle: result.handle,
      did: result.did,
      didMetadata: JSON.stringify(result.didDoc),
    };
  } catch (err: unknown) {
    console.error(err);
    return null;
  }
}
