
import { useState } from 'react';
import { Search, Download, Loader, AlertTriangle } from 'lucide-react';
import { usePds } from '../contexts/PdsContext';
import { getDidByUsername, fetchRepoRecords, exportRepoCar, fetchRepoInfo } from 'pds_module/logic';

export function PdsBrowser() {
  const { pdsUrl } = usePds();
  const [handle, setHandle] = useState('');
  const [did, setDid] = useState('');
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const [records, setRecords] = useState<Record<string, any[]>>({});
  const [collections, setCollections] = useState<string[]>([]);

  const handleBrowse = async () => {
    if (!handle || !pdsUrl) return;
    setLoading(true);
    setError('');
    setRecords({});
    setCollections([]);
    try {
      let targetDid = handle;
      if (!handle.startsWith('did:')) {
        const resolved = await getDidByUsername(handle, pdsUrl);
        if (!resolved) throw new Error('Could not resolve handle to DID');
        targetDid = resolved;
      }
      setDid(targetDid);

      // Fetch repo info to get dynamic collections
      const repoInfo = await fetchRepoInfo(targetDid, pdsUrl);
      if (!repoInfo || !repoInfo.collections) {
        throw new Error('Could not fetch repo info or collections');
      }

      const dynamicCollections = repoInfo.collections as string[];
      setCollections(dynamicCollections);

      const results: Record<string, unknown[]> = {};
      for (const colId of dynamicCollections) {
        const data = await fetchRepoRecords(targetDid, colId, pdsUrl, 50);
        if (data && data.records) {
          results[colId] = data.records;
        }
      }
      setRecords(results);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to browse PDS');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!did || !pdsUrl) return;
    setDownloading(true);
    try {
      const data = await exportRepoCar(did, pdsUrl);
      if (data) {
        const blob = new Blob([data], { type: 'application/vnd.ipld.car' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${handle || did}.car`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (e: unknown) {
      alert('Failed to download CAR file: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="card mt-lg">
      <h3 className="flex items-center gap-sm mb-lg text-lg">
        <Search size={20} /> PDS Browser
      </h3>

      <div className="flex gap-md mb-lg">
        <div className="flex-1">
          <input 
            className="input" 
            placeholder="Enter username (e.g. alice) or DID" 
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleBrowse()}
          />
        </div>
        <button 
          className="btn btn-primary"
          onClick={handleBrowse}
          disabled={loading || !handle}
        >
          {loading ? <Loader size={16} className="spin" /> : <Search size={16} />}
          Browse
        </button>
        {did && (
          <button 
            className="btn btn-secondary"
            onClick={handleDownload}
            disabled={downloading}
          >
            {downloading ? <Loader size={16} className="spin" /> : <Download size={16} />}
            Download CAR
          </button>
        )}
      </div>

      {error && (
        <div className="mb-lg p-sm bg-red-50 text-danger rounded flex items-center gap-sm text-sm">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {did && (
        <div className="mb-lg p-sm bg-slate-50 rounded text-xs font-mono break-all border">
          DID: {did}
        </div>
      )}

      <div className="flex-col gap-lg">
        {collections.map(colId => (
          <div key={colId} className="w-full">
            <h4 className="flex items-center gap-sm mb-md text-sm font-bold border-b pb-xs m-0">
              {colId} ({records[colId]?.length || 0})
            </h4>
            <div className="flex-col gap-sm mt-sm" style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {records[colId]?.length > 0 ? (
                records[colId].map((record: any, idx: number) => (
                  <div key={idx} className="p-sm bg-slate-50 rounded border text-xs">
                    <div className="text-muted mb-xs break-all">URI: {record.uri}</div>
                    <pre className="whitespace-pre-wrap overflow-auto max-h-40">
                      {JSON.stringify(record.value, null, 2)}
                    </pre>
                  </div>
                ))
              ) : (
                <div className="text-muted text-xs italic p-sm">No records found</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
