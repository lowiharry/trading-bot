export function TradingParameters({ settings, updateSettings }) {
  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      <h2 className="text-xl font-semibold mb-6">Trading Parameters</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Entry Threshold (%)
          </label>
          <input
            type="number"
            value={settings.entryThreshold}
            onChange={(e) =>
              updateSettings("entryThreshold", parseFloat(e.target.value))
            }
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
            step="0.1"
            min="0.1"
            max="10"
          />
          <p className="text-xs text-gray-400 mt-1">
            Minimum price deviation from moving average to trigger trades
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">
            Stop Loss (%)
          </label>
          <input
            type="number"
            value={settings.stopLoss}
            onChange={(e) =>
              updateSettings("stopLoss", parseFloat(e.target.value))
            }
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
            step="0.1"
            min="0.1"
            max="5"
          />
          <p className="text-xs text-gray-400 mt-1">
            Maximum acceptable loss percentage before stopping
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">
            Max Concurrent Trades
          </label>
          <input
            type="number"
            value={settings.maxConcurrentTrades}
            onChange={(e) =>
              updateSettings("maxConcurrentTrades", parseInt(e.target.value))
            }
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
            min="1"
            max="5"
          />
          <p className="text-xs text-gray-400 mt-1">
            Maximum number of simultaneous arbitrage trades
          </p>
        </div>
      </div>
    </div>
  );
}
