import { MeshContact, MeshNode, UserProfile } from './types';

/**
 * Validates unique Device ID format.
 * Must begin with '!' followed by 8 hexadecimal characters, e.g. "!a9f24c01".
 */
export function validateDeviceNodeId(nodeId: string): boolean {
  if (!nodeId || typeof nodeId !== 'string') return false;
  return /^![0-9a-fA-F]{8}$/.test(nodeId.trim());
}

/**
 * Generates a unique 4-byte (8 hex characters) radio device node ID.
 */
export function generateDeviceNodeId(): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(4);
    crypto.getRandomValues(bytes);
    const hex = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return `!${hex}`;
  }
  return `!${Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0')}`;
}

/**
 * Creates a saved contact record from an observed mesh node beacon.
 */
export function createContactFromMeshNode(
  node: MeshNode,
  nickname?: string,
  notes?: string
): MeshContact {
  return {
    id: node.id,
    nodeId: node.id,
    callsign: node.callsign,
    nickname: nickname?.trim() || node.callsign,
    publicKey: node.publicKey,
    fingerprint: node.publicKey.substring(0, 16).toUpperCase(),
    hardwareType: node.hardwareType,
    frequencyBand: node.frequencyBand,
    lastSeenMs: node.lastSeenMs,
    rssiDbm: node.rssiDbm,
    snrDb: node.snrDb,
    hopDistance: node.hopDistance,
    isVerified: false,
    notes: notes?.trim() || '',
    status: 'in_mesh',
  };
}

/**
 * Filters discovered mesh nodes that are not yet saved in the user's contact list.
 */
export function filterDiscoveredMeshNodes(
  allNodes: MeshNode[],
  savedContacts: MeshContact[],
  selfNodeId: string
): MeshNode[] {
  const contactNodeIds = new Set(savedContacts.map((c) => c.nodeId));
  return allNodes.filter((node) => node.id !== selfNodeId && !contactNodeIds.has(node.id));
}

/**
 * Sorts contacts by active mesh proximity (direct hops first, then RSSI strength).
 */
export function sortContactsByProximity(contacts: MeshContact[]): MeshContact[] {
  return [...contacts].sort((a, b) => {
    // 1. Direct hop first
    if (a.hopDistance !== b.hopDistance) {
      return a.hopDistance - b.hopDistance;
    }
    // 2. Stronger RSSI first (e.g. -50 > -80)
    return b.rssiDbm - a.rssiDbm;
  });
}
