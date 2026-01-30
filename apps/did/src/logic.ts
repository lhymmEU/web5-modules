import { ccc, Transaction } from "@ckb-ccc/ccc";
import { base32 } from "@scure/base";

export const name = 'DID Module';

export async function buildCreateTransaction(
  signer: ccc.Signer,
  metadata: string
): Promise<{
  rawTx: string;
  did: string;
}> {
  try {
    const address = await signer.getRecommendedAddressObj();
    const metadataObj = JSON.parse(metadata);
    const { tx, id } = await ccc.didCkb.createDidCkb({
      signer,
      data: { value: { document: metadataObj} },
      receiver: address.script,
    });

    await tx.completeInputsByCapacity(signer);
    await tx.completeFeeBy(signer);

    const rawTx = ccc.stringify(tx);

    const args = ccc.bytesFrom(id);
    const did = `did:ckb:${base32.encode(args).toLowerCase()}`;
    
    return {
      rawTx,
      did
    };
  } catch (error) {
    console.error('Error building create transaction:', error);
    return {
      rawTx: '',
      did: '',
    };
  }
}

export async function sendCkbTransaction(signer: ccc.Signer, tx: Transaction): Promise<string> {
  try {
    const txHash = await signer.sendTransaction(tx);
    return txHash;
  } catch (error) {
    console.error('Error sending transaction:', error);
    return '';
  }
}

export interface didCkbCellInfo {
  txHash: string;
  index: number;
  args: string;
  capacity: string;
  did: string;
  didMetadata: string;
}

export async function fetchDidCkbCellsInfo(
  signer: ccc.Signer
): Promise<Array<didCkbCellInfo>> {
  try {
    const didScriptInfo = await signer.client.getKnownScript(ccc.KnownScript.DidCkb);
    const didCodeHash = didScriptInfo?.codeHash;
    if (!didCodeHash) throw new Error('DidCkb script codeHash not found');
    const cells = await signer.findCells({
      script: {
        codeHash: didCodeHash,
        hashType: 'type',
        args: "0x",
      },
    }, true, 'desc', 10);
    const result: Array<didCkbCellInfo> = [];
    for await (const cell of cells) {
      const txHash = cell.outPoint.txHash;
      const index = Number(cell.outPoint.index);
      try {
        const data = cell.outputData ?? '0x';
        const didData = ccc.didCkb.DidCkbData.decode(data);
        const didDoc = didData.value.document;      
        const didMetadata = JSON.stringify(didDoc);
        if (!cell.cellOutput.type) throw new Error('cell.cellOutput.type is undefined');
        const args = ccc.bytesFrom(cell.cellOutput.type.args.slice(0, 42)); // 20 bytes Type args
        const did = `did:ckb:${base32.encode(args).toLowerCase()}`;
        result.push({
          txHash,
          index,
          capacity: ccc.fixedPointToString(cell.cellOutput.capacity),
          args: cell.cellOutput.type.args,
          did,
          didMetadata,
        });
      } catch (error) {
        console.error(`Error processing cell ${txHash}:${index}:`, error);
      }
    }
    return result;
  } catch (error) {
    console.error('Error fetching did:ckb cells info:', error);
    return [];
  }
}


export async function destroyDidCell(
  signer: ccc.Signer,
  args: string
): Promise<string> {
  try {
    const { tx: destroyDidTx } = await ccc.didCkb.destroyDidCkb({ client: signer.client, id: args });
    await destroyDidTx.completeInputsByCapacity(signer);
    await destroyDidTx.completeFeeBy(signer);
    const sent = await signer.sendTransaction(destroyDidTx);
    return sent;
  } catch (error) {
    console.error('Error destroying did:ckb cell:', error);
    return '';
  }
}

export async function updateDidKey(
  signer: ccc.Signer,
  args: string,
  newDidKey: string
): Promise<string> {
  try {
    const address = await signer.getRecommendedAddressObj();
    const { tx: updateDidTx } = await ccc.didCkb.transferDidCkb({
      client: signer.client,
      id: args,
      receiver: address.script,
      data: (_, data?: ccc.didCkb.DidCkbData) => {
        if (!data) throw new Error('data is undefined');
        (data.value.document as { verificationMethods: { atproto?: string } }).verificationMethods.atproto = newDidKey;
        return data;
      },
    });
    await updateDidTx.completeInputsByCapacity(signer);
    await updateDidTx.completeFeeBy(signer);
    const sent = await signer.sendTransaction(updateDidTx);
    return sent;
  } catch (error) {
    console.error('Error updating did:ckb key:', error);
    return '';
  }
}

// update AKA and serviceEndpoint
// handle like: david.web5.bbsfans.dev
export async function updateHandle(
  signer: ccc.Signer,
  args: string,
  handle: string
): Promise<string> {
  try {
    const address = await signer.getRecommendedAddressObj();
    // serviceEndpoint like: https://web5.bbsfans.dev for handle is david.web5.bbsfans.dev
    const parts = handle.split('.');
    const pdsHost = parts.slice(1).join('.');
    const serviceEndpoint = `https://${pdsHost}`;
    const { tx: updateHandleTx } = await ccc.didCkb.transferDidCkb({
      client: signer.client,
      id: args,
      receiver: address.script,
      data: (_, data?: ccc.didCkb.DidCkbData) => {
        if (!data) throw new Error('data is undefined');
        // aka like: ["at://david.web5.bbsfans.dev"]
        const akaObj = JSON.parse(`[ "at://${handle}" ]`);
        (data.value.document as { alsoKnownAs?: Record<string, unknown> }).alsoKnownAs = akaObj;
        const doc = data.value.document as { services?: Record<string, any> };
        if (!doc.services) doc.services = {};
        if (!doc.services.atproto_pds) doc.services.atproto_pds = {};
        (doc.services.atproto_pds as { endpoint?: string }).endpoint = serviceEndpoint;
        return data;
      },
    });
    await updateHandleTx.completeInputsByCapacity(signer);
    await updateHandleTx.completeFeeBy(signer);
    const sent = await signer.sendTransaction(updateHandleTx);
    return sent;
  } catch (error) {
    console.error('Error updating did:ckb handle:', error);
    return '';
  }
}
    
export async function transferDidCell(
  signer: ccc.Signer,
  args: string,
  receiverAddress: string
): Promise<string> {
  try {
    const receiver = await ccc.Address.fromString(receiverAddress.trim(), signer.client);
    const { tx } = await ccc.didCkb.transferDidCkb({
      client: signer.client,
      id: args,
      receiver: receiver.script,
    });
    await tx.completeInputsByCapacity(signer);
    await tx.completeFeeBy(signer);
    const sent = await signer.sendTransaction(tx);
    return sent;
  } catch (error) {
    console.error('Error transferring did:ckb cell:', error);
    return '';
  }
}
