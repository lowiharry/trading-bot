// Bitget API integration for trade execution
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      symbol,
      side, // 'buy' or 'sell'
      type = "market", // 'market' or 'limit'
      quantity,
      price,
      apiKey,
      secretKey,
      passphrase,
      isDemoMode = true,
    } = body;

    // Enhanced input validation
    if (!symbol || !side || !quantity) {
      return Response.json(
        {
          success: false,
          error:
            "Missing required parameters: symbol, side, and quantity are required",
        },
        { status: 400 },
      );
    }

    if (quantity <= 0) {
      return Response.json(
        {
          success: false,
          error: "Quantity must be greater than 0",
        },
        { status: 400 },
      );
    }

    if (!["buy", "sell"].includes(side)) {
      return Response.json(
        {
          success: false,
          error: "Side must be either 'buy' or 'sell'",
        },
        { status: 400 },
      );
    }

    if (!["market", "limit"].includes(type)) {
      return Response.json(
        {
          success: false,
          error: "Type must be either 'market' or 'limit'",
        },
        { status: 400 },
      );
    }

    if (isDemoMode) {
      // Enhanced demo mode - use dynamic prices and realistic execution
      const currentPrice = await getCurrentDynamicPrice(symbol);
      if (!currentPrice) {
        return Response.json(
          {
            success: false,
            error: `Unable to get current price for ${symbol}`,
          },
          { status: 500 },
        );
      }

      // Simulate market slippage (±0.05% for demo)
      const slippagePercent = (Math.random() - 0.5) * 0.1; // ±0.05%
      const executedPrice = currentPrice * (1 + slippagePercent / 100);
      const executedQty = quantity;

      // Simulate realistic trading fees
      const feeRate = 0.001; // 0.1% fee
      const notionalValue = executedQty * executedPrice;
      const feeAmount = notionalValue * feeRate;

      const mockTrade = {
        orderId: `demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        symbol,
        side,
        type,
        quantity: parseFloat(quantity),
        price: parseFloat(executedPrice.toFixed(8)),
        status: "filled",
        executedQty: parseFloat(executedQty),
        executedPrice: parseFloat(executedPrice.toFixed(8)),
        timestamp: Date.now(),
        fees: {
          asset: getBaseCurrency(symbol),
          amount: parseFloat(feeAmount.toFixed(8)),
        },
      };

      // Simulate realistic network delay
      const networkDelay = 50 + Math.random() * 150; // 50-200ms
      await new Promise((resolve) => setTimeout(resolve, networkDelay));

      console.log(
        `Demo trade executed: ${side} ${quantity} ${symbol} at ${executedPrice}`,
      );

      return Response.json({
        success: true,
        data: mockTrade,
        message: "Demo trade executed successfully",
      });
    }

    // Real trading mode - requires API credentials
    if (!apiKey || !secretKey || !passphrase) {
      return Response.json(
        {
          success: false,
          error: "API credentials required for live trading",
        },
        { status: 400 },
      );
    }

    // Enhanced validation for live trading
    if (type === "limit" && (!price || price <= 0)) {
      return Response.json(
        {
          success: false,
          error:
            "Price is required and must be greater than 0 for limit orders",
        },
        { status: 400 },
      );
    }

    try {
      // Bitget API authentication and trade execution
      const timestamp = Date.now().toString();
      const method = "POST";
      const requestPath = "/api/spot/v1/trade/orders";

      const orderData = {
        symbol,
        side,
        orderType: type,
        force: "gtc",
        size: quantity.toString(),
        ...(type === "limit" && { price: price.toString() }),
      };

      // Create signature for Bitget API
      const signature = createBitgetSignature(
        timestamp,
        method,
        requestPath,
        JSON.stringify(orderData),
        secretKey,
      );

      const response = await fetch(`https://api.bitget.com${requestPath}`, {
        method: "POST",
        headers: {
          "ACCESS-KEY": apiKey,
          "ACCESS-SIGN": signature,
          "ACCESS-TIMESTAMP": timestamp,
          "ACCESS-PASSPHRASE": passphrase,
          "Content-Type": "application/json",
          locale: "en-US",
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        throw new Error(
          `Bitget API HTTP error: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();

      if (data.code !== "00000") {
        throw new Error(`Bitget API error: ${data.msg || data.code}`);
      }

      return Response.json({
        success: true,
        data: data.data,
        message: "Trade executed successfully",
      });
    } catch (apiError) {
      console.error("Bitget API error:", apiError);
      return Response.json(
        {
          success: false,
          error: `API execution failed: ${apiError.message}`,
        },
        { status: 502 },
      );
    }
  } catch (error) {
    console.error("Error executing trade:", error);
    return Response.json(
      {
        success: false,
        error: "Internal server error during trade execution",
      },
      { status: 500 },
    );
  }
}

// Enhanced price fetching for demo mode
async function getCurrentDynamicPrice(symbol) {
  try {
    // First try to get real-time price from our price API
    const response = await fetch(
      `${process.env.NODE_ENV === "development" ? "http://localhost:3000" : ""}/api/bitget/prices`,
    );
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.data) {
        const formattedSymbol = symbol
          .replace(/USDT$/, "/USDT")
          .replace(/BTC$/, "/BTC");
        const priceInfo = data.data[formattedSymbol];
        if (priceInfo && priceInfo.price) {
          // Add small realistic variation to make trading more dynamic
          const basePrice = parseFloat(priceInfo.price);
          const variation = (Math.random() - 0.5) * 0.02; // ±1% variation
          return basePrice * (1 + variation);
        }
      }
    }
  } catch (error) {
    console.log(
      "Could not fetch real-time price, using enhanced fallback for",
      symbol,
    );
  }

  // Enhanced fallback with time-based variations to simulate market movement
  const now = Date.now();
  const timeVariation = Math.sin(now / 300000) * 0.05; // 5-minute cycle with ±5% variation
  const randomVariation = (Math.random() - 0.5) * 0.03; // ±1.5% random

  const basePrices = {
    XRPUSDT: 0.5,
    BTCUSDT: 60000,
    XRPBTC: 0.0000083,
  };

  const basePrice = basePrices[symbol];
  if (!basePrice) {
    console.error(`No fallback price available for symbol: ${symbol}`);
    return null;
  }

  // Combine time-based and random variation for more realistic price movement
  const totalVariation = timeVariation + randomVariation;
  const finalPrice = basePrice * (1 + totalVariation);

  console.log(
    `Generated dynamic fallback price for ${symbol}: ${finalPrice.toFixed(8)} (base: ${basePrice}, variation: ${(totalVariation * 100).toFixed(2)}%)`,
  );

  return finalPrice;
}

function getBaseCurrency(symbol) {
  if (symbol.includes("USDT")) return "USDT";
  if (symbol.includes("BTC")) return "BTC";
  if (symbol.includes("ETH")) return "ETH";
  return "USDT"; // Default fallback
}

function createBitgetSignature(
  timestamp,
  method,
  requestPath,
  body,
  secretKey,
) {
  // Enhanced signature creation with proper error handling
  try {
    const crypto = require("crypto");
    const message = timestamp + method + requestPath + body;
    return crypto
      .createHmac("sha256", secretKey)
      .update(message)
      .digest("base64");
  } catch (error) {
    console.error("Error creating signature:", error);
    // Return a mock signature for development - NEVER use in production
    if (process.env.NODE_ENV === "development") {
      return "mock_signature_" + timestamp;
    }
    throw new Error("Failed to create API signature");
  }
}

// Enhanced order status endpoint
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId");
    const symbol = searchParams.get("symbol");
    const isDemoMode = searchParams.get("demoMode") === "true";

    if (!orderId) {
      return Response.json(
        {
          success: false,
          error: "orderId parameter is required",
        },
        { status: 400 },
      );
    }

    if (isDemoMode) {
      // Enhanced demo order status
      const currentPrice = (await getCurrentDynamicPrice(symbol)) || 1;

      return Response.json({
        success: true,
        data: {
          orderId,
          symbol: symbol || "UNKNOWN",
          status: "filled",
          executedQty: "100",
          executedPrice: currentPrice.toFixed(8),
          timestamp: Date.now(),
          fees: {
            asset: getBaseCurrency(symbol),
            amount: (100 * currentPrice * 0.001).toFixed(8),
          },
        },
      });
    }

    // Real API call would go here - for now return not implemented
    return Response.json(
      {
        success: false,
        error: "Live trading order status not implemented yet",
      },
      { status: 501 },
    );
  } catch (error) {
    console.error("Error getting order status:", error);
    return Response.json(
      {
        success: false,
        error: "Failed to get order status",
      },
      { status: 500 },
    );
  }
}
