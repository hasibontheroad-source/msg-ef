import { CryptographicIdentity, MeshContact, MeshNode, MeshPacket, MessageType, NetworkMode, TransportMedium, UserProfile } from './types';
import { SeenPacketCache, createMeshPacket, prepareRelayPacket, shouldRelayPacket } from './routing';
import { decryptPayload, encryptPayload, generateDeviceIdentity } from './crypto';
import { hardwareRadio } from './hardware';
import { acousticModem } from './acoustic';
import { generateDeviceNodeId, validateDeviceNodeId } from './contacts';

export const PRESET_AVATARS = [
  { id: 'avatar_specops', label: 'Tactical SpecOps', icon: '🛡️', color: 'bg-emerald-800' },
  { id: 'avatar_operator', label: 'Radio Operator', icon: '📡', color: 'bg-blue-800' },
  { id: 'avatar_pilot', label: 'Airborne Recon', icon: '🛩️', color: 'bg-sky-800' },
  { id: 'avatar_rescue', label: 'Mountain Rescue', icon: '🏔️', color: 'bg-amber-800' },
  { id: 'avatar_crypto', label: 'Cyber Cryptographer', icon: '🔐', color: 'bg-purple-800' },
  { id: 'avatar_medic', label: 'Field Medic', icon: '⚕️', color: 'bg-rose-800' },
];

export class MeshNetworkEngine {
  private localIdentity: CryptographicIdentity = {
    nodeId: '!79fc127b',
    callsign: 'Alex River',
    publicKeyBase64: '04a91b...e2ee',
    fingerprint: 'E84D : 92A1 : F0B3 : 77CA',
  };

  public userProfile: UserProfile = {
    nodeId: '!79fc127b',
    callsign: 'Alex River',
    avatarUrl: 'avatar_specops',
    statusMessage: 'Available via Internet & LoRa Mesh',
    hardwareType: 'Cross-Platform Mesh Client',
    frequencyBand: '915MHz LoRa & BLE',
    publicKeyBase64: '04a91b...e2ee',
    fingerprint: 'E84D : 92A1 : F0B3 : 77CA',
    batteryPct: 96,
  };

  private broadcastChannel: BroadcastChannel | null = null;
  private seenCache = new SeenPacketCache(2000);
  private nodes = new Map<string, MeshNode>();
  private contacts = new Map<string, MeshContact>();
  private packets: MeshPacket[] = [];
  private listeners: Array<() => void> = [];

  public activeChannel = 'Primary-Broadcast';
  public activeDirectRecipient: string | null = null;
  public isCloudGatewayActive = true;
  public networkMode: NetworkMode = 'hybrid';
  public activeTransport: TransportMedium = 'lora_rf_915';

  constructor() {
    this.initDefaultNodes();
    this.initDefaultContacts();
    this.initBroadcastChannel();
    this.initIdentity();

    // Listen to physical hardware radio if connected
    hardwareRadio.setPacketListener((incomingPacket) => {
      this.handleIncomingPacket(incomingPacket as MeshPacket);
    });
  }

  private async initIdentity() {
    try {
      const savedProfile = localStorage.getItem('meshwave_user_profile');
      if (savedProfile) {
        this.userProfile = JSON.parse(savedProfile);
        this.localIdentity.nodeId = this.userProfile.nodeId;
        this.localIdentity.callsign = this.userProfile.callsign;
      } else {
        const id = await generateDeviceIdentity('Alex River');
        this.localIdentity = id;
        this.userProfile.nodeId = id.nodeId;
        this.userProfile.callsign = id.callsign;
        this.userProfile.publicKeyBase64 = id.publicKeyBase64;
        this.userProfile.fingerprint = id.fingerprint;
        this.saveProfileToStorage();
      }

      const savedContacts = localStorage.getItem('meshwave_contacts');
      if (savedContacts) {
        const parsed: MeshContact[] = JSON.parse(savedContacts);
        parsed.forEach((c) => this.contacts.set(c.id, c));
      }

      const savedPackets = localStorage.getItem('meshwave_packets');
      if (savedPackets) {
        try {
          const parsed: MeshPacket[] = JSON.parse(savedPackets);
          // Strip out any legacy demo packets so users always have a fresh, clean inbox
          this.packets = parsed.filter(
            (p) =>
              p &&
              p.id &&
              !p.id.startsWith('demo_') &&
              !p.id.startsWith('seed_') &&
              p.senderId !== '!demo_sender'
          );
        } catch {
          this.packets = [];
        }
      } else {
        this.packets = [];
      }
    } catch {
      // Fallback
    }
    this.notify();
  }

