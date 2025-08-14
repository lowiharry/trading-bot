export function PortfolioBalanceCard({
  balances,
  currentPrices,
  isDemoMode,
  isLoadingBalances,
}) {
  const totalValue =
    balances.USDT +
    balances.AEVO * currentPrices["AEVO/USDT"] +
    balances.BTC * currentPrices["BTC/USDT"];

  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold">Portfolio Balance</h3>
        <div className="flex items-center gap-2">
          {isLoadingBalances && (
            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
          )}
          <span
            className={`text-xs px-2 py-1 rounded ${
              isDemoMode
                ? "bg-blue-900 text-blue-300"
                : "bg-orange-900 text-orange-300"
            }`}
          >
            {isDemoMode ? "Demo" : "Live"}
          </span>
        </div>
      </div>
      <div className="space-y-3">
        {Object.entries(balances).map(([asset, amount]) => (
          <div key={asset} className="flex justify-between items-center">
            <span className="font-medium">{asset}</span>
            <span className="font-mono">
              {amount.toFixed(asset === "USDT" ? 2 : 8)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="flex justify-between items-center font-semibold">
          <span>Total Value (USDT)</span>
          <span className="font-mono">${totalValue.toFixed(2)}</span>
        </div>
      </div>
      {!isDemoMode && (
        <div className="mt-3 text-xs text-orange-400">
          * Live account balance from Bitget API
        </div>
      )}
    </div>
  );
}
