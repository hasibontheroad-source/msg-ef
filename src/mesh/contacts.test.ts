import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateDeviceNodeId,
  generateDeviceNodeId,
  createContactFromMeshNode,
  filterDiscoveredMeshNodes,
  sortContactsByProximity,
} from './contacts';
import { MeshContact, MeshNode } from './types';

test('validateDeviceNodeId accepts valid 8-hex character node IDs with ! prefix', () => {
  assert.equal(validateDeviceNodeId('!a9f24c01'), true);
  assert.equal(validateDeviceNodeId('!79FC127B'), true);
  assert.equal(validateDeviceNodeId('!00000000'), true);
});

test('validateDeviceNodeId rejects malformed or invalid IDs', () => {
  assert.equal(validateDeviceNodeId(''), false);
  assert.equal(validateDeviceNodeId('a9f24c01'), false, 'Missing ! prefix');
  assert.equal(validateDeviceNodeId('!a9f2'), false, 'Too short');
  assert.equal(validateDeviceNodeId('!a9f24c0199'), false, 'Too long');
  assert.equal(validateDeviceNodeId('!xyz12345'), false, 'Non-hex character');
});

test('generateDeviceNodeId produces valid unique node ID', () => {
  const id1 = generateDeviceNodeId();
  const id2 = generateDeviceNodeId();
  assert.equal(validateDeviceNodeId(id1), true);
  assert.equal(validateDeviceNodeId(id2), true);
  assert.notEqual(id1, id2);
});

test('createContactFromMeshNode initializes contact with correct properties', () => {
  const mockNode: MeshNode = {
    id: '!node001',
    callsign: 'BRAVO-SCOUT',
    role: 'client',
    hardwareType: 'Android BLE',
    frequencyBand: 'BLE 2.4GHz',
    batteryPct: 80,
    lastSeenMs: 123456,
    rssiDbm: -70,
    snrDb: 8.5,
    hopDistance: 1,
    publicKey: '04mockpublickey123',
    isDirectNeighbor: true,
    status: 'active',
  };

  const contact = createContactFromMeshNode(mockNode, 'Scout Unit 1', 'Lead reconnaissance');
  assert.equal(contact.id, '!node001');
  assert.equal(contact.nodeId, '!node001');
  assert.equal(contact.callsign, 'BRAVO-SCOUT');
  assert.equal(contact.nickname, 'Scout Unit 1');
  assert.equal(contact.notes, 'Lead reconnaissance');
  assert.equal(contact.isVerified, false);
});

test('filterDiscoveredMeshNodes excludes self and already saved contacts', () => {
  const nodes: MeshNode[] = [
    { id: '!self', callsign: 'OPERATOR' } as MeshNode,
    { id: '!saved1', callsign: 'SAVED-1' } as MeshNode,
    { id: '!new1', callsign: 'NEW-PEER' } as MeshNode,
  ];

  const saved: MeshContact[] = [
    { id: '!saved1', nodeId: '!saved1', callsign: 'SAVED-1' } as MeshContact,
  ];

  const discovered = filterDiscoveredMeshNodes(nodes, saved, '!self');
  assert.equal(discovered.length, 1);
  assert.equal(discovered[0].id, '!new1');
});

test('sortContactsByProximity prioritizes direct hops then strongest RSSI', () => {
  const c1: MeshContact = { id: '1', hopDistance: 2, rssiDbm: -60 } as MeshContact;
  const c2: MeshContact = { id: '2', hopDistance: 1, rssiDbm: -85 } as MeshContact;
  const c3: MeshContact = { id: '3', hopDistance: 1, rssiDbm: -50 } as MeshContact;

  const sorted = sortContactsByProximity([c1, c2, c3]);
  assert.equal(sorted[0].id, '3', 'Hop 1 with -50dBm is closest');
  assert.equal(sorted[1].id, '2', 'Hop 1 with -85dBm is second');
  assert.equal(sorted[2].id, '1', 'Hop 2 is third');
});
