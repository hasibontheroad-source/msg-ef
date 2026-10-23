import React, { useState } from 'react';
import {
  LogIn,
  LogOut,
  ShieldCheck,
  Cloud,
  CheckCircle2,
  AlertCircle,
  X,
  UserCheck,
  RefreshCw,
} from 'lucide-react';
import { signInWithPopup, signOut, User } from 'firebase/auth';
import { auth, googleProvider, testFirestoreConnection } from '../firebase/config';
import { syncUserMeshProfile } from '../firebase/firestoreService';
import { CryptographicIdentity } from '../mesh/types';
import { meshEngine } from '../mesh/meshEngine';

interface FirebaseAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  identity: CryptographicIdentity;
  isCloudGateway: boolean;
  onToggleCloudGateway: () => void;
}

export const FirebaseAuthModal: React.FC<FirebaseAuthModalProps> = ({
  isOpen,
  onClose,
  user,
  identity,
  isCloudGateway,
  onToggleCloudGateway,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionTestStatus, setConnectionTestStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await signInWithPopup(auth, googleProvider);
      if (res.user) {
        // Sync cryptographic identity and Google profile to Firestore
        await syncUserMeshProfile(res.user.uid, {
          callsign: res.user.displayName || identity.callsign,
          avatarUrl: res.user.photoURL || 'avatar_specops',
          publicKey: identity.publicKeyBase64,
          radioNodeId: identity.nodeId,
        });

        // Update local mesh engine identity with Google display name if desired
        if (res.user.displayName) {
          meshEngine.updateUserProfile({
            callsign: res.user.displayName,
            avatarUrl: res.user.photoURL || meshEngine.userProfile.avatarUrl,
          });
        }
      }
    } catch (err: unknown) {
      console.error('Firebase Auth error:', err);
      const code = (err as { code?: string })?.code;
      if (code === 'auth/popup-blocked') {
        setError('Popup was blocked by your browser. Please allow popups for this site and try again.');
      } else if (code === 'auth/popup-closed-by-user') {
        setError('Sign-in popup was closed before completing authentication. Please click Sign In again.');
      } else if (code === 'auth/cancelled-popup-request') {
        setError('Sign-in request was cancelled. Please try again.');
      } else if (code === 'auth/network-request-failed') {
        setError('Network connectivity issue. When offline, MeshWave continues to work 100% via radio mesh.');
      } else {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOut(auth);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setConnectionTestStatus('Testing Firestore connection...');
    const ok = await testFirestoreConnection();
    if (ok) {
      setConnectionTestStatus('ONLINE: Firestore database connection verified.');
    } else {
      setConnectionTestStatus('OFFLINE: Device currently air-gapped from cloud (operating via peer-to-peer radio).');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-mono">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-md w-full p-6 text-neutral-200 relative shadow-2xl">
        <button
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-100 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 pb-4 border-b border-neutral-800">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Cloud className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-neutral-100">FIREBASE HYBRID GATEWAY</h3>
            <div className="text-xs text-neutral-400">Google Auth &amp; Firestore Relay</div>
          </div>
        </div>

        <div className="py-4 space-y-4 text-xs text-neutral-300">
          <p className="leading-relaxed">
            MeshWave functions <strong className="text-emerald-400">100% offline</strong> without any internet. When you reach an internet connection, signing in allows your device to act as an <strong className="text-blue-400">Internet Gateway Bridge</strong>, safely relaying encrypted store-and-forward packets into Firestore.
          </p>

          {user ? (
            <div className="p-3 bg-neutral-950 border border-emerald-900/60 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <UserCheck className="w-4 h-4" />
                <span>SIGNED IN WITH GOOGLE</span>
              </div>
              <div className="text-neutral-300">
                Email: <span className="text-neutral-100 font-semibold">{user.email}</span>
              </div>
              <div className="text-neutral-400 text-[11px]">
                UID: {user.uid}
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-neutral-800">
                <span className="text-neutral-400">Gateway Relay:</span>
                <button
                  onClick={onToggleCloudGateway}
                  className={`px-3 py-1 rounded text-xs font-bold cursor-pointer ${
                    isCloudGateway
                      ? 'bg-blue-600 text-white'
                      : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {isCloudGateway ? 'ACTIVE (BRIDGING)' : 'DISABLED'}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl text-center space-y-3">
              <ShieldCheck className="w-8 h-8 text-blue-400 mx-auto" />
              <p className="text-neutral-400">
                Authenticate with Google to publish your ECDH public key and sync offline packets to the cloud gateway.
              </p>
              <button
                onClick={handleSignIn}
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-lg bg-white hover:bg-neutral-100 text-neutral-900 font-bold transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>{loading ? 'SIGNING IN...' : 'SIGN IN WITH GOOGLE'}</span>
              </button>
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-950/40 border border-rose-800 text-rose-300 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Connection Test */}
          <div className="pt-2 border-t border-neutral-800 space-y-2">
            <button
              onClick={handleTestConnection}
              className="w-full py-2 px-3 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>TEST FIRESTORE CONNECTION</span>
            </button>
            {connectionTestStatus && (
              <div
                className={`p-2 rounded text-[11px] ${
                  connectionTestStatus.startsWith('ONLINE')
                    ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-900'
                    : 'bg-neutral-950 text-neutral-400 border border-neutral-800'
                }`}
              >
                {connectionTestStatus}
              </div>
            )}
          </div>
        </div>

        {user && (
          <div className="pt-3 border-t border-neutral-800 flex justify-end">
            <button
              onClick={handleSignOut}
              disabled={loading}
              className="px-4 py-2 rounded bg-neutral-800 hover:bg-neutral-700 text-rose-400 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>SIGN OUT</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
