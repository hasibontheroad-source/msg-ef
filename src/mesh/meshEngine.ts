import { CryptographicIdentity, MeshNode, MeshPacket, MessageType, TransportMedium } from './types';
import { SeenPacketCache, createMeshPacket, prepareRelayPacket, shouldRelayPacket, calculateLinkQuality } from './routing';
import { decryptPayload, encryptPayload, generateDeviceIdentity } from './crypto';
import { hardwareRadio } from './hardware';
import { acousticModem } from './acoustic';

export class MeshNetworkEngine {
  private localIdentity: CryptographicIdentity = {
    nodeId: '!7a4e9102',
    callsign: 'GHOST-ACTUAL',
    publicKeyBase64: '04a91b...e2ee',
    fingerprint: 'E84D : 92A1 : F0B3 : 77CA',
  };

  private broadcastChannel: BroadcastChannel | null = null;
  private seenCache = new SeenPacketCache(2000);
  private nodes = new Map<string, MeshNode>();
  private packets: MeshPacket[] = [];
  private listeners: Array<() => void> = [];

  public activeChannel = 'Primary-Broadcast';
  public isCloudGatewayActive = false;
  public activeTransport: TransportMedium = 'lora_rf_915';

  constructor() {
    this.initDefaultNodes();
    this.initBroadcastChannel();
    this.initIdentity();

    // Listen to physical hardware radio if connected
    hardwareRadio.setPacketListener((incomingPacket) => {
      this.handleIncomingPacket(incomingPacket as MeshPacket);
    });
  }

  private async initIdentity() {
    try {
      const saved = localStorage.getItem('meshwave_identity');
      if (saved) {
        this.localIdentity = JSON.parse(saved);
      } else {
        const id = await generateDeviceIdentity('OPERATOR-' + Math.floor(100 + Math.random() * 900));
        this.localIdentity = id;
        localStorage.setItem('meshwave_identity', JSON.stringify({
          nodeId: id.nodeId,
          callsign: id.callsign,
          publicKeyBase64: id.publicKeyBase64,
          fingerprint: id.fingerprint,
        }));
      }
    } catch {
      // Fallback
    }
    this.notify();
  }

