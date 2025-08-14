import React, { useMemo } from "react";
import {
  DollarSign,
  Activity,
  TrendingUp,
  Settings,
  Clock,
  AlertCircle,
  CheckCircle,
  Zap,
} from "lucide-react";

export function StatusCards({
  totalProfit,
  trades,
  isExecuting,
  isRunning,
  isDemoMode,
  currentOpportunity,
  settings,
  lastUpdated,
  error,
  stats,
}) {
  // Memoize expensive calculations to prevent unnecessary re-renders
  const calculatedStats = useMemo(() => {
    // Use API-provided stats when available, fallback to manual calculation
    const successRate =
      stats?.success_rate ||
      (trades.length > 0
        ? (trades.filter(
            (trade) =>
              trade.status === "completed" && parseFloat(trade.profit_loss) > 0,
          ).length /
            trades.length) *
          100
        : 0);

    const completedTrades =
      stats?.total_trades ||
      trades.filter((trade) => trade.status === "completed").length;

    return {
      successRate: Math.round(successRate * 100) / 100, // Round to 2 decimal places
      completedTrades,
    };
  }, [stats, trades]);

  // Memoize uptime calculation
  const uptimeDisplay = useMemo(() => {
    if (!isRunning) return "0m";
    // Mock calculation - in real app you'd track actual start time
    const uptimeMinutes = Math.floor(Math.random() * 120) + 1;
    if (uptimeMinutes < 60) return `${uptimeMinutes}m`;
    const hours = Math.floor(uptimeMinutes / 60);
    const minutes = uptimeMinutes % 60;
    return `${hours}h ${minutes}m`;
  }, [isRunning]); // Only recalculate when running status changes

  // Memoize opportunity status
  const opportunityStatus = useMemo(() => {
    if (!currentOpportunity) {
      return {
        display: "Scanning...",
        subtitle: "Waiting for price data",
        color: "text-gray-400",
      };
    }

    const profitText = `${currentOpportunity.profitPercentage > 0 ? "+" : ""}${currentOpportunity.profitPercentage.toFixed(2)}%`;
    const color =
      currentOpportunity.profitPercentage > 0
        ? "text-green-400"
        : "text-red-400";

    const status = currentOpportunity.isValid
      ? { text: "✓ Meets criteria", color: "text-green-400" }
      : { text: "⚠ Below threshold", color: "text-yellow-400" };

    const potential = currentOpportunity.potentialProfit
      ? `$${currentOpportunity.potentialProfit.toFixed(2)} potential`
      : null;

    return {
      display: profitText,
      subtitle: status.text,
      color,
      statusColor: status.color,
      potential,
    };
  }, [currentOpportunity]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      {/* Total Profit Card */}
      <div className="bg-gray-800 p-6 rounded-lg">
        <div className="flex items-center gap-3 mb-2">
          <DollarSign className="text-green-400" size={24} />
          <h3 className="font-semibold">Total Profit</h3>
        </div>
        <p
          className={`text-2xl font-bold ${totalProfit >= 0 ? "text-green-400" : "text-red-400"}`}
        >
          {totalProfit >= 0 ? "+" : ""}${totalProfit.toFixed(2)}
        </p>
        <div className="flex justify-between items-center text-sm text-gray-400">
          <span>{calculatedStats.completedTrades} completed trades</span>
          {calculatedStats.completedTrades > 0 && (
            <span className="text-blue-400">
              {calculatedStats.successRate.toFixed(0)}% success
            </span>
          )}
        </div>
      </div>

      {/* Bot Status Card */}
      <div className="bg-gray-800 p-6 rounded-lg">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center gap-2">
            {isRunning ? (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                <Activity className="text-green-400" size={24} />
              </div>
            ) : (
              <Activity className="text-gray-400" size={24} />
            )}
          </div>
          <h3 className="font-semibold">Bot Status</h3>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <p
            className={`text-2xl font-bold ${
              isExecuting
                ? "text-yellow-400"
                : isRunning
                  ? "text-green-400"
                  : "text-gray-400"
            }`}
          >
            {isExecuting ? "Executing" : isRunning ? "Active" : "Stopped"}
          </p>
          {isExecuting && (
            <Zap className="text-yellow-400 animate-pulse" size={20} />
          )}
          {isRunning && !isExecuting && (
            <CheckCircle className="text-green-400" size={20} />
          )}
          {error && <AlertCircle className="text-red-400" size={20} />}
        </div>
        <div className="text-sm text-gray-400 space-y-1">
          <div className="flex justify-between">
            <span>{isDemoMode ? "Demo Mode" : "Live Trading"}</span>
            {isRunning && (
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {uptimeDisplay}
              </span>
            )}
          </div>
          {lastUpdated && (
            <div className="text-xs">
              Last update: {lastUpdated.toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>

      {/* Current Opportunity Card */}
      <div className="bg-gray-800 p-6 rounded-lg">
        <div className="flex items-center gap-3 mb-2">
          <TrendingUp className="text-yellow-400" size={24} />
          <h3 className="font-semibold">Current Opportunity</h3>
        </div>
        <p className={`text-2xl font-bold ${opportunityStatus.color}`}>
          {opportunityStatus.display}
        </p>
        <div className="text-sm text-gray-400 space-y-1">
          <div>
            <span className={opportunityStatus.statusColor}>
              {opportunityStatus.subtitle}
            </span>
          </div>
          {opportunityStatus.potential && (
            <div className="text-xs">{opportunityStatus.potential}</div>
          )}
        </div>
      </div>

      {/* Configuration Card */}
      <div className="bg-gray-800 p-6 rounded-lg">
        <div className="flex items-center gap-3 mb-2">
          <Settings className="text-purple-400" size={24} />
          <h3 className="font-semibold">Configuration</h3>
        </div>
        <p className="text-2xl font-bold">${settings.tradeAmount}</p>
        <div className="text-sm text-gray-400 space-y-1">
          <div>Per arbitrage cycle</div>
          <div className="text-xs">
            Target: {settings.profitTarget}% | Stop: {settings.stopLoss}%
          </div>
          <div className="text-xs">
            Max trades: {settings.maxConcurrentTrades}
          </div>
        </div>
      </div>
    </div>
  );
}
