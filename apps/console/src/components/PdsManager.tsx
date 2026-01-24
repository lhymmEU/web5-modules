
import { useState, useEffect } from 'react';
import { Server, Loader, LogIn, LogOut, AlertTriangle, Shield, Edit2, Save, X } from 'lucide-react';
import { useKeystore } from '../contexts/KeystoreContext';
import { usePds } from '../contexts/PdsContext';
import { ccc } from '@ckb-ccc/connector-react';
import { pdsLogin, fetchUserProfile, writePDS, type sessionInfo, getDidByUsername } from '../utils/pds';

export function PdsManager() {
  const { wallet } = ccc.useCcc();
  const signer = ccc.useSigner();
  const { connected, didKey, client } = useKeystore();
  const { agent, pdsUrl } = usePds();
  
  // CKB Address State
  const [address, setAddress] = useState<string>('');
  
  // Login States
  const [username, setUsername] = useState<string>('');
  const [did, setDid] = useState<string>('');
  const [loginStatus, setLoginStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [loginError, setLoginError] = useState<string>('');
  const [session, setSession] = useState<sessionInfo | null>(null);
  
  // Profile State
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isSaving, setSaving] = useState(false);

  // Fetch User Profile
  useEffect(() => {
    if (session && session.did && pdsUrl) {
      fetchUserProfile(session.did, pdsUrl).then(profileStr => {
        if (profileStr) {
          try {
            const data = JSON.parse(profileStr);
            // .value contains the actual record data in getRecord response
            const profile = data.value || data; 
            setUserProfile(profile);
            setEditDisplayName(profile.displayName || '');
            setEditDescription(profile.description || '');
          } catch (e) {
            console.error("Failed to parse profile", e);
          }
        }
      });
    } else {
      setUserProfile(null);
    }
  }, [session, pdsUrl]);

  const handleSaveProfile = async () => {
    if (!session || !pdsUrl || !didKey || !client || !agent) return;
    
    setSaving(true);
    try {
        const record: any = {
            $type: 'app.actor.profile',
            displayName: editDisplayName,
            description: editDescription,
            // handle: session.handle, // handle is not usually in the profile record itself, but we can add it if needed
        };
        // Preserve other fields if updating
        if (userProfile) {
             if (userProfile.avatar) record.avatar = userProfile.avatar;
             if (userProfile.banner) record.banner = userProfile.banner;
        }

        const writeResult = await writePDS(agent, session.accessJwt, didKey, client, {
            record,
            did: session.did,
            rkey: 'self',
            type: userProfile ? 'update' : 'create'
        });

        if (writeResult) {
            // Refresh profile
            const profileStr = await fetchUserProfile(session.did, pdsUrl);
            if (profileStr) {
                 const data = JSON.parse(profileStr);
                 const profile = data.value || data;
                 setUserProfile(profile);
            }
            setIsEditing(false);
        }
    } catch (e) {
        console.error(e);
        alert('Failed to save profile: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
        setSaving(false);
    }
  };

  // Fetch CKB Address
  useEffect(() => {
    if (!signer) {
      setAddress('');
      return;
    }
    const fetchAddr = async () => {
      try {
        const addr = await signer.getRecommendedAddress();
        setAddress(addr);
      } catch (e) {
        console.error('Failed to fetch address', e);
      }
    };
    fetchAddr();
  }, [signer]);

  const handleLogin = async () => {
    if ((!did && !username) || !pdsUrl || !address || !didKey || !agent) {
      setLoginError('Missing required info (Username/DID, PDS URL, CKB Address, DID Key, or Agent)');
      setLoginStatus('error');
      return;
    }

    if (!client) {
      setLoginError('Keystore client not connected');
      setLoginStatus('error');
      return;
    }

    setLoginStatus('processing');
    setLoginError('');
    setSession(null);

    try {
      let targetDid = did;
      if (!targetDid && username) {
        const resolved = await getDidByUsername(username, pdsUrl);
        if (resolved && resolved !== '') {
          targetDid = resolved;
          setDid(resolved);
        } else {
          throw new Error(`Could not resolve DID for ${username}`);
        }
      }

      const sessionInfo = await pdsLogin(agent, targetDid, didKey, address, client);
      
      if (sessionInfo) {
        setSession(sessionInfo);
        setLoginStatus('success');
      } else {
        throw new Error('Login failed');
      }
    } catch (e: unknown) {
      setLoginError(e instanceof Error ? e.message : String(e));
      setLoginStatus('error');
    }
  };

  const handleLogout = () => {
    setSession(null);
    setLoginStatus('idle');
  };

  return (
    <div className="container">
      <div className="flex items-center gap-md mb-lg">
        <div className="bg-primary-light p-sm rounded text-primary" style={{ background: '#e0e7ff', color: '#4338ca' }}>
          <Server size={24} />
        </div>
        <div>
          <h2 className="m-0 text-lg">PDS Manager</h2>
          <div className="text-muted text-sm">Manage your Personal Data Server account</div>
        </div>
      </div>
      
      {!wallet ? (
        <div className="card text-center text-muted border-dashed">
          Please connect your CKB wallet in the header.
        </div>
      ) : !connected ? (
        <div className="card text-center text-danger border-dashed">
          Keystore disconnected. Please check your connection in the header.
        </div>
      ) : !session ? (
        /* Login Section */
        <div className="card mx-auto max-w-sm">
          <h3 className="flex justify-center items-center gap-sm mb-lg text-lg">
            <LogIn size={20} /> Login to PDS
          </h3>

          <div className="mb-md">
            <label className="text-sm font-medium text-muted mb-xs block">PDS URL</label>
            <div className="badge badge-primary">
              {pdsUrl}
            </div>
          </div>

          <div className="mb-lg">
            <label className="text-sm font-medium text-muted mb-xs block">Username</label>
            <input 
              className="input" 
              placeholder="alice" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="flex">
            <button 
              className="btn btn-primary"
              onClick={handleLogin}
              disabled={loginStatus === 'processing'}
            >
              {loginStatus === 'processing' ? <Loader size={16} className="spin" /> : <LogIn size={16} />}
              Sign In
            </button>
          </div>

          {loginStatus === 'error' && (
            <div className="mt-md p-sm bg-red-50 text-danger rounded flex items-center gap-sm text-sm">
              <AlertTriangle size={16} />
              {loginError}
            </div>
          )}
        </div>
      ) : (
        /* Authenticated View */
        <div>
          <div className="card">
            
            {isEditing ? (
                /* Edit Form */
                <div className="max-w-sm">
                    <div className="flex justify-between items-center mb-lg">
                        <h3 className="m-0 text-lg">Edit Profile</h3>
                        <button onClick={() => setIsEditing(false)} className="btn btn-sm btn-secondary border-none">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="mb-md">
                        <label className="text-sm font-medium text-muted mb-xs block">Display Name</label>
                        <input 
                            className="input" 
                            value={editDisplayName}
                            onChange={(e) => setEditDisplayName(e.target.value)}
                            placeholder="Display Name"
                        />
                    </div>

                    <div className="mb-lg">
                        <label className="text-sm font-medium text-muted mb-xs block">Description</label>
                        <textarea 
                            className="input input-area" 
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            placeholder="Bio / Description"
                        />
                    </div>

                    <div className="flex gap-md">
                        <button 
                            className="btn btn-primary" 
                            onClick={handleSaveProfile}
                            disabled={isSaving}
                        >
                            {isSaving ? <Loader size={16} className="spin" /> : <Save size={16} />}
                            Save Changes
                        </button>
                        <button 
                            className="btn btn-secondary" 
                            onClick={() => setIsEditing(false)}
                            disabled={isSaving}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            ) : (
                /* Display View */
                <>
                    <div className="flex-col justify-between items-start mb-lg gap-sm">
                        <div className="w-full">
                        <div className="font-bold text-lg text-inherit line-height-tight mb-xs" style={{ fontSize: '1.5rem' }}>
                            {userProfile?.displayName || session?.handle}
                        </div>
                        <div className="text-sm text-muted mb-sm">@{session?.handle}</div>
                        
                        {userProfile?.description && (
                            <div className="text-sm text-muted w-full line-height-normal">
                            {userProfile.description}
                            </div>
                        )}
                        </div>
                    <div className="flex gap-sm">
                        <button className="btn btn-secondary" onClick={() => setIsEditing(true)}>
                            <Edit2 size={16} /> Edit Profile
                        </button>
                        <button className="btn btn-secondary" onClick={handleLogout}>
                            <LogOut size={16} /> Sign Out
                        </button>
                    </div>
                    </div>
                </>
            )}
          </div>

          {/* Session Info */}
          <div className="card">
            <h3 className="flex items-center gap-sm mb-md text-sm">
              <Shield size={18} /> Session Details
            </h3>
            
            <div className="flex-col text-sm">
              <div>
                <div className="text-muted mb-xs">Access JWT</div>
                <details>
                  <summary className="cursor-pointer text-primary text-xs">Show Token</summary>
                  <div className="mt-xs font-mono text-xs bg-slate-100 p-sm rounded break-all max-h-100 overflow-auto">
                    {session.accessJwt}
                  </div>
                </details>
              </div>

              <div>
                <div className="text-muted mb-xs">Refresh JWT</div>
                <details>
                  <summary className="cursor-pointer text-primary text-xs">Show Token</summary>
                  <div className="mt-xs font-mono text-xs bg-slate-100 p-sm rounded break-all max-h-100 overflow-auto">
                    {session.refreshJwt}
                  </div>
                </details>
              </div>
              
              <div>
                <div className="text-muted mb-xs">DID Metadata</div>
                <details>
                  <summary className="cursor-pointer text-primary text-xs">Show Metadata</summary>
                  <pre className="mt-xs">
                    {(() => {
                      try {
                        return JSON.stringify(JSON.parse(session.didMetadata), null, 2);
                      } catch {
                        return session.didMetadata;
                      }
                    })()}
                  </pre>
                </details>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
