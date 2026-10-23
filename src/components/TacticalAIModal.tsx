import React, { useState } from 'react';
import {
  Sparkles,
  Zap,
  Brain,
  Image as ImageIcon,
  Search,
  ExternalLink,
  Volume2,
  AlertCircle,
  Copy,
  Check,
  Send,
  Radio,
} from 'lucide-react';

export type AiMode = 'quick' | 'thinking' | 'image' | 'search';

interface TacticalAIModalProps {
  onInsertMessage?: (text: string) => void;
}

export const TacticalAIModal: React.FC<TacticalAIModalProps> = ({
  onInsertMessage,
}) => {
  const [activeMode, setActiveMode] = useState<AiMode>('quick');
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Results
  const [quickResult, setQuickResult] = useState<string | null>(null);
  const [thinkingResult, setThinkingResult] = useState<string | null>(null);
  const [imageResult, setImageResult] = useState<{ url: string; description: string } | null>(null);
  const [searchResult, setSearchResult] = useState<{ text: string; sources: Array<{ title: string; url: string }> } | null>(null);
  const [copied, setCopied] = useState(false);

  const aspectRatios = [
    { label: '16:9 Landscape', value: '16:9' },
    { label: '4:3 Standard', value: '4:3' },
    { label: '1:1 Square', value: '1:1' },
    { label: '9:16 Portrait', value: '9:16' },
    { label: '3:4 Vertical', value: '3:4' },
    { label: '3:2 Photo', value: '3:2' },
    { label: '2:3 Card', value: '2:3' },
    { label: '21:9 Ultra-Wide', value: '21:9' },
  ];

  const handleRunAi = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      if (activeMode === 'quick') {
        const res = await fetch('/api/gemini/quick-reply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, context: 'Tactical mesh network comms' }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setQuickResult(data.reply);
      } else if (activeMode === 'thinking') {
        const res = await fetch('/api/gemini/high-thinking', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setThinkingResult(data.text);
      } else if (activeMode === 'image') {
        const res = await fetch('/api/gemini/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, aspectRatio }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setImageResult({ url: data.imageUrl, description: data.description });
      } else if (activeMode === 'search') {
        const res = await fetch('/api/gemini/search-grounding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: prompt }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setSearchResult({ text: data.text, sources: data.sources || [] });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full p-4 space-y-4 font-mono text-neutral-200">
      {/* AI Modes Selector */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button
          onClick={() => setActiveMode('quick')}
          className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeMode === 'quick'
              ? 'bg-amber-950/60 border-amber-500 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
              : 'bg-neutral-900 hover:bg-neutral-800 border-neutral-800 text-neutral-400'
          }`}
        >
          <Zap className="w-5 h-5 text-amber-400" />
          <span className="text-xs font-bold">LOW-LATENCY</span>
          <span className="text-[10px] text-neutral-500">gemini-3.1-flash-lite</span>
        </button>

        <button
          onClick={() => setActiveMode('thinking')}
          className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeMode === 'thinking'
              ? 'bg-purple-950/60 border-purple-500 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.2)]'
              : 'bg-neutral-900 hover:bg-neutral-800 border-neutral-800 text-neutral-400'
          }`}
        >
          <Brain className="w-5 h-5 text-purple-400" />
          <span className="text-xs font-bold">HIGH THINKING</span>
          <span className="text-[10px] text-neutral-500">gemini-4-argon (HIGH)</span>
        </button>

        <button
          onClick={() => setActiveMode('image')}
          className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeMode === 'image'
              ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
              : 'bg-neutral-900 hover:bg-neutral-800 border-neutral-800 text-neutral-400'
          }`}
        >
          <ImageIcon className="w-5 h-5 text-emerald-400" />
          <span className="text-xs font-bold">TACTICAL MAPS</span>
          <span className="text-[10px] text-neutral-500">nano-banana-2.1</span>
        </button>

        <button
          onClick={() => setActiveMode('search')}
          className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeMode === 'search'
              ? 'bg-blue-950/60 border-blue-500 text-blue-300 shadow-[0_0_12px_rgba(59,130,246,0.2)]'
              : 'bg-neutral-900 hover:bg-neutral-800 border-neutral-800 text-neutral-400'
          }`}
        >
          <Search className="w-5 h-5 text-blue-400" />
          <span className="text-xs font-bold">SEARCH DATA</span>
          <span className="text-[10px] text-neutral-500">gemini-3.8-flash</span>
        </button>
      </div>

      {/* Input Console */}
      <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4 space-y-3">
        <form onSubmit={handleRunAi} className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs text-neutral-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>
                {activeMode === 'quick' && 'PROMPT FOR ULTRA-FAST RADIO PACKET (SITREP / ABBREVIATION):'}
                {activeMode === 'thinking' && 'COMPLEX CRYPTANALYSIS, ROUTING PROOF OR FRESNEL BUDGET:'}
                {activeMode === 'image' && 'TACTICAL TERRAIN SKETCH OR SATELLITE RECON OVERVIEW:'}
                {activeMode === 'search' && 'QUERY LIVE RF REGULATIONS, WEATHER ALERTS OR FREQUENCIES:'}
              </span>
            </label>
            <span className="text-[10px] text-neutral-500">SERVER-SIDE SECURE</span>
          </div>

          <textarea
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={
              activeMode === 'quick'
                ? 'e.g. Generate a concise 3-sentence encrypted SITREP for mountain ridge patrol with low battery.'
                : activeMode === 'thinking'
                ? 'e.g. Analyze a 5-hop epidemic store-and-forward mesh with 12 nodes. Calculate packet collision probability at SF9 BW250kHz.'
                : activeMode === 'image'
                ? 'e.g. Topographical military sketch of an alpine river valley with LoRa repeater towers on peak 400.'
                : 'e.g. What are the legal transmission duty cycles and EIRP limits for 915MHz ISM in the US vs 868MHz in Europe?'
            }
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-xs font-mono text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-emerald-600"
          />

          {/* Image Aspect Ratio Affordance */}
          {activeMode === 'image' && (
            <div className="space-y-1.5 pt-1">
              <label className="text-xs text-neutral-400 block">ASPECT RATIO AFFORDANCE:</label>
              <div className="flex flex-wrap gap-1.5">
                {aspectRatios.map((ratio) => (
                  <button
                    key={ratio.value}
                    type="button"
                    onClick={() => setAspectRatio(ratio.value)}
                    className={`px-3 py-1.5 rounded text-xs font-mono transition-colors cursor-pointer ${
                      aspectRatio === ratio.value
                        ? 'bg-emerald-600 text-white font-bold'
                        : 'bg-neutral-950 hover:bg-neutral-800 text-neutral-300 border border-neutral-800'
                    }`}
                  >
                    {ratio.label} ({ratio.value})
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-neutral-500">
              {activeMode === 'quick' && '⚡ gemini-3.1-flash-lite'}
              {activeMode === 'thinking' && '🧠 ThinkingLevel.HIGH (Reasoning depth maximized)'}
              {activeMode === 'image' && '🎨 gemini-nano-banana-2.1 with configurable aspect ratio'}
              {activeMode === 'search' && '🌐 Google Search Grounding with citations'}
            </span>

            <button
              type="submit"
              disabled={isLoading || !prompt.trim()}
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'PROCESSING...' : 'RUN TACTICAL AI'}</span>
            </button>
          </div>
        </form>

        {error && (
          <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Results View */}
      {activeMode === 'quick' && quickResult && (
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs pb-2 border-b border-neutral-800">
            <span className="font-bold text-amber-400">LOW-LATENCY TACTICAL RESPONSE:</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleCopy(quickResult)}
                className="text-neutral-400 hover:text-neutral-200 text-xs flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'COPIED' : 'COPY'}</span>
              </button>
              {onInsertMessage && (
                <button
                  onClick={() => onInsertMessage(quickResult)}
                  className="px-2 py-1 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-xs cursor-pointer flex items-center gap-1"
                >
                  <Send className="w-3 h-3" /> Insert in Comms
                </button>
              )}
            </div>
          </div>
          <div className="p-3 bg-neutral-950 rounded border border-neutral-900 text-xs leading-relaxed text-neutral-200 whitespace-pre-wrap">
            {quickResult}
          </div>
        </div>
      )}

      {activeMode === 'thinking' && thinkingResult && (
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs pb-2 border-b border-neutral-800">
            <span className="font-bold text-purple-400">HIGH-THINKING ARCHITECTURAL AUDIT:</span>
            <button
              onClick={() => handleCopy(thinkingResult)}
              className="text-neutral-400 hover:text-neutral-200 text-xs flex items-center gap-1 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'COPIED' : 'COPY'}</span>
            </button>
          </div>
          <div className="p-3 bg-neutral-950 rounded border border-neutral-900 text-xs leading-relaxed text-neutral-200 whitespace-pre-wrap max-h-96 overflow-y-auto">
            {thinkingResult}
          </div>
        </div>
      )}

      {activeMode === 'image' && imageResult && (
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between text-xs pb-2 border-b border-neutral-800">
            <span className="font-bold text-emerald-400">TACTICAL MAP GENERATED ({aspectRatio}):</span>
            <a
              href={imageResult.url}
              download={`tactical_map_${aspectRatio.replace(':', '_')}.png`}
              className="text-xs text-emerald-400 hover:text-emerald-300 underline cursor-pointer"
            >
              Download PNG
            </a>
          </div>
          <div className="flex flex-col items-center justify-center p-2 bg-neutral-950 rounded border border-neutral-900">
            <img
              src={imageResult.url}
              alt={imageResult.description}
              className="max-h-[500px] w-auto rounded object-contain"
            />
            <p className="text-[11px] text-neutral-400 mt-2 text-center">{imageResult.description}</p>
          </div>
        </div>
      )}

      {activeMode === 'search' && searchResult && (
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between text-xs pb-2 border-b border-neutral-800">
            <span className="font-bold text-blue-400">GROUNDED SEARCH INTELLIGENCE:</span>
            <button
              onClick={() => handleCopy(searchResult.text)}
              className="text-neutral-400 hover:text-neutral-200 text-xs flex items-center gap-1 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'COPIED' : 'COPY'}</span>
            </button>
          </div>
          <div className="p-3 bg-neutral-950 rounded border border-neutral-900 text-xs leading-relaxed text-neutral-200 whitespace-pre-wrap">
            {searchResult.text}
          </div>

          {searchResult.sources.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-neutral-800">
              <span className="text-[11px] text-neutral-500 font-bold">VERIFIED SOURCES & REGULATORY CITATIONS:</span>
              <div className="flex flex-wrap gap-2">
                {searchResult.sources.map((s, idx) => (
                  <a
                    key={idx}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-[11px] text-blue-400"
                  >
                    <span>{s.title}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
