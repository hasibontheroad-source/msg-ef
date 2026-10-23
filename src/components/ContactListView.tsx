import React, { useState } from 'react';
import {
  UserPlus,
  Search,
  ShieldCheck,
  MessageSquare,
  Trash2,
  Radio,
  Signal,
  CheckCircle2,
  Layers,
  Cpu,
  Wifi,
  Sparkles,
  AlertCircle,
  X,
} from 'lucide-react';
import { MeshContact, MeshNode } from '../mesh/types';
import { PRESET_AVATARS } from '../mesh/meshEngine';
import { createContactFromMeshNode, validateDeviceNodeId } from '../mesh/contacts';

interface ContactListViewProps {
  contacts: MeshContact[];
  discoveredNodes: MeshNode[];
  onSelectDirectMessage: (contactNodeId: string, contactName: string) => void;
  onAddContact: (contact: MeshContact) => void;
  onRemoveContact: (contactId: string) => void;
  onToggleVerification: (contactId: string) => void;
}

export const ContactListView: React.FC<ContactListViewProps> = ({
  contacts,
  discoveredNodes,
  onSelectDirectMessage,
  onAddContact,
  onRemoveContact,
  onToggleVerification,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'saved' | 'discovered'>('saved');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Add Contact Form State
  const [newUsername, setNewUsername] = useState('');
  const [newDeviceId, setNewDeviceId] = useState('');
  const [newNickname, setNewNickname] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [addError, setAddError] = useState<string | null>(null);

  const filteredContacts = contacts.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.callsign.toLowerCase().includes(q) ||
      (c.nickname && c.nickname.toLowerCase().includes(q)) ||
      c.nodeId.toLowerCase().includes(q)
    );
  });

  const filteredDiscovered = discoveredNodes.filter((n) => {
    const q = searchQuery.toLowerCase();
    return n.callsign.toLowerCase().includes(q) || n.id.toLowerCase().includes(q);
  });

  const handleCreateManualContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim()) {
      setAddError('Please enter a contact username.');
      return;
    }
    if (!validateDeviceNodeId(newDeviceId)) {
      setAddError('Invalid Device ID format. Must begin with "!" and 8 hex digits (e.g. !a9f24c01).');
      return;
    }
    setAddError(null);

    const newContact: MeshContact = {
      id: newDeviceId.trim(),
      nodeId: newDeviceId.trim(),
      callsign: newUsername.trim(),
      nickname: newNickname.trim() || newUsername.trim(),
      avatarUrl: 'avatar_operator',
      publicKey: `04mock_${newDeviceId.substring(1)}`,
      fingerprint: `${newDeviceId.substring(1, 5).toUpperCase()} : 00FF : E2EE`,
      hardwareType: 'Mesh / Internet Peer',
      lastSeenMs: Date.now(),
      rssiDbm: -60,
      snrDb: 10,
      hopDistance: 1,
      isVerified: false,
      notes: newNotes.trim(),
      status: 'online_cloud',
    };

    onAddContact(newContact);
    setIsAddModalOpen(false);
    setNewUsername('');
    setNewDeviceId('');
    setNewNickname('');
    setNewNotes('');
  };

  const handleAddFromDiscovered = (node: MeshNode) => {
    const contact = createContactFromMeshNode(node);
    onAddContact(contact);
  };

  const renderAvatar = (avatarUrl?: string, name?: string) => {
    if (avatarUrl?.startsWith('data:')) {
      return <img src={avatarUrl} alt={name} className="w-10 h-10 rounded-xl object-cover" />;
    }
    const preset = PRESET_AVATARS.find((p) => p.id === avatarUrl);
    if (preset) {
      return (
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${preset.color}`}>
          {preset.icon}
        </div>
      );
    }
    return (
      <div className="w-10 h-10 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-sm font-bold text-emerald-400">
        {name?.substring(0, 2).toUpperCase() || 'OP'}
      </div>
    );
  };

  return (
    <div className="flex-1 max-w-5xl mx-auto w-full p-4 sm:p-6 space-y-4 font-sans text-neutral-100">
      {/* Search and Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search contacts by name or ID..."
            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-9 pr-4 py-2 text-xs font-mono text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Subtabs: Saved vs Discovered */}
          <div className="flex items-center p-1 bg-neutral-900 rounded-xl border border-neutral-800 text-xs font-mono">
            <button
              onClick={() => setActiveSubTab('saved')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeSubTab === 'saved'
                  ? 'bg-neutral-800 text-emerald-300 font-bold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              SAVED ({contacts.length})
            </button>
            <button
              onClick={() => setActiveSubTab('discovered')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'discovered'
                  ? 'bg-neutral-800 text-emerald-300 font-bold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>DISCOVERED ({discoveredNodes.length})</span>
            </button>
          </div>

          {/* Add Contact Button */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5 shadow-md shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">ADD CONTACT</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeSubTab === 'saved' ? (
        <div className="space-y-2">
          {filteredContacts.length === 0 ? (
            <div className="p-8 text-center bg-neutral-900/60 border border-neutral-800 rounded-2xl space-y-2">
              <UserPlus className="w-8 h-8 text-neutral-600 mx-auto" />
              <p className="text-sm font-medium text-neutral-400">No saved contacts matching query</p>
              <p className="text-xs text-neutral-500">
                Add contacts discovered over the mesh network or enter a peer's unique Device ID.
              </p>
            </div>
          ) : (
            filteredContacts.map((contact) => (
              <div
                key={contact.id}
                className="bg-neutral-900/80 hover:bg-neutral-900 border border-neutral-800/80 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
              >
                {/* Contact Identity Info */}
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    {renderAvatar(contact.avatarUrl, contact.callsign)}
                    <span
                      className={`w-3 h-3 rounded-full absolute -bottom-0.5 -right-0.5 border-2 border-neutral-900 ${
                        contact.status === 'online_cloud'
                          ? 'bg-blue-500'
                          : contact.status === 'in_mesh'
                          ? 'bg-emerald-500'
                          : 'bg-neutral-600'
                      }`}
                      title={
                        contact.status === 'online_cloud'
                          ? 'Online via Internet'
                          : contact.status === 'in_mesh'
                          ? 'In Mesh via LoRa/BLE'
                          : 'Offline'
                      }
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-neutral-100 text-sm">{contact.nickname || contact.callsign}</span>
                      {contact.isVerified ? (
                        <span
                          className="flex items-center gap-0.5 text-[10px] text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800 font-mono"
                          title="Cryptographically Verified Key"
                        >
                          <ShieldCheck className="w-3 h-3" /> VERIFIED
                        </span>
                      ) : (
                        <button
                          onClick={() => onToggleVerification(contact.id)}
                          className="text-[10px] text-neutral-500 hover:text-emerald-400 font-mono underline cursor-pointer"
                        >
                          Verify Key
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs font-mono text-neutral-400 mt-0.5">
                      <span className="text-emerald-400 font-medium">{contact.callsign}</span>
                      <span>•</span>
                      <span className="text-neutral-500">{contact.nodeId}</span>
                    </div>

                    {contact.notes && (
                      <p className="text-xs text-neutral-400 mt-1 italic line-clamp-1">{contact.notes}</p>
                    )}
                  </div>
                </div>

                {/* Status Telemetry & Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-800/80">
                  <div className="text-left sm:text-right font-mono text-[11px] text-neutral-400 space-y-0.5">
                    <div className="flex items-center sm:justify-end gap-1.5">
                      {contact.status === 'online_cloud' ? (
                        <span className="flex items-center gap-1 text-blue-400">
                          <Wifi className="w-3 h-3" /> Online Internet
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-emerald-400">
                          <Radio className="w-3 h-3" /> In Mesh ({contact.rssiDbm} dBm)
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-neutral-500">
                      {contact.hopDistance === 0 ? 'Direct Peer' : `${contact.hopDistance} Hops Away`}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onSelectDirectMessage(contact.nodeId, contact.nickname || contact.callsign)}
                      aria-label={`Send direct message to ${contact.callsign}`}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>MESSAGE</span>
                    </button>

                    <button
                      onClick={() => {
                        if (window.confirm(`Remove ${contact.nickname || contact.callsign} from saved contacts?`)) {
                          onRemoveContact(contact.id);
                        }
                      }}
                      aria-label={`Remove contact ${contact.callsign}`}
                      className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-rose-400 cursor-pointer transition-colors"
                      title="Remove Contact"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* Discovered Mesh Peers List */
        <div className="space-y-2">
          {filteredDiscovered.length === 0 ? (
            <div className="p-8 text-center bg-neutral-900/60 border border-neutral-800 rounded-2xl space-y-2">
              <Radio className="w-8 h-8 text-neutral-600 mx-auto animate-pulse" />
              <p className="text-sm font-medium text-neutral-400">All heard mesh nodes are already in your contacts</p>
              <p className="text-xs text-neutral-500">
                New nodes transmitting beacons on 915MHz or BLE will automatically appear here.
              </p>
            </div>
          ) : (
            filteredDiscovered.map((node) => (
              <div
                key={node.id}
                className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-sm font-bold text-amber-400">
                    <Radio className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-neutral-100 text-sm">{node.callsign}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300">
                        {node.role.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-xs font-mono text-neutral-400 mt-0.5">
                      Node ID: <span className="text-emerald-400">{node.id}</span> • {node.hardwareType}
                    </div>
                    <div className="text-[11px] font-mono text-neutral-500 mt-0.5">
                      Signal: {node.rssiDbm} dBm • SNR: {node.snrDb} dB • {node.hopDistance} Hops
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleAddFromDiscovered(node)}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>ADD TO CONTACTS</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Manual Add Contact Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-sans">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-md w-full p-6 text-neutral-100 relative shadow-2xl">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-neutral-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 pb-3 border-b border-neutral-800">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-100">ADD MESH CONTACT</h3>
                <p className="text-xs text-neutral-400 font-mono">Connect via Unique Radio Device ID</p>
              </div>
            </div>

            <form onSubmit={handleCreateManualContact} className="py-4 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-300 block">USERNAME / CALLSIGN:</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="e.g. Echo Leader"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-sm text-neutral-100 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-300 block">UNIQUE DEVICE ID:</label>
                <input
                  type="text"
                  value={newDeviceId}
                  onChange={(e) => setNewDeviceId(e.target.value)}
                  placeholder="!a9f24c01"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-sm font-mono text-emerald-400 focus:outline-none focus:border-emerald-500"
                  required
                />
                <p className="text-[10px] text-neutral-500 font-mono">
                  8-hexadecimal characters preceded by "!" (found in peer profile)
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-300 block">OPTIONAL NICKNAME:</label>
                <input
                  type="text"
                  value={newNickname}
                  onChange={(e) => setNewNickname(e.target.value)}
                  placeholder="e.g. Sarah (Base Camp)"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-sm text-neutral-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-300 block">NOTES:</label>
                <input
                  type="text"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="e.g. Primary contact in sector 2"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-sm text-neutral-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {addError && (
                <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{addError}</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold cursor-pointer transition-colors shadow-md"
                >
                  SAVE CONTACT
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
