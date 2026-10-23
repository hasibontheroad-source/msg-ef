import React from 'react';
import {
  Search,
  Plus,
  Users,
  Radio,
  Wifi,
  Zap,
  Globe,
  Radar,
  Sliders,
  Sparkles,
  Settings,
  ShieldCheck,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { ChatConversationItem, MeshContact, NetworkMode, UserProfile } from '../mesh/types';
import { PRESET_AVATARS } from '../mesh/meshEngine';

interface ChatSidebarProps {
  userProfile: UserProfile;
  conversations: ChatConversationItem[];
  activeConversationId: string;
  onSelectConversation: (id: string) => void;
  networkMode: NetworkMode;
  onChangeNetworkMode: (mode: NetworkMode) => void;
  onOpenProfile: () => void;
  onOpenContacts: () => void;
  onOpenRadar: () => void;
  onOpenRadio: () => void;
  onOpenAi: () => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  userProfile,
  conversations,
  activeConversationId,
  onSelectConversation,
  networkMode,
  onChangeNetworkMode,
  onOpenProfile,
  onOpenContacts,
  onOpenRadar,
  onOpenRadio,
  onOpenAi,
}) => {
  const [search, setSearch] = React.useState('');

  const filtered = conversations.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const renderAvatar = (avatarUrl?: string, name?: string) => {
    if (avatarUrl?.startsWith('data:')) {
      return <img src={avatarUrl} alt={name} className="w-10 h-10 rounded-xl object-cover shrink-0" />;
    }
    const preset = PRESET_AVATARS.find((p) => p.id === avatarUrl);
    if (preset) {
      return (
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${preset.color}`}>
          {preset.icon}
        </div>
      );
    }
    return (
      <div className="w-10 h-10 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-xs font-bold text-emerald-400 shrink-0">
        {name?.substring(0, 2).toUpperCase() || 'CH'}
      </div>
    );
  };

  return (
    <aside className="w-full md:w-80 lg:w-96 border-r border-neutral-800 bg-neutral-950 flex flex-col h-full shrink-0 select-none">
      {/* User Profile Mini Bar */}
      <div className="p-3 border-b border-neutral-800 flex items-center justify-between gap-3 bg-neutral-900/60">
        <button
          onClick={onOpenProfile}
          className="flex items-center gap-2.5 text-left hover:opacity-90 transition-opacity cursor-pointer flex-1 min-w-0"
        >
          {renderAvatar(userProfile.avatarUrl, userProfile.callsign)}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm text-neutral-100 truncate">{userProfile.callsign}</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            </div>
            <div className="text-[11px] font-mono text-emerald-400/90 truncate">{userProfile.nodeId}</div>
          </div>
        </button>

        <button
          onClick={onOpenProfile}
          title="Profile & Identity Settings"
          aria-label="Profile settings"
          className="p-2 rounded-xl text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 cursor-pointer transition-colors"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Network Mode Switcher (Hybrid / Online / Offline) */}
      <div className="p-2.5 border-b border-neutral-800 bg-neutral-900/30">
        <div className="grid grid-cols-3 gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800 text-[10px] font-mono font-medium">
          <button
            onClick={() => onChangeNetworkMode('hybrid')}
            title="Auto routes over Internet when online, fails over to LoRa/BLE Radio when offline"
            className={`py-1.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1 ${
              networkMode === 'hybrid'
                ? 'bg-emerald-600 text-white font-bold shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Zap className="w-3 h-3 text-amber-300" />
            <span>HYBRID</span>
          </button>

          <button
            onClick={() => onChangeNetworkMode('internet')}
            title="Online Cloud Messaging via Firebase / Internet"
            className={`py-1.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1 ${
              networkMode === 'internet'
                ? 'bg-blue-600 text-white font-bold shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Globe className="w-3 h-3 text-blue-300" />
            <span>ONLINE</span>
          </button>

          <button
            onClick={() => onChangeNetworkMode('mesh_offline')}
            title="100% Offline Radio Mesh (LoRa RF 915MHz & BLE P2P)"
            className={`py-1.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1 ${
              networkMode === 'mesh_offline'
                ? 'bg-purple-600 text-white font-bold shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Radio className="w-3 h-3 text-emerald-300" />
            <span>MESH RF</span>
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="p-2.5 border-b border-neutral-900">
        <div className="relative">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search chats or channels..."
            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-emerald-600"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto divide-y divide-neutral-900/60">
        {filtered.map((item) => {
          const isActive = activeConversationId === item.id;
          const isSos = item.id === 'Emergency-SOS-911';

          return (
            <button
              key={item.id}
              onClick={() => onSelectConversation(item.id)}
              className={`w-full p-3 flex items-center gap-3 text-left transition-colors cursor-pointer ${
                isActive
                  ? 'bg-neutral-800/90 border-l-4 border-emerald-500'
                  : 'hover:bg-neutral-900/70 border-l-4 border-transparent'
              } ${isSos ? 'bg-rose-950/20' : ''}`}
            >
              <div className="relative shrink-0">
                {renderAvatar(item.avatarUrl, item.name)}
                <span
                  className={`w-2.5 h-2.5 rounded-full absolute -bottom-0.5 -right-0.5 border-2 border-neutral-950 ${
                    item.isOnline
                      ? 'bg-blue-500'
                      : isSos
                      ? 'bg-rose-500 animate-ping'
                      : 'bg-emerald-500'
                  }`}
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className={`font-semibold text-xs truncate ${isSos ? 'text-rose-400' : 'text-neutral-100'}`}>
                    {item.name}
                  </span>
                  {item.lastMessageTime && (
                    <span className="text-[10px] text-neutral-500 font-mono">
                      {new Date(item.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-xs text-neutral-400 truncate font-mono">{item.lastMessage || 'No messages yet'}</p>
                  {item.unreadCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-neutral-950 text-[10px] font-bold font-mono">
                      {item.unreadCount}
                    </span>
                  )}
                </div>

                {item.statusText && (
                  <div className="text-[10px] font-mono text-neutral-500 flex items-center gap-1 mt-0.5">
                    {item.transport === 'internet_cloud' ? (
                      <span className="text-blue-400">🌐 Cloud Online</span>
                    ) : (
                      <span className="text-emerald-400/90">📡 LoRa Mesh (915MHz)</span>
                    )}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Bottom Messenger Tool Navigation */}
      <div className="p-2 border-t border-neutral-800 bg-neutral-900/80 flex items-center justify-around text-xs font-mono">
        <button
          onClick={onOpenContacts}
          className="flex flex-col items-center gap-1 py-1 px-2 text-neutral-400 hover:text-emerald-400 cursor-pointer transition-colors"
          title="Contacts & Discovered Mesh Peers"
        >
          <Users className="w-4 h-4" />
          <span className="text-[10px]">Contacts</span>
        </button>

        <button
          onClick={onOpenRadar}
          className="flex flex-col items-center gap-1 py-1 px-2 text-neutral-400 hover:text-emerald-400 cursor-pointer transition-colors"
          title="Tactical Mesh Radar & Topology"
        >
          <Radar className="w-4 h-4" />
          <span className="text-[10px]">Radar</span>
        </button>

        <button
          onClick={onOpenRadio}
          className="flex flex-col items-center gap-1 py-1 px-2 text-neutral-400 hover:text-emerald-400 cursor-pointer transition-colors"
          title="Radio Frequencies & Hardware Transceiver"
        >
          <Sliders className="w-4 h-4" />
          <span className="text-[10px]">Radio</span>
        </button>

        <button
          onClick={onOpenAi}
          className="flex flex-col items-center gap-1 py-1 px-2 text-amber-400 hover:text-amber-300 cursor-pointer transition-colors"
          title="Tactical AI Co-Pilot"
        >
          <Sparkles className="w-4 h-4" />
          <span className="text-[10px]">AI Co-Pilot</span>
        </button>
      </div>
    </aside>
  );
};
