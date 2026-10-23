import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bytesToHex,
  hexToBytes,
  formatFingerprint,
  sha256Hex,
  encryptPayload,
  decryptPayload,
} from './crypto';

test('bytesToHex and hexToBytes are bijective inverses', () => {
  const original = new Uint8Array([0x00, 0x1a, 0xff, 0x4b, 0x7c]);
  const hex = bytesToHex(original);
  assert.equal(hex, '001aff4b7c');
  const restored = hexToBytes(hex);
  assert.deepEqual(Array.from(restored), Array.from(original));
});

test('formatFingerprint groups hex into 4-char tactical blocks', () => {
  const rawHex = 'a1b2c3d4e5f678901122334455667788';
  const formatted = formatFingerprint(rawHex);
  assert.equal(formatted, 'A1B2 : C3D4 : E5F6 : 7890');
});

test('sha256Hex produces consistent hash string', async () => {
  const hash1 = await sha256Hex('MeshWave-LoRa-Test');
  const hash2 = await sha256Hex('MeshWave-LoRa-Test');
  assert.equal(hash1, hash2);
  assert.ok(hash1.length >= 32);
});

test('encryptPayload and decryptPayload round-trip ciphertext', async () => {
  const plaintext = 'Tactical Grid 44 Alpha: Evac in 20 min';
  const passphrase = 'secret-tactical-key-99';

  const { ciphertext, nonce } = await encryptPayload(plaintext, passphrase);
  assert.ok(ciphertext.length > 0);
  assert.ok(nonce.length > 0);

  const decrypted = await decryptPayload(ciphertext, nonce, passphrase);
  assert.equal(decrypted, plaintext);
});
