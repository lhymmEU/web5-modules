
import { useState, useRef, useEffect } from 'react';
import { 
  getStoredWhitelist, 
  addOriginToWhitelist, 
  removeOriginFromWhitelist, 
  DEFAULT_WHITELIST 
} from '../utils/storage';
import { Settings, Plus, Trash2, Globe, Download, Upload } from 'lucide-react';

export function WhitelistSettings() {
  const [userWhitelist, setUserWhitelist] = useState<string[]>([]);
  const [newOrigin, setNewOrigin] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const refreshList = () => {
    setUserWhitelist(getStoredWhitelist());
  };

  useEffect(() => {
    refreshList();
  }, []);

  const handleAdd = () => {
    if (!newOrigin) return;
    try {
      const url = new URL(newOrigin);
      const origin = url.origin;
      addOriginToWhitelist(origin);
      setNewOrigin('');
      refreshList();
    } catch {
      alert('Invalid URL format. Please enter a valid URL (e.g., http://example.com)');
    }
  };

  const handleRemove = (origin: string) => {
    removeOriginFromWhitelist(origin);
    refreshList();
  };

  // --- Export / Import Logic ---

  const onExport = () => {
    const data = {
      exportedAt: Date.now(),
      whitelist: userWhitelist
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const date = new Date().toISOString().slice(0, 10);
    link.download = `web5-whitelist-backup-${date}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const onImport = () => {
    fileInputRef.current?.click();
  };

  const onFileSelected = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      
      let importedList: string[] = [];
      if (Array.isArray(parsed)) {
        // Support direct array format
        importedList = parsed;
      } else if (parsed && Array.isArray(parsed.whitelist)) {
        // Support object wrapper format
        importedList = parsed.whitelist;
      } else {
        alert('Invalid file format: whitelist array not found.');
        return;
      }

      let addedCount = 0;
      for (const origin of importedList) {
        try {
          // Simple validation
          new URL(origin); 
          addOriginToWhitelist(origin);
          addedCount++;
        } catch {
          // Ignore invalid URLs
        }
      }
      
      refreshList();
      alert(`Imported ${addedCount} origins successfully.`);
    } catch (e) {
      console.error(e);
      alert('Import failed: Invalid JSON file.');
    }
    
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="card">
      <div className="card-header justify-between">
        <div className="flex items-center gap-4">
          <div className="card-icon">
            <Settings size={24} />
          </div>
          <h2>Allowed Origins</h2>
        </div>
        <div className="flex gap-2">
           <button className="btn btn-primary" onClick={onExport} title="Export Whitelist">
             <Download size={16} /> Export
           </button>
           <button className="btn btn-primary" onClick={onImport} title="Import Whitelist">
             <Upload size={16} /> Import
           </button>
        </div>
      </div>
      
      <div className="card-content">
        <div className="input-group flex-row">
          <input 
            value={newOrigin}
            onChange={(e) => setNewOrigin(e.target.value)}
            placeholder="Add new origin (e.g. http://localhost:8080)"
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            className="input flex-1"
          />
          <button onClick={handleAdd} className="btn btn-success flex items-center gap-2">
            <Plus size={18} /> Add
          </button>
        </div>

        <div className="list-container">
          <h3 className="text-secondary-sm mt-4 mb-4">Default (Read-only)</h3>
          <ul className="list-container" style={{ padding: 0, margin: 0 }}>
            {DEFAULT_WHITELIST.map(origin => (
              <li key={origin} className="list-item compact">
                <div className="list-item-subtitle">
                  <Globe size={16} />
                  <span>{origin}</span>
                </div>
                <span className="badge-pill system">System</span>
              </li>
            ))}
          </ul>

          <h3 className="text-secondary-sm mt-4 mb-4">User Defined</h3>
          {userWhitelist.length === 0 && (
            <p className="empty-text">No custom origins added.</p>
          )}
          <ul className="list-container" style={{ padding: 0, margin: 0 }}>
            {userWhitelist.map(origin => (
              <li key={origin} className="list-item compact">
                <div className="list-item-subtitle">
                  <Globe size={16} />
                  <span>{origin}</span>
                </div>
                <button 
                  onClick={() => handleRemove(origin)}
                  className="btn-icon danger"
                  title="Remove"
                >
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileSelected(file);
        }}
      />
    </div>
  );
}
