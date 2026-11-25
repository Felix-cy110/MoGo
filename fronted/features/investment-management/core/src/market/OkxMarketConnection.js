import { OKX_PUBLIC_WS_URL, readOkxMessage, subscriptionMessage } from './okxProtocol.js';

const CONNECT_TIMEOUT_MS = 10_000;
const SUBSCRIBE_TIMEOUT_MS = 10_000;
const IDLE_MS = 20_000;
const PONG_TIMEOUT_MS = 10_000;
const STABLE_CONNECTION_MS = 30_000;

// One disposable session owns its socket and timers; late events from older sockets are ignored.
export class OkxMarketConnection {
  constructor({ createSocket, onQuote, onDisconnect, now, random }) {
    Object.assign(this, { createSocket, onQuote, onDisconnect, now, random });
    this.symbols = [];
    this.socket = null;
    this.pending = new Map();
    this.retryCount = 0;
  }

  setSymbols(symbols) {
    const previous = this.symbols;
    this.symbols = symbols;
    if (!symbols.length) {
      this.release();
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
      this.retryCount = 0;
      this.onDisconnect();
      return;
    }
    if (!this.socket && !this.retryTimer) this.connect();
    else if (this.socket?.readyState === 1) {
      const removed = previous.filter(symbol => !symbols.includes(symbol));
      const added = symbols.filter(symbol => !previous.includes(symbol));
      removed.forEach(symbol => this.acknowledge(symbol));
      if (removed.length && !this.send(subscriptionMessage('unsubscribe', removed))) return;
      this.subscribe(added);
    }
  }

  connect() {
    if (!this.symbols.length) return;
    let socket;
    try { socket = this.createSocket(OKX_PUBLIC_WS_URL); }
    catch { this.fail(); return; }
    this.socket = socket;
    const current = () => this.socket === socket;
    this.connectTimer = setTimeout(() => this.fail(), CONNECT_TIMEOUT_MS);
    socket.onopen = () => {
      if (!current()) return;
      clearTimeout(this.connectTimer);
      this.armHeartbeat();
      this.openedAt = this.now();
      this.subscribe(this.symbols);
    };
    socket.onmessage = event => {
      if (!current()) return;
      const message = readOkxMessage(event.data, this.now());
      if (!message) return;
      if (message.type === 'error') { this.fail(); return; }
      this.armHeartbeat();
      if (this.now() - this.openedAt >= STABLE_CONNECTION_MS) this.retryCount = 0;
      if (!this.symbols.includes(message.symbol)) return;
      if (message.type === 'subscribed' || (message.type === 'quote' && message.quote)) {
        this.acknowledge(message.symbol);
      }
      if (message.type === 'quote') this.onQuote(message.symbol, message.quote);
    };
    socket.onerror = socket.onclose = () => { if (current()) this.fail(); };
  }

  subscribe(symbols) {
    if (!symbols.length) return;
    symbols.forEach(symbol => {
      this.acknowledge(symbol);
      this.pending.set(symbol, setTimeout(() => this.fail(), SUBSCRIBE_TIMEOUT_MS));
    });
    this.send(subscriptionMessage('subscribe', symbols));
  }

  acknowledge(symbol) {
    clearTimeout(this.pending.get(symbol));
    this.pending.delete(symbol);
  }

  send(message) {
    try {
      if (this.socket?.readyState !== 1) throw new Error('Socket is not open');
      this.socket.send(message);
      return true;
    } catch {
      this.fail();
      return false;
    }
  }

  armHeartbeat() {
    clearTimeout(this.heartbeatTimer);
    // OKX uses text ping/pong after inactivity, not WebSocket protocol ping frames.
    this.heartbeatTimer = setTimeout(() => {
      if (this.send('ping')) this.heartbeatTimer = setTimeout(() => this.fail(), PONG_TIMEOUT_MS);
    }, IDLE_MS);
  }

  release() {
    clearTimeout(this.connectTimer);
    clearTimeout(this.heartbeatTimer);
    this.pending.forEach(clearTimeout);
    this.pending.clear();
    const socket = this.socket;
    this.socket = null;
    if (socket) {
      socket.onopen = socket.onmessage = socket.onerror = socket.onclose = null;
      // Closing can throw for a failed handshake. Local ownership/timers are already released.
      try { socket.close(); } catch { /* The next attempt uses a new socket. */ }
    }
  }

  fail() {
    this.release();
    this.onDisconnect();
    if (!this.symbols.length || this.retryTimer) return;
    const ceiling = Math.min(30_000, 2_000 * 2 ** Math.min(this.retryCount++, 4));
    const delay = ceiling * (0.5 + this.random() / 2);
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.connect();
    }, delay);
  }
}
