import sql from "../utils/sql.js";

// Create a new trade record
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      user_id = "demo_user",
      trade_type = "arbitrage",
      entry_price_aevo,
      entry_price_btc,
      exit_price_aevo,
      exit_price_btc,
      trade_amount,
      profit_loss = 0,
      profit_percentage = 0,
      fees_paid = 0,
      execution_time_ms,
      error_message,
      status = "pending",
      is_demo = true,
    } = body;

    // Insert new trade
    const result = await sql`
      INSERT INTO trades (
        user_id, trade_type, entry_price_aevo, entry_price_btc, 
        exit_price_aevo, exit_price_btc, trade_amount, profit_loss, 
        profit_percentage, fees_paid, execution_time_ms, error_message,
        status, is_demo, completed_at
      ) VALUES (
        ${user_id}, ${trade_type}, ${entry_price_aevo}, ${entry_price_btc},
        ${exit_price_aevo}, ${exit_price_btc}, ${trade_amount}, ${profit_loss},
        ${profit_percentage}, ${fees_paid}, ${execution_time_ms}, ${error_message},
        ${status}, ${is_demo}, ${status === "completed" || status === "failed" ? "NOW()" : null}
      ) RETURNING *
    `;

    // Clean up old trades - keep only the 10 most recent per demo mode
    await sql`
      DELETE FROM trades 
      WHERE is_demo = ${is_demo} 
      AND id NOT IN (
        SELECT id FROM trades 
        WHERE is_demo = ${is_demo}
        ORDER BY created_at DESC 
        LIMIT 10
      )
    `;

    return Response.json({
      success: true,
      data: result[0],
    });
  } catch (error) {
    console.error("Error creating trade:", error);
    return Response.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    );
  }
}

// Get trades list with filtering
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get("user_id") || "demo_user";
    const limit = Math.min(parseInt(searchParams.get("limit")) || 10, 10); // Always cap at 10
    const status = searchParams.get("status");
    const is_demo = searchParams.get("is_demo");

    // Build the query using template literals properly
    let tradesQuery, statsQuery;

    if (status && is_demo !== null) {
      const demoValue = is_demo === "true";
      tradesQuery = sql`
        SELECT * FROM trades 
        WHERE user_id = ${user_id} AND status = ${status} AND is_demo = ${demoValue}
        ORDER BY created_at DESC 
        LIMIT 10
      `;

      statsQuery = sql`
        SELECT 
          COUNT(*)::int as total_trades,
          COUNT(CASE WHEN profit_loss > 0 THEN 1 END)::int as profitable_trades,
          COALESCE(SUM(profit_loss), 0)::numeric as total_profit,
          COALESCE(AVG(profit_percentage), 0)::numeric as avg_profit_percentage,
          COALESCE(SUM(fees_paid), 0)::numeric as total_fees
        FROM trades 
        WHERE user_id = ${user_id} AND status = 'completed' AND is_demo = ${demoValue}
      `;
    } else if (status) {
      tradesQuery = sql`
        SELECT * FROM trades 
        WHERE user_id = ${user_id} AND status = ${status}
        ORDER BY created_at DESC 
        LIMIT 10
      `;

      statsQuery = sql`
        SELECT 
          COUNT(*)::int as total_trades,
          COUNT(CASE WHEN profit_loss > 0 THEN 1 END)::int as profitable_trades,
          COALESCE(SUM(profit_loss), 0)::numeric as total_profit,
          COALESCE(AVG(profit_percentage), 0)::numeric as avg_profit_percentage,
          COALESCE(SUM(fees_paid), 0)::numeric as total_fees
        FROM trades 
        WHERE user_id = ${user_id} AND status = 'completed'
      `;
    } else if (is_demo !== null) {
      const demoValue = is_demo === "true";
      tradesQuery = sql`
        SELECT * FROM trades 
        WHERE user_id = ${user_id} AND is_demo = ${demoValue}
        ORDER BY created_at DESC 
        LIMIT 10
      `;

      statsQuery = sql`
        SELECT 
          COUNT(*)::int as total_trades,
          COUNT(CASE WHEN profit_loss > 0 THEN 1 END)::int as profitable_trades,
          COALESCE(SUM(profit_loss), 0)::numeric as total_profit,
          COALESCE(AVG(profit_percentage), 0)::numeric as avg_profit_percentage,
          COALESCE(SUM(fees_paid), 0)::numeric as total_fees
        FROM trades 
        WHERE user_id = ${user_id} AND status = 'completed' AND is_demo = ${demoValue}
      `;
    } else {
      tradesQuery = sql`
        SELECT * FROM trades 
        WHERE user_id = ${user_id}
        ORDER BY created_at DESC 
        LIMIT 10
      `;

      statsQuery = sql`
        SELECT 
          COUNT(*)::int as total_trades,
          COUNT(CASE WHEN profit_loss > 0 THEN 1 END)::int as profitable_trades,
          COALESCE(SUM(profit_loss), 0)::numeric as total_profit,
          COALESCE(AVG(profit_percentage), 0)::numeric as avg_profit_percentage,
          COALESCE(SUM(fees_paid), 0)::numeric as total_fees
        FROM trades 
        WHERE user_id = ${user_id} AND status = 'completed'
      `;
    }

    const [trades, stats] = await Promise.all([tradesQuery, statsQuery]);

    // Format the stats properly
    const formattedStats = {
      total_trades: parseInt(stats[0].total_trades) || 0,
      profitable_trades: parseInt(stats[0].profitable_trades) || 0,
      total_profit: parseFloat(stats[0].total_profit) || 0,
      avg_profit_percentage: parseFloat(stats[0].avg_profit_percentage) || 0,
      total_fees: parseFloat(stats[0].total_fees) || 0,
    };

    // Calculate success rate
    const successRate =
      formattedStats.total_trades > 0
        ? (formattedStats.profitable_trades / formattedStats.total_trades) * 100
        : 0;

    return Response.json({
      success: true,
      data: {
        trades,
        stats: {
          ...formattedStats,
          success_rate: parseFloat(successRate.toFixed(2)),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching trades:", error);
    return Response.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    );
  }
}
