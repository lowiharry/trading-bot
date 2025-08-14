export function TradeHistoryCard({ trades }) {
  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      <h3 className="text-xl font-semibold mb-4">Trade History</h3>
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {trades.length === 0 ? (
          <p className="text-gray-400 text-center py-4">
            No trades executed yet
          </p>
        ) : (
          trades.map((trade) => (
            <div key={trade.id} className="bg-gray-700 p-3 rounded">
              <div className="flex justify-between items-center mb-2">
                <span
                  className={`font-semibold ${parseFloat(trade.profit_loss) > 0 ? "text-green-400" : "text-red-400"}`}
                >
                  {parseFloat(trade.profit_loss) > 0 ? "+" : ""}$
                  {parseFloat(trade.profit_loss || 0).toFixed(2)}
                </span>
                <span className="text-sm text-gray-400">
                  {new Date(trade.created_at).toLocaleTimeString()}
                </span>
              </div>
              <div className="text-sm text-gray-300">
                {parseFloat(trade.profit_percentage || 0).toFixed(2)}% return |{" "}
                {trade.status}
              </div>
              {trade.execution_time_ms && (
                <div className="text-xs text-gray-400 mt-1">
                  Executed in {trade.execution_time_ms}ms
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
