import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createMeshPacket,
  shouldRelayPacket,
  prepareRelayPacket,
  calculateLinkQuality,
  estimateAirtimeMs,
  prioritizePacketQueue,
  SeenPacketCache,
} from './routing';
import { MeshPacket } from './types';

test('createMeshPacket creates packet with hopCount 0 and correct sender', () => {
  const pkt = createMeshPacket({
    channelId: 'tactical-1',
    senderId: '!node001',
    senderCallsign: 'ALPHA-LEADER',
    type: 'text',
    payloadCiphertext: 'deadbeef1234',
    nonce: 'a1b2c3d4e5f6',
    transportMedium: 'bluetooth_mesh',
  });

  assert.equal(pkt.senderId, '!node001');
  assert.equal(pkt.senderCallsign, 'ALPHA-LEADER');
  assert.equal(pkt.hopCount, 0);
  assert.equal(pkt.maxHops, 7);
  assert.equal(pkt.status, 'transmitting');
  assert.deepEqual(pkt.relayPath, ['!node001']);
});

test('shouldRelayPacket respects seen cache duplicate suppression', () => {
  const cache = new SeenPacketCache(100);
  const pkt = createMeshPacket({
    channelId: 'tactical-1',
    senderId: '!node001',
    senderCallsign: 'ALPHA-LEADER',
    type: 'text',
    payloadCiphertext: 'abc',
    nonce: '123',
    transportMedium: 'lora_rf_915',
  });

  const decision1 = shouldRelayPacket(pkt, '!node002', cache);
  assert.equal(decision1.relay, true);

  cache.add(pkt.id);
  const decision2 = shouldRelayPacket(pkt, '!node002', cache);
  assert.equal(decision2.relay, false);
  assert.match(decision2.reason, /Duplicate/);
});

test('shouldRelayPacket prevents loop and self-originated forwarding', () => {
  const cache = new SeenPacketCache(100);
  const pkt = createMeshPacket({
    channelId: 'tactical-1',
    senderId: '!node001',
    senderCallsign: 'ALPHA-LEADER',
    type: 'text',
    payloadCiphertext: 'abc',
    nonce: '123',
    transportMedium: 'lora_rf_915',
  });

  // Self originated
  const decisionSelf = shouldRelayPacket(pkt, '!node001', cache);
  assert.equal(decisionSelf.relay, false);
  assert.match(decisionSelf.reason, /Originated by self/);

  // Relay loop prevention
  const relayedPkt = prepareRelayPacket(pkt, '!node002');
  const decisionLoop = shouldRelayPacket(relayedPkt, '!node002', cache);
  assert.equal(decisionLoop.relay, false);
  assert.match(decisionLoop.reason, /relay path/);
});

test('shouldRelayPacket stops relaying when maxHops reached', () => {
  const cache = new SeenPacketCache(100);
  const pkt = createMeshPacket({
    channelId: 'tactical-1',
    senderId: '!node001',
    senderCallsign: 'ALPHA-LEADER',
    type: 'text',
    payloadCiphertext: 'abc',
    nonce: '123',
    transportMedium: 'lora_rf_915',
    maxHops: 2,
  });

  pkt.hopCount = 2;
  const decision = shouldRelayPacket(pkt, '!node999', cache);
  assert.equal(decision.relay, false);
  assert.match(decision.reason, /Hop limit exceeded/);
});

test('calculateLinkQuality computes scaled link quality correctly', () => {
  const excellent = calculateLinkQuality(-55, 12);
  assert.equal(excellent.quality, 'excellent');
  assert.ok(excellent.score >= 80);

  const poor = calculateLinkQuality(-125, -15);
  assert.equal(poor.quality, 'poor');
  assert.ok(poor.score < 35);
});

test('estimateAirtimeMs produces realistic positive LoRa duration', () => {
  const airtimeSF7 = estimateAirtimeMs(64, 7, 125);
  const airtimeSF12 = estimateAirtimeMs(64, 12, 125);

  assert.ok(airtimeSF7 > 0);
  assert.ok(airtimeSF12 > airtimeSF7, 'SF12 airtime should be much longer than SF7');
});

test('prioritizePacketQueue elevates emergency_sos above text and telemetry', () => {
  const textPkt: MeshPacket = {
    id: '1',
    type: 'text',
    timestamp: 100,
  } as MeshPacket;

  const sosPkt: MeshPacket = {
    id: '2',
    type: 'emergency_sos',
    timestamp: 200,
  } as MeshPacket;

  const voicePkt: MeshPacket = {
    id: '3',
    type: 'voice',
    timestamp: 150,
  } as MeshPacket;

  const sorted = prioritizePacketQueue([textPkt, sosPkt, voicePkt]);
  assert.equal(sorted[0].id, '2', 'Emergency SOS must be first');
  assert.equal(sorted[1].id, '3', 'Voice packet must be second');
  assert.equal(sorted[2].id, '1', 'Text packet must be third');
});
