import sql from "@/app/api/utils/sql";

// Validation helpers
const validateLimit = (limit) => {
  const parsed = parseInt(limit);
  if (isNaN(parsed) || parsed < 1 || parsed > 5) {
    return 5; // Default safe value
  }
  return parsed;
};

const validateBooleanParam = (param) => {
  if (param === null || param === undefined) return null;
  return param === "true" || param === "1";
};

// Get recent arbitrage opportunities
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawLimit = searchParams.get("limit");
    const rawWasExecuted = searchParams.get("was_executed");

    // Enhanced validation
    const limit = validateLimit(rawLimit);
    const was_executed = validateBooleanParam(rawWasExecuted);

    let query = `
      SELECT 
        id, aevo_price, btc_price, aevo_ma, btc_ma, aevo_deviation, btc_deviation,
        potential_profit, profit_percentage, was_executed, trade_id, detected_at
      FROM arbitrage_opportunities
    `;

    const conditions = [];
    const params = [];

    // Filter by execution status if specified
    if (was_executed !== null) {
      conditions.push(`was_executed = $${params.length + 1}`);
      params.push(was_executed);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`;
    }

    // Always order by newest first and limit to exactly 5
    query += ` ORDER BY detected_at DESC LIMIT $${params.length + 1}`;
    params.push(5); // Always limit to 5, regardless of requested limit

    const opportunities = await sql(query, params);

    // Calculate summary statistics with better error handling
    const statsQuery = `
      SELECT 
        COUNT(*) as total_opportunities,
        SUM(CASE WHEN was_executed = true THEN 1 ELSE 0 END) as executed_opportunities,
        COALESCE(AVG(profit_percentage), 0) as avg_profit_percentage,
        COALESCE(MAX(profit_percentage), 0) as max_profit_percentage,
        COALESCE(MIN(profit_percentage), 0) as min_profit_percentage
      FROM arbitrage_opportunities
      ${was_executed !== null ? `WHERE was_executed = $1` : ""}
    `;

    const statsParams = was_executed !== null ? [was_executed] : [];
    const stats = await sql(statsQuery, statsParams);

    return Response.json({
      success: true,
      data: {
        opportunities: opportunities.map((opp) => ({
          id: opp.id,
          aevoPrice: parseFloat(opp.aevo_price) || 0,
          btcPrice: parseFloat(opp.btc_price) || 0,
          aevoMA: parseFloat(opp.aevo_ma) || 0,
          btcMA: parseFloat(opp.btc_ma) || 0,
          aevoDeviation: parseFloat(opp.aevo_deviation) || 0,
          btcDeviation: parseFloat(opp.btc_deviation) || 0,
          potentialProfit: parseFloat(opp.potential_profit) || 0,
          profitPercentage: parseFloat(opp.profit_percentage) || 0,
          wasExecuted: Boolean(opp.was_executed),
          tradeId: opp.trade_id,
          detectedAt: new Date(opp.detected_at),
          timestamp: new Date(opp.detected_at),
          // Add computed fields for frontend compatibility
          aevoUsdtDeviation: parseFloat(opp.aevo_deviation) || 0,
          aevoBtcDeviation: parseFloat(opp.btc_deviation) || 0,
        })),
        stats: {
          total_opportunities: parseInt(stats[0]?.total_opportunities) || 0,
          executed_opportunities:
            parseInt(stats[0]?.executed_opportunities) || 0,
          avg_profit_percentage:
            parseFloat(stats[0]?.avg_profit_percentage) || 0,
          max_profit_percentage:
            parseFloat(stats[0]?.max_profit_percentage) || 0,
          min_profit_percentage:
            parseFloat(stats[0]?.min_profit_percentage) || 0,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching arbitrage opportunities:", error);
    return Response.json(
      {
        success: false,
        error: "Failed to fetch opportunities",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 },
    );
  }
}

// Record a new arbitrage opportunity with enhanced validation
export async function POST(request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return Response.json(
        {
          success: false,
          error: "Invalid JSON in request body",
        },
        { status: 400 },
      );
    }

    // Validate required fields
    const requiredFields = [
      "aevo_price",
      "btc_price",
      "potential_profit",
      "profit_percentage",
    ];
    const missingFields = requiredFields.filter(
      (field) => body[field] === undefined || body[field] === null,
    );

    if (missingFields.length > 0) {
      return Response.json(
        {
          success: false,
          error: `Missing required fields: ${missingFields.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // Sanitize and validate numeric inputs
    const validateNumber = (value, fieldName, min = null, max = null) => {
      const num = parseFloat(value);
      if (isNaN(num)) {
        throw new Error(`Invalid number for ${fieldName}: ${value}`);
      }
      if (min !== null && num < min) {
        throw new Error(`${fieldName} must be >= ${min}`);
      }
      if (max !== null && num > max) {
        throw new Error(`${fieldName} must be <= ${max}`);
      }
      return num;
    };

    const sanitizedData = {
      aevo_price: validateNumber(body.aevo_price, "aevo_price", 0),
      btc_price: validateNumber(body.btc_price, "btc_price", 0),
      aevo_ma: validateNumber(body.aevo_ma || 0, "aevo_ma", 0),
      btc_ma: validateNumber(body.btc_ma || 0, "btc_ma", 0),
      aevo_deviation: validateNumber(
        body.aevo_deviation || 0,
        "aevo_deviation",
        -100,
        100,
      ),
      btc_deviation: validateNumber(
        body.btc_deviation || 0,
        "btc_deviation",
        -100,
        100,
      ),
      potential_profit: validateNumber(
        body.potential_profit,
        "potential_profit",
      ),
      profit_percentage: validateNumber(
        body.profit_percentage,
        "profit_percentage",
        -100,
        100,
      ),
      was_executed: Boolean(body.was_executed || false),
      trade_id: body.trade_id ? parseInt(body.trade_id) : null,
    };

    // Validate trade_id if provided
    if (body.trade_id && isNaN(sanitizedData.trade_id)) {
      return Response.json(
        {
          success: false,
          error: "Invalid trade_id: must be a number",
        },
        { status: 400 },
      );
    }

    const result = await sql`
      INSERT INTO arbitrage_opportunities (
        aevo_price, btc_price, aevo_ma, btc_ma,
        aevo_deviation, btc_deviation, potential_profit, profit_percentage,
        was_executed, trade_id
      ) VALUES (
        ${sanitizedData.aevo_price}, ${sanitizedData.btc_price}, 
        ${sanitizedData.aevo_ma}, ${sanitizedData.btc_ma},
        ${sanitizedData.aevo_deviation}, ${sanitizedData.btc_deviation}, 
        ${sanitizedData.potential_profit}, ${sanitizedData.profit_percentage},
        ${sanitizedData.was_executed}, ${sanitizedData.trade_id}
      ) RETURNING id, detected_at
    `;

    // Clean up old opportunities - keep only the 5 most recent
    await sql`
      DELETE FROM arbitrage_opportunities 
      WHERE id NOT IN (
        SELECT id FROM arbitrage_opportunities 
        ORDER BY detected_at DESC 
        LIMIT 5
      )
    `;

    return Response.json({
      success: true,
      data: {
        id: result[0].id,
        detected_at: result[0].detected_at,
      },
    });
  } catch (error) {
    console.error("Error recording arbitrage opportunity:", error);

    // Return specific validation errors to client
    if (
      error.message.includes("Invalid number") ||
      error.message.includes("must be") ||
      error.message.includes("Missing required")
    ) {
      return Response.json(
        {
          success: false,
          error: error.message,
        },
        { status: 400 },
      );
    }

    return Response.json(
      {
        success: false,
        error: "Failed to record opportunity",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 },
    );
  }
}
