import { Play, Pause, RefreshCw, AlertTriangle, Clock } from "lucide-react";

export function DashboardHeader({
  isRunning,
  isExecuting,
  isDemoMode,
  setIsDemoMode,
  error,
  lastUpdated,
  isLoadingPrices,
  onToggleBot,
  refreshAllData,
  dataFreshness,
}) {
  const getDataAge = (timestamp) => {
    if (!timestamp) return "N/A";
    const now = new Date();
    const diff = (now - new Date(timestamp)) / 1000; // seconds
    if (diff < 60) return `${Math.floor(diff)}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    return `${Math.floor(diff / 3600)}h`;
  };

  return (
    <div className="mb-8">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            Bitget Triangular Arbitrage Bot
          </h1>
          <div className="text-gray-400 mt-2">
            <p className="mb-2">
              USDT → AEVO → BTC → USDT when AEVO/BTC ≥4% increase {">"}{" "}
              AEVO/USDT increase
            </p>

            {/* Data Freshness Indicators */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${isLoadingPrices ? "bg-yellow-400 animate-pulse" : "bg-green-400"}`}
                />
                <span>Prices: {getDataAge(dataFreshness?.prices)}</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${parseInt(getDataAge(dataFreshness?.trades)) > 60 ? "bg-yellow-400" : "bg-green-400"}`}
                />
                <span>Trades: {getDataAge(dataFreshness?.trades)}</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${parseInt(getDataAge(dataFreshness?.opportunities)) > 30 ? "bg-yellow-400" : "bg-green-400"}`}
                />
                <span>
                  Opportunities: {getDataAge(dataFreshness?.opportunities)}
                </span>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="flex items-center gap-2 text-red-400 bg-red-900/30 px-4 py-2 rounded-lg mt-3">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Manual Refresh Button */}
          {refreshAllData && (
            <button
              onClick={refreshAllData}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              title="Refresh all data"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
          )}

          {/* Demo Mode Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Mode:</span>
            <button
              onClick={() => setIsDemoMode(!isDemoMode)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isDemoMode
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-orange-600 hover:bg-orange-700 text-white"
              }`}
              title={
                isRunning
                  ? "Bot will restart when mode is changed"
                  : "Switch between demo and live trading"
              }
            >
              {isDemoMode ? "Demo" : "Live"}
            </button>
          </div>

          {/* Bot Control */}
          <button
            onClick={onToggleBot}
            disabled={isExecuting}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-colors ${
              isRunning
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-green-600 hover:bg-green-700 text-white"
            } ${isExecuting ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {isExecuting ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Executing...</span>
              </>
            ) : isRunning ? (
              <>
                <Pause className="w-5 h-5" />
                <span>Stop Bot</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                <span>Start Bot</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Status Bar */}
      <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-center gap-2 text-gray-400">
          <Clock className="w-4 h-4" />
          <span className="text-sm">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </span>
        </div>

        {/* Trading Mode Status */}
        <div
          className={`flex items-center gap-2 text-sm ${
            isDemoMode ? "text-blue-400" : "text-orange-400"
          }`}
        >
          <div
            className={`w-2 h-2 rounded-full ${
              isDemoMode ? "bg-blue-400" : "bg-orange-400"
            }`}
          />
          <span>
            {isDemoMode
              ? "Demo Trading (Simulated)"
              : "Live Trading (Real Money)"}
          </span>
          {!isDemoMode && (
            <span className="text-xs text-orange-300">
              ⚠️ API keys required for execution
            </span>
          )}
        </div>

        {isRunning && (
          <div className="flex items-center gap-2 text-green-400">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-sm">Bot is monitoring markets</span>
          </div>
        )}
      </div>
    </div>
  );
}
