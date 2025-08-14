// Test Bitget API connection endpoint
export async function POST(request) {
  try {
    const body = await request.json();
    const { apiKey, secretKey, passphrase } = body;

    if (!apiKey || !secretKey || !passphrase) {
      return Response.json(
        {
          success: false,
          error: "All API credentials are required (API Key, Secret Key, and Passphrase)",
        },
        { status: 400 },
      );
    }

    // Test connection by fetching account info
    const timestamp = Date.now().toString();
    const method = "GET";
    const requestPath = "/api/spot/v1/account/assets";

    const signature = createBitgetSignature(
      timestamp,
      method,
      requestPath,
      "",
      secretKey,
    );

    console.log("🔍 Testing Bitget API connection...");

    const response = await fetch(`https://api.bitget.com${requestPath}`, {
      method: "GET",
      headers: {
        "ACCESS-KEY": apiKey,
        "ACCESS-SIGN": signature,
        "ACCESS-TIMESTAMP": timestamp,
        "ACCESS-PASSPHRASE": passphrase,
        "Content-Type": "application/json",
        locale: "en-US",
      },
    });

    console.log("📥 Bitget response status:", response.status);

    if (!response.ok) {
      console.error("❌ Bitget API HTTP error:", response.status, response.statusText);
      
      if (response.status === 401) {
        return Response.json(
          {
            success: false,
            error: "Authentication failed. Please check your API credentials.",
            details: "Invalid API key, secret key, or passphrase.",
          },
          { status: 401 },
        );
      } else if (response.status === 403) {
        return Response.json(
          {
            success: false,
            error: "Access forbidden. Please check your API permissions.",
            details: "Make sure your API key has spot trading permissions enabled.",
          },
          { status: 403 },
        );
      } else {
        return Response.json(
          {
            success: false,
            error: `Bitget API error: HTTP ${response.status}`,
            details: response.statusText,
          },
          { status: response.status },
        );
      }
    }

    const data = await response.json();
    console.log("📥 Bitget response data received");

    if (data.code !== "00000") {
      console.error("❌ Bitget API error:", data);
      
      let errorMessage = "Connection failed";
      let details = data.msg || data.code;
      
      if (data.code === "40001") {
        errorMessage = "Invalid API credentials";
        details = "Please verify your API key, secret key, and passphrase are correct.";
      } else if (data.code === "40002") {
        errorMessage = "Invalid signature";
        details = "There may be an issue with your secret key or system time.";
      } else if (data.code === "40003") {
        errorMessage = "Missing required parameter";
        details = "API request is missing required authentication parameters.";
      } else if (data.code === "40004") {
        errorMessage = "Invalid timestamp";
        details = "System time may be out of sync. Please check your system clock.";
      } else if (data.code === "40005") {
        errorMessage = "Invalid passphrase";
        details = "The passphrase provided does not match your API configuration.";
      } else if (data.code === "40006") {
        errorMessage = "API key permissions insufficient";
        details = "Your API key doesn't have the required permissions for spot trading.";
      }

      return Response.json(
        {
          success: false,
          error: errorMessage,
          details: details,
          code: data.code,
        },
        { status: 400 },
      );
    }

    // Parse account data to verify we can access it
    const assets = data.data || [];
    console.log(`✅ Successfully connected! Found ${assets.length} assets.`);

    // Get some basic account info for verification
    const totalAssets = assets.length;
    const hasBalances = assets.some(asset => parseFloat(asset.available || 0) > 0);

    return Response.json({
      success: true,
      message: "Successfully connected to Bitget!",
      data: {
        connected: true,
        totalAssets: totalAssets,
        hasBalances: hasBalances,
        timestamp: new Date().toISOString(),
        accountType: "Spot Trading Account",
      },
    });

  } catch (error) {
    console.error("💥 Connection test error:", error);
    
    let errorMessage = "Connection test failed";
    let details = error.message;
    
    if (error.message.includes("fetch")) {
      errorMessage = "Network connection failed";
      details = "Unable to reach Bitget API. Please check your internet connection.";
    } else if (error.message.includes("timeout")) {
      errorMessage = "Connection timeout";
      details = "Request to Bitget API timed out. Please try again.";
    } else if (error.message.includes("signature")) {
      errorMessage = "Signature creation failed";
      details = "Unable to create API signature. Please check your secret key.";
    }

    return Response.json(
      {
        success: false,
        error: errorMessage,
        details: details,
      },
      { status: 500 },
    );
  }
}

function createBitgetSignature(timestamp, method, requestPath, body, secretKey) {
  try {
    const crypto = require("crypto");
    const message = timestamp + method + requestPath + body;
    return crypto
      .createHmac("sha256", secretKey)
      .update(message)
      .digest("base64");
  } catch (error) {
    console.error("Error creating signature:", error);
    if (process.env.NODE_ENV === "development") {
      return "mock_signature_" + timestamp;
    }
    throw new Error("Failed to create API signature: " + error.message);
  }
}