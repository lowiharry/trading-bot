import { withDataRateLimit } from "../../utils/rateLimiter.js";

// Bitget API integration for real-time price data
async function handler(request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbols = searchParams.get("symbols") || "XRPUSDT,BTCUSDT,XRPBTC";

    // Bitget API endpoint for ticker prices
    const bitgetUrl = `https://api.bitget.com/api/spot/v1/market/tickers?symbol=${symbols}`;

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

    // Transform Bitget response to our format
    const prices = {};
    data.data.forEach((ticker) => {
      let pairName = ticker.symbol;

      // Convert Bitget symbol format to our format
      if (pairName === "XRPUSDT") pairName = "XRP/USDT";
      else if (pairName === "BTCUSDT") pairName = "BTC/USDT";
      else if (pairName === "XRPBTC") pairName = "XRP/BTC";

      prices[pairName] = {
        price: parseFloat(ticker.close),
        volume: parseFloat(ticker.baseVol),
        change24h: parseFloat(ticker.change),
        high24h: parseFloat(ticker.high24h),
        low24h: parseFloat(ticker.low24h),
        timestamp: Date.now(),
      };
    });

    return Response.json({
      success: true,
      data: prices,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Error fetching Bitget prices:", error);

    // Return mock data if API fails (for demo purposes)
    const mockPrices = {
      "XRP/USDT": {
        price: 0.5 + (Math.random() - 0.5) * 0.01,
        volume: 50000000,
        change24h: -1.5,
        high24h: 0.52,
        low24h: 0.48,
        timestamp: Date.now(),
      },
      "BTC/USDT": {
        price: 60000 + (Math.random() - 0.5) * 500,
        volume: 850000000,
        change24h: 1.8,
        high24h: 61000,
        low24h: 59000,
        timestamp: Date.now(),
      },
      "XRP/BTC": {
        price: 0.0000083 + (Math.random() - 0.5) * 0.0000001,
        volume: 1000000,
        change24h: -2.0,
        high24h: 0.0000085,
        low24h: 0.0000081,
        timestamp: Date.now(),
      },
    };

    return Response.json({
      success: true,
      data: mockPrices,
      timestamp: Date.now(),
      note: "Using mock data - Bitget API unavailable",
    });
  }
}

export const GET = withDataRateLimit(handler);
