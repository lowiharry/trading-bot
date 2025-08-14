import { RefreshCw } from "lucide-react";

export function BotSettings({
  settings,
  updateSettings,
  isSavingSettings,
  balances,
}) {
  return (
    <div className="mt-8 bg-gray-800 p-6 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold">Bot Settings</h3>
        {isSavingSettings && (
          <div className="flex items-center gap-2 text-sm text-blue-400">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Saving...</span>
          </div>
        )}
      </div>
      <div className="mb-4 p-4 bg-blue-900/30 rounded-lg">
        <h4 className="font-semibold text-blue-400 mb-2">
          Triangular Arbitrage Strategy
        </h4>
        <p className="text-sm text-gray-300">
          Bot executes USDT → AEVO → BTC → USDT when AEVO/BTC ≥4% increase
          exceeds AEVO/USDT increase. Trades execute sequentially with
          10-second intervals.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div>
          <label className="block text-sm font-medium mb-2">
            AEVO/USDT Threshold (%)
          </label>
          <input
            type="number"
            value={2.5}
            disabled
            className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 opacity-75"
          />
          <div className="text-xs text-gray-400 mt-1">Fixed at 2.5%</div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">
            AEVO/BTC Threshold (%)
          </label>
          <input
            type="number"
            value={4.0}
            disabled
            className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 opacity-75"
          />
          <div className="text-xs text-gray-400 mt-1">Fixed at 4.0%</div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">
            Profit Target (%)
          </label>
          <input
            type="number"
            value={settings.profitTarget}
            onChange={(e) =>
              updateSettings("profitTarget", parseFloat(e.target.value))
            }
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
            step="0.1"
            min="0.1"
            max="5"
          />
          <div className="text-xs text-green-400 mt-1">
            Auto-saves changes
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">
            Trade Amount (USDT)
          </label>
          <input
            type="number"
            value={settings.tradeAmount}
            onChange={(e) =>
              updateSettings("tradeAmount", parseFloat(e.target.value))
            }
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
            step="100"
            min="100"
            max={balances.USDT}
          />
          <div className="text-xs text-green-400 mt-1">
            Auto-saves changes
          </div>
        </div>
      </div>
    </div>
  );
}
