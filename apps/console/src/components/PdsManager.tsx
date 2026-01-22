import { useState, useEffect } from 'react';
import { Server, Loader, LogIn, AlertTriangle, Shield, User, Users, FileText, Edit2, Save, X } from 'lucide-react';
import { useKeystore } from '../contexts/KeystoreContext';
import { usePds } from '../contexts/PdsContext';
import { ccc } from '@ckb-ccc/connector-react';
import { pdsPreLogin, pdsLogin, fetchUserProfile, preWritePDS, buildWriteSignData, writePDS, type sessionInfo } from '../utils/pds';

export function PdsManager() {
  const { wallet, open } = ccc.useCcc();
  const signer = ccc.useSigner();
  const { connected, didKey, client } = useKeystore();
  const { pdsUrl } = usePds();
  
  // CKB Address State
  const [address, setAddress] = useState<string>('');
  
  // Login States
  const [did, setDid] = useState('');
  const [loginStatus, setLoginStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [loginError, setLoginError] = useState('');
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
    if (!session || !pdsUrl || !didKey || !client) return;
    
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

        // 1. Pre-write
        const preWriteResult = await preWritePDS(pdsUrl, session.accessJwt, {
            record,
            did: session.did,
            rkey: 'self',
            type: userProfile ? 'update' : 'create'
        });
        
        if (!preWriteResult) throw new Error('Pre-write failed');

        // 2. Sign
        const signBytes = buildWriteSignData(preWriteResult.writerData);
        if (!signBytes) throw new Error('Failed to build sign data');
        
        const sig = await client.signMessage(signBytes);
        if (!sig) throw new Error('Failed to sign');

        // 3. Write
        const writeResult = await writePDS(pdsUrl, session.accessJwt, didKey, preWriteResult.writerData, preWriteResult.newRecord, sig, {
            record,
            did: session.did,
            rkey: preWriteResult.rkey,
            type: userProfile ? 'update' : 'create'
        });

        console.log('Write result:', writeResult);

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
    if (!did || !pdsUrl || !address || !didKey) {
      setLoginError('Missing required info (DID, PDS URL, CKB Address, or DID Key)');
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
      // 1. Pre-login (get message to sign)
      const messageToSign = await pdsPreLogin(did, pdsUrl, address);
      if (!messageToSign) {
        throw new Error('Failed to prepare login');
      }

      // 2. Sign with Keystore
      const sig = await client.signMessage(messageToSign);
      
      if (!sig) {
        throw new Error('Failed to sign message');
      }

      // 3. Login
      const sessionInfo = await pdsLogin(did, pdsUrl, didKey, address, messageToSign, sig);
      
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
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div style={{ 
          background: '#e0e7ff', 
          padding: '0.5rem', 
          borderRadius: '8px',
          color: '#4338ca'
        }}>
          <Server size={24} />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>PDS Manager</h2>
          <div style={{ color: '#64748b', fontSize: '0.875rem' }}>Manage your Personal Data Server account</div>
        </div>
      </div>
      
      {!wallet ? (
        <div style={{ padding: '2rem', textAlign: 'center', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
          <div style={{ marginBottom: '1rem', color: '#64748b' }}>Please connect your CKB wallet to proceed.</div>
          <button className="btn btn-primary" onClick={open}>Connect Wallet</button>
        </div>
      ) : !connected ? (
        <div style={{ padding: '2rem', textAlign: 'center', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', color: '#dc2626' }}>
          Keystore disconnected. Please check your connection in the header.
        </div>
      ) : !session ? (
        /* Login Section */
        <div style={{ padding: '1.5rem', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', maxWidth: '500px', margin: '0 auto' }}>
          <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.125rem', textAlign: 'center', color: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <LogIn size={20} /> Login to PDS
          </h3>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#475569', marginBottom: '0.25rem' }}>PDS URL</label>
            <div style={{ 
              background: '#f1f5f9', 
              padding: '0.5rem 0.75rem', 
              borderRadius: '6px', 
              border: '1px solid #e2e8f0', 
              color: '#475569', 
              fontSize: '0.875rem' 
            }}>
              {pdsUrl}
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#475569', marginBottom: '0.25rem' }}>DID</label>
            <input 
              className="input" 
              placeholder="did:ckb:..." 
              value={did}
              onChange={(e) => setDid(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <button 
            className="btn btn-primary"
            onClick={handleLogin}
            disabled={loginStatus === 'processing'}
            style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
          >
            {loginStatus === 'processing' ? <Loader size={16} className="spin" /> : <LogIn size={16} />}
            Sign In with Keystore
          </button>

          {loginStatus === 'error' && (
            <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#fef2f2', color: '#991b1b', borderRadius: '6px', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={16} />
              {loginError}
            </div>
          )}
        </div>
      ) : (
        /* Authenticated View */
        <div>
          <div style={{ marginBottom: '2rem', padding: '1.5rem', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            
            {isEditing ? (
                /* Edit Form */
                <div style={{ maxWidth: '500px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Edit Profile</h3>
                        <button onClick={() => setIsEditing(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                            <X size={20} />
                        </button>
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#475569', marginBottom: '0.25rem' }}>Display Name</label>
                        <input 
                            className="input" 
                            value={editDisplayName}
                            onChange={(e) => setEditDisplayName(e.target.value)}
                            placeholder="Display Name"
                            style={{ width: '100%' }}
                        />
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#475569', marginBottom: '0.25rem' }}>Description</label>
                        <textarea 
                            className="input" 
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            placeholder="Bio / Description"
                            style={{ width: '100%', minHeight: '100px', fontFamily: 'inherit' }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button 
                            className="btn btn-primary" 
                            onClick={handleSaveProfile}
                            disabled={isSaving}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#f1f5f9', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0' }}>
                        {userProfile?.avatar ? (
                            <img src={userProfile.avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <User size={40} color="#94a3b8" />
                        )}
                        </div>
                        <div>
                        <div style={{ fontWeight: 700, fontSize: '1.5rem', color: '#0f172a', lineHeight: 1.2 }}>
                            {userProfile?.displayName || session?.handle}
                        </div>
                        <div style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '0.5rem' }}>@{session?.handle}</div>
                        
                        {userProfile?.description && (
                            <div style={{ fontSize: '0.875rem', color: '#334155', maxWidth: '500px', lineHeight: 1.5 }}>
                            {userProfile.description}
                            </div>
                        )}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button className="btn btn-secondary" onClick={() => setIsEditing(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Edit2 size={16} /> Edit Profile
                        </button>
                        <button className="btn btn-secondary" onClick={handleLogout}>
                            Sign Out
                        </button>
                    </div>
                    </div>

                    {userProfile && (
                    <div style={{ display: 'flex', gap: '2rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Users size={16} color="#64748b" />
                        <span style={{ fontWeight: 600, color: '#0f172a' }}>{userProfile.followersCount || 0}</span>
                        <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Followers</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Users size={16} color="#64748b" />
                        <span style={{ fontWeight: 600, color: '#0f172a' }}>{userProfile.followsCount || 0}</span>
                        <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Following</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FileText size={16} color="#64748b" />
                        <span style={{ fontWeight: 600, color: '#0f172a' }}>{userProfile.postsCount || 0}</span>
                        <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Posts</span>
                        </div>
                    </div>
                    )}
                </>
            )}
          </div>

          {/* Session Info */}
          <div style={{ padding: '1.5rem', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e293b' }}>
              <Shield size={18} /> Session Details
            </h3>
            
            <div style={{ fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <div style={{ color: '#64748b', marginBottom: '0.25rem' }}>Access JWT</div>
                <details>
                  <summary style={{ cursor: 'pointer', color: '#2563eb', fontSize: '0.75rem' }}>Show Token</summary>
                  <div style={{ marginTop: '0.5rem', fontFamily: 'monospace', fontSize: '0.75rem', background: '#e2e8f0', color: '#1e293b', padding: '0.5rem', borderRadius: '4px', wordBreak: 'break-all', maxHeight: '100px', overflowY: 'auto' }}>
                    {session.accessJwt}
                  </div>
                </details>
              </div>

              <div>
                <div style={{ color: '#64748b', marginBottom: '0.25rem' }}>Refresh JWT</div>
                <details>
                  <summary style={{ cursor: 'pointer', color: '#2563eb', fontSize: '0.75rem' }}>Show Token</summary>
                  <div style={{ marginTop: '0.5rem', fontFamily: 'monospace', fontSize: '0.75rem', background: '#e2e8f0', color: '#1e293b', padding: '0.5rem', borderRadius: '4px', wordBreak: 'break-all', maxHeight: '100px', overflowY: 'auto' }}>
                    {session.refreshJwt}
                  </div>
                </details>
              </div>
              
              <div>
                <div style={{ color: '#64748b', marginBottom: '0.25rem' }}>DID Metadata</div>
                <details>
                  <summary style={{ cursor: 'pointer', color: '#2563eb', fontSize: '0.75rem' }}>Show Metadata</summary>
                  <pre style={{ marginTop: '0.5rem', fontFamily: 'monospace', fontSize: '0.75rem', background: '#f1f5f9', color: '#334155', padding: '0.5rem', borderRadius: '4px', overflowX: 'auto' }}>
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
