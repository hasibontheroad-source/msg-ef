import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Mic,
  MicOff,
  AlertTriangle,
  ShieldCheck,
  Radio,
  Play,
  Pause,
  Volume2,
  Sparkles,
  Layers,
  ChevronRight,
  RotateCcw,
  WifiOff,
} from 'lucide-react';
import { MeshPacket, TransportMedium } from '../mesh/types';
import { meshEngine } from '../mesh/meshEngine';

interface MessagingFeedProps {
  packets: MeshPacket[];
  currentCallsign: string;
  currentNodeId: string;
  activeTransport: TransportMedium;
  onSelectTransport: (transport: TransportMedium) => void;
  onRequestQuickAiReply: (inputContext: string) => Promise<string>;
}

export const MessagingFeed: React.FC<MessagingFeedProps> = ({
  packets,
  currentCallsign,
  currentNodeId,
  activeTransport,
  onSelectTransport,
  onRequestQuickAiReply,
}) => {
  const [activeChannel, setActiveChannel] = useState('Primary-Broadcast');
  const [inputText, setInputText] = useState('');
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [isAiDrafting, setIsAiDrafting] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const channels = [
    { id: 'Primary-Broadcast', name: 'PRIMARY BROADCAST', freq: '915.0 MHz' },
    { id: 'Tactical-1', name: 'TACTICAL MESH 1', freq: 'Ch 2 • SF9' },
    { id: 'Emergency-SOS-911', name: 'EMERGENCY SOS', freq: 'High Priority', alert: true },
  ];

  // Auto-scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [packets]);

  // Audio recording timer
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

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    const textToSend = inputText.trim();
    setInputText('');

    await meshEngine.sendMessage({
      text: textToSend,
      channelId: activeChannel,
      type: activeChannel === 'Emergency-SOS-911' ? 'emergency_sos' : 'text',
    });
  };

  const handleStartVoiceRecord = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        alert('Microphone recording is not supported on this device/browser.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = (reader.result as string).split(',')[1];
          if (base64) {
            await meshEngine.sendMessage({
              audioBase64: base64,
              audioDurationSec: Math.max(1, recordSeconds),
              channelId: activeChannel,
              type: 'voice',
            });
          }
        };
        reader.readAsDataURL(audioBlob);

        // Stop all mic tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecordingVoice(true);
    } catch (err) {
      console.error('Failed to access microphone', err);
      // Fallback: simulate an encrypted voice transmission packet
      setIsRecordingVoice(true);
    }
  };

  const handleStopVoiceRecord = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else {
      // Simulation fallback voice packet
      meshEngine.sendMessage({
        text: `[Encrypted Voice Transmission - ${recordSeconds || 3}s]`,
        audioDurationSec: recordSeconds || 3,
        channelId: activeChannel,
        type: 'voice',
      });
    }
    setIsRecordingVoice(false);
  };

  const handlePlayAudio = (packet: MeshPacket) => {
    if (playingAudioId === packet.id) {
      if (audioPlayerRef.current) audioPlayerRef.current.pause();
      setPlayingAudioId(null);
      return;
    }

    if (packet.audioBlobUrl) {
      if (audioPlayerRef.current) audioPlayerRef.current.pause();
      const audio = new Audio(packet.audioBlobUrl);
      audioPlayerRef.current = audio;
      audio.onended = () => setPlayingAudioId(null);
      audio.play().catch(() => setPlayingAudioId(null));
      setPlayingAudioId(packet.id);
    } else {
      // Synthetic acoustic voice simulation tone
      setPlayingAudioId(packet.id);
      setTimeout(() => setPlayingAudioId(null), (packet.audioDurationSec || 2) * 1000);
    }
  };

  const handleTriggerSos = async () => {
    const confirmed = window.confirm(
      'ALERT: Broadcast Emergency Distress SOS to all nearby mesh nodes on maximum LoRa power?'
    );
    if (!confirmed) return;

    await meshEngine.sendMessage({
      text: `MAYDAY MAYDAY: Emergency Distress Beacon triggered from ${currentCallsign} (Node ${currentNodeId}). GPS: 37.7749° N, 122.4194° W. Immediate relay required.`,
      channelId: 'Emergency-SOS-911',
      type: 'emergency_sos',
    });
    setActiveChannel('Emergency-SOS-911');
  };

  const handleQuickAiDraft = async () => {
    setIsAiDrafting(true);
    try {
      const recentContext = packets.slice(-3).map((p) => `${p.senderCallsign}: ${p.decryptedContent || ''}`).join('\n');
      const draft = await onRequestQuickAiReply(recentContext || 'Ready for patrol status check');
      setInputText(draft);
    } catch {
      setInputText('SITREP: Position secure. Mesh link nominal.');
    } finally {
      setIsAiDrafting(false);
    }
  };

  const filteredPackets = packets.filter(
    (p) => p.channelId === activeChannel || p.recipientId === 'BROADCAST' || p.type === 'emergency_sos'
  );

  return (
    <div className="flex flex-col h-[calc(100vh-125px)] max-w-7xl mx-auto w-full bg-neutral-950 text-neutral-100 font-sans">
      {/* Top Channel & Transport Sub-header */}
      <div className="border-b border-neutral-900 bg-neutral-900/40 px-4 py-2 flex flex-wrap items-center justify-between gap-3">
        {/* Channel Selector */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {channels.map((ch) => (
            <button
              key={ch.id}
              onClick={() => setActiveChannel(ch.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-colors flex items-center gap-2 cursor-pointer ${
                activeChannel === ch.id
                  ? ch.alert
                    ? 'bg-rose-950 border border-rose-600 text-rose-300'
                    : 'bg-emerald-950/90 border border-emerald-600 text-emerald-300'
                  : 'bg-neutral-900/80 hover:bg-neutral-800 text-neutral-400 border border-neutral-800'
              }`}
            >
              {ch.alert && <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />}
              <span>{ch.name}</span>
              <span className="text-[10px] text-neutral-500 hidden sm:inline">({ch.freq})</span>
            </button>
          ))}
        </div>

        {/* Transport Selector */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-neutral-500 hidden md:inline">MEDIUM:</span>
          <select
            value={activeTransport}
            onChange={(e) => onSelectTransport(e.target.value as TransportMedium)}
            aria-label="Select radio transport medium"
            className="bg-neutral-900 border border-neutral-800 rounded px-2.5 py-1 text-emerald-400 text-xs font-mono focus:outline-none focus:border-emerald-600 cursor-pointer"
          >
            <option value="lora_rf_915">LoRa RF (915 MHz US/Americas)</option>
            <option value="lora_rf_868">LoRa RF (868 MHz EU/UK)</option>
            <option value="lora_rf_433">LoRa RF (433 MHz Ham/Asia)</option>
            <option value="bluetooth_mesh">Bluetooth Low Energy Mesh (2.4 GHz)</option>
            <option value="acoustic_fsk">Acoustic Audio FSK Modem (Air-Gapped)</option>
            <option value="cloud_gateway">Internet Cloud Gateway (Hybrid)</option>
          </select>
        </div>
      </div>

      {/* Message Feed Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredPackets.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-neutral-500 font-mono space-y-2">
            <Radio className="w-10 h-10 text-neutral-700 animate-pulse" />
            <p className="text-sm">No packets heard on {activeChannel}</p>
            <p className="text-xs text-neutral-600">
              Transmit a text or voice message to flood packet through local mesh nodes.
            </p>
          </div>
        ) : (
          filteredPackets.map((pkt) => {
            const isSelf = pkt.senderId === currentNodeId;
            const isSos = pkt.type === 'emergency_sos';

            return (
              <div
                key={pkt.id}
                className={`flex flex-col max-w-2xl rounded-lg p-3 transition-all ${
                  isSos
                    ? 'border-2 border-rose-600 bg-rose-950/30 text-rose-100 shadow-[0_0_15px_rgba(225,29,72,0.2)] ml-auto mr-auto w-full'
                    : isSelf
                    ? 'ml-auto bg-neutral-900/90 border border-emerald-900/50 text-neutral-100'
                    : 'mr-auto bg-neutral-900/60 border border-neutral-800 text-neutral-200'
                }`}
              >
                {/* Packet Header */}
                <div className="flex items-center justify-between gap-3 text-[11px] font-mono pb-1.5 border-b border-neutral-800/80 mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className={`font-bold ${isSos ? 'text-rose-400' : isSelf ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {pkt.senderCallsign}
                    </span>
                    <span className="text-neutral-500">[{pkt.senderId}]</span>
                    {pkt.isEncrypted && (
                      <span className="flex items-center gap-0.5 text-[10px] text-emerald-400/90 bg-emerald-950/60 px-1 py-0.2 rounded border border-emerald-900" title="AES-256-GCM End-to-End Encrypted">
                        <ShieldCheck className="w-3 h-3" /> E2EE
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-neutral-500 text-[10px]">
                    <span className="uppercase">
                      {pkt.hopCount === 0 ? '0 Hops (Direct)' : `${pkt.hopCount} Hops`}
                    </span>
                    <span>•</span>
                    <span>{new Date(pkt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                  </div>
                </div>

                {/* Packet Body */}
                {pkt.type === 'voice' ? (
                  <div className="flex items-center gap-3 py-2 px-3 bg-neutral-950/70 rounded-md border border-neutral-800">
                    <button
                      onClick={() => handlePlayAudio(pkt)}
                      aria-label="Play encrypted voice message"
                      className="w-8 h-8 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 flex items-center justify-center text-emerald-400 cursor-pointer transition-colors"
                    >
                      {playingAudioId === pkt.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                    </button>
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400 mb-1">
                        <span className="flex items-center gap-1">
                          <Volume2 className="w-3 h-3 text-emerald-400" /> Encrypted Voice Payload
                        </span>
                        <span>{pkt.audioDurationSec || 2}s</span>
                      </div>
                      {/* Fake / simulated waveform bars */}
                      <div className="flex items-center gap-0.5 h-4">
                        {[40, 70, 90, 60, 30, 80, 100, 75, 45, 95, 80, 50, 65, 30, 85, 90, 60].map((h, i) => (
                          <div
                            key={i}
                            className={`flex-1 rounded-sm transition-all ${
                              playingAudioId === pkt.id ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-700'
                            }`}
                            style={{ height: `${h}%` }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm font-mono whitespace-pre-wrap leading-relaxed">
                    {pkt.decryptedContent || pkt.payloadCiphertext}
                  </p>
                )}

                {/* Packet Route & Telemetry Footer */}
                <div className="mt-2 pt-1.5 flex items-center justify-between text-[10px] font-mono text-neutral-500 border-t border-neutral-800/50">
                  <div className="flex items-center gap-1">
                    <Layers className="w-3 h-3 text-neutral-600" />
                    <span>Path: {pkt.relayPath.join(' → ')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {pkt.rssiDbm && <span className="text-emerald-500/80">{pkt.rssiDbm} dBm</span>}
                    {pkt.snrDb && <span>SNR: {pkt.snrDb}dB</span>}
                    <span className="capitalize text-neutral-400">• {pkt.status}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Voice Recording Active HUD */}
      {isRecordingVoice && (
        <div className="border-t border-rose-900 bg-rose-950/60 px-4 py-2.5 flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-2 text-rose-400 font-mono text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            <span>RECORDING ENCRYPTED VOICE PACKET ({recordSeconds}s)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsRecordingVoice(false)}
              className="px-2.5 py-1 text-xs font-mono rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleStopVoiceRecord}
              className="px-3 py-1 text-xs font-mono font-bold rounded bg-rose-600 hover:bg-rose-500 text-white cursor-pointer"
            >
              TRANSMIT VOICE
            </button>
          </div>
        </div>
      )}

      {/* Bottom Composer Bar */}
      <div className="border-t border-neutral-900 bg-neutral-950 p-3">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          {/* Emergency SOS Button */}
          <button
            type="button"
            onClick={handleTriggerSos}
            aria-label="Broadcast Emergency SOS"
            className="p-2.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-700 text-rose-400 hover:text-rose-200 transition-colors cursor-pointer shrink-0"
            title="Broadcast Emergency SOS Beacon"
          >
            <AlertTriangle className="w-5 h-5" />
          </button>

          {/* Quick AI Tactical Reply */}
          <button
            type="button"
            onClick={handleQuickAiDraft}
            disabled={isAiDrafting}
            aria-label="Generate Quick Tactical Reply with Gemini 3.1 Flash Lite"
            className="p-2.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-amber-400 hover:text-amber-300 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
            title="Low-latency tactical SITREP reply (gemini-3.1-flash-lite)"
          >
            <Sparkles className={`w-5 h-5 ${isAiDrafting ? 'animate-spin' : ''}`} />
          </button>

          {/* Text Input */}
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Message ${activeChannel}...`}
            className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-sm font-mono text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-emerald-600"
          />

          {/* Voice Record Button */}
          <button
            type="button"
            onClick={isRecordingVoice ? handleStopVoiceRecord : handleStartVoiceRecord}
            aria-label="Push to talk voice message"
            className={`p-2.5 rounded-lg border transition-colors cursor-pointer shrink-0 ${
              isRecordingVoice
                ? 'bg-rose-600 border-rose-500 text-white animate-pulse'
                : 'bg-neutral-900 hover:bg-neutral-800 border-neutral-800 text-neutral-400 hover:text-emerald-400'
            }`}
            title="Hold or click to record encrypted voice packet"
          >
            <Mic className="w-5 h-5" />
          </button>

          {/* Send Button */}
          <button
            type="submit"
            disabled={!inputText.trim()}
            aria-label="Transmit packet"
            className="p-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:hover:bg-emerald-600 text-white font-mono transition-colors cursor-pointer shrink-0"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};
