
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
        <div className="card-icon" style={{ backgroundColor: '#64748b' }}>
          <Settings size={24} color="white" />
        </div>
        <h2>Allowed Origins</h2>
      </div>
      
      <div className="card-content">
        <div className="input-group">
          <input 
            value={newOrigin}
            onChange={(e) => setNewOrigin(e.target.value)}
            placeholder="Add new origin (e.g. http://localhost:8080)"
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <button onClick={handleAdd} className="btn-primary">
            <Plus size={18} /> Add
          </button>
        </div>

        <div className="whitelist-container">
          <h3 style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '1rem' }}>Default (Read-only)</h3>
          <ul className="whitelist">
            {DEFAULT_WHITELIST.map(origin => (
              <li key={origin} className="whitelist-item default">
                <div className="origin-info">
                  <Globe size={16} />
                  <span>{origin}</span>
                </div>
                <span className="badge-default">System</span>
              </li>
            ))}
          </ul>

          <h3 style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '1rem' }}>User Defined</h3>
          {userWhitelist.length === 0 && (
            <p style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.9rem' }}>No custom origins added.</p>
          )}
          <ul className="whitelist">
            {userWhitelist.map(origin => (
              <li key={origin} className="whitelist-item">
                <div className="origin-info">
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

      <style>{`
        .whitelist-container {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .whitelist {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .whitelist-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
        }
        .whitelist-item.default {
          background: #f1f5f9;
          border-style: dashed;
        }
        .origin-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-family: monospace;
          color: #334155;
        }
        .badge-default {
          font-size: 0.75rem;
          background: #e2e8f0;
          color: #64748b;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-weight: 600;
        }
        .btn-icon.danger {
          color: #ef4444;
          background: transparent;
          padding: 0.25rem;
        }
        .btn-icon.danger:hover {
          background: #fee2e2;
        }
      `}</style>
    </div>
  );
}