  private initDefaultNodes() {
    const seedNodes: MeshNode[] = [
      {
        id: '!a9f24c01',
        callsign: 'ALPHA-RELAY',
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
      },
      {
        id: '!3c1d8820',
        callsign: 'BRAVO-SCOUT',
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
      },
      {
        id: '!e7a0910f',
        callsign: 'ECHO-DRONE-REPEATER',
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
      },
      {
        id: '!99b110ee',
        callsign: 'SIERRA-GATEWAY',
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
      },
    ];

    seedNodes.forEach((n) => this.nodes.set(n.id, n));

    // Seed realistic offline messages in primary channel
    const initialPackets: MeshPacket[] = [
      {
        id: 'pkt_init_1',
        channelId: 'Primary-Broadcast',
        senderId: '!a9f24c01',
        senderCallsign: 'ALPHA-RELAY',
        recipientId: 'BROADCAST',
        type: 'text',
        payloadCiphertext: 'encrypted_payload_alpha',
        nonce: '00112233',
        hopCount: 1,
        maxHops: 7,
        transportMedium: 'lora_rf_915',
        timestamp: Date.now() - 15 * 60 * 1000,
        isEncrypted: true,
        decryptedContent: 'All tactical units: Frequency 915.0MHz SF9 active. Mesh topology stable across 4 sectors.',
        status: 'delivered',
        relayPath: ['!a9f24c01', '!e7a0910f'],
        rssiDbm: -68,
        snrDb: 9.8,
      },
      {
        id: 'pkt_init_2',
        channelId: 'Primary-Broadcast',
        senderId: '!3c1d8820',
        senderCallsign: 'BRAVO-SCOUT',
        recipientId: 'BROADCAST',
        type: 'text',
        payloadCiphertext: 'encrypted_payload_bravo',
        nonce: '11223344',
        hopCount: 2,
        maxHops: 7,
        transportMedium: 'bluetooth_mesh',
        timestamp: Date.now() - 8 * 60 * 1000,
        isEncrypted: true,
        decryptedContent: 'Bravo checkpoint reached. Cellular & WiFi zero. Relaying over BLE mesh through Echo Drone.',
        status: 'delivered',
        relayPath: ['!3c1d8820', '!e7a0910f', '!a9f24c01'],
        rssiDbm: -84,
        snrDb: 4.2,
      },
    ];

    this.packets = initialPackets;
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

        // Broadcast local presence beacon periodically
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
        id: this.localIdentity.nodeId,
        callsign: this.localIdentity.callsign,
        role: 'client',
        hardwareType: navigator.userAgent.includes('iPhone') ? 'iOS BLE' : 'Android BLE',
        frequencyBand: this.activeTransport.includes('915') ? '915MHz (US)' : 'BLE 2.4GHz',
        batteryPct: 88,
        lastSeenMs: Date.now(),
        rssiDbm: -50,
        snrDb: 11.2,
        hopDistance: 0,
        publicKey: this.localIdentity.publicKeyBase64,
        isDirectNeighbor: true,
        status: 'active',
      },
    });
  }

  private handleNodeBeacon(peerNode: MeshNode) {
    if (peerNode.id === this.localIdentity.nodeId) return;
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

  public getPackets(channelId?: string): MeshPacket[] {
    const ch = channelId || this.activeChannel;
    return this.packets.filter((p) => p.channelId === ch || p.recipientId === 'BROADCAST');
  }

  public getIdentity(): CryptographicIdentity {
    return this.localIdentity;
  }

  public updateCallsign(newCallsign: string) {
    this.localIdentity = {
      ...this.localIdentity,
      callsign: newCallsign.trim() || 'OPERATOR',
    };
    try {
      localStorage.setItem('meshwave_identity', JSON.stringify({
        nodeId: this.localIdentity.nodeId,
        callsign: this.localIdentity.callsign,
        publicKeyBase64: this.localIdentity.publicKeyBase64,
        fingerprint: this.localIdentity.fingerprint,
      }));
    } catch {}
    this.notify();
  }

  /**
   * Send a new message (text, voice, emergency SOS) through the mesh.
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
    const channelId = params.channelId || this.activeChannel;
    const type = params.type || (params.audioBase64 ? 'voice' : 'text');
    const contentToEncrypt = params.audioBase64 || params.text || '';

    // E2EE: Encrypt with AES-GCM
    const { ciphertext, nonce } = await encryptPayload(contentToEncrypt, params.passphrase);

    const packet = createMeshPacket({
      channelId,
      senderId: this.localIdentity.nodeId,
      senderCallsign: this.localIdentity.callsign,
      recipientId: params.recipientId || 'BROADCAST',
      type,
      payloadCiphertext: ciphertext,
      nonce,
      transportMedium: this.activeTransport,
      isEncrypted: true,
      decryptedContent: params.text,
      audioDurationSec: params.audioDurationSec,
    });

    if (params.audioBase64) {
      packet.audioBlobUrl = `data:audio/webm;base64,${params.audioBase64}`;
    }

    // Add to local store
    this.packets.push(packet);
    this.seenCache.add(packet.id);
    this.notify();

    // Broadcast across local devices / tabs
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({
        type: 'MESH_PACKET',
        packet,
      });
    }

    // Send over physical Web Serial hardware if connected
    hardwareRadio.sendPacketOverSerial(packet);

    // If acoustic transmission is requested for air-gapped emergency
    if (this.activeTransport === 'acoustic_fsk' && params.text) {
      acousticModem.transmitAcousticChirp(params.text);
    }

    // Simulate multi-hop mesh propagation across simulated nodes
    this.simulateMeshRelay(packet);

    return packet;
  }

  private async simulateMeshRelay(packet: MeshPacket) {
    // 1. First hop through nearby router (Alpha Relay or Echo Drone)
    setTimeout(() => {
      const idx = this.packets.findIndex((p) => p.id === packet.id);
      if (idx !== -1) {
        this.packets[idx] = {
          ...this.packets[idx],
          status: 'relayed',
          relayPath: [...this.packets[idx].relayPath, '!e7a0910f'],
        };
        this.notify();
      }
    }, 700);

    // 2. Multi-hop acknowledgment
    setTimeout(() => {
      const idx = this.packets.findIndex((p) => p.id === packet.id);
      if (idx !== -1) {
        this.packets[idx] = {
          ...this.packets[idx],
          status: 'delivered',
          relayPath: [...this.packets[idx].relayPath, '!a9f24c01', '!99b110ee'],
        };
        this.notify();
      }
    }, 1800);
  }

  /**
   * Handle incoming packet from any transport (BLE, LoRa serial, BroadcastChannel, acoustic)
   */
  async handleIncomingPacket(packet: MeshPacket) {
    if (!packet || !packet.id) return;

    // Check store-and-forward rules
    const decision = shouldRelayPacket(packet, this.localIdentity.nodeId, this.seenCache);
    if (!decision.relay && this.seenCache.has(packet.id)) {
      return;
    }

    this.seenCache.add(packet.id);

    // Decrypt content if not already decrypted
    if (packet.isEncrypted && !packet.decryptedContent) {
      try {
        const decrypted = await decryptPayload(packet.payloadCiphertext, packet.nonce);
        packet.decryptedContent = decrypted;
        if (packet.type === 'voice') {
          packet.audioBlobUrl = `data:audio/webm;base64,${decrypted}`;
        }
      } catch (err) {
        packet.decryptedContent = `[Encrypted payload - key mismatch]`;
      }
    }

    // Add to message feed
    this.packets.push(packet);
    this.notify();

    // If this node is acting as a router/repeater, re-relay packet
    if (decision.relay && packet.hopCount < packet.maxHops) {
      const relayPkt = prepareRelayPacket(packet, this.localIdentity.nodeId);
      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage({
          type: 'MESH_PACKET',
          packet: relayPkt,
        });
      }
      hardwareRadio.sendPacketOverSerial(relayPkt);
    }
  }

  clearHistory() {
    this.packets = [];
    this.notify();
  }
}

export const meshEngine = new MeshNetworkEngine();
