export const INVESTMENT_PRICE_REFRESH_MS = 15_000;
export const INVESTMENT_PRICE_MAX_AGE_MS = 60_000;
const instruments = Object.freeze({ BTC: 'BTC-USDT', ETH: 'ETH-USDT' });

export const investmentMarketSymbol = target =>
  target?.quoteCurrency === 'USDT' && Object.hasOwn(instruments, target.symbol)
    ? target.symbol : null;

// Quotes are optional display data; they never enter portfolio calculations or storage.
export const createOkxMarketClient = ({
  fetchImpl = (...args) => globalThis.fetch(...args),
  timeoutMs = 5_000,
  now = Date.now,
} = {}) => ({
  async getPrice(symbol, { signal } = {}) {
    if (!Object.hasOwn(instruments, symbol) || signal?.aborted) return null;
    const controller = new AbortController();
    let timer;
    let cancel;
    try {
      const cancelled = new Promise(resolve => {
        cancel = () => { controller.abort(); resolve(null); };
        timer = setTimeout(cancel, timeoutMs);
        signal?.addEventListener('abort', cancel, { once: true });
      });
      const request = async () => {
        const response = await fetchImpl(
          `https://www.okx.com/api/v5/market/ticker?instId=${instruments[symbol]}`,
          { signal: controller.signal, credentials: 'omit', cache: 'no-store' },
        );
        if (!response.ok) return null;
        const body = await response.json();
        const ticker = Array.isArray(body?.data) ? body.data[0] : null;
        if (body?.code !== '0' || ticker?.instId !== instruments[symbol] || ticker?.instType !== 'SPOT') return null;
        const price = ticker.last;
        const timestamp = Number(ticker.ts);
        const age = now() - timestamp;
        if (typeof price !== 'string' || price.length > 80 ||
            !/^(0|[1-9]\d*)(\.\d+)?$/.test(price) || !/[1-9]/.test(price) ||
            !Number.isSafeInteger(timestamp) || timestamp <= 0 ||
            age < -5_000 || age >= INVESTMENT_PRICE_MAX_AGE_MS) return null;
        return { price, timestamp };
      };
      // Race the entire response body as well as fetch: a stalled body must also time out.
      return await Promise.race([request(), cancelled]);
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', cancel);
    }
  },
});

export const okxMarketClient = createOkxMarketClient();
