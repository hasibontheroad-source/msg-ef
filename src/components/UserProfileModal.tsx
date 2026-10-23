import React, { useState } from 'react';
import {
  X,
  User,
  ShieldCheck,
  RefreshCw,
  Copy,
  Check,
  Upload,
  Camera,
  Radio,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { UserProfile } from '../mesh/types';
import { PRESET_AVATARS } from '../mesh/meshEngine';
import { validateDeviceNodeId } from '../mesh/contacts';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onSaveProfile: (updates: Partial<UserProfile>) => void;
  onRegenerateDeviceId: () => string;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  onSaveProfile,
  onRegenerateDeviceId,
}) => {
  const [username, setUsername] = useState(profile.callsign);
  const [deviceId, setDeviceId] = useState(profile.nodeId);
  const [statusMessage, setStatusMessage] = useState(profile.statusMessage || 'Available via Internet & LoRa Mesh');
  const [selectedAvatar, setSelectedAvatar] = useState(profile.avatarUrl || 'avatar_specops');
  const [customAvatarBase64, setCustomAvatarBase64] = useState<string | null>(
    profile.avatarUrl.startsWith('data:') ? profile.avatarUrl : null
  );

  const [copiedId, setCopiedId] = useState(false);
  const [idError, setIdError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleCustomImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('File size exceeds 2MB limit. Please choose a smaller photo.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setCustomAvatarBase64(base64);
        setSelectedAvatar(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRegenerateId = () => {
    const newId = onRegenerateDeviceId();
    setDeviceId(newId);
    setIdError(null);
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(deviceId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateDeviceNodeId(deviceId)) {
      setIdError('Invalid Device ID format. Must start with "!" followed by 8 hex characters (e.g. !a9f24c01).');
      return;
    }
    setIdError(null);

    onSaveProfile({
      callsign: username.trim() || 'Anonymous User',
      nodeId: deviceId.trim(),
      avatarUrl: selectedAvatar,
      statusMessage: statusMessage.trim(),
    });

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  const currentPreset = PRESET_AVATARS.find((p) => p.id === selectedAvatar);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-sans text-neutral-100">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-lg w-full p-6 relative shadow-2xl overflow-y-auto max-h-[90vh]">
        <button
          onClick={onClose}
          aria-label="Close profile modal"
          className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 cursor-pointer transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 pb-4 border-b border-neutral-800">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-neutral-100">USER PROFILE &amp; DEVICE ID</h2>
            <p className="text-xs text-neutral-400 font-mono">Offline &amp; Online Messaging Identity</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="py-4 space-y-5">
          {/* Avatar / Display Picture Section */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider block">
              DISPLAY PICTURE / AVATAR:
            </label>
            <div className="flex items-center gap-4">
              {/* Active Avatar Preview */}
              <div className="relative group shrink-0">
                <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-emerald-500 flex items-center justify-center bg-neutral-950 shadow-md">
                  {selectedAvatar.startsWith('data:') ? (
                    <img src={selectedAvatar} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl">{currentPreset?.icon || '🛡️'}</span>
                  )}
                </div>
                <label className="absolute inset-0 rounded-2xl bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                  <Camera className="w-5 h-5 text-white" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCustomImageUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Upload Button or Preset Info */}
              <div className="space-y-1 text-xs">
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 font-mono text-xs cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Upload Custom Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCustomImageUpload}
                    className="hidden"
                  />
                </label>
                <p className="text-[11px] text-neutral-500">Supports PNG, JPG, or pick from presets below</p>
              </div>
            </div>

            {/* Tactical Preset Avatars */}
            <div className="grid grid-cols-6 gap-2 pt-2">
              {PRESET_AVATARS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setSelectedAvatar(preset.id)}
                  title={preset.label}
                  className={`h-11 rounded-xl flex items-center justify-center text-xl transition-all cursor-pointer ${preset.color} ${
                    selectedAvatar === preset.id
                      ? 'ring-2 ring-emerald-400 scale-105 shadow-md'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  {preset.icon}
                </button>
              ))}
            </div>
          </div>

          {/* Username / Callsign Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider block">
              USERNAME / TACTICAL CALLSIGN:
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. Alex River, GhostActual"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm font-medium text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          {/* Unique Device ID Section */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                UNIQUE DEVICE ID (RADIO HARDWARE NODE):
              </label>
              <span className="text-[11px] font-mono text-emerald-400">P2P MESH ADDRESS</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={deviceId}
                onChange={(e) => {
                  setDeviceId(e.target.value);
                  setIdError(null);
                }}
                placeholder="!a9f24c01"
                className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm font-mono text-emerald-400 font-bold focus:outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={handleCopyId}
                title="Copy Device ID"
                className="p-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 cursor-pointer transition-colors shrink-0"
              >
                {copiedId ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={handleRegenerateId}
                title="Generate New Unique ID"
                className="px-3 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 font-mono text-xs font-medium cursor-pointer transition-colors flex items-center gap-1.5 shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                <span>NEW ID</span>
              </button>
            </div>
            {idError && (
              <p className="text-xs text-rose-400 flex items-center gap-1 mt-1">
                <AlertCircle className="w-3.5 h-3.5" /> {idError}
              </p>
            )}
            <p className="text-[11px] text-neutral-500 font-mono">
              Peers use this unique radio ID to direct-message you over Bluetooth, LoRa radio, or online cloud.
            </p>
          </div>

          {/* Status Message Bio */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider block">
              STATUS BIO / RADIO BROADCAST MESSAGE:
            </label>
            <input
              type="text"
              value={statusMessage}
              onChange={(e) => setStatusMessage(e.target.value)}
              placeholder="e.g. Available via Internet & LoRa Mesh"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Cryptographic Key Safety Notice */}
          <div className="p-3 bg-neutral-950/70 border border-neutral-800 rounded-xl text-xs font-mono text-neutral-400 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="text-neutral-200 font-bold">END-TO-END ENCRYPTED KEYPAIR</span>
              <p className="text-[11px] text-neutral-500">
                P-256 ECDH fingerprint: {profile.fingerprint}
              </p>
            </div>
          </div>

          {/* Save / Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold font-mono tracking-wider cursor-pointer transition-colors shadow-lg shadow-emerald-950/50"
            >
              {savedSuccess ? 'PROFILE SAVED ✓' : 'SAVE PROFILE'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
