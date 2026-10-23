import React from 'react';
import {
  Radio,
  WifiOff,
  ShieldCheck,
  Battery,
  Signal,
  LogIn,
  LogOut,
  UserCheck,
  CloudUpload,
  Cpu,
} from 'lucide-react';
import { User } from 'firebase/auth';

interface HeaderProps {
  callsign: string;
  nodeId: string;
  transport: string;
  user: User | null;
  isCloudGateway: boolean;
  onOpenAuth: () => void;
  onSignOut: () => void;
  onToggleCloudGateway: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  callsign,
  nodeId,
  transport,
  user,
  isCloudGateway,
  onOpenAuth,
  onSignOut,
  onToggleCloudGateway,
}) => {
  return (
    <header className="border-b border-emerald-950/60 bg-neutral-950/95 backdrop-blur-md px-4 py-3 sticky top-0 z-40 text-neutral-200 select-none">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Brand & Identity */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold tracking-wider text-emerald-400 text-base">MESHWAVE</span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-800/80 text-emerald-300">
                P2P E2EE
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-800/60 text-amber-300">
                <WifiOff className="w-3 h-3" /> 100% OFFLINE MESH
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-neutral-400 font-mono">
              <span className="text-emerald-300 font-semibold">{callsign}</span>
              <span className="text-neutral-600">•</span>
              <span className="text-neutral-400">{nodeId}</span>
            </div>
          </div>
        </div>

        {/* Tactical HUD Status */}
        <div className="flex items-center gap-2 sm:gap-4 text-xs font-mono">
          {/* Active Radio Transport Indicator */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded bg-neutral-900 border border-neutral-800 text-neutral-300">
            <Cpu className="w-3.5 h-3.5 text-emerald-400" />
            <span className="uppercase text-[11px] font-medium tracking-tight">
              {transport.replace('_', ' ')}
            </span>
          </div>

          {/* Signal / Battery */}
          <div className="flex items-center gap-3 px-2.5 py-1 rounded bg-neutral-900 border border-neutral-800">
            <div className="flex items-center gap-1 text-emerald-400" title="Mesh RF Signal: Strong">
              <Signal className="w-3.5 h-3.5" />
              <span className="text-[11px] font-bold">-62dBm</span>
            </div>
            <div className="w-px h-3 bg-neutral-800" />
            <div className="flex items-center gap-1 text-neutral-400" title="Device Battery">
              <Battery className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px]">96%</span>
            </div>
          </div>

          {/* Cloud Gateway Relay Toggle */}
          <button
            onClick={onToggleCloudGateway}
            aria-label="Toggle cloud gateway relay bridge"
            className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded border text-[11px] transition-colors cursor-pointer ${
              isCloudGateway
                ? 'bg-blue-950/80 border-blue-600 text-blue-300'
                : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
            }`}
            title="When active, bridges offline mesh packets to cloud database if an internet gateway is reached"
          >
            <CloudUpload className={`w-3.5 h-3.5 ${isCloudGateway ? 'text-blue-400 animate-pulse' : ''}`} />
            <span>{isCloudGateway ? 'GATEWAY ON' : 'GATEWAY OFF'}</span>
          </button>

          {/* Firebase Auth Profile */}
          {user ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-950/40 border border-emerald-800 text-emerald-300">
                <UserCheck className="w-3.5 h-3.5" />
                <span className="max-w-[100px] truncate">{user.displayName || user.email?.split('@')[0]}</span>
              </div>
              <button
                onClick={onSignOut}
                aria-label="Sign out from Firebase"
                className="p-1.5 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-rose-400 transition-colors cursor-pointer"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              aria-label="Connect Google Firebase Account"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 hover:text-emerald-300 transition-colors cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">SIGN IN</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
