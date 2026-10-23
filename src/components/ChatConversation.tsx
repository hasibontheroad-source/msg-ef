import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Mic,
  AlertTriangle,
  ShieldCheck,
  Radio,
  Wifi,
  Play,
  Pause,
  Volume2,
  Sparkles,
  Phone,
  Info,
  Check,
  CheckCheck,
  Lock,
  ArrowLeft,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { MeshPacket, NetworkMode, TransportMedium, UserProfile } from '../mesh/types';
import { PRESET_AVATARS } from '../mesh/meshEngine';

interface ChatConversationProps {
  conversationId: string;
  conversationName: string;
  isDirect: boolean;
  recipientNodeId?: string;
  packets: MeshPacket[];
  userProfile: UserProfile;
  networkMode: NetworkMode;
  onSendMessage: (text: string, type?: 'text' | 'voice' | 'emergency_sos') => Promise<void>;
  onSendVoiceMessage: (audioBase64: string, durationSec: number) => Promise<void>;
  onRequestQuickAiReply: (context: string) => Promise<string>;
  onBackMobile?: () => void;
  onOpenRadar?: () => void;
}

export const ChatConversation: React.FC<ChatConversationProps> = ({
  conversationId,
  conversationName,
  isDirect,
  recipientNodeId,
  packets,
  userProfile,
  networkMode,
  onSendMessage,
  onSendVoiceMessage,
  onRequestQuickAiReply,
  onBackMobile,
  onOpenRadar,
}) => {
  const [inputText, setInputText] = useState('');
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [packets]);

  // Voice recording timer
  useEffect(() => {
    if (isRecordingVoice) {
      setRecordSeconds(0);
      recordTimerRef.current = setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    } else {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    }
    return () => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    };
  }, [isRecordingVoice]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;
    const text = inputText.trim();
    setInputText('');
    await onSendMessage(text, conversationId === 'Emergency-SOS-911' ? 'emergency_sos' : 'text');
  };

  const handleStartVoice = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setIsRecordingVoice(true);
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = (reader.result as string).split(',')[1];
          if (base64) {
            await onSendVoiceMessage(base64, Math.max(1, recordSeconds));
          }
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      setIsRecordingVoice(true);
    } catch {
      setIsRecordingVoice(true);
    }
  };

  const handleStopVoice = async () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else {
      await onSendMessage(`[Voice Message - ${recordSeconds || 3}s]`, 'voice');
    }
    setIsRecordingVoice(false);
  };

  const handlePlayVoice = (pkt: MeshPacket) => {
    if (playingAudioId === pkt.id) {
      if (audioPlayerRef.current) audioPlayerRef.current.pause();
      setPlayingAudioId(null);
      return;
    }

    if (pkt.audioBlobUrl) {
      if (audioPlayerRef.current) audioPlayerRef.current.pause();
      const audio = new Audio(pkt.audioBlobUrl);
      audioPlayerRef.current = audio;
      audio.onended = () => setPlayingAudioId(null);
      audio.play().catch(() => setPlayingAudioId(null));
      setPlayingAudioId(pkt.id);
    } else {
      setPlayingAudioId(pkt.id);
      setTimeout(() => setPlayingAudioId(null), (pkt.audioDurationSec || 2) * 1000);
    }
  };

  const handleAiQuickReply = async () => {
    setIsAiGenerating(true);
    try {
      const recentContext = packets
        .slice(-3)
        .map((p) => `${p.senderCallsign}: ${p.decryptedContent || ''}`)
        .join('\n');
      const suggestion = await onRequestQuickAiReply(recentContext || conversationName);
      setInputText(suggestion);
    } catch {
      setInputText('ROGER. Standby for SITREP.');
    } finally {
      setIsAiGenerating(false);
    }
  };

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
        {name?.substring(0, 2).toUpperCase() || 'OP'}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-neutral-950 text-neutral-100 font-sans">
      {/* Modern Messenger Header */}
      <div className="px-4 py-3 border-b border-neutral-800 bg-neutral-900/70 flex items-center justify-between gap-3 backdrop-blur-md">
        <div className="flex items-center gap-3 min-w-0">
          {onBackMobile && (
            <button
              onClick={onBackMobile}
              className="md:hidden p-1.5 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          {renderAvatar(undefined, conversationName)}

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-sm text-neutral-100 truncate">{conversationName}</h2>
              <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-900 font-mono">
                <Lock className="w-2.5 h-2.5" /> E2EE
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-neutral-400 mt-0.5">
              {networkMode === 'internet' ? (
                <span className="flex items-center gap-1 text-blue-400">
                  <Wifi className="w-3 h-3" /> Online via Cloud Internet
                </span>
              ) : networkMode === 'mesh_offline' ? (
                <span className="flex items-center gap-1 text-emerald-400">
                  <Radio className="w-3 h-3" /> Direct LoRa RF (915 MHz)
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-300">
                  <Radio className="w-3 h-3" /> Hybrid (Internet &amp; LoRa Mesh)
                </span>
              )}
              {recipientNodeId && <span>• ID: {recipientNodeId}</span>}
            </div>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => alert(`Simulating encrypted voice P2P talk link to ${conversationName}...`)}
            title="Start Encrypted Voice Call"
            className="p-2 rounded-xl text-neutral-400 hover:text-emerald-400 hover:bg-neutral-800 cursor-pointer transition-colors"
          >
            <Phone className="w-4 h-4" />
          </button>

          {onOpenRadar && (
            <button
              onClick={onOpenRadar}
              title="Inspect Mesh Radar & Node Telemetry"
              className="p-2 rounded-xl text-neutral-400 hover:text-emerald-400 hover:bg-neutral-800 cursor-pointer transition-colors"
            >
              <Radio className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {packets.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-neutral-500 font-mono space-y-2">
            <Radio className="w-10 h-10 text-neutral-700 animate-pulse" />
            <p className="text-sm font-semibold">End-to-End Encrypted Session</p>
            <p className="text-xs text-neutral-600 max-w-sm">
              Messages and voice recordings are encrypted on your device and sent via both internet and offline radio mesh.
            </p>
          </div>
        ) : (
          packets.map((pkt) => {
            const isSelf = pkt.senderId === userProfile.nodeId;
            const isSos = pkt.type === 'emergency_sos';

            return (
              <div
                key={pkt.id}
                className={`flex items-end gap-2 ${isSelf ? 'justify-end' : 'justify-start'}`}
              >
                {!isSelf && renderAvatar(pkt.senderAvatarUrl, pkt.senderCallsign)}

                <div
                  className={`max-w-[85%] sm:max-w-md rounded-2xl px-4 py-2.5 transition-all shadow-sm ${
                    isSos
                      ? 'bg-rose-950/40 border-2 border-rose-600 text-rose-100 shadow-[0_0_15px_rgba(225,29,72,0.25)]'
                      : isSelf
                      ? 'bg-emerald-700 text-white rounded-br-none'
                      : 'bg-neutral-900 border border-neutral-800 text-neutral-100 rounded-bl-none'
                  }`}
                >
                  {/* Sender Name if Group/Incoming */}
                  {!isSelf && (
                    <div className="text-[11px] font-bold text-amber-400 mb-1 flex items-center justify-between gap-2">
                      <span>{pkt.senderCallsign}</span>
                      <span className="text-[10px] text-neutral-500 font-mono font-normal">{pkt.senderId}</span>
                    </div>
                  )}

                  {/* Message Content: Voice vs Text */}
                  {pkt.type === 'voice' ? (
                    <div className="flex items-center gap-3 py-1">
                      <button
                        onClick={() => handlePlayVoice(pkt)}
                        className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                          isSelf
                            ? 'bg-emerald-900 hover:bg-emerald-950 text-emerald-200'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        }`}
                      >
                        {playingAudioId === pkt.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                      </button>

                      <div className="flex-1 min-w-[140px]">
                        <div className="flex items-center justify-between text-[11px] font-mono opacity-80 mb-1">
                          <span className="flex items-center gap-1">
                            <Volume2 className="w-3 h-3" /> Encrypted Voice
                          </span>
                          <span>{pkt.audioDurationSec || 2}s</span>
                        </div>
                        {/* Audio Waveform */}
                        <div className="flex items-center gap-0.5 h-4">
                          {[30, 60, 90, 40, 75, 100, 60, 85, 40, 90, 70, 50, 80, 45, 95].map((h, i) => (
                            <div
                              key={i}
                              className={`flex-1 rounded-sm ${
                                playingAudioId === pkt.id
                                  ? 'bg-white animate-pulse'
                                  : isSelf
                                  ? 'bg-emerald-300/80'
                                  : 'bg-neutral-500'
                              }`}
                              style={{ height: `${h}%` }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm font-sans leading-relaxed whitespace-pre-wrap select-text">
                      {pkt.decryptedContent || pkt.payloadCiphertext}
                    </p>
                  )}

                  {/* Bubble Metadata & Delivery Footer */}
                  <div
                    className={`flex items-center justify-between gap-3 text-[10px] font-mono mt-1 pt-1 border-t ${
                      isSelf ? 'border-emerald-600/60 text-emerald-100/80' : 'border-neutral-800 text-neutral-400'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      {pkt.isInternet ? (
                        <span className="flex items-center gap-0.5 text-blue-300">
                          <Wifi className="w-2.5 h-2.5" /> Cloud
                        </span>
                      ) : (
                        <span className="flex items-center gap-0.5 text-emerald-300">
                          <Radio className="w-2.5 h-2.5" /> LoRa {pkt.hopCount}h
                        </span>
                      )}
                      {pkt.rssiDbm && <span>({pkt.rssiDbm}dBm)</span>}
                    </div>

                    <div className="flex items-center gap-1">
                      <span>{new Date(pkt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {isSelf && (
                        <span title="Delivered via E2EE">
                          <CheckCheck className="w-3 h-3 text-emerald-200" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Voice Recording Banner */}
      {isRecordingVoice && (
        <div className="border-t border-rose-900 bg-rose-950/80 px-4 py-2.5 flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-2 text-rose-300 text-xs font-mono">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            <span>RECORDING VOICE MESSAGE ({recordSeconds}s)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsRecordingVoice(false)}
              className="px-2.5 py-1 text-xs rounded bg-neutral-800 text-neutral-300 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleStopVoice}
              className="px-3.5 py-1 text-xs font-bold rounded bg-rose-600 hover:bg-rose-500 text-white cursor-pointer"
            >
              SEND AUDIO
            </button>
          </div>
        </div>
      )}

      {/* Message Composer Area */}
      <div className="p-3 border-t border-neutral-800 bg-neutral-900/60">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          {/* Quick AI SITREP Suggestion */}
          <button
            type="button"
            onClick={handleAiQuickReply}
            disabled={isAiGenerating}
            title="Generate Fast Tactical SITREP (gemini-3.1-flash-lite)"
            className="p-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-amber-400 hover:text-amber-300 cursor-pointer transition-colors shrink-0 disabled:opacity-40"
          >
            <Sparkles className={`w-5 h-5 ${isAiGenerating ? 'animate-spin' : ''}`} />
          </button>

          {/* Text Input */}
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Write a message to ${conversationName}...`}
            className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-emerald-500"
          />

          {/* Voice Record Mic Button */}
          <button
            type="button"
            onClick={isRecordingVoice ? handleStopVoice : handleStartVoice}
            title="Push to record encrypted voice message"
            className={`p-2.5 rounded-xl border transition-colors cursor-pointer shrink-0 ${
              isRecordingVoice
                ? 'bg-rose-600 border-rose-500 text-white animate-pulse'
                : 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-neutral-300 hover:text-emerald-400'
            }`}
          >
            <Mic className="w-5 h-5" />
          </button>

          {/* Send Button */}
          <button
            type="submit"
            disabled={!inputText.trim()}
            title="Send Message"
            className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:hover:bg-emerald-600 text-white cursor-pointer transition-colors shrink-0 shadow-md"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};