  private saveProfileToStorage() {
    try {
      localStorage.setItem('meshwave_user_profile', JSON.stringify(this.userProfile));
      localStorage.setItem('meshwave_identity', JSON.stringify({
        nodeId: this.userProfile.nodeId,
        callsign: this.userProfile.callsign,
        publicKeyBase64: this.userProfile.publicKeyBase64,
        fingerprint: this.userProfile.fingerprint,
      }));
    } catch {}
  }

  private saveContactsToStorage() {
    try {
      localStorage.setItem('meshwave_contacts', JSON.stringify(Array.from(this.contacts.values())));
    } catch {}
  }

  public savePacketsToStorage() {
    try {
      localStorage.setItem('meshwave_packets', JSON.stringify(this.packets.slice(-200)));
    } catch {}
  }

  public clearAllChats() {
    this.packets = [];
    try {
      localStorage.removeItem('meshwave_packets');
    } catch {}
    this.notify();
  }

  private initDefaultNodes() {
    const seedNodes: MeshNode[] = [
      {
        id: '!a9f24c01',
        callsign: 'Alpha Patrol',
        role: 'router',
        hardwareType: 'Heltec LoRa V3',
        frequencyBand: '915MHz (US)',
        batteryPct: 94,
        latitude: 37.7749,
        longitude: -122.4194,
        lastSeenMs: Date.now() - 12000,
        rssiDbm: -68,
        snrDb: 9.8,
        hopDistance: 1,
        publicKey: '04b821ac39...',
        isDirectNeighbor: true,
        status: 'active',
        avatarUrl: 'avatar_specops',
      },
      {
        id: '!3c1d8820',
        callsign: 'Bravo Scout',
        role: 'client',
        hardwareType: 'Android BLE',
        frequencyBand: 'BLE 2.4GHz',
        batteryPct: 78,
        latitude: 37.7812,
        longitude: -122.4101,
        lastSeenMs: Date.now() - 34000,
        rssiDbm: -84,
        snrDb: 4.2,
        hopDistance: 2,
        publicKey: '0498dcfa...',
        isDirectNeighbor: false,
        status: 'active',
        avatarUrl: 'avatar_operator',
      },
      {
        id: '!e7a0910f',
        callsign: 'Echo Drone Repeater',
        role: 'repeater',
        hardwareType: 'T-Beam LoRa',
        frequencyBand: '915MHz (US)',
        batteryPct: 62,
        latitude: 37.7654,
        longitude: -122.4312,
        lastSeenMs: Date.now() - 8000,
        rssiDbm: -54,
        snrDb: 12.1,
        hopDistance: 1,
        publicKey: '04ff104a...',
        isDirectNeighbor: true,
        status: 'active',
        avatarUrl: 'avatar_pilot',
      },
      {
        id: '!99b110ee',
        callsign: 'Sierra Base Station',
        role: 'gateway',
        hardwareType: 'Relay Gateway',
        frequencyBand: '915MHz (US)',
        batteryPct: 100,
        latitude: 37.7901,
        longitude: -122.4011,
        lastSeenMs: Date.now() - 5000,
        rssiDbm: -72,
        snrDb: 8.5,
        hopDistance: 1,
        publicKey: '0420e199...',
        isDirectNeighbor: true,
        status: 'active',
        avatarUrl: 'avatar_rescue',
      },
    ];

    seedNodes.forEach((n) => this.nodes.set(n.id, n));
    // Clean fresh inbox with no demo packets
    this.packets = [];
  }

  private initDefaultContacts() {
    // Clean contacts list - user adds or discovers peers naturally
    this.contacts = new Map();
  }

  private initBroadcastChannel() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('meshwave_local_mesh_v1');
        this.broadcastChannel.onmessage = (event) => {
          if (event.data?.type === 'MESH_PACKET') {
            this.handleIncomingPacket(event.data.packet);
          } else if (event.data?.type === 'NODE_BEACON') {
            this.handleNodeBeacon(event.data.node);
          }
        };

