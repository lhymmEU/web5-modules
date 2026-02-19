export type RepoListEntry = {
  did: string;
  head: string;
  rev: string;
  active: boolean;
  status?: string;
};

export type RepoList = {
  cursor?: string;
  repos: RepoListEntry[];
};

export async function listRepos(
  pdsAPIUrl: string, limit?: number, cursor?: string,
): Promise<RepoList | null> {
  try {
    const url = new URL(`https://${pdsAPIUrl}/xrpc/com.atproto.sync.listRepos`);
    url.searchParams.append('limit', limit?.toString() || '10');
    if (cursor) url.searchParams.append('cursor', cursor);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });

    if (!response.ok) {
      console.error(`Failed to list repos: ${response.status} ${response.statusText}`);
      return null;
    }
    return await response.json();
  } catch (e) {
    console.error('listRepos error:', e);
    return null;
  }
}

export type RepoBlobs = {
  cursor?: string;
  cids: string[];
};

export async function fetchRepoBlobs(
  did: string, pdsAPIUrl: string, limit?: number, cursor?: string,
): Promise<RepoBlobs | null> {
  try {
    const url = new URL(`https://${pdsAPIUrl}/xrpc/com.atproto.sync.listBlobs`);
    url.searchParams.append('did', did);
    url.searchParams.append('limit', limit?.toString() || '10');
    if (cursor) url.searchParams.append('cursor', cursor);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });

    if (!response.ok) {
      console.error(`Failed to fetch repo blobs: ${response.status} ${response.statusText}`);
      return null;
    }
    return await response.json();
  } catch (e) {
    console.error('fetchRepoBlobs error:', e);
    return null;
  }
}

export async function exportRepoCar(did: string, pdsAPIUrl: string, since?: string): Promise<ArrayBuffer | null> {
  try {
    const url = new URL(`https://${pdsAPIUrl}/xrpc/com.atproto.sync.getRepo`);
    url.searchParams.append('did', did);
    if (since) url.searchParams.append('since', since);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });

    if (!response.ok) {
      console.error(`Failed to fetch repo car: ${response.status} ${response.statusText}`);
      return null;
    }
    return await response.arrayBuffer();
  } catch (e) {
    console.error('fetchRepoCar error:', e);
    return null;
  }
}

export async function importRepoCar(
  did: string, pdsAPIUrl: string, car: ArrayBuffer, accessToken: string,
): Promise<boolean | null> {
  try {
    const url = new URL(`https://${pdsAPIUrl}/xrpc/com.atproto.repo.importRepo`);
    url.searchParams.append('did', did);

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/vnd.ipld.car',
      },
      body: car,
    });

    if (!response.ok) {
      console.error(`Failed to import repo car: ${response.status} ${response.statusText}`);
      return false;
    }
    return true;
  } catch (e) {
    console.error('importRepoCar error:', e);
    return null;
  }
}
