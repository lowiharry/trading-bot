// Bitget API integration for account balance fetching
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const isDemoMode = searchParams.get("demoMode") === "true";
    const user_id = searchParams.get("user_id") || "demo_user";

    if (isDemoMode) {
      // Return demo balances
      return Response.json({
        success: true,
        data: {
          balances: {
            USDT: 10000,
            AEVO: 0,
            BTC: 0,
          },
          mode: "demo",
        },
      });
    }

    // Get API credentials for live mode
    const sql = (await import("@/app/api/utils/sql")).default;
    
    try {
      const settingsResult = await sql`
        SELECT api_key_encrypted FROM bot_settings 
        WHERE user_id = ${user_id}
        ORDER BY created_at DESC 
        LIMIT 1
      `;

      if (!settingsResult.length || !settingsResult[0].api_key_encrypted) {
        return Response.json(
          {
            success: false,
            error: "API credentials required for live balance fetching",
          },
          { status: 400 },
        );
      }

      // In a real implementation, decrypt the credentials here
      // For now, use environment variables
      const apiCredentials = {
        apiKey: process.env.BITGET_API_KEY,
        secretKey: process.env.BITGET_SECRET_KEY,
        passphrase: process.env.BITGET_PASSPHRASE,
      };

      if (
        !apiCredentials.apiKey ||
        !apiCredentials.secretKey ||
        !apiCredentials.passphrase
      ) {
        return Response.json(
          {
            success: false,
            error: "API credentials not configured for live balance fetching",
          },
          { status: 400 },
        );
      }

      // Create signature for Bitget API
      const timestamp = Date.now().toString();
      const method = "GET";
      const requestPath = "/api/spot/v1/account/assets";

      const signature = createBitgetSignature(
        timestamp,
        method,
        requestPath,
        "",
        apiCredentials.secretKey,
      );

      console.log("🔍 Fetching live account balance from Bitget...");

      const response = await fetch(`https://api.bitget.com${requestPath}`, {
        method: "GET",
        headers: {
          "ACCESS-KEY": apiCredentials.apiKey,
          "ACCESS-SIGN": signature,
          "ACCESS-TIMESTAMP": timestamp,
          "ACCESS-PASSPHRASE": apiCredentials.passphrase,
          "Content-Type": "application/json",
          locale: "en-US",
        },
      });

      if (!response.ok) {
        console.error("Bitget balance API error:", response.status, response.statusText);
        throw new Error(
          `Bitget API HTTP error: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();

      if (data.code !== "00000") {
        console.error("Bitget balance API error:", data);
        throw new Error(`Bitget API error: ${data.msg || data.code}`);
      }

      // Parse balance data
      const assets = data.data || [];
      const balances = {
        USDT: 0,
        AEVO: 0,
        BTC: 0,
      };

      // Extract relevant balances
      assets.forEach((asset) => {
        const symbol = asset.coinName;
        const available = parseFloat(asset.available) || 0;
        
        if (symbol === "USDT") {
          balances.USDT = available;
        } else if (symbol === "AEVO") {
          balances.AEVO = available;
        } else if (symbol === "BTC") {
          balances.BTC = available;
        }
      });

      console.log("✅ Live balance fetched successfully:", balances);

      return Response.json({
        success: true,
        data: {
          balances,
          mode: "live",
          lastUpdated: new Date().toISOString(),
        },
      });
    } catch (apiError) {
      console.error("Bitget balance API error:", apiError);
      
      // Return fallback demo balances with error indication
      return Response.json(
        {
          success: false,
          error: `Failed to fetch live balance: ${apiError.message}`,
          fallback: {
            balances: {
              USDT: 10000,
              AEVO: 0,
              BTC: 0,
            },
            mode: "demo_fallback",
          },
        },
        { status: 502 },
      );
    }
  } catch (error) {
    console.error("Error fetching account balance:", error);
    return Response.json(
      {
        success: false,
        error: "Internal server error during balance fetch",
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
    throw new Error("Failed to create API signature");
  }
}

// POST endpoint for refreshing balance manually
export async function POST(request) {
  try {
    const body = await request.json();
    const { user_id = "demo_user", isDemoMode = true } = body;

    // Redirect to GET with appropriate parameters
    const searchParams = new URLSearchParams({
      demoMode: isDemoMode.toString(),
      user_id: user_id,
    });

    const url = new URL(request.url);
    url.search = searchParams.toString();

    return GET({ url: url.toString() });
  } catch (error) {
    console.error("Error in POST balance refresh:", error);
    return Response.json(
      {
        success: false,
        error: "Failed to refresh balance",
      },
      { status: 500 },
    );
  }
}