        setInterval(() => this.broadcastPresence(), 15000);
      } catch (err) {
        console.warn('BroadcastChannel error', err);
      }
    }
  }

  private broadcastPresence() {
    if (!this.broadcastChannel) return;
    this.broadcastChannel.postMessage({
      type: 'NODE_BEACON',
      node: {
        id: this.userProfile.nodeId,
        callsign: this.userProfile.callsign,
        avatarUrl: this.userProfile.avatarUrl,
        role: 'client',
        hardwareType: 'Cross-Platform Messenger',
        frequencyBand: '915MHz LoRa & BLE',
        batteryPct: this.userProfile.batteryPct || 95,
        lastSeenMs: Date.now(),
        rssiDbm: -50,
        snrDb: 11.2,
        hopDistance: 0,
        publicKey: this.userProfile.publicKeyBase64,
        isDirectNeighbor: true,
        status: 'active',
      },
    });
  }

  private handleNodeBeacon(peerNode: MeshNode) {
    if (peerNode.id === this.userProfile.nodeId) return;
    this.nodes.set(peerNode.id, {
      ...peerNode,
      lastSeenMs: Date.now(),
    });
    this.notify();
  }

  public subscribe(cb: () => void): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private notify() {
    this.listeners.forEach((cb) => cb());
  }

  public getNodes(): MeshNode[] {
    return Array.from(this.nodes.values());
  }

  public getContacts(): MeshContact[] {
    return Array.from(this.contacts.values());
  }

  public getDiscoveredNodes(): MeshNode[] {
    const contactIds = new Set(this.contacts.keys());
    return Array.from(this.nodes.values()).filter(
      (n) => n.id !== this.userProfile.nodeId && !contactIds.has(n.id)
    );
  }

  public getPackets(channelId?: string, directRecipientId?: string | null): MeshPacket[] {
    if (directRecipientId) {
      return this.packets.filter(
        (p) =>
          (p.senderId === directRecipientId && p.recipientId === this.userProfile.nodeId) ||
          (p.senderId === this.userProfile.nodeId && p.recipientId === directRecipientId)
      );
    }
    const ch = channelId || this.activeChannel;
    return this.packets.filter((p) => p.channelId === ch && (p.recipientId === 'BROADCAST' || !p.recipientId));
  }

  public getIdentity(): CryptographicIdentity {
    return this.localIdentity;
  }

  public getUserProfile(): UserProfile {
    return this.userProfile;
  }

  public updateUserProfile(updates: Partial<UserProfile>) {
    this.userProfile = {
      ...this.userProfile,
      ...updates,
    };
    if (updates.nodeId && validateDeviceNodeId(updates.nodeId)) {
      this.localIdentity.nodeId = updates.nodeId;
    }
    if (updates.callsign) {
      this.localIdentity.callsign = updates.callsign;
    }
    this.saveProfileToStorage();
    this.notify();
  }

  public regenerateUniqueDeviceId(): string {
    const newId = generateDeviceNodeId();
    this.updateUserProfile({ nodeId: newId });
    return newId;
  }

  public addContact(contact: MeshContact) {
    this.contacts.set(contact.id, contact);
    this.saveContactsToStorage();
    this.notify();
  }

  public removeContact(contactId: string) {
    this.contacts.delete(contactId);
    this.saveContactsToStorage();
    this.notify();
  }

  public updateContactNickname(contactId: string, nickname: string) {
    const c = this.contacts.get(contactId);
    if (c) {
      this.contacts.set(contactId, { ...c, nickname: nickname.trim() || c.callsign });
      this.saveContactsToStorage();
      this.notify();
    }
  }

  public toggleContactVerification(contactId: string) {
    const c = this.contacts.get(contactId);
    if (c) {
      this.contacts.set(contactId, { ...c, isVerified: !c.isVerified });
      this.saveContactsToStorage();
      this.notify();
    }
  }

  /**
   * Send message (Text / Voice / SOS) supporting both Offline Mesh and Online Internet
   */
  async sendMessage(params: {
    text?: string;
    audioBase64?: string;
    audioDurationSec?: number;
    type?: MessageType;
    channelId?: string;
    recipientId?: string;
    passphrase?: string;
  }): Promise<MeshPacket> {
    const isDirect = Boolean(params.recipientId && params.recipientId !== 'BROADCAST');
    const channelId = isDirect ? `dm_${params.recipientId}` : params.channelId || this.activeChannel;
    const type = params.type || (params.audioBase64 ? 'voice' : 'text');
    const contentToEncrypt = params.audioBase64 || params.text || '';

    // E2EE
    const { ciphertext, nonce } = await encryptPayload(contentToEncrypt, params.passphrase);

    // Determine transport based on NetworkMode
    let transport: TransportMedium = this.activeTransport;
    const isInternet = this.networkMode === 'internet' || (this.networkMode === 'hybrid' && navigator.onLine);
    if (isInternet) {
      transport = 'internet_cloud';
    }

    const packet = createMeshPacket({
      channelId,
      senderId: this.userProfile.nodeId,
      senderCallsign: this.userProfile.callsign,
      recipientId: params.recipientId || 'BROADCAST',
      type,
      payloadCiphertext: ciphertext,
      nonce,
      transportMedium: transport,
      isEncrypted: true,
      decryptedContent: params.text,
      audioDurationSec: params.audioDurationSec,
    });

    packet.senderAvatarUrl = this.userProfile.avatarUrl;
    packet.isInternet = isInternet;

    if (params.audioBase64) {
      packet.audioBlobUrl = `data:audio/webm;base64,${params.audioBase64}`;
    }

    this.packets.push(packet);
    this.seenCache.add(packet.id);
    this.savePacketsToStorage();
    this.notify();

    // Broadcast locally
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({
        type: 'MESH_PACKET',
        packet,
      });
    }

    // Physical radio transmit
    hardwareRadio.sendPacketOverSerial(packet);

    if (this.activeTransport === 'acoustic_fsk' && params.text) {
      acousticModem.transmitAcousticChirp(params.text);
    }

    this.simulateMeshRelay(packet);

    return packet;
  }

  private async simulateMeshRelay(packet: MeshPacket) {
    setTimeout(() => {
      const idx = this.packets.findIndex((p) => p.id === packet.id);
      if (idx !== -1) {
        this.packets[idx] = {
          ...this.packets[idx],
          status: 'relayed',
          relayPath: [...this.packets[idx].relayPath, '!e7a0910f'],
        };
        this.savePacketsToStorage();
        this.notify();
      }
    }, 600);

    setTimeout(() => {
      const idx = this.packets.findIndex((p) => p.id === packet.id);
      if (idx !== -1) {
        this.packets[idx] = {
          ...this.packets[idx],
          status: 'delivered',
          relayPath: [...this.packets[idx].relayPath, '!a9f24c01', '!99b110ee'],
        };
        this.savePacketsToStorage();
        this.notify();
      }
    }, 1500);
  }

  public clearChannelPackets(channelId?: string, directRecipientId?: string | null) {
    if (directRecipientId) {
      this.packets = this.packets.filter(
        (p) =>
          !(
            (p.senderId === directRecipientId && p.recipientId === this.userProfile.nodeId) ||
            (p.senderId === this.userProfile.nodeId && p.recipientId === directRecipientId)
          )
      );
    } else if (channelId) {
      this.packets = this.packets.filter((p) => p.channelId !== channelId);
    } else {
      this.packets = [];
    }
    this.savePacketsToStorage();
    this.notify();
  }

  async handleIncomingPacket(packet: MeshPacket) {
    if (!packet || !packet.id) return;

    const decision = shouldRelayPacket(packet, this.userProfile.nodeId, this.seenCache);
    if (!decision.relay && this.seenCache.has(packet.id)) {
      return;
    }

    this.seenCache.add(packet.id);

    if (packet.isEncrypted && !packet.decryptedContent) {
      try {
        const decrypted = await decryptPayload(packet.payloadCiphertext, packet.nonce);
        packet.decryptedContent = decrypted;
        if (packet.type === 'voice') {
          packet.audioBlobUrl = `data:audio/webm;base64,${decrypted}`;
        }
      } catch {
        packet.decryptedContent = `[Encrypted Message]`;
      }
    }

    this.packets.push(packet);
    this.savePacketsToStorage();
    this.notify();

    if (decision.relay && packet.hopCount < packet.maxHops) {
      const relayPkt = prepareRelayPacket(packet, this.userProfile.nodeId);
      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage({
          type: 'MESH_PACKET',
          packet: relayPkt,
        });
      }
      hardwareRadio.sendPacketOverSerial(relayPkt);
    }
  }
}

export const meshEngine = new MeshNetworkEngine();
