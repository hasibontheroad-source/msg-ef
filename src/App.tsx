/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, testFirestoreConnection } from './firebase/config';
import {
  syncMessageToGateway,
  syncUserMeshProfile,
  subscribeGatewayMessages,
} from './firebase/firestoreService';
import { meshEngine } from './mesh/meshEngine';
import {
  ChatConversationItem,
  MeshContact,
  MeshNode,
  MeshPacket,
  NetworkMode,
  TransportMedium,
  UserProfile,
} from './mesh/types';
import { ChatSidebar } from './components/ChatSidebar';
import { ChatConversation } from './components/ChatConversation';
import { UserProfileModal } from './components/UserProfileModal';
import { ContactListView } from './components/ContactListView';
import { MeshRadar } from './components/MeshRadar';
import { RadioConsole } from './components/RadioConsole';
import { TacticalAIModal } from './components/TacticalAIModal';
import { FirebaseAuthModal } from './components/FirebaseAuthModal';
import { X, ShieldCheck, Radio, Wifi } from 'lucide-react';

export default function App() {
  const [userProfile, setUserProfile] = useState<UserProfile>(meshEngine.getUserProfile());
  const [contacts, setContacts] = useState<MeshContact[]>(meshEngine.getContacts());
  const [discoveredNodes, setDiscoveredNodes] = useState<MeshNode[]>(meshEngine.getDiscoveredNodes());
  const [packets, setPackets] = useState<MeshPacket[]>(meshEngine.getPackets());
  const [networkMode, setNetworkMode] = useState<NetworkMode>(meshEngine.networkMode);
  const [activeConversationId, setActiveConversationId] = useState<string>('Primary-Broadcast');

  // Active overlay / modal: 'profile' | 'contacts' | 'radar' | 'radio' | 'ai' | 'auth' | null
  const [activeModal, setActiveModal] = useState<string | null>(null);

  // Mobile navigation state
  const [isMobileConversationOpen, setIsMobileConversationOpen] = useState(false);

  // Firebase Auth
  const [user, setUser] = useState<User | null>(null);
  const [isCloudGateway, setIsCloudGateway] = useState(true);

  // Subscribe to reactive meshEngine state updates
  useEffect(() => {
    const unsubscribe = meshEngine.subscribe(() => {
      setUserProfile(meshEngine.getUserProfile());
      setContacts(meshEngine.getContacts());
      setDiscoveredNodes(meshEngine.getDiscoveredNodes());
      setPackets([...meshEngine.getPackets()]);
    });
    return unsubscribe;
  }, []);

  // Firebase Auth Listener
  useEffect(() => {
    testFirestoreConnection();
    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        syncUserMeshProfile(currentUser.uid, {
          callsign: userProfile.callsign,
          avatarUrl: userProfile.avatarUrl,
          statusMessage: userProfile.statusMessage,
          publicKey: userProfile.publicKeyBase64,
          radioNodeId: userProfile.nodeId,
          hardwareType: userProfile.hardwareType,
        }).catch((err) => console.warn('Firestore profile sync error:', err));
      }
    });
    return unsubAuth;
  }, [userProfile.callsign, userProfile.avatarUrl, userProfile.statusMessage, userProfile.publicKeyBase64, userProfile.nodeId, userProfile.hardwareType]);

  // Firestore Real-Time Message Listener (for Online Internet Messaging)
  useEffect(() => {
    if (user && isCloudGateway) {
      try {
        const unsubMessages = subscribeGatewayMessages('Primary-Broadcast', (cloudPackets) => {
          cloudPackets.forEach((p) => {
            if (p.id && p.senderId !== userProfile.nodeId) {
              meshEngine.handleIncomingPacket({
                ...p,
                isInternet: true,
                transportMedium: 'internet_cloud',
              } as MeshPacket);
            }
          });
        });
        return unsubMessages;
      } catch (e) {
        console.warn('Real-time listener setup error:', e);
      }
    }
  }, [user, isCloudGateway, userProfile.nodeId]);

  // Build conversations list combining Channels and Saved Contacts
  const conversations: ChatConversationItem[] = [
    {
      id: 'Primary-Broadcast',
      name: 'Primary Broadcast',
      isDirect: false,
      lastMessage: packets.filter((p) => p.channelId === 'Primary-Broadcast').slice(-1)[0]?.decryptedContent || 'No messages yet',
      lastMessageTime: packets.filter((p) => p.channelId === 'Primary-Broadcast').slice(-1)[0]?.timestamp,
      unreadCount: 0,
      statusText: 'All units broadcast',
      isOnline: true,
      transport: 'lora_rf_915',
    },
    {
      id: 'Tactical-1',
      name: 'Tactical Squad 1',
      isDirect: false,
      lastMessage: packets.filter((p) => p.channelId === 'Tactical-1').slice(-1)[0]?.decryptedContent || 'No messages yet',
      lastMessageTime: packets.filter((p) => p.channelId === 'Tactical-1').slice(-1)[0]?.timestamp,
      unreadCount: 0,
      statusText: 'Channel 2 • SF9',
      isOnline: true,
      transport: 'bluetooth_mesh',
    },
    {
      id: 'Emergency-SOS-911',
      name: 'Emergency SOS',
      isDirect: false,
      lastMessage: packets.filter((p) => p.type === 'emergency_sos').slice(-1)[0]?.decryptedContent || 'No messages yet',
      lastMessageTime: packets.filter((p) => p.type === 'emergency_sos').slice(-1)[0]?.timestamp,
      unreadCount: 0,
      statusText: 'High Priority Relay',
      isOnline: false,
      transport: 'lora_rf_915',
    },
    ...contacts.map((contact) => {
      const dmPackets = meshEngine.getPackets(undefined, contact.nodeId);
      const latest = dmPackets[dmPackets.length - 1];
      return {
        id: contact.nodeId,
        name: contact.nickname || contact.callsign,
        avatarUrl: contact.avatarUrl,
        isDirect: true,
        recipientNodeId: contact.nodeId,
        lastMessage: latest?.decryptedContent || 'No messages yet',
        lastMessageTime: latest?.timestamp || contact.lastSeenMs,
        unreadCount: 0,
        statusText: contact.status === 'online_cloud' ? 'Online Internet' : `LoRa Mesh • ${contact.rssiDbm}dBm`,
        isOnline: contact.status === 'online_cloud',
        transport: contact.status === 'online_cloud' ? ('internet_cloud' as TransportMedium) : ('lora_rf_915' as TransportMedium),
      };
    }),
  ];

  const activeConversation = conversations.find((c) => c.id === activeConversationId) || conversations[0];

  const activePackets = meshEngine.getPackets(
    activeConversation.isDirect ? undefined : activeConversation.id,
    activeConversation.isDirect ? activeConversation.recipientNodeId : undefined
  );

  const handleSendMessage = async (text: string, type: 'text' | 'voice' | 'emergency_sos' = 'text') => {
    const isDirect = activeConversation.isDirect;
    const packet = await meshEngine.sendMessage({
      text,
      type,
      channelId: isDirect ? undefined : activeConversation.id,
      recipientId: isDirect ? activeConversation.recipientNodeId : 'BROADCAST',
    });

    // If online or hybrid with internet, mirror to Firestore
    if ((networkMode === 'internet' || networkMode === 'hybrid') && user && isCloudGateway) {
      syncMessageToGateway(packet).catch((err) => console.warn('Cloud sync error:', err));
    }
  };

  const handleSendVoiceMessage = async (audioBase64: string, durationSec: number) => {
    const isDirect = activeConversation.isDirect;
    const packet = await meshEngine.sendMessage({
      audioBase64,
      audioDurationSec: durationSec,
      type: 'voice',
      channelId: isDirect ? undefined : activeConversation.id,
      recipientId: isDirect ? activeConversation.recipientNodeId : 'BROADCAST',
    });

    if ((networkMode === 'internet' || networkMode === 'hybrid') && user && isCloudGateway) {
      syncMessageToGateway(packet).catch((err) => console.warn('Cloud sync error:', err));
    }
  };

  const handleQuickAiReply = async (context: string): Promise<string> => {
    try {
      const res = await fetch('/api/gemini/quick-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'Draft an instant SITREP acknowledgment for tactical messenger',
          context,
        }),
      });
      const data = await res.json();
      return data.reply || 'ROGER. SITREP RECEIVED.';
    } catch {
      return 'ROGER. LINK NOMINAL.';
    }
  };

  const handleSaveProfile = (updates: Partial<UserProfile>) => {
    meshEngine.updateUserProfile(updates);
    if (user) {
      syncUserMeshProfile(user.uid, {
        callsign: updates.callsign || userProfile.callsign,
        publicKey: userProfile.publicKeyBase64,
        radioNodeId: updates.nodeId || userProfile.nodeId,
        hardwareType: userProfile.hardwareType,
      }).catch((e) => console.warn(e));
    }
  };

  const handleSelectDirectMessage = (contactNodeId: string, contactName: string) => {
    setActiveConversationId(contactNodeId);
    setActiveModal(null);
    setIsMobileConversationOpen(true);
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-neutral-950 text-neutral-100 flex flex-col font-sans select-none">
      {/* Top Messenger Status Bar */}
      <header className="h-11 px-4 border-b border-neutral-800 bg-neutral-950 flex items-center justify-between gap-3 text-xs font-mono shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
          </div>
          <span className="font-bold text-emerald-400 tracking-wider">MESHWAVE</span>
          <span className="text-[10px] text-neutral-500 hidden sm:inline">|</span>
          <span className="text-[10px] text-neutral-400 hidden sm:inline">
            {networkMode === 'internet' ? '🌐 ONLINE INTERNET' : networkMode === 'mesh_offline' ? '📡 OFFLINE RADIO MESH' : '⚡ AUTO-HYBRID'}
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-[11px] text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">E2EE AES-256</span>
          </div>

          <button
            onClick={() => setActiveModal('auth')}
            className={`px-2.5 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
              user
                ? 'bg-blue-950/70 border border-blue-800 text-blue-300'
                : 'bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300'
            }`}
          >
            {user ? (
              <>
                <Wifi className="w-3 h-3 text-blue-400" />
                <span>{user.displayName?.split(' ')[0] || user.email?.split('@')[0]}</span>
              </>
            ) : (
              <span>SIGN IN</span>
            )}
          </button>
        </div>
      </header>

      {/* Main Split Screen (Sidebar + Conversation) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar */}
        <div
          className={`${
            isMobileConversationOpen ? 'hidden md:flex' : 'flex'
          } w-full md:w-80 lg:w-96 flex-col h-full`}
        >
          <ChatSidebar
            userProfile={userProfile}
            conversations={conversations}
            activeConversationId={activeConversationId}
            onSelectConversation={(id) => {
              setActiveConversationId(id);
              setIsMobileConversationOpen(true);
            }}
            networkMode={networkMode}
            onChangeNetworkMode={(m) => {
              setNetworkMode(m);
              meshEngine.networkMode = m;
            }}
            onOpenProfile={() => setActiveModal('profile')}
            onOpenContacts={() => setActiveModal('contacts')}
            onOpenRadar={() => setActiveModal('radar')}
            onOpenRadio={() => setActiveModal('radio')}
            onOpenAi={() => setActiveModal('ai')}
          />
        </div>

        {/* Right Conversation View */}
        <div
          className={`${
            isMobileConversationOpen ? 'flex' : 'hidden md:flex'
          } flex-1 flex-col h-full overflow-hidden`}
        >
          <ChatConversation
            conversationId={activeConversation.id}
            conversationName={activeConversation.name}
            isDirect={activeConversation.isDirect}
            recipientNodeId={activeConversation.recipientNodeId}
            packets={activePackets}
            userProfile={userProfile}
            networkMode={networkMode}
            onSendMessage={handleSendMessage}
            onSendVoiceMessage={handleSendVoiceMessage}
            onRequestQuickAiReply={handleQuickAiReply}
            onBackMobile={() => setIsMobileConversationOpen(false)}
            onOpenRadar={() => setActiveModal('radar')}
          />
        </div>
      </div>

      {/* Modal 1: User Profile & Device ID */}
      <UserProfileModal
        isOpen={activeModal === 'profile'}
        onClose={() => setActiveModal(null)}
        profile={userProfile}
        onSaveProfile={handleSaveProfile}
        onRegenerateDeviceId={() => meshEngine.regenerateUniqueDeviceId()}
      />

      {/* Modal 2: Contact List (Saved Contacts & Discovered Mesh Peers) */}
      {activeModal === 'contacts' && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col relative shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between shrink-0">
              <h2 className="text-base font-bold text-neutral-100">MESH &amp; ONLINE CONTACTS</h2>
              <button
                onClick={() => setActiveModal(null)}
                aria-label="Close contacts modal"
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <ContactListView
                contacts={contacts}
                discoveredNodes={discoveredNodes}
                onSelectDirectMessage={handleSelectDirectMessage}
                onAddContact={(contact) => meshEngine.addContact(contact)}
                onRemoveContact={(id) => meshEngine.removeContact(id)}
                onToggleVerification={(id) => meshEngine.toggleContactVerification(id)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Tactical Mesh Radar */}
      {activeModal === 'radar' && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-5xl w-full max-h-[90vh] flex flex-col relative shadow-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-neutral-800 flex items-center justify-between shrink-0">
              <h2 className="text-base font-bold text-neutral-100 font-mono">TACTICAL 2D MESH RADAR</h2>
              <button
                onClick={() => setActiveModal(null)}
                aria-label="Close radar modal"
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <MeshRadar
                nodes={meshEngine.getNodes()}
                localNodeId={userProfile.nodeId}
                localCallsign={userProfile.callsign}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: Radio Hardware Console */}
      {activeModal === 'radio' && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col relative shadow-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-neutral-800 flex items-center justify-between shrink-0">
              <h2 className="text-base font-bold text-neutral-100 font-mono">RADIO FREQUENCY &amp; HARDWARE CONSOLE</h2>
              <button
                onClick={() => setActiveModal(null)}
                aria-label="Close radio modal"
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <RadioConsole />
            </div>
          </div>
        </div>
      )}

      {/* Modal 5: Tactical AI Co-Pilot */}
      {activeModal === 'ai' && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col relative shadow-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-neutral-800 flex items-center justify-between shrink-0">
              <h2 className="text-base font-bold text-neutral-100 font-mono">TACTICAL AI CO-PILOT</h2>
              <button
                onClick={() => setActiveModal(null)}
                aria-label="Close AI modal"
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <TacticalAIModal
                onInsertMessage={(text) => {
                  handleSendMessage(text);
                  setActiveModal(null);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal 6: Firebase Google Auth Modal */}
      <FirebaseAuthModal
        isOpen={activeModal === 'auth'}
        onClose={() => setActiveModal(null)}
        user={user}
        identity={meshEngine.getIdentity()}
        isCloudGateway={isCloudGateway}
        onToggleCloudGateway={() => setIsCloudGateway(!isCloudGateway)}
      />
    </div>
  );
}
