import { withDataRateLimit } from "../../utils/rateLimiter.js";

// Bitget API integration for candlestick data and moving averages
async function handler(request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol") || "XRPUSDT";
    const granularity = searchParams.get("granularity") || "12H"; // 12-hour candles
    const limit = searchParams.get("limit") || "100";

    // Bitget API endpoint for candlestick data
    const bitgetUrl = `https://api.bitget.com/api/spot/v1/market/candles?symbol=${symbol}&granularity=${granularity}&limit=${limit}`;

    const response = await fetch(bitgetUrl, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Bitget API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.code !== "00000") {
      throw new Error(`Bitget API error: ${data.msg}`);
    }

    // Process candlestick data
    const candles = data.data.map((candle) => ({
      timestamp: parseInt(candle[0]),
      open: parseFloat(candle[1]),
      high: parseFloat(candle[2]),
      low: parseFloat(candle[3]),
      close: parseFloat(candle[4]),
      volume: parseFloat(candle[5]),
    }));

    // Calculate 12-hour moving average
    const closePrices = candles.map((c) => c.close);
    const movingAverage = calculateMovingAverage(closePrices, 20); // 20-period MA

    // Get current price and deviation
    const currentPrice = candles[candles.length - 1]?.close || 0;
    const currentMA = movingAverage[movingAverage.length - 1] || currentPrice;
    const deviation = ((currentPrice - currentMA) / currentMA) * 100;

    return Response.json({
      success: true,
      data: {
        symbol,
        candles,
        movingAverage: currentMA,
        currentPrice,
        deviation,
        timestamp: Date.now(),
      },
    });
  } catch (error) {
    console.error("Error fetching Bitget candles:", error);

    // Get symbol from request params for mock data
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol") || "XRPUSDT";

    // Return mock data if API fails
    const mockCandles = generateMockCandles(symbol);
    const closePrices = mockCandles.map((c) => c.close);
    const movingAverage = calculateMovingAverage(closePrices, 20);
    const currentPrice = mockCandles[mockCandles.length - 1].close;
    const currentMA = movingAverage[movingAverage.length - 1];
    const deviation = ((currentPrice - currentMA) / currentMA) * 100;

    return Response.json({
      success: true,
      data: {
        symbol,
        candles: mockCandles,
        movingAverage: currentMA,
        currentPrice,
        deviation,
        timestamp: Date.now(),
      },
      note: "Using mock data - Bitget API unavailable",
    });
  }
}

function calculateMovingAverage(prices, period) {
  const ma = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      ma.push(null);
    } else {
      const sum = prices
        .slice(i - period + 1, i + 1)
        .reduce((a, b) => a + b, 0);
      ma.push(sum / period);
    }
  }
  return ma;
}

function generateMockCandles(symbol) {
  const candles = [];
  const now = Date.now();
  const interval = 12 * 60 * 60 * 1000; // 12 hours in milliseconds

  let basePrice;
  if (symbol === "XRPUSDT") basePrice = 0.5;
  else if (symbol === "BTCUSDT") basePrice = 60000;
  else if (symbol === "XRPBTC") basePrice = 0.0000083;
  else basePrice = 1;

  for (let i = 99; i >= 0; i--) {
    const timestamp = now - i * interval;
    const volatility = basePrice * 0.02; // 2% volatility

    const open = basePrice + (Math.random() - 0.5) * volatility;
    const close = open + (Math.random() - 0.5) * volatility;
    const high = Math.max(open, close) + Math.random() * volatility * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * 0.5;
    const volume = Math.random() * 1000000;

    candles.push({
      timestamp,
      open,
      high,
      low,
      close,
      volume,
    });

    basePrice = close; // Use close as next base price for trend
  }

  return candles;
}

export const GET = withDataRateLimit(handler);
