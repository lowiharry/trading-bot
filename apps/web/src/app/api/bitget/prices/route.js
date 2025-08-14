// Bitget API integration for real-time price data
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbols = searchParams.get("symbols") || "AEVOUSDT,BTCUSDT,AEVOBTC";

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
      if (pairName === "AEVOUSDT") pairName = "AEVO/USDT";
      else if (pairName === "BTCUSDT") pairName = "BTC/USDT";
      else if (pairName === "AEVOBTC") pairName = "AEVO/BTC";

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
      "AEVO/USDT": {
        price: 0.85 + (Math.random() - 0.5) * 0.02,
        volume: 1250000,
        change24h: -2.5,
        high24h: 0.89,
        low24h: 0.82,
        timestamp: Date.now(),
      },
      "BTC/USDT": {
        price: 43500 + (Math.random() - 0.5) * 500,
        volume: 850000000,
        change24h: 1.8,
        high24h: 44200,
        low24h: 42800,
        timestamp: Date.now(),
      },
      "AEVO/BTC": {
        price: 0.0000195 + (Math.random() - 0.5) * 0.000001,
        volume: 45000,
        change24h: -4.2,
        high24h: 0.0000205,
        low24h: 0.0000188,
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
