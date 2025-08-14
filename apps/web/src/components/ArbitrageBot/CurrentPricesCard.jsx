import { RefreshCw } from "lucide-react";

export function CurrentPricesCard({
  currentPrices,
  movingAverages,
  isLoadingPrices,
  dataFreshness,
}) {
  const getDataAge = (timestamp) => {
    if (!timestamp) return "N/A";
    const now = new Date();
    const diff = (now - new Date(timestamp)) / 1000;
    if (diff < 60) return `${Math.floor(diff)}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold">Current Prices</h3>
        <div className="flex items-center gap-2">
          {isLoadingPrices && (
            <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
          )}
          <div
            className={`w-2 h-2 rounded-full ${isLoadingPrices ? "bg-yellow-400 animate-pulse" : "bg-green-400"}`}
          ></div>
          <span className="text-xs text-gray-400">
            {dataFreshness?.prices ? getDataAge(dataFreshness.prices) : "Live"}
          </span>
        </div>
      </div>
      <div className="space-y-3">
        {["AEVO/USDT", "BTC/USDT", "AEVO/BTC"].map((pair) => {
          const price = currentPrices[pair];
          const ma = movingAverages[pair];
          const deviation = ma ? ((price - ma) / ma) * 100 : 0;

          const aevoUsdtDeviation = movingAverages["AEVO/USDT"]
            ? ((currentPrices["AEVO/USDT"] - movingAverages["AEVO/USDT"]) /
                movingAverages["AEVO/USDT"]) *
              100
            : 0;
          const aevoBtcDeviation = movingAverages["AEVO/BTC"]
            ? ((currentPrices["AEVO/BTC"] - movingAverages["AEVO/BTC"]) /
                movingAverages["AEVO/BTC"]) *
              100
            : 0;

          let conditionMet = false;
          if (
            pair === "AEVO/BTC" &&
            aevoBtcDeviation >= 4.0 &&
            aevoBtcDeviation > aevoUsdtDeviation
          )
            conditionMet = true;

          return (
            <div
              key={pair}
              className={`flex justify-between items-center ${conditionMet ? "bg-green-900/30 p-2 rounded" : ""}`}
            >
              <span className="font-medium">
                {pair}
                {conditionMet && (
                  <span className="ml-2 text-green-400 text-xs">
                    ✓ ARBITRAGE READY
                  </span>
                )}
              </span>
              <div className="text-right">
                <div className="font-mono">
                  $
                  {price.toFixed(
                    pair.includes("BTC") && !pair.includes("AEVO") ? 0 : 6,
                  )}
                </div>
                {ma && (
                  <div
                    className={`text-sm ${deviation > 0 ? "text-green-400" : "text-red-400"}`}
                  >
                    {deviation > 0 ? "+" : ""}
                    {deviation.toFixed(2)}% vs MA
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 pt-4 border-t border-gray-700 text-sm text-gray-400">
        <div>Strategy: Execute when AEVO/BTC ≥4% {">"} AEVO/USDT increase</div>
        <div>• AEVO/BTC: ≥4.0% increase vs MA</div>
        <div>• AEVO/BTC increase must exceed AEVO/USDT increase</div>
      </div>
    </div>
  );
}
