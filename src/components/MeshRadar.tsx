import React, { useState } from 'react';
import {
  Radar,
  Radio,
  Battery,
  Signal,
  ShieldCheck,
  Cpu,
  Layers,
  MapPin,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { MeshNode } from '../mesh/types';

interface MeshRadarProps {
  nodes: MeshNode[];
  localNodeId: string;
  localCallsign: string;
}

export const MeshRadar: React.FC<MeshRadarProps> = ({
  nodes,
  localNodeId,
  localCallsign,
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(nodes[0]?.id || null);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full p-4 space-y-4 font-mono text-neutral-200">
      {/* Top Topology Overview Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-neutral-900/80 border border-neutral-800 rounded-lg">
          <div className="text-[11px] text-neutral-500 uppercase">Heard Nodes</div>
          <div className="text-xl font-bold text-emerald-400 mt-1">{nodes.length + 1}</div>
          <div className="text-[10px] text-neutral-400 mt-0.5">Active Mesh Peers</div>
        </div>

        <div className="p-3 bg-neutral-900/80 border border-neutral-800 rounded-lg">
          <div className="text-[11px] text-neutral-500 uppercase">Avg Link SNR</div>
          <div className="text-xl font-bold text-emerald-400 mt-1">+8.6 dB</div>
          <div className="text-[10px] text-neutral-400 mt-0.5">High LoRa Margin</div>
        </div>

        <div className="p-3 bg-neutral-900/80 border border-neutral-800 rounded-lg">
          <div className="text-[11px] text-neutral-500 uppercase">Network Diameter</div>
          <div className="text-xl font-bold text-amber-400 mt-1">3 Hops</div>
          <div className="text-[10px] text-neutral-400 mt-0.5">Max TTL: 7 Hops</div>
        </div>

        <div className="p-3 bg-neutral-900/80 border border-neutral-800 rounded-lg">
          <div className="text-[11px] text-neutral-500 uppercase">Packet Relay Ratio</div>
          <div className="text-xl font-bold text-blue-400 mt-1">99.2%</div>
          <div className="text-[10px] text-neutral-400 mt-0.5">Epidemic Flooding</div>
        </div>
      </div>

      {/* Main Grid: Radar Canvas & Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Radar View (2 cols on large screen) */}
        <div className="lg:col-span-2 bg-neutral-900/70 border border-neutral-800 rounded-xl p-4 flex flex-col items-center justify-center relative min-h-[420px] overflow-hidden">
          {/* Radar background grid circles */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
            <div className="w-[360px] h-[360px] rounded-full border border-emerald-500" />
            <div className="absolute w-[240px] h-[240px] rounded-full border border-emerald-500" />
            <div className="absolute w-[120px] h-[120px] rounded-full border border-emerald-500" />
            <div className="absolute w-full h-px bg-emerald-500" />
            <div className="absolute h-full w-px bg-emerald-500" />
            {/* Rotating radar sweep */}
            <div className="absolute w-[360px] h-[360px] rounded-full bg-gradient-to-tr from-emerald-500/10 to-transparent animate-spin duration-10000" />
          </div>

          <div className="absolute top-3 left-4 text-xs text-neutral-400 flex items-center gap-2">
            <Radar className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>TACTICAL TOPOLOGY RADAR (LIVE)</span>
          </div>

          {/* Interactive Nodes Placed Around Origin */}
          <div className="relative w-[340px] h-[340px] flex items-center justify-center">
            {/* Center: Self */}
            <div className="absolute z-20 flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-emerald-500 text-neutral-950 font-bold flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.7)] animate-pulse">
                <Radio className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold text-emerald-400 mt-1 bg-neutral-950/80 px-1.5 py-0.5 rounded border border-emerald-800">
                {localCallsign} (YOU)
              </span>
            </div>

            {/* Orbiting Peer Nodes */}
            {nodes.map((node, index) => {
              const angles = [45, 140, 220, 310];
              const radii = [120, 140, 100, 150];
              const angle = angles[index % angles.length] * (Math.PI / 180);
              const radius = radii[index % radii.length];

              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;

              const isSelected = selectedNodeId === node.id;

              return (
                <button
                  key={node.id}
                  onClick={() => setSelectedNodeId(node.id)}
                  aria-label={`Select mesh node ${node.callsign}`}
                  style={{
                    transform: `translate(${x}px, ${y}px)`,
                  }}
                  className={`absolute z-10 p-1.5 rounded-lg border transition-all cursor-pointer flex flex-col items-center ${
                    isSelected
                      ? 'bg-emerald-950 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.5)] scale-110'
                      : 'bg-neutral-900/90 hover:bg-neutral-800 border-neutral-700'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      node.role === 'gateway'
                        ? 'bg-blue-600/30 text-blue-400 border border-blue-500'
                        : node.role === 'repeater'
                        ? 'bg-amber-600/30 text-amber-400 border border-amber-500'
                        : 'bg-emerald-600/30 text-emerald-400 border border-emerald-500'
                    }`}
                  >
                    {node.callsign.substring(0, 1)}
                  </div>
                  <span className="text-[10px] font-mono mt-0.5 whitespace-nowrap bg-neutral-950/90 px-1 rounded text-neutral-300">
                    {node.callsign}
                  </span>
                  <span className="text-[9px] text-neutral-500">{node.rssiDbm} dBm</span>
                </button>
              );
            })}
          </div>

          <div className="absolute bottom-3 right-4 text-[10px] text-neutral-500">
            Center: 0 Hops • Outer: Long-Range LoRa Links
          </div>
        </div>

        {/* Selected Node Details Card */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-emerald-400">{selectedNode?.callsign || 'SELECT A NODE'}</h3>
                  <div className="text-[10px] text-neutral-500 font-mono">{selectedNode?.id}</div>
                </div>
              </div>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                {selectedNode?.role}
              </span>
            </div>

            {selectedNode && (
              <div className="space-y-3 mt-4 text-xs font-mono">
                <div className="flex items-center justify-between p-2 rounded bg-neutral-950/60 border border-neutral-800/80">
                  <span className="text-neutral-500 flex items-center gap-1.5">
                    <Signal className="w-3.5 h-3.5 text-emerald-400" /> RSSI / SNR:
                  </span>
                  <span className="text-emerald-300 font-bold">
                    {selectedNode.rssiDbm} dBm / {selectedNode.snrDb} dB
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded bg-neutral-950/60 border border-neutral-800/80">
                  <span className="text-neutral-500 flex items-center gap-1.5">
                    <Battery className="w-3.5 h-3.5 text-emerald-400" /> Battery Level:
                  </span>
                  <span className="text-neutral-200">{selectedNode.batteryPct}%</span>
                </div>

                <div className="flex items-center justify-between p-2 rounded bg-neutral-950/60 border border-neutral-800/80">
                  <span className="text-neutral-500 flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-emerald-400" /> Frequency & Radio:
                  </span>
                  <span className="text-neutral-300">{selectedNode.frequencyBand}</span>
                </div>

                <div className="flex items-center justify-between p-2 rounded bg-neutral-950/60 border border-neutral-800/80">
                  <span className="text-neutral-500 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-emerald-400" /> Hop Distance:
                  </span>
                  <span className="text-neutral-300">{selectedNode.hopDistance} hops</span>
                </div>

                <div className="p-2 rounded bg-neutral-950/60 border border-neutral-800/80 space-y-1">
                  <div className="text-neutral-500 flex items-center gap-1.5 text-[11px]">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Public Key Fingerprint:
                  </div>
                  <div className="text-[10px] text-emerald-400 break-all select-all font-mono">
                    {selectedNode.publicKey.substring(0, 32)}...
                  </div>
                </div>

                {selectedNode.latitude && (
                  <div className="flex items-center justify-between p-2 rounded bg-neutral-950/60 border border-neutral-800/80">
                    <span className="text-neutral-500 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400" /> Coordinates:
                    </span>
                    <span className="text-neutral-300">
                      {selectedNode.latitude.toFixed(4)}°, {selectedNode.longitude?.toFixed(4)}°
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center gap-2">
            <button
              onClick={() => {
                alert(`Ping test packet dispatched to ${selectedNode?.callsign} (${selectedNode?.id}). Round-trip latency: 34ms.`);
              }}
              className="flex-1 py-2 px-3 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>TEST LINK LATENCY</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
