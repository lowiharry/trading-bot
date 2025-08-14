"use client";
import { useArbitrageBot } from "../hooks/useArbitrageBot";
import { DashboardHeader } from "../components/ArbitrageBot/DashboardHeader";
import { StatusCards } from "../components/ArbitrageBot/StatusCards";
import { CurrentPricesCard } from "../components/ArbitrageBot/CurrentPricesCard";
import { PortfolioBalanceCard } from "../components/ArbitrageBot/PortfolioBalanceCard";
import { RecentOpportunitiesCard } from "../components/ArbitrageBot/RecentOpportunitiesCard";
import { TradeHistoryCard } from "../components/ArbitrageBot/TradeHistoryCard";
import { BotSettings } from "../components/ArbitrageBot/BotSettings";
import { ApiConfiguration } from "../components/ArbitrageBot/ApiConfiguration";
import { TradingParameters } from "../components/ArbitrageBot/TradingParameters";
import { ApiInstructions } from "../components/ArbitrageBot/ApiInstructions";

export default function ArbitrageBotDashboard() {
  const {
    isRunning,
    setIsRunning,
    isDemoMode,
    setIsDemoMode,
    balances,
    currentPrices,
    movingAverages,
    opportunities,
    trades,
    totalProfit,
    stats,
    settings,
    isExecuting,
    error,
    isLoadingPrices,
    isLoadingBalances,
    lastUpdated,
    isSavingSettings,
    updateSettings,
    currentOpportunity,
    dataFreshness,
    refreshAllData,
  } = useArbitrageBot();

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <DashboardHeader
          isRunning={isRunning}
          isExecuting={isExecuting}
          isDemoMode={isDemoMode}
          setIsDemoMode={setIsDemoMode}
          error={error}
          lastUpdated={lastUpdated}
          isLoadingPrices={isLoadingPrices}
          onToggleBot={() => setIsRunning(!isRunning)}
          refreshAllData={refreshAllData}
          dataFreshness={dataFreshness}
        />

        <StatusCards
          totalProfit={totalProfit}
          trades={trades}
          isExecuting={isExecuting}
          isRunning={isRunning}
          isDemoMode={isDemoMode}
          currentOpportunity={currentOpportunity}
          settings={settings}
          lastUpdated={lastUpdated}
          error={error}
          stats={stats}
          dataFreshness={dataFreshness}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <CurrentPricesCard
              currentPrices={currentPrices}
              movingAverages={movingAverages}
              isLoadingPrices={isLoadingPrices}
              dataFreshness={dataFreshness}
            />
            <PortfolioBalanceCard
              balances={balances}
              currentPrices={currentPrices}
              isLoadingBalances={isLoadingBalances}
              isDemoMode={isDemoMode}
            />
          </div>
          <div className="space-y-6">
            <RecentOpportunitiesCard
              opportunities={opportunities}
              dataFreshness={dataFreshness}
            />
            <TradeHistoryCard trades={trades} dataFreshness={dataFreshness} />
          </div>
        </div>

        <BotSettings
          settings={settings}
          updateSettings={updateSettings}
          isSavingSettings={isSavingSettings}
          balances={balances}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          <ApiConfiguration
            settings={settings}
            updateSettings={updateSettings}
          />
          <TradingParameters
            settings={settings}
            updateSettings={updateSettings}
          />
        </div>

        <ApiInstructions />
      </div>
    </div>
  );
}
