import { MeshPacket, RadioConfig } from './types';

// Web Serial types for TypeScript
interface SerialPort {
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
  getInfo(): { usbVendorId?: number; usbProductId?: number };
}

// Web Bluetooth types
interface BluetoothDevice {
  name?: string;
  id: string;
  gatt?: {
    connected: boolean;
    connect(): Promise<unknown>;
    disconnect(): void;
  };
}

export class HardwareRadioManager {
  private serialPort: SerialPort | null = null;
  private bleDevice: BluetoothDevice | null = null;
  private isSerialConnected = false;
  private isBleConnected = false;
  private onPacketCallback: ((packet: Partial<MeshPacket>) => void) | null = null;

  public radioConfig: RadioConfig = {
    frequencyMhz: 915.0,
    bandwidthKhz: 250,
    spreadingFactor: 9,
    codingRate: '4/5',
    txPowerDbm: 20,
    channelName: 'Tactical-Mesh-Primary',
    presharedKey: 'tactical-mesh-default-e2ee-key-2026',
    meshMode: 'router_gateway',
  };

  public isWebSerialSupported(): boolean {
    return typeof navigator !== 'undefined' && 'serial' in navigator;
  }

  public isWebBluetoothSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  public setPacketListener(callback: (packet: Partial<MeshPacket>) => void) {
    this.onPacketCallback = callback;
  }

  /**
   * Request user to select a USB/UART LoRa hardware module (Heltec, T-Beam, ESP32-S3, RAK)
   */
  async connectWebSerial(): Promise<{ success: boolean; deviceName: string; error?: string }> {
    if (!this.isWebSerialSupported()) {
      return {
        success: false,
        deviceName: 'Unsupported',
        error: 'Web Serial API is supported on Chrome, Edge, and Opera (Desktop/Android with OTG).',
      };
    }

    try {
      // @ts-ignore - navigator.serial is standard in modern browsers
      const port: SerialPort = await navigator.serial.requestPort();
      await port.open({ baudRate: 115200 });
      this.serialPort = port;
      this.isSerialConnected = true;

      // Start reading in background
      this.startSerialReader(port);

      return {
        success: true,
        deviceName: 'LoRa RF Transceiver (USB 115200 baud)',
      };
    } catch (err) {
      return {
        success: false,
        deviceName: 'None',
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  private async startSerialReader(port: SerialPort) {
    try {
      while (port.readable && this.isSerialConnected) {
        const reader = port.readable.getReader();
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            if (value && this.onPacketCallback) {
              const text = new TextDecoder().decode(value);
              this.parseRawSerialData(text);
            }
          }
        } finally {
          reader.releaseLock();
        }
      }
    } catch (e) {
      console.warn('Serial reader disconnected', e);
      this.isSerialConnected = false;
    }
  }

  private parseRawSerialData(raw: string) {
    try {
      // Parse custom LoRa framing: +PACKET:{...}
      if (raw.includes('+PACKET:')) {
        const jsonPart = raw.substring(raw.indexOf('+PACKET:') + 8).trim();
        const parsed = JSON.parse(jsonPart);
        if (this.onPacketCallback) {
          this.onPacketCallback(parsed);
        }
      }
    } catch {
      // Ignore partial chunks
    }
  }

  /**
   * Transmit packet through physical LoRa hardware module via Serial
   */
  async sendPacketOverSerial(packet: MeshPacket): Promise<boolean> {
    if (!this.serialPort || !this.isSerialConnected || !this.serialPort.writable) {
      return false;
    }

    try {
      const writer = this.serialPort.writable.getWriter();
      const packetStr = `+PACKET:${JSON.stringify(packet)}\n`;
      const data = new TextEncoder().encode(packetStr);
      await writer.write(data);
      writer.releaseLock();
      return true;
    } catch (err) {
      console.error('Failed to send packet over Web Serial', err);
      return false;
    }
  }

  /**
   * Request user to select a Bluetooth LoRa Radio (e.g. Meshtastic BLE device)
   */
  async connectWebBluetooth(): Promise<{ success: boolean; deviceName: string; error?: string }> {
    if (!this.isWebBluetoothSupported()) {
      return {
        success: false,
        deviceName: 'Unsupported',
        error: 'Web Bluetooth API is supported on Android Chrome and desktop Chrome/Edge.',
      };
    }

    try {
      // @ts-ignore
      const device: BluetoothDevice = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['generic_access'],
      });

      this.bleDevice = device;
      this.isBleConnected = true;

      return {
        success: true,
        deviceName: device.name || 'Bluetooth Mesh LoRa Node',
      };
    } catch (err) {
      return {
        success: false,
        deviceName: 'None',
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  disconnectAll() {
    if (this.serialPort) {
      try {
        this.serialPort.close();
      } catch {}
      this.serialPort = null;
      this.isSerialConnected = false;
    }
    if (this.bleDevice?.gatt) {
      this.bleDevice.gatt.disconnect();
      this.bleDevice = null;
      this.isBleConnected = false;
    }
  }

  getStatus() {
    return {
      serialConnected: this.isSerialConnected,
      bleConnected: this.isBleConnected,
      webSerialSupported: this.isWebSerialSupported(),
      webBleSupported: this.isWebBluetoothSupported(),
      config: this.radioConfig,
    };
  }
}

export const hardwareRadio = new HardwareRadioManager();
