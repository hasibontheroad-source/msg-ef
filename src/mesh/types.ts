export type TransportMedium = 
  | 'bluetooth_mesh'
  | 'lora_rf_915'
  | 'lora_rf_868'
  | 'lora_rf_433'
  | 'acoustic_fsk'
  | 'webrtc_p2p'
  | 'cloud_gateway';

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
}

export interface MeshPacket {
  id: string; // Unique packet hash / id
  channelId: string;
  senderId: string;
  senderCallsign: string;
  recipientId: string; // Target Node ID or 'BROADCAST'
  type: MessageType;
  payloadCiphertext: string; // Encrypted text or audio base64
  nonce: string; // Initialization vector / IV
  mac?: string; // Auth tag or HMAC
  hopCount: number;
  maxHops: number; // TTL (typically 7)
  transportMedium: TransportMedium;
  timestamp: number;
  audioDurationSec?: number;
  rssiDbm?: number;
  snrDb?: number;
  isEncrypted: boolean;
  decryptedContent?: string; // Decrypted client-side only
  audioBlobUrl?: string; // Playable blob for voice messages
  status: 'transmitting' | 'relayed' | 'delivered' | 'cached';
  relayPath: string[]; // List of node IDs that relayed this packet
}

export interface RadioConfig {
  frequencyMhz: number; // e.g. 915.0 or 868.0
  bandwidthKhz: number; // 125, 250, 500
  spreadingFactor: number; // SF7 - SF12
  codingRate: string; // 4/5, 4/8
  txPowerDbm: number; // 2 - 22 dBm
  channelName: string;
  presharedKey: string;
  meshMode: 'client' | 'repeater' | 'router_gateway';
}

export interface CryptographicIdentity {
  nodeId: string;
  callsign: string;
  publicKeyBase64: string;
  fingerprint: string; // SHA-256 8-byte hex blocks for verification
  privateKey?: CryptoKey;
  publicKey?: CryptoKey;
}
