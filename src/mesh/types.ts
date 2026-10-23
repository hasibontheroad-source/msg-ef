export type TransportMedium = 
  | 'bluetooth_mesh'
  | 'lora_rf_915'
  | 'lora_rf_868'
  | 'lora_rf_433'
  | 'acoustic_fsk'
  | 'webrtc_p2p'
  | 'cloud_gateway'
  | 'internet_cloud';

export type NetworkMode = 'hybrid' | 'internet' | 'mesh_offline';

export type MessageType = 'text' | 'voice' | 'emergency_sos' | 'telemetry' | 'ai_brief';

export interface MeshNode {
  id: string; // e.g. "!a9f24c01" or user uid
  callsign: string;
  role: 'client' | 'router' | 'repeater' | 'gateway';
  hardwareType: 'Android BLE' | 'iOS BLE' | 'Heltec LoRa V3' | 'T-Beam LoRa' | 'Acoustic Node' | 'Relay Gateway';
  frequencyBand: '915MHz (US)' | '868MHz (EU)' | '433MHz' | 'BLE 2.4GHz';
  batteryPct: number;
  latitude?: number;
  longitude?: number;
  lastSeenMs: number;
  rssiDbm: number;
  snrDb: number;
  hopDistance: number;
  publicKey: string;
  isDirectNeighbor: boolean;
  status: 'active' | 'weak' | 'offline';
  avatarUrl?: string;
}

export interface MeshPacket {
  id: string;
  channelId: string;
  senderId: string;
  senderCallsign: string;
  senderAvatarUrl?: string;
  recipientId: string; // Target Node ID or 'BROADCAST'
  type: MessageType;
  payloadCiphertext: string;
  nonce: string;
  mac?: string;
  hopCount: number;
  maxHops: number;
  transportMedium: TransportMedium;
  timestamp: number;
  audioDurationSec?: number;
  rssiDbm?: number;
  snrDb?: number;
  isEncrypted: boolean;
  decryptedContent?: string;
  audioBlobUrl?: string;
  status: 'transmitting' | 'relayed' | 'delivered' | 'cached';
  relayPath: string[];
  isInternet?: boolean;
}

export interface RadioConfig {
  frequencyMhz: number;
  bandwidthKhz: number;
  spreadingFactor: number;
  codingRate: string;
  txPowerDbm: number;
  channelName: string;
  presharedKey: string;
  meshMode: 'client' | 'repeater' | 'router_gateway';
}

export interface CryptographicIdentity {
  nodeId: string;
  callsign: string;
  publicKeyBase64: string;
  fingerprint: string;
  privateKey?: CryptoKey;
  publicKey?: CryptoKey;
}

export interface UserProfile {
  nodeId: string; // Unique Device ID (e.g. "!79fc127b")
  callsign: string; // Username / tactical callsign
  avatarUrl: string; // Display picture URL or preset SVG identifier
  statusMessage: string; // e.g. "Available via Internet & LoRa", "On Patrol"
  hardwareType: string;
  frequencyBand: string;
  publicKeyBase64: string;
  fingerprint: string;
  batteryPct?: number;
}

export interface MeshContact {
  id: string; // Node ID
  nodeId: string; // Unique radio address (e.g. "!a9f24c01")
  callsign: string;
  nickname?: string;
  avatarUrl?: string;
  publicKey: string;
  fingerprint: string;
  hardwareType?: string;
  frequencyBand?: string;
  lastSeenMs: number;
  rssiDbm: number;
  snrDb: number;
  hopDistance: number;
  isVerified: boolean;
  notes?: string;
  status: 'in_mesh' | 'recent' | 'offline' | 'online_cloud';
}

export interface ChatConversationItem {
  id: string; // channelId or contact nodeId
  name: string;
  avatarUrl?: string;
  isDirect: boolean;
  recipientNodeId?: string;
  lastMessage?: string;
  lastMessageTime?: number;
  unreadCount: number;
  statusText?: string;
  isOnline?: boolean;
  transport?: TransportMedium;
}
