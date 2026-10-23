import { MeshNode, MeshPacket, MessageType, TransportMedium } from './types';

export class SeenPacketCache {
  private cache = new Map<string, number>();
  private readonly maxSize: number;
  private readonly ttlMs: number;

  constructor(maxSize = 1000, ttlMs = 10 * 60 * 1000) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }

  has(packetId: string): boolean {
    const time = this.cache.get(packetId);
    if (!time) return false;
    if (Date.now() - time > this.ttlMs) {
      this.cache.delete(packetId);
      return false;
    }
    return true;
  }

  add(packetId: string): void {
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }
    this.cache.set(packetId, Date.now());
  }

  size(): number {
    return this.cache.size;
  }

  clear(): void {
    this.cache.clear();
  }
}

/**
 * Creates a new mesh packet ready for transmission.
 */
export function createMeshPacket(params: {
  channelId: string;
  senderId: string;
  senderCallsign: string;
  recipientId?: string;
  type: MessageType;
  payloadCiphertext: string;
  nonce: string;
  transportMedium: TransportMedium;
  isEncrypted?: boolean;
  decryptedContent?: string;
  audioDurationSec?: number;
  maxHops?: number;
}): MeshPacket {
  const timestamp = Date.now();
  const id = `pkt_${timestamp}_${Math.random().toString(36).substring(2, 9)}`;

  return {
    id,
    channelId: params.channelId,
    senderId: params.senderId,
    senderCallsign: params.senderCallsign,
    recipientId: params.recipientId || 'BROADCAST',
    type: params.type,
    payloadCiphertext: params.payloadCiphertext,
    nonce: params.nonce,
    hopCount: 0,
    maxHops: params.maxHops ?? 7,
    transportMedium: params.transportMedium,
    timestamp,
    audioDurationSec: params.audioDurationSec,
    rssiDbm: -45, // Initial transmit baseline
    snrDb: 10.5,
    isEncrypted: params.isEncrypted ?? true,
    decryptedContent: params.decryptedContent,
    status: 'transmitting',
    relayPath: [params.senderId],
  };
}

/**
 * Decides whether a node should relay an incoming packet based on epidemic mesh rules.
 */
export function shouldRelayPacket(
  packet: MeshPacket,
  localNodeId: string,
  seenCache: SeenPacketCache
): { relay: boolean; reason: string } {
  // 1. Never relay if already seen
  if (seenCache.has(packet.id)) {
    return { relay: false, reason: 'Duplicate packet already processed' };
  }

  // 2. Do not relay packet originated by self
  if (packet.senderId === localNodeId) {
    return { relay: false, reason: 'Originated by self' };
  }

  // 3. Do not relay if already in relay path (loop prevention)
  if (packet.relayPath.includes(localNodeId)) {
    return { relay: false, reason: 'Self already in relay path (loop prevention)' };
  }

  // 4. Check Hop Count against Max Hops (TTL)
  if (packet.hopCount >= packet.maxHops) {
    return { relay: false, reason: 'Hop limit exceeded (TTL expired)' };
  }

  return { relay: true, reason: 'Valid for multi-hop relay' };
}

/**
 * Prepares a packet for retransmission as a relay node.
 */
export function prepareRelayPacket(packet: MeshPacket, localNodeId: string): MeshPacket {
  return {
    ...packet,
    hopCount: packet.hopCount + 1,
    relayPath: [...packet.relayPath, localNodeId],
    status: 'relayed',
  };
}

/**
 * Calculate link quality score (0 - 100%) based on RSSI (dBm) and SNR (dB).
 * Typical LoRa: RSSI from -125 (very weak) to -30 (very strong), SNR from -15 to +12 dB.
 */
export function calculateLinkQuality(rssiDbm: number, snrDb: number): { score: number; quality: 'excellent' | 'good' | 'fair' | 'poor' } {
  // Normalize RSSI: -120 dBm -> 0, -50 dBm -> 100
  const rssiNorm = Math.min(100, Math.max(0, ((rssiDbm + 120) / 70) * 100));
  // Normalize SNR: -10 dB -> 0, +10 dB -> 100
  const snrNorm = Math.min(100, Math.max(0, ((snrDb + 10) / 20) * 100));

  const score = Math.round(rssiNorm * 0.6 + snrNorm * 0.4);

  let quality: 'excellent' | 'good' | 'fair' | 'poor' = 'poor';
  if (score >= 80) quality = 'excellent';
  else if (score >= 60) quality = 'good';
  else if (score >= 35) quality = 'fair';

  return { score, quality };
}

/**
 * Estimates physical LoRa transmission airtime in milliseconds.
 * Semtech SX1262 / SX1276 standard formula.
 */
export function estimateAirtimeMs(payloadBytes: number, sf: number, bwKhz: number): number {
  const symbolDurationMs = (Math.pow(2, sf) / (bwKhz * 1000)) * 1000;
  const preambleSymbols = 8 + 4.25;
  const preambleDurationMs = preambleSymbols * symbolDurationMs;

  // Simplified packet symbol calculation (explicit header, coding rate 4/5)
  const nPayload = 8 + Math.max(Math.ceil((8 * payloadBytes - 4 * sf + 28) / (4 * sf)) * 5, 0);
  const payloadDurationMs = nPayload * symbolDurationMs;

  return Math.round(preambleDurationMs + payloadDurationMs);
}

/**
 * Sorts packet queue by priority: Emergency SOS > Voice > Text > Telemetry.
 */
export function prioritizePacketQueue(packets: MeshPacket[]): MeshPacket[] {
  const priorityMap: Record<MessageType, number> = {
    emergency_sos: 0,
    voice: 1,
    text: 2,
    ai_brief: 3,
    telemetry: 4,
  };

  return [...packets].sort((a, b) => {
    const prioA = priorityMap[a.type] ?? 99;
    const prioB = priorityMap[b.type] ?? 99;
    if (prioA !== prioB) return prioA - prioB;
    return a.timestamp - b.timestamp;
  });
}
