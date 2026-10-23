/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, testFirestoreConnection } from './firebase/config';
import { syncMessageToGateway, syncUserMeshProfile } from './firebase/firestoreService';
import { meshEngine } from './mesh/meshEngine';
import { MeshNode, MeshPacket, TransportMedium } from './mesh/types';
import { Header } from './components/Header';
import { Navigation, NavTab } from './components/Navigation';
import { MessagingFeed } from './components/MessagingFeed';
import { MeshRadar } from './components/MeshRadar';
import { RadioConsole } from './components/RadioConsole';
import { KeyVault } from './components/KeyVault';
import { TacticalAIModal } from './components/TacticalAIModal';
import { FirebaseAuthModal } from './components/FirebaseAuthModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('comms');
  const [identity, setIdentity] = useState(meshEngine.getIdentity());
  const [nodes, setNodes] = useState<MeshNode[]>(meshEngine.getNodes());
  const [packets, setPackets] = useState<MeshPacket[]>(meshEngine.getPackets());
  const [activeTransport, setActiveTransport] = useState<TransportMedium>(meshEngine.activeTransport);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isCloudGateway, setIsCloudGateway] = useState(false);

  // Sync state from meshEngine on reactive events
  useEffect(() => {
    const unsubscribe = meshEngine.subscribe(() => {
      setIdentity(meshEngine.getIdentity());
      setNodes(meshEngine.getNodes());
      setPackets([...meshEngine.getPackets()]);
    });
    return unsubscribe;
  }, []);

  // Firebase auth state listener
  useEffect(() => {
    testFirestoreConnection();
    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        syncUserMeshProfile(currentUser.uid, {
          callsign: identity.callsign,
          publicKey: identity.publicKeyBase64,
          radioNodeId: identity.nodeId,
        }).catch((err) => console.warn('Firestore user profile sync error:', err));
      }
    });
    return unsubAuth;
  }, [identity]);

  // When cloud gateway is enabled, automatically mirror new packets to Firestore
  useEffect(() => {
    if (isCloudGateway && user && packets.length > 0) {
      const latest = packets[packets.length - 1];
      if (latest && latest.senderId === identity.nodeId) {
        syncMessageToGateway(latest).catch((err) =>
          console.warn('Gateway sync error:', err)
        );
      }
    }
  }, [packets, isCloudGateway, user, identity.nodeId]);

  const handleSelectTransport = (transport: TransportMedium) => {
    setActiveTransport(transport);
    meshEngine.activeTransport = transport;
  };

  const handleUpdateCallsign = (newCallsign: string) => {
    meshEngine.updateCallsign(newCallsign);
    setIdentity(meshEngine.getIdentity());
    if (user) {
      syncUserMeshProfile(user.uid, {
        callsign: newCallsign,
        publicKey: identity.publicKeyBase64,
        radioNodeId: identity.nodeId,
      }).catch((e) => console.warn(e));
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setIsCloudGateway(false);
  };

  const handleToggleCloudGateway = () => {
    if (!user) {
      setIsAuthModalOpen(true);
    } else {
      setIsCloudGateway(!isCloudGateway);
    }
  };

  const handleRequestQuickAiReply = async (context: string): Promise<string> => {
    try {
      const res = await fetch('/api/gemini/quick-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'Draft an instant SITREP acknowledgment for tactical mesh',
          context,
        }),
      });
      const data = await res.json();
      return data.reply || 'ROGER. SITREP RECEIVED. LINK SOLID.';
    } catch {
      return 'ROGER. LINK NOMINAL.';
    }
  };

  const handleInsertAiMessage = async (text: string) => {
    setActiveTab('comms');
    await meshEngine.sendMessage({
      text,
      type: 'ai_brief',
    });
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-mono selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* Top Header */}
      <Header
        callsign={identity.callsign}
        nodeId={identity.nodeId}
        transport={activeTransport}
        user={user}
        isCloudGateway={isCloudGateway}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onSignOut={handleSignOut}
        onToggleCloudGateway={handleToggleCloudGateway}
      />

      {/* Main Navigation */}
      <Navigation
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        packetCount={packets.length}
        nodeCount={nodes.length}
      />

      {/* Content Body Based on Tab */}
      <main className="flex-1 flex flex-col">
        {activeTab === 'comms' && (
          <MessagingFeed
            packets={packets}
            currentCallsign={identity.callsign}
            currentNodeId={identity.nodeId}
            activeTransport={activeTransport}
            onSelectTransport={handleSelectTransport}
            onRequestQuickAiReply={handleRequestQuickAiReply}
          />
        )}

        {activeTab === 'radar' && (
          <MeshRadar
            nodes={nodes}
            localNodeId={identity.nodeId}
            localCallsign={identity.callsign}
          />
        )}

        {activeTab === 'radio' && <RadioConsole />}

        {activeTab === 'vault' && (
          <KeyVault
            identity={identity}
            onUpdateCallsign={handleUpdateCallsign}
          />
        )}

        {activeTab === 'ai' && (
          <TacticalAIModal onInsertMessage={handleInsertAiMessage} />
        )}
      </main>

      {/* Firebase Google Auth & Gateway Modal */}
      <FirebaseAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        user={user}
        identity={identity}
        isCloudGateway={isCloudGateway}
        onToggleCloudGateway={() => setIsCloudGateway(!isCloudGateway)}
      />
    </div>
  );
}
