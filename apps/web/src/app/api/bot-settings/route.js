import sql from "@/app/api/utils/sql";

// Get bot settings
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get("user_id") || "demo_user";

    const result = await sql`
      SELECT * FROM bot_settings 
      WHERE user_id = ${user_id} 
      ORDER BY created_at DESC 
      LIMIT 1
    `;

    if (result.length === 0) {
      // Return default settings if none exist - optimized for ultra-aggressive trade execution
      return Response.json({
        success: true,
        data: {
          entryThreshold: 0.01, // Ultra-aggressive - down from 0.5 to 0.01 for hyper-frequent entries
          profitTarget: 0.005, // Micro-profits - down from 0.01 to 0.005% for tiny profit captures
          stopLoss: 0.1, // Tight risk management - down from 0.5 to 0.1 for better protection
          tradeAmount: 1000,
          maxConcurrentTrades: 5, // Maximum activity - up from 3 to 5 for highest throughput
          isDemoMode: true,
          isActive: false,
        },
      });
    }

    // Transform snake_case database fields to camelCase for frontend
    const settings = result[0];
    return Response.json({
      success: true,
      data: {
        id: settings.id,
        userId: settings.user_id,
        entryThreshold: parseFloat(settings.entry_threshold),
        profitTarget: parseFloat(settings.profit_target),
        stopLoss: parseFloat(settings.stop_loss),
        tradeAmount: parseFloat(settings.trade_amount),
        maxConcurrentTrades: parseInt(settings.max_concurrent_trades),
        isDemoMode: settings.is_demo_mode,
        isActive: settings.is_active,
        api_key_encrypted: settings.api_key_encrypted,
        createdAt: settings.created_at,
        updatedAt: settings.updated_at,
      },
    });
  } catch (error) {
    console.error("Error fetching bot settings:", error);
    return Response.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    );
  }
}

// Create or update bot settings
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      user_id = "demo_user",
      apiKey,
      secretKey,
      passphrase,
      entryThreshold,
      profitTarget,
      stopLoss,
      tradeAmount,
      maxConcurrentTrades,
      isDemoMode,
      isActive, // Add bot status tracking
    } = body;

    // Check if settings already exist
    const existing = await sql`
      SELECT id FROM bot_settings WHERE user_id = ${user_id}
    `;

    let result;

    if (existing.length > 0) {
      // Update existing settings using individual UPDATE statements for reliability
      const settingsId = existing[0].id;

      if (entryThreshold !== undefined) {
        await sql`UPDATE bot_settings SET entry_threshold = ${entryThreshold} WHERE id = ${settingsId}`;
      }
      if (profitTarget !== undefined) {
        await sql`UPDATE bot_settings SET profit_target = ${profitTarget} WHERE id = ${settingsId}`;
      }
      if (stopLoss !== undefined) {
        await sql`UPDATE bot_settings SET stop_loss = ${stopLoss} WHERE id = ${settingsId}`;
      }
      if (tradeAmount !== undefined) {
        await sql`UPDATE bot_settings SET trade_amount = ${tradeAmount} WHERE id = ${settingsId}`;
      }
      if (maxConcurrentTrades !== undefined) {
        await sql`UPDATE bot_settings SET max_concurrent_trades = ${maxConcurrentTrades} WHERE id = ${settingsId}`;
      }
      if (isDemoMode !== undefined) {
        await sql`UPDATE bot_settings SET is_demo_mode = ${isDemoMode} WHERE id = ${settingsId}`;
      }
      // Add bot status tracking
      if (isActive !== undefined) {
        await sql`UPDATE bot_settings SET is_active = ${isActive} WHERE id = ${settingsId}`;
      }

      // Handle API credentials (encrypt in real implementation)
      if (apiKey && !apiKey.includes("••••")) {
        await sql`UPDATE bot_settings SET api_key_encrypted = ${encryptApiKey(apiKey)} WHERE id = ${settingsId}`;
      }

      // Update timestamp
      await sql`UPDATE bot_settings SET updated_at = CURRENT_TIMESTAMP WHERE id = ${settingsId}`;

      // Get updated record
      result = await sql`SELECT * FROM bot_settings WHERE id = ${settingsId}`;
    } else {
      // Create new settings with optimized defaults for ultra-aggressive trade execution
      result = await sql`
        INSERT INTO bot_settings (
          user_id, entry_threshold, profit_target, stop_loss, 
          trade_amount, max_concurrent_trades, is_demo_mode,
          is_active, api_key_encrypted
        ) VALUES (
          ${user_id}, ${entryThreshold || 0.01}, ${profitTarget || 0.005}, ${stopLoss || 0.1},
          ${tradeAmount || 1000}, ${maxConcurrentTrades || 5}, ${isDemoMode !== false},
          ${isActive || false}, ${apiKey ? encryptApiKey(apiKey) : null}
        ) RETURNING *
      `;
    }

    // Transform response to camelCase
    const settings = result[0];
    return Response.json({
      success: true,
      data: {
        id: settings.id,
        userId: settings.user_id,
        entryThreshold: parseFloat(settings.entry_threshold),
        profitTarget: parseFloat(settings.profit_target),
        stopLoss: parseFloat(settings.stop_loss),
        tradeAmount: parseFloat(settings.trade_amount),
        maxConcurrentTrades: parseInt(settings.max_concurrent_trades),
        isDemoMode: settings.is_demo_mode,
        isActive: settings.is_active,
        createdAt: settings.created_at,
        updatedAt: settings.updated_at,
      },
      message: "Settings saved successfully",
    });
  } catch (error) {
    console.error("Error saving bot settings:", error);
    return Response.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    );
  }
}

// Reset settings to optimized defaults
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get("user_id") || "demo_user";

    // Delete existing settings to force defaults on next load
    await sql`DELETE FROM bot_settings WHERE user_id = ${user_id}`;

    return Response.json({
      success: true,
      message: "Settings reset to defaults successfully",
    });
  } catch (error) {
    console.error("Error resetting bot settings:", error);
    return Response.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    );
  }
}

// Simple placeholder encryption (use proper encryption in production)
function encryptApiKey(apiKey) {
  // In a real implementation, use proper encryption like AES
  // This is just a placeholder
  return Buffer.from(apiKey).toString("base64");
}

function decryptApiKey(encryptedKey) {
  // In a real implementation, use proper decryption
  // This is just a placeholder
  try {
    return Buffer.from(encryptedKey, "base64").toString("utf8");
  } catch {
    return null;
  }
}
