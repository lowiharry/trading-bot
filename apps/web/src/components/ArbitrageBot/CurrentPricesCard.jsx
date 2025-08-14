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

  const xrpIsLow = movingAverages["XRP/USDT"]
    ? currentPrices["XRP/USDT"] <= movingAverages["XRP/USDT"] * 0.97
    : false;
  const btcIsHigh = movingAverages["BTC/USDT"]
    ? currentPrices["BTC/USDT"] >= movingAverages["BTC/USDT"] * 1.03
    : false;
  const arbitrageReady = xrpIsLow && btcIsHigh;

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
        {["XRP/USDT", "BTC/USDT", "XRP/BTC"].map((pair) => {
          const price = currentPrices[pair] || 0;
          const ma = movingAverages[pair] || 0;
          const deviation = ma ? ((price - ma) / ma) * 100 : 0;

          let conditionMet = false;
          if (pair === "XRP/USDT" && xrpIsLow) conditionMet = true;
          if (pair === "BTC/USDT" && btcIsHigh) conditionMet = true;

          return (
            <div
              key={pair}
              className={`flex justify-between items-center ${conditionMet && arbitrageReady ? "bg-green-900/30 p-2 rounded" : ""}`}
            >
              <span className="font-medium">
                {pair}
                {conditionMet && arbitrageReady && (
                  <span className="ml-2 text-green-400 text-xs">
                    ✓ TRIGGER
                  </span>
                )}
              </span>
              <div className="text-right">
                <div className="font-mono">
                  {pair.includes("BTC") && !pair.includes("XRP") ? (price.toFixed(2)) : (price.toFixed(6))}
                </div>
                {ma > 0 && (
                  <div
                    className={`text-sm ${deviation >= 0 ? "text-green-400" : "text-red-400"}`}
                  >
                    {deviation >= 0 ? "+" : ""}
                    {deviation.toFixed(2)}% vs MA
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 pt-4 border-t border-gray-700 text-sm text-gray-400">
        <div>Strategy: Execute when XRP is low and BTC is high.</div>
        <div>• XRP/USDT: ≤3.0% below 12h MA</div>
        <div>• BTC/USDT: ≥3.0% above 12h MA</div>
      </div>
    </div>
  );
}
