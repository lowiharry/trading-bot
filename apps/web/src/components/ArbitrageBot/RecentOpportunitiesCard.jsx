export function RecentOpportunitiesCard({ opportunities }) {
  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      <h3 className="text-xl font-semibold mb-4">Recent Opportunities</h3>
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {opportunities.length === 0 ? (
          <p className="text-gray-400 text-center py-4">
            No opportunities detected yet
          </p>
        ) : (
          opportunities.map((opp, index) => (
            <div key={opp.id || index} className="bg-gray-700 p-3 rounded">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`font-semibold ${
                      opp.profitPercentage > 0
                        ? "text-green-400"
                        : "text-red-400"
                    }`}
                  >
                    {opp.profitPercentage > 0 ? "+" : ""}
                    {opp.profitPercentage.toFixed(2)}%
                  </span>
                  {opp.wasExecuted && (
                    <span className="text-xs bg-blue-600 px-2 py-1 rounded">
                      EXECUTED
                    </span>
                  )}
                  {!opp.wasExecuted && opp.profitPercentage > 1 && (
                    <span className="text-xs bg-yellow-600 px-2 py-1 rounded">
                      MISSED
                    </span>
                  )}
                </div>
                <span className="text-sm text-gray-400">
                  {opp.timestamp
                    ? new Date(opp.timestamp).toLocaleTimeString()
                    : opp.detectedAt
                      ? new Date(opp.detectedAt).toLocaleTimeString()
                      : "Unknown time"}
                </span>
              </div>
              <div className="text-sm text-gray-300">
                XRP/USDT: {opp.xrpUsdtDeviation > 0 ? "+" : ""}
                {opp.xrpUsdtDeviation.toFixed(2)}% | BTC/USDT:{" "}
                {opp.btcUsdtDeviation > 0 ? "+" : ""}
                {opp.btcUsdtDeviation.toFixed(2)}%
              </div>
              {opp.potentialProfit && (
                <div className="text-xs text-gray-400 mt-1">
                  Potential: ${opp.potentialProfit.toFixed(2)} | XRP: $
                  {opp.xrpPrice ? opp.xrpPrice.toFixed(4) : "N/A"} | BTC: $
                  {opp.btcPrice ? opp.btcPrice.toFixed(0) : "N/A"}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
