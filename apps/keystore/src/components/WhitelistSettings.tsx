
import { useState, useEffect } from 'react';
import { 
  getStoredWhitelist, 
  addOriginToWhitelist, 
  removeOriginFromWhitelist, 
  DEFAULT_WHITELIST 
} from '../utils/storage';
import { Settings, Plus, Trash2, Globe } from 'lucide-react';

export function WhitelistSettings() {
  const [userWhitelist, setUserWhitelist] = useState<string[]>([]);
  const [newOrigin, setNewOrigin] = useState('');

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

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-icon">
          <Settings size={24} />
        </div>
        <h2>Allowed Origins</h2>
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
    </div>
  );
}
