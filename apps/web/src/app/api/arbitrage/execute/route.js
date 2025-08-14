import sql from "@/app/api/utils/sql";

// Execute arbitrage trade sequence: USDT → AEVO → BTC → USDT
export async function POST(request) {
  const startTime = Date.now();
  let trade = null;

  try {
    const body = await request.json();
    const {
      user_id = "demo_user",
      trade_amount,
      current_prices,
      settings,
      is_demo = true,
    } = body;

    console.log("Starting arbitrage execution:", {
      trade_amount,
      is_demo,
      current_prices,
    });

    // Enhanced validation
    if (!trade_amount || trade_amount <= 0) {
      return Response.json(
        {
          success: false,
          error: "Invalid trade amount: must be greater than 0",
        },
        { status: 400 },
      );
    }

    if (trade_amount < 10) {
      return Response.json(
        {
          success: false,
          error: "Minimum trade amount is $10",
        },
        { status: 400 },
      );
    }

    if (
      !current_prices ||
      !current_prices["AEVO/USDT"] ||
      !current_prices["BTC/USDT"] ||
      !current_prices["AEVO/BTC"]
    ) {
      return Response.json(
        {
          success: false,
          error: "Missing required price data",
        },
        { status: 400 },
      );
    }

    // Get API credentials if in live mode
    let apiCredentials = null;
    if (!is_demo) {
      console.log("🔑 Live mode detected - fetching API credentials...");
      try {
        const settingsResult = await sql`
          SELECT api_key_encrypted FROM bot_settings 
          WHERE user_id = ${user_id}
          ORDER BY created_at DESC 
          LIMIT 1
        `;

        if (settingsResult.length > 0 && settingsResult[0].api_key_encrypted) {
          // In a real implementation, decrypt the credentials here
          // For now, we'll use environment variables or return an error
          apiCredentials = {
            apiKey: process.env.BITGET_API_KEY,
            secretKey: process.env.BITGET_SECRET_KEY,
            passphrase: process.env.BITGET_PASSPHRASE,
          };

          // Check if we have environment credentials as fallback
          if (
            !apiCredentials.apiKey ||
            !apiCredentials.secretKey ||
            !apiCredentials.passphrase
          ) {
            console.log("❌ No valid API credentials found for live trading");
            return Response.json(
              {
                success: false,
                error:
                  "API credentials required for live trading. Please configure your Bitget API keys in settings or add them to environment variables.",
              },
              { status: 400 },
            );
          }

          console.log("✅ API credentials found for live trading");
        } else {
          console.log(
            "❌ No API credentials found in database for live trading",
          );
          return Response.json(
            {
              success: false,
              error:
                "API credentials required for live trading. Please configure your Bitget API keys in settings.",
            },
            { status: 400 },
          );
        }
      } catch (dbError) {
        console.error("Error fetching API credentials:", dbError);
        return Response.json(
          {
            success: false,
            error: "Failed to fetch API credentials",
          },
          { status: 500 },
        );
      }
    }

    // Validate price sanity (prevent arbitrage on stale/invalid prices)
    const aevoUsdtPrice = parseFloat(current_prices["AEVO/USDT"]);
    const btcUsdtPrice = parseFloat(current_prices["BTC/USDT"]);
    const aevoBtcPrice = parseFloat(current_prices["AEVO/BTC"]);

    if (aevoUsdtPrice <= 0 || btcUsdtPrice <= 0 || aevoBtcPrice <= 0) {
      return Response.json(
        {
          success: false,
          error: "Invalid price data: all prices must be positive",
        },
        { status: 400 },
      );
    }

    // Price staleness check - reject if prices seem unrealistic
    if (aevoUsdtPrice > 10 || aevoUsdtPrice < 0.01) {
      return Response.json(
        {
          success: false,
          error: "AEVO/USDT price appears stale or invalid",
        },
        { status: 400 },
      );
    }

    if (btcUsdtPrice > 200000 || btcUsdtPrice < 10000) {
      return Response.json(
        {
          success: false,
          error: "BTC/USDT price appears stale or invalid",
        },
        { status: 400 },
      );
    }

    // Calculate expected profit BEFORE starting trade
    const expectedAevoAmount = trade_amount / aevoUsdtPrice;
    const expectedBtcAmount = expectedAevoAmount * aevoBtcPrice;
    const expectedFinalUsdt = expectedBtcAmount * btcUsdtPrice;
    const expectedProfit = expectedFinalUsdt - trade_amount;
    const expectedProfitPercentage = (expectedProfit / trade_amount) * 100;

    console.log("Expected trade outcome:", {
      expectedProfit: expectedProfit.toFixed(4),
      expectedProfitPercentage: expectedProfitPercentage.toFixed(4),
      expectedAevoAmount: expectedAevoAmount.toFixed(8),
      expectedBtcAmount: expectedBtcAmount.toFixed(8),
    });

    // More realistic loss protection - allow smaller losses that could be profitable with slippage
    if (is_demo && expectedProfit < -5) {
      // Reduced from -100 to -5 for micro-trading
      console.log(
        `❌ Demo trade rejected - Expected loss: $${Math.abs(expectedProfit).toFixed(2)} (threshold: $5)`,
      );
      return Response.json(
        {
          success: false,
          error: `Expected loss too high: $${Math.abs(expectedProfit).toFixed(2)}. Demo mode prevents trades with >$5 expected loss.`,
        },
        { status: 400 },
      );
    }

    // For live trading, be more conservative
    if (!is_demo && expectedProfit < -2) {
      // Reduced from -20 to -2
      console.log(
        `❌ Live trade rejected - Expected loss: $${Math.abs(expectedProfit).toFixed(2)} (threshold: $2)`,
      );
      return Response.json(
        {
          success: false,
          error: `Expected loss too high: $${Math.abs(expectedProfit).toFixed(2)}. Live trading prevents trades with >$2 expected loss.`,
        },
        { status: 400 },
      );
    }

    // Enhanced logging for micro-profits
    console.log(`✅ Trade approved:`, {
      expectedProfit: expectedProfit.toFixed(6),
      expectedProfitPercentage: expectedProfitPercentage.toFixed(6),
      tradeAmount: trade_amount,
      mode: is_demo ? "DEMO" : "LIVE",
      reason: expectedProfit >= 0 ? "PROFITABLE" : "SLIPPAGE_POTENTIAL",
    });

    // Log the reasoning for trade acceptance
    if (expectedProfit < 0) {
      console.log(
        `Allowing negative expected profit trade: $${expectedProfit.toFixed(2)} - potential for slippage gains in ${is_demo ? "demo" : "live"} mode`,
      );
    }

    // Create initial trade record using transaction
    try {
      const tradeResult = await sql`
        INSERT INTO trades (
          user_id, trade_type, entry_price_aevo, entry_price_btc, 
          trade_amount, is_demo, status
        ) VALUES (
          ${user_id}, 'arbitrage', ${aevoUsdtPrice}, ${btcUsdtPrice},
          ${trade_amount}, ${is_demo}, 'executing'
        ) RETURNING *
      `;

      trade = tradeResult[0];
      console.log("Created trade record:", trade.id);
    } catch (dbError) {
      console.error("Database error creating trade:", dbError);
      return Response.json(
        {
          success: false,
          error: "Failed to initialize trade record",
        },
        { status: 500 },
      );
    }

    // Execute the three-step arbitrage with proper error handling
    let step1Data, step2Data, step3Data;
    let aevoAmount, btcAmount;

    try {
      // Step 1: Buy AEVO with USDT
      console.log("Step 1: Buying AEVO with USDT");
      const aevoQuantity = trade_amount / aevoUsdtPrice;

      const step1Response = await fetch(
        process.env.NODE_ENV === "development"
          ? "http://localhost:3000/api/bitget/trade"
          : "/api/bitget/trade",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            symbol: "AEVOUSDT",
            side: "buy",
            type: "market",
            quantity: aevoQuantity,
            isDemoMode: is_demo,
            // Pass API credentials for live trading
            ...(apiCredentials && {
              apiKey: apiCredentials.apiKey,
              secretKey: apiCredentials.secretKey,
              passphrase: apiCredentials.passphrase,
            }),
          }),
        },
      );

      if (!step1Response.ok) {
        const errorText = await step1Response.text();
        console.error(
          "Step 1 failed - Response:",
          step1Response.status,
          errorText,
        );
        throw new Error(
          `Step 1 failed: Buy AEVO - HTTP ${step1Response.status}`,
        );
      }

      step1Data = await step1Response.json();
      console.log("Step 1 completed:", step1Data);

      if (!step1Data.success) {
        throw new Error(`Step 1 failed: ${step1Data.error}`);
      }

      aevoAmount = parseFloat(step1Data.data.executedQty);
      if (aevoAmount <= 0) {
        throw new Error("Step 1 failed: Invalid executed quantity");
      }

      console.log("Acquired AEVO amount:", aevoAmount);

      // Realistic inter-trade delay
      const delay1 = is_demo
        ? 500 + Math.random() * 1000
        : 8000 + Math.random() * 4000;
      console.log(`Waiting ${Math.round(delay1)}ms between trades...`);
      await new Promise((resolve) => setTimeout(resolve, delay1));

      // Step 2: Sell AEVO for BTC
      console.log("Step 2: Selling AEVO for BTC");
      const step2Response = await fetch(
        process.env.NODE_ENV === "development"
          ? "http://localhost:3000/api/bitget/trade"
          : "/api/bitget/trade",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            symbol: "AEVOBTC",
            side: "sell",
            type: "market",
            quantity: aevoAmount,
            isDemoMode: is_demo,
            // Pass API credentials for live trading
            ...(apiCredentials && {
              apiKey: apiCredentials.apiKey,
              secretKey: apiCredentials.secretKey,
              passphrase: apiCredentials.passphrase,
            }),
          }),
        },
      );

      if (!step2Response.ok) {
        const errorText = await step2Response.text();
        console.error(
          "Step 2 failed - Response:",
          step2Response.status,
          errorText,
        );
        throw new Error(
          `Step 2 failed: Sell AEVO for BTC - HTTP ${step2Response.status}`,
        );
      }

      step2Data = await step2Response.json();
      console.log("Step 2 completed:", step2Data);

      if (!step2Data.success) {
        throw new Error(`Step 2 failed: ${step2Data.error}`);
      }

      btcAmount = parseFloat(step2Data.data.executedQty);
      if (btcAmount <= 0) {
        throw new Error("Step 2 failed: Invalid executed quantity");
      }

      console.log("Acquired BTC amount:", btcAmount);

      // Second inter-trade delay
      const delay2 = is_demo
        ? 500 + Math.random() * 1000
        : 8000 + Math.random() * 4000;
      console.log(`Waiting ${Math.round(delay2)}ms between trades...`);
      await new Promise((resolve) => setTimeout(resolve, delay2));

      // Step 3: Sell BTC for USDT
      console.log("Step 3: Selling BTC for USDT");
      const step3Response = await fetch(
        process.env.NODE_ENV === "development"
          ? "http://localhost:3000/api/bitget/trade"
          : "/api/bitget/trade",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            symbol: "BTCUSDT",
            side: "sell",
            type: "market",
            quantity: btcAmount,
            isDemoMode: is_demo,
            // Pass API credentials for live trading
            ...(apiCredentials && {
              apiKey: apiCredentials.apiKey,
              secretKey: apiCredentials.secretKey,
              passphrase: apiCredentials.passphrase,
            }),
          }),
        },
      );

      if (!step3Response.ok) {
        const errorText = await step3Response.text();
        console.error(
          "Step 3 failed - Response:",
          step3Response.status,
          errorText,
        );
        throw new Error(
          `Step 3 failed: Sell BTC for USDT - HTTP ${step3Response.status}`,
        );
      }

      step3Data = await step3Response.json();
      console.log("Step 3 completed:", step3Data);

      if (!step3Data.success) {
        throw new Error(`Step 3 failed: ${step3Data.error}`);
      }

      const finalUsdtAmount = parseFloat(step3Data.data.executedQty);
      const finalUsdtPrice = parseFloat(step3Data.data.executedPrice);

      if (finalUsdtAmount <= 0 || finalUsdtPrice <= 0) {
        throw new Error("Step 3 failed: Invalid execution data");
      }

      // Calculate final results using actual executed amounts
      const finalUsdt = finalUsdtAmount * finalUsdtPrice;
      const profit = finalUsdt - trade_amount;
      const profitPercentage = (profit / trade_amount) * 100;
      const executionTime = Date.now() - startTime;

      console.log("Trade completed:", {
        profit: profit.toFixed(4),
        profitPercentage: profitPercentage.toFixed(4),
        executionTime: executionTime,
      });

      // Calculate fees more accurately
      const totalFees =
        (parseFloat(step1Data.data.fees?.amount) || 0) +
        (parseFloat(step2Data.data.fees?.amount) || 0) +
        (parseFloat(step3Data.data.fees?.amount) || 0);

      // Update trade record with results using transaction
      const updatedTrade = await sql`
        UPDATE trades SET 
          status = 'completed',
          exit_price_aevo = ${step2Data.data.executedPrice},
          exit_price_btc = ${finalUsdtPrice},
          profit_loss = ${profit},
          profit_percentage = ${profitPercentage},
          fees_paid = ${totalFees},
          execution_time_ms = ${executionTime},
          completed_at = CURRENT_TIMESTAMP
        WHERE id = ${trade.id}
        RETURNING *
      `;

      // Record the arbitrage opportunity with execution data
      await sql`
        INSERT INTO arbitrage_opportunities (
          aevo_price, btc_price, aevo_ma, btc_ma,
          aevo_deviation, btc_deviation, potential_profit, profit_percentage,
          was_executed, trade_id
        ) VALUES (
          ${aevoUsdtPrice}, ${btcUsdtPrice},
          ${settings?.aevoUsdtMA || 0}, ${settings?.aevoBtcMA || 0},
          ${settings?.aevoUsdtDeviation || 0}, ${settings?.aevoBtcDeviation || 0},
          ${profit}, ${profitPercentage}, true, ${trade.id}
        )
      `;

      console.log("Trade successfully completed and recorded");

      return Response.json({
        success: true,
        data: {
          trade: updatedTrade[0],
          profit,
          profitPercentage,
          executionTime,
          expectedProfit,
          slippage:
            Math.abs((profit - expectedProfit) / Math.abs(expectedProfit)) *
            100,
          steps: [
            {
              step: 1,
              action: "Buy AEVO",
              result: {
                ...step1Data.data,
                symbol: "AEVOUSDT",
                executedAmount: aevoAmount,
              },
            },
            {
              step: 2,
              action: "Sell AEVO for BTC",
              result: {
                ...step2Data.data,
                symbol: "AEVOBTC",
                executedAmount: btcAmount,
              },
            },
            {
              step: 3,
              action: "Sell BTC for USDT",
              result: {
                ...step3Data.data,
                symbol: "BTCUSDT",
                executedAmount: finalUsdtAmount,
                finalValue: finalUsdt,
              },
            },
          ],
          strategy: {
            route: "USDT → AEVO → BTC → USDT",
            entryAmount: trade_amount,
            exitAmount: finalUsdt,
            aevoUsdtDeviation: settings?.aevoUsdtDeviation,
            aevoBtcDeviation: settings?.aevoBtcDeviation,
          },
        },
      });
    } catch (stepError) {
      console.error("Trade execution step error:", stepError);

      // Update trade record with error details
      if (trade?.id) {
        try {
          await sql`
            UPDATE trades SET 
              status = 'failed',
              error_message = ${stepError.message},
              execution_time_ms = ${Date.now() - startTime},
              completed_at = CURRENT_TIMESTAMP
            WHERE id = ${trade.id}
          `;
        } catch (updateError) {
          console.error("Failed to update failed trade:", updateError);
        }
      }

      return Response.json(
        {
          success: false,
          error: stepError.message,
          trade_id: trade?.id,
          execution_time: Date.now() - startTime,
          step_completed: step1Data ? (step2Data ? 2 : 1) : 0,
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Error executing arbitrage:", error);

    // Update trade record with error if it exists
    if (trade?.id) {
      try {
        await sql`
          UPDATE trades SET 
            status = 'failed',
            error_message = ${error.message},
            execution_time_ms = ${Date.now() - startTime},
            completed_at = CURRENT_TIMESTAMP
          WHERE id = ${trade.id}
        `;
      } catch (updateError) {
        console.error("Failed to update failed trade:", updateError);
      }
    }

    // Enhanced error categorization
    let statusCode = 500;
    let errorMessage = "Internal server error";

    if (
      error.message.includes("Invalid") ||
      error.message.includes("Missing")
    ) {
      statusCode = 400;
      errorMessage = error.message;
    } else if (
      error.message.includes("timeout") ||
      error.message.includes("network")
    ) {
      statusCode = 503;
      errorMessage = "Service temporarily unavailable";
    } else if (error.message.includes("HTTP 4")) {
      statusCode = 502;
      errorMessage = "Trading service error";
    }

    return Response.json(
      {
        success: false,
        error: errorMessage,
        trade_id: trade?.id,
        execution_time: Date.now() - startTime,
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: statusCode },
    );
  }
}

// Get arbitrage execution status
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const trade_id = searchParams.get("trade_id");
    const user_id = searchParams.get("user_id") || "demo_user";

    if (trade_id) {
      // Get specific trade status
      const result = await sql`
        SELECT * FROM trades WHERE id = ${trade_id}
      `;

      return Response.json({
        success: true,
        data: result[0] || null,
      });
    }

    // Get recent arbitrage executions
    const recentTrades = await sql`
      SELECT * FROM trades 
      WHERE user_id = ${user_id} AND trade_type = 'arbitrage'
      ORDER BY created_at DESC 
      LIMIT 10
    `;

    return Response.json({
      success: true,
      data: recentTrades,
    });
  } catch (error) {
    console.error("Error getting arbitrage status:", error);
    return Response.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    );
  }
}
