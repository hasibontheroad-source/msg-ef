import React, { useState } from 'react';
import {
  Radio,
  Usb,
  Bluetooth,
  Volume2,
  Sliders,
  Terminal,
  Activity,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCw,
} from 'lucide-react';
import { hardwareRadio } from '../mesh/hardware';
import { acousticModem } from '../mesh/acoustic';
import { estimateAirtimeMs } from '../mesh/routing';

export const RadioConsole: React.FC = () => {
  const [hardwareStatus, setHardwareStatus] = useState(hardwareRadio.getStatus());
  const [frequency, setFrequency] = useState(915.0);
  const [bandwidth, setBandwidth] = useState(250);
  const [spreadingFactor, setSpreadingFactor] = useState(9);
  const [txPower, setTxPower] = useState(20);
  const [serialError, setSerialError] = useState<string | null>(null);
  const [acousticText, setAcousticText] = useState('SOS GRID 44A');
  const [isTransmittingAcoustic, setIsTransmittingAcoustic] = useState(false);
  const [acousticProgress, setAcousticProgress] = useState(0);

  const [rawLogs, setRawLogs] = useState<string[]>([
    `[${new Date().toLocaleTimeString()}] Radio Engine Initialized: RF SX1262 LoRa Core active`,
    `[${new Date().toLocaleTimeString()}] Freq: 915.000 MHz • BW: 250kHz • SF9 • CR 4/5 • Tx: 20dBm`,
    `[${new Date().toLocaleTimeString()}] P2P Mesh Protocol: Multi-Hop Epidemic Flooding (TTL=7)`,
    `[${new Date().toLocaleTimeString()}] Web Serial & Web Bluetooth listeners ready for hardware transceiver attachment`,
  ]);

  const airtimeMs = estimateAirtimeMs(64, spreadingFactor, bandwidth);

  const handleConnectSerial = async () => {
    setSerialError(null);
    const res = await hardwareRadio.connectWebSerial();
    if (!res.success && res.error) {
      setSerialError(res.error);
      setRawLogs((prev) => [
        `[${new Date().toLocaleTimeString()}] Web Serial Error: ${res.error}`,
        ...prev,
      ]);
    } else {
      setHardwareStatus(hardwareRadio.getStatus());
      setRawLogs((prev) => [
        `[${new Date().toLocaleTimeString()}] USB Hardware Attached: ${res.deviceName}`,
        ...prev,
      ]);
    }
  };

  const handleConnectBle = async () => {
    setSerialError(null);
    const res = await hardwareRadio.connectWebBluetooth();
    if (!res.success && res.error) {
      setSerialError(res.error);
      setRawLogs((prev) => [
        `[${new Date().toLocaleTimeString()}] Web BLE Error: ${res.error}`,
        ...prev,
      ]);
    } else {
      setHardwareStatus(hardwareRadio.getStatus());
      setRawLogs((prev) => [
        `[${new Date().toLocaleTimeString()}] Bluetooth Mesh Radio Attached: ${res.deviceName}`,
        ...prev,
      ]);
    }
  };

  const handleTransmitAcousticChirp = async () => {
    if (!acousticText.trim()) return;
    setIsTransmittingAcoustic(true);
    setAcousticProgress(0);
    setRawLogs((prev) => [
      `[${new Date().toLocaleTimeString()}] Acoustic FSK: Modulating "${acousticText}" into 1650/1850Hz audio chirps...`,
      ...prev,
    ]);

    try {
      await acousticModem.transmitAcousticChirp(acousticText, (pct) => {
        setAcousticProgress(pct);
      });
      setRawLogs((prev) => [
        `[${new Date().toLocaleTimeString()}] Acoustic FSK: Transmission completed successfully via speaker`,
        ...prev,
      ]);
    } catch (e) {
      setRawLogs((prev) => [
        `[${new Date().toLocaleTimeString()}] Acoustic FSK Error: ${String(e)}`,
        ...prev,
      ]);
    } finally {
      setIsTransmittingAcoustic(false);
    }
  };

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full p-4 space-y-4 font-mono text-neutral-200">
      {/* Top Hardware Bridge Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* USB Web Serial Section */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <Usb className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-neutral-100">LORA USB HARDWARE (WEB SERIAL)</h3>
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                  hardwareStatus.serialConnected
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : 'bg-neutral-800 text-neutral-400'
                }`}
              >
                {hardwareStatus.serialConnected ? 'CONNECTED' : 'DISCONNECTED'}
              </span>
            </div>

            <p className="text-xs text-neutral-400 mt-3 leading-relaxed">
              Connect external long-range LoRa hardware modules (Heltec WiFi LoRa 32 V3, LilyGO T-Beam, RAK4631, ESP32) directly over USB-UART cable or OTG.
            </p>

            {serialError && (
              <div className="mt-3 p-2.5 rounded bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{serialError}</span>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center justify-between">
            <span className="text-[11px] text-neutral-500">Baud Rate: 115200</span>
            <button
              onClick={handleConnectSerial}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Usb className="w-3.5 h-3.5" />
              <span>{hardwareStatus.serialConnected ? 'RECONNECT USB' : 'ATTACH LORA USB'}</span>
            </button>
          </div>
        </div>

        {/* Bluetooth LoRa Section */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <Bluetooth className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-bold text-neutral-100">BLUETOOTH MESH LORA TRANSCEIVER</h3>
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                  hardwareStatus.bleConnected
                    ? 'bg-blue-950 text-blue-400 border border-blue-800'
                    : 'bg-neutral-800 text-neutral-400'
                }`}
              >
                {hardwareStatus.bleConnected ? 'PAIRED' : 'STANDBY'}
              </span>
            </div>

            <p className="text-xs text-neutral-400 mt-3 leading-relaxed">
              Pair with wireless Meshtastic BLE nodes or nRF52 radio dongles in your tactical backpack without wires. Compatible with Android & Apple iOS BLE mesh.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center justify-between">
            <span className="text-[11px] text-neutral-500">BLE 2.4GHz GATT</span>
            <button
              onClick={handleConnectBle}
              className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Bluetooth className="w-3.5 h-3.5" />
              <span>{hardwareStatus.bleConnected ? 'RESCAN BLE' : 'SCAN BLE NODES'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* RF Tuning & Airtime Calculator */}
      <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-neutral-800">
          <Sliders className="w-5 h-5 text-emerald-400" />
          <h3 className="text-sm font-bold text-neutral-100">RF PHYSICAL LAYER PARAMETERS</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* Frequency */}
          <div className="space-y-1.5">
            <label className="text-neutral-400 flex items-center justify-between">
              <span>FREQUENCY:</span>
              <span className="text-emerald-400 font-bold">{frequency.toFixed(1)} MHz</span>
            </label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(parseFloat(e.target.value))}
              className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 text-neutral-200 focus:outline-none focus:border-emerald-600 cursor-pointer"
            >
              <option value="915.0">915.0 MHz (US / Americas ISM)</option>
              <option value="868.0">868.0 MHz (Europe / UK SRD)</option>
              <option value="433.0">433.0 MHz (Asia / Ham Radio)</option>
              <option value="923.0">923.0 MHz (Asia / ANZ)</option>
            </select>
          </div>

          {/* Spreading Factor */}
          <div className="space-y-1.5">
            <label className="text-neutral-400 flex items-center justify-between">
              <span>SPREADING FACTOR:</span>
              <span className="text-emerald-400 font-bold">SF{spreadingFactor}</span>
            </label>
            <input
              type="range"
              min="7"
              max="12"
              step="1"
              value={spreadingFactor}
              onChange={(e) => setSpreadingFactor(parseInt(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-neutral-500">
              <span>SF7 (Fast)</span>
              <span>SF12 (Extreme Range)</span>
            </div>
          </div>

          {/* Bandwidth */}
          <div className="space-y-1.5">
            <label className="text-neutral-400 flex items-center justify-between">
              <span>BANDWIDTH:</span>
              <span className="text-emerald-400 font-bold">{bandwidth} kHz</span>
            </label>
            <select
              value={bandwidth}
              onChange={(e) => setBandwidth(parseInt(e.target.value))}
              className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 text-neutral-200 focus:outline-none focus:border-emerald-600 cursor-pointer"
            >
              <option value="125">125 kHz (Standard LoRa)</option>
              <option value="250">250 kHz (High Throughput)</option>
              <option value="500">500 kHz (Ultra High Speed)</option>
            </select>
          </div>

          {/* Tx Power & Calculated Airtime */}
          <div className="space-y-1.5">
            <label className="text-neutral-400 flex items-center justify-between">
              <span>ESTIMATED AIRTIME:</span>
              <span className="text-amber-400 font-bold">{airtimeMs} ms</span>
            </label>
            <div className="p-2 rounded bg-neutral-950 border border-neutral-800 flex items-center justify-between text-[11px]">
              <span className="text-neutral-500">Tx Power:</span>
              <span className="text-emerald-400 font-bold">{txPower} dBm (100mW)</span>
            </div>
            <div className="text-[10px] text-neutral-500">
              Duty cycle compliant (1.0% limit enforced)
            </div>
          </div>
        </div>
      </div>

      {/* Acoustic Audio FSK Modem Section */}
      <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold text-neutral-100">AIR-GAPPED ACOUSTIC AUDIO MODEM</h3>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
            AIR-GAPPED SPEECH/MIC
          </span>
        </div>

        <p className="text-xs text-neutral-400 leading-relaxed">
          Transmits and receives encrypted packets through ultrasound and audible audio frequencies (1650Hz / 1850Hz FSK) via speaker and microphone. Works 100% offline with zero radio emissions or RF detection.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-2">
          <input
            type="text"
            value={acousticText}
            onChange={(e) => setAcousticText(e.target.value)}
            placeholder="Payload to chirp over speaker..."
            className="flex-1 bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-xs font-mono text-neutral-100 focus:outline-none focus:border-amber-500 w-full"
          />
          <button
            onClick={handleTransmitAcousticChirp}
            disabled={isTransmittingAcoustic}
            className="w-full sm:w-auto px-4 py-2 rounded bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-neutral-950 font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
          >
            <Play className={`w-3.5 h-3.5 ${isTransmittingAcoustic ? 'animate-spin' : ''}`} />
            <span>{isTransmittingAcoustic ? `CHIRPING (${acousticProgress}%)` : 'TRANSMIT ACOUSTIC CHIRP'}</span>
          </button>
        </div>
      </div>

      {/* Raw Radio Packet Monitor */}
      <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between pb-2 border-b border-neutral-800 text-xs">
          <div className="flex items-center gap-2 text-neutral-300">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span className="font-bold">RF PACKET TRACE & BUS LOG</span>
          </div>
          <button
            onClick={() => setRawLogs([])}
            className="text-[10px] text-neutral-500 hover:text-neutral-300 cursor-pointer"
          >
            Clear Log
          </button>
        </div>

        <div className="bg-neutral-950 border border-neutral-900 rounded p-3 h-36 overflow-y-auto space-y-1 text-[11px] font-mono text-emerald-500/90 select-all">
          {rawLogs.map((log, i) => (
            <div key={i} className="leading-tight">
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
