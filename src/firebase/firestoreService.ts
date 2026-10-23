import {
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from './config';
import { MeshPacket } from '../mesh/types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((p) => ({
        providerId: p.providerId,
        email: p.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function syncUserMeshProfile(userId: string, data: {
  callsign: string;
  avatarUrl?: string;
  statusMessage?: string;
  publicKey: string;
  radioNodeId: string;
  hardwareType?: string;
  frequencyBand?: string;
}) {
  const path = `users/${userId}`;
  try {
    await setDoc(doc(db, 'users', userId), {
      id: userId,
      callsign: data.callsign,
      avatarUrl: data.avatarUrl || 'avatar_specops',
      statusMessage: data.statusMessage || 'Available via Internet & LoRa Mesh',
      publicKey: data.publicKey,
      radioNodeId: data.radioNodeId,
      hardwareType: data.hardwareType || 'Cross-Platform Mesh Client',
      frequencyBand: data.frequencyBand || '915MHz LoRa & BLE',
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function syncMessageToGateway(packet: MeshPacket) {
  if (!auth.currentUser) return;
  const path = `messages/${packet.id}`;
  try {
    await setDoc(doc(db, 'messages', packet.id), {
      id: packet.id,
      channelId: packet.channelId,
      senderId: auth.currentUser.uid,
      senderCallsign: packet.senderCallsign,
      recipientId: packet.recipientId,
      type: packet.type,
      payloadCiphertext: packet.payloadCiphertext,
      nonce: packet.nonce,
      hopCount: packet.hopCount,
      transportMedium: packet.transportMedium,
      audioDurationSec: packet.audioDurationSec || 0,
      rssiDbm: packet.rssiDbm || -50,
      snrDb: packet.snrDb || 10,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function subscribeGatewayMessages(channelId: string, onMessages: (packets: Partial<MeshPacket>[]) => void) {
  const path = 'messages';
  try {
    const q = query(
      collection(db, path),
      where('channelId', '==', channelId),
      limit(50)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const msgs = snapshot.docs.map((d) => d.data() as Partial<MeshPacket>);
        onMessages(msgs);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}
