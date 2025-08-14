import sql from '../../utils/sql.js';

// Get a specific trade by ID
export async function GET(request, { params }) {
  try {
    const { id } = params;

    const result = await sql`
      SELECT * FROM trades WHERE id = ${id}
    `;

    if (result.length === 0) {
      return Response.json({
        success: false,
        error: 'Trade not found'
      }, { status: 404 });
    }

    return Response.json({
      success: true,
      data: result[0]
    });

  } catch (error) {
    console.error('Error fetching trade:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

// Update a trade (complete, add profit/loss, etc.)
export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    const {
      status,
      exit_price_aevo,
      exit_price_btc,
      profit_loss,
      profit_percentage,
      fees_paid,
      execution_time_ms,
      error_message
    } = body;

    // Build dynamic update query
    const updateFields = [];
    const updateValues = [];

    if (status !== undefined) {
      updateFields.push('status');
      updateValues.push(status);
    }
    if (exit_price_aevo !== undefined) {
      updateFields.push('exit_price_aevo');
      updateValues.push(exit_price_aevo);
    }
    if (exit_price_btc !== undefined) {
      updateFields.push('exit_price_btc');
      updateValues.push(exit_price_btc);
    }
    if (profit_loss !== undefined) {
      updateFields.push('profit_loss');
      updateValues.push(profit_loss);
    }
    if (profit_percentage !== undefined) {
      updateFields.push('profit_percentage');
      updateValues.push(profit_percentage);
    }
    if (fees_paid !== undefined) {
      updateFields.push('fees_paid');
      updateValues.push(fees_paid);
    }
    if (execution_time_ms !== undefined) {
      updateFields.push('execution_time_ms');
      updateValues.push(execution_time_ms);
    }
    if (error_message !== undefined) {
      updateFields.push('error_message');
      updateValues.push(error_message);
    }

    // Add completed_at timestamp if status is completed
    if (status === 'completed') {
      updateFields.push('completed_at');
      updateValues.push(new Date().toISOString());
    }

    if (updateFields.length === 0) {
      return Response.json({
        success: false,
        error: 'No fields to update'
      }, { status: 400 });
    }

    // Build SET clause
    const setClause = updateFields.map((field, index) => `${field} = $${index + 1}`).join(', ');
    updateValues.push(id); // Add ID for WHERE clause

    const result = await sql(
      `UPDATE trades SET ${setClause} WHERE id = $${updateValues.length} RETURNING *`,
      updateValues
    );

    if (result.length === 0) {
      return Response.json({
        success: false,
        error: 'Trade not found'
      }, { status: 404 });
    }

    return Response.json({
      success: true,
      data: result[0]
    });

  } catch (error) {
    console.error('Error updating trade:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

// Delete a trade
export async function DELETE(request, { params }) {
  try {
    const { id } = params;

    const result = await sql`
      DELETE FROM trades WHERE id = ${id} RETURNING *
    `;

    if (result.length === 0) {
      return Response.json({
        success: false,
        error: 'Trade not found'
      }, { status: 404 });
    }

    return Response.json({
      success: true,
      message: 'Trade deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting trade:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}