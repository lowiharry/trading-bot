import { useState, useEffect, useRef, useCallback, useMemo } from "react";

export function useArbitrageBot() {
  const [isRunning, setIsRunning] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [balances, setBalances] = useState({
    USDT: 10000,
    XRP: 0,
    BTC: 0,
  });
  const [currentPrices, setCurrentPrices] = useState({
    "XRP/USDT": 0.5,
    "BTC/USDT": 60000,
    "XRP/BTC": 0.0000083,
  });
  const [movingAverages, setMovingAverages] = useState({
    "XRP/USDT": 0.51,
    "BTC/USDT": 59000,
    "XRP/BTC": 0.0000085,
  });
  const [opportunities, setOpportunities] = useState([]);
  const [trades, setTrades] = useState([]);
  const [totalProfit, setTotalProfit] = useState(0);
  const [stats, setStats] = useState(null);
  const [settings, setSettings] = useState({
    entryThreshold: 0.01,
    profitTarget: 0.005,
    stopLoss: 0.1,
    tradeAmount: 1000,
    maxConcurrentTrades: 5,
    apiKey: "",
    secretKey: "",
    passphrase: "",
  });
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState(null);

  const [isLoadingPrices, setIsLoadingPrices] = useState(false);
  const [isLoadingMA, setIsLoadingMA] = useState(false);
  const [isLoadingTrades, setIsLoadingTrades] = useState(false);
  const [isLoadingOpportunities, setIsLoadingOpportunities] = useState(false);
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [dataFreshness, setDataFreshness] = useState({
    prices: new Date(),
    trades: new Date(),
    opportunities: new Date(),
    settings: new Date(),
    movingAverages: new Date(),
    balances: new Date(),
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const intervalRef = useRef();
  const saveTimeoutRef = useRef();

  const currentPricesStable = useMemo(() => currentPrices, [currentPrices]);
  const movingAveragesStable = useMemo(() => movingAverages, [movingAverages]);
  const settingsStable = useMemo(() => settings, [settings]);


  const loadSettings = useCallback(async () => {
    try {
      const response = await fetch("/api/bot-settings");
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setSettings({
            entryThreshold: data.data.entryThreshold || 0.01,
            profitTarget: data.data.profitTarget || 0.005,
            stopLoss: data.data.stopLoss || 0.1,
            tradeAmount: data.data.tradeAmount || 1000,
            maxConcurrentTrades: data.data.maxConcurrentTrades || 5,
            apiKey: data.data.api_key_encrypted ? "••••••••••••••••" : "",
            secretKey: "",
            passphrase: "",
          });
          if (data.data.isDemoMode !== undefined) {
            setIsDemoMode(data.data.isDemoMode);
          }
          if (data.data.isActive !== undefined) {
            setIsRunning(data.data.isActive);
          }
        }
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  }, []);

  const fetchPrices = useCallback(async () => {
    setIsLoadingPrices(true);
    try {
      const response = await fetch("/api/bitget/prices");
      if (!response.ok) throw new Error("Failed to fetch prices");

      const data = await response.json();
      if (data.success) {
        setCurrentPrices((prev) => ({
          ...prev,
          ...Object.fromEntries(
            Object.entries(data.data).map(([pair, info]) => [pair, info.price]),
          ),
        }));
        setLastUpdated(new Date());
        setDataFreshness((prev) => ({ ...prev, prices: new Date() }));
        setError(null);
      }
    } catch (err) {
      console.error("Error fetching prices:", err);
      setError("Failed to fetch real-time prices");
    } finally {
      setIsLoadingPrices(false);
    }
  }, []);

  const fetchMovingAverages = useCallback(async () => {
    setIsLoadingMA(true);
    try {
      const [xrpResponse, btcResponse, xrpBtcResponse] = await Promise.all([
        fetch("/api/bitget/candles?symbol=XRPUSDT"),
        fetch("/api/bitget/candles?symbol=BTCUSDT"),
        fetch("/api/bitget/candles?symbol=XRPBTC"),
      ]);

      if (xrpResponse.ok && btcResponse.ok && xrpBtcResponse.ok) {
        const [xrpData, btcData, xrpBtcData] = await Promise.all([
          xrpResponse.json(),
          btcResponse.json(),
          xrpBtcResponse.json(),
        ]);

        if (xrpData.success && btcData.success && xrpBtcData.success) {
          setMovingAverages({
            "XRP/USDT": xrpData.data.movingAverage,
            "BTC/USDT": btcData.data.movingAverage,
            "XRP/BTC": xrpBtcData.data.movingAverage,
          });
          setDataFreshness((prev) => ({ ...prev, movingAverages: new Date() }));
        }
      }
    } catch (err) {
      console.error("Error fetching moving averages:", err);
    } finally {
      setIsLoadingMA(false);
    }
  }, []);

  const fetchTrades = useCallback(async () => {
    setIsLoadingTrades(true);
    try {
      const response = await fetch(
        `/api/trades?limit=10&is_demo=${isDemoMode}`,
      );
      if (!response.ok) throw new Error("Failed to fetch trades");

      const data = await response.json();
      if (data.success) {
        setTrades(data.data.trades);
        setTotalProfit(parseFloat(data.data.stats.total_profit) || 0);
        setStats(data.data.stats);
        setDataFreshness((prev) => ({ ...prev, trades: new Date() }));

        if (error && error.includes("Failed to fetch trades")) {
          setError(null);
        }
      } else {
        throw new Error(data.error || "Failed to fetch trades");
      }
    } catch (err) {
      console.error("Error fetching trades:", err);
      setError("Failed to fetch trades: " + err.message);
    } finally {
      setIsLoadingTrades(false);
    }
  }, [isDemoMode, error]);

  const fetchOpportunities = useCallback(async () => {
    setIsLoadingOpportunities(true);
    try {
      const response = await fetch("/api/opportunities?limit=5");
      if (!response.ok) throw new Error("Failed to fetch opportunities");

      const data = await response.json();
      if (data.success) {
        setOpportunities(data.data.opportunities);
        setDataFreshness((prev) => ({ ...prev, opportunities: new Date() }));
      }
    } catch (err) {
      console.error("Error fetching opportunities:", err);
    } finally {
      setIsLoadingOpportunities(false);
    }
  }, []);

  const fetchBalances = useCallback(async () => {
    setIsLoadingBalances(true);
    try {
      const response = await fetch(
        `/api/bitget/balance?demoMode=${isDemoMode}&user_id=demo_user`,
      );
      if (!response.ok) throw new Error("Failed to fetch balances");

      const data = await response.json();
      if (data.success) {
        setBalances(data.data.balances);
        setDataFreshness((prev) => ({ ...prev, balances: new Date() }));
        console.log(
          `✅ ${data.data.mode === "live" ? "Live" : "Demo"} balances fetched:`,
          data.data.balances,
        );
      } else {
        if (data.fallback) {
          setBalances(data.fallback.balances);
          console.log(
            "⚠️ Using fallback demo balances:",
            data.fallback.balances,
          );
        }
        throw new Error(data.error || "Failed to fetch balances");
      }
    } catch (err) {
      console.error("Error fetching balances:", err);
    } finally {
      setIsLoadingBalances(false);
    }
  }, [isDemoMode]);

  const recordOpportunity = useCallback(
    async (opportunity) => {
      try {
        const response = await fetch("/api/opportunities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            xrp_price: currentPricesStable["XRP/USDT"],
            btc_price: currentPricesStable["BTC/USDT"],
            xrp_ma: opportunity.xrpUsdtMA,
            btc_ma: opportunity.xrpBtcMA,
            xrp_deviation: opportunity.xrpUsdtDeviation,
            btc_deviation: opportunity.xrpBtcDeviation,
            potential_profit: opportunity.potentialProfit,
            profit_percentage: opportunity.profitPercentage,
            was_executed: opportunity.was_executed || false,
          }),
        });
        if (response.ok) {
          await fetchOpportunities();
        }
      } catch (err) {
        console.error("Error recording opportunity:", err);
      }
    },
    [currentPricesStable, fetchOpportunities],
  );

  useEffect(() => {
    const initializeData = async () => {
      await Promise.all([
        loadSettings(),
        fetchPrices(),
        fetchMovingAverages(),
        fetchTrades(),
        fetchOpportunities(),
        fetchBalances(),
      ]);
    };
    initializeData();
  }, [
    loadSettings,
    fetchPrices,
    fetchMovingAverages,
    fetchTrades,
    fetchOpportunities,
    fetchBalances,
  ]);

  useEffect(() => {
    const id = setInterval(fetchPrices, 2000);
    return () => clearInterval(id);
  }, [fetchPrices]);

  useEffect(() => {
    const id = setInterval(fetchMovingAverages, 60000);
    return () => clearInterval(id);
  }, [fetchMovingAverages]);

  useEffect(() => {
    const id = setInterval(fetchTrades, 3000);
    return () => clearInterval(id);
  }, [fetchTrades]);

  useEffect(() => {
    const id = setInterval(fetchOpportunities, 2000);
    return () => clearInterval(id);
  }, [fetchOpportunities]);

  const calculateOpportunity = useCallback(() => {
    const xrpUsdtPrice = currentPricesStable["XRP/USDT"];
    const btcUsdtPrice = currentPricesStable["BTC/USDT"];
    const xrpBtcPrice = currentPricesStable["XRP/BTC"];
    const xrpUsdtMA = movingAveragesStable["XRP/USDT"];
    const btcUsdtMA = movingAveragesStable["BTC/USDT"];
    const xrpBtcMA = movingAveragesStable["XRP/BTC"];

    if (
      !xrpUsdtPrice ||
      !btcUsdtPrice ||
      !xrpBtcPrice ||
      !xrpUsdtMA ||
      !btcUsdtMA ||
      !xrpBtcMA
    ) {
      return null;
    }

    const xrpUsdtDeviation = ((xrpUsdtPrice - xrpUsdtMA) / xrpUsdtMA) * 100;
    const xrpBtcDeviation = ((xrpBtcPrice - xrpBtcMA) / xrpBtcMA) * 100;
    const btcUsdtDeviation = ((btcUsdtPrice - btcUsdtMA) / btcUsdtMA) * 100;

    const xrpAmount = settingsStable.tradeAmount / xrpUsdtPrice;
    const btcAmount = xrpAmount * xrpBtcPrice;
    const finalUsdt = btcAmount * btcUsdtPrice;
    const potentialProfit = finalUsdt - settingsStable.tradeAmount;
    const profitPercentage =
      (potentialProfit / settingsStable.tradeAmount) * 100;

    const crossRate = xrpUsdtPrice / btcUsdtPrice;
    const actualRate = xrpBtcPrice;
    const rateDiscrepancy =
      Math.abs((crossRate - actualRate) / actualRate) * 100;

    const hasVolatility =
      Math.abs(xrpUsdtDeviation) > 0.005 ||
      Math.abs(btcUsdtDeviation) > 0.005 ||
      Math.abs(xrpBtcDeviation) >= 0.05;
    const hasDiscrepancy = rateDiscrepancy >= 0.01;
    const meetsProfitTarget = profitPercentage > settingsStable.profitTarget;

    const isInteresting =
      hasVolatility || hasDiscrepancy || profitPercentage > 0.005;

    if (!isInteresting) {
      return null;
    }

    const isValid = meetsProfitTarget && (hasVolatility || hasDiscrepancy);

    return {
      isValid,
      xrpUsdtDeviation,
      xrpBtcDeviation,
      btcUsdtDeviation,
      potentialProfit,
      profitPercentage,
      timestamp: new Date(),
      xrpUsdtMA,
      btcUsdtMA,
      xrpBtcMA,
      xrpPrice: xrpUsdtPrice,
      btcPrice: btcUsdtPrice,
      crossRate,
      actualRate,
      rateDiscrepancy,
      conditions: {
        hasVolatility,
        hasDiscrepancy,
        meetsProfitTarget,
      },
    };
  }, [currentPricesStable, movingAveragesStable, settingsStable]);

  const executeArbitrageTrade = useCallback(
    async (opportunity) => {
      if (isExecuting) {
        console.log("Trade execution already in progress, skipping...");
        return;
      }

      setIsExecuting(true);
      setError(null);

      const executionTimeout = setTimeout(() => {
        console.error("Trade execution timeout");
        setError("Trade execution timed out");
        setIsExecuting(false);
      }, 120000);

      try {
        console.log("🚀 Starting trade execution with opportunity:", {
          profitPercentage: opportunity.profitPercentage,
          potentialProfit: opportunity.potentialProfit,
          isValid: opportunity.isValid,
          tradeAmount: settingsStable.tradeAmount,
          currentPrices: currentPricesStable,
          isDemoMode: isDemoMode,
        });

        const requestBody = {
          trade_amount: settingsStable.tradeAmount,
          current_prices: currentPricesStable,
          settings: {
            xrpUsdtMA: opportunity.xrpUsdtMA,
            xrpBtcMA: opportunity.xrpBtcMA,
            btcUsdtMA: opportunity.btcUsdtMA,
            xrpUsdtDeviation: opportunity.xrpUsdtDeviation,
            xrpBtcDeviation: opportunity.xrpBtcDeviation,
            btcUsdtDeviation: opportunity.btcUsdtDeviation,
          },
          is_demo: isDemoMode,
        };

        console.log(
          "📤 Sending trade request:",
          JSON.stringify(requestBody, null, 2),
        );

        const response = await fetch("/api/arbitrage/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        console.log(
          "📥 Trade response status:",
          response.status,
          response.statusText,
        );

        clearTimeout(executionTimeout);

        if (!response.ok) {
          const errorText = await response.text();
          console.error("❌ Trade request failed:", {
            status: response.status,
            statusText: response.statusText,
            responseBody: errorText,
            requestBody: requestBody,
          });
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        console.log("📥 Trade response data:", JSON.stringify(data, null, 2));

        if (data.success) {
          console.log("✅ Trade executed successfully:", {
            profit: data.data.profit,
            profitPercentage: data.data.profitPercentage,
            executionTime: data.data.executionTime,
          });

          if (isDemoMode && data.data.profit) {
            const profit = parseFloat(data.data.profit);
            setBalances((prev) => ({
              ...prev,
              USDT: Math.max(0, prev.USDT + profit),
            }));
          }

          await Promise.all([fetchTrades(), fetchOpportunities()]);

          setError(null);
        } else {
          console.error("❌ Trade failed on server:", {
            error: data.error,
            tradeId: data.trade_id,
            executionTime: data.execution_time,
            stepCompleted: data.step_completed,
            details: data.details,
          });
          throw new Error(data.error || "Trade execution failed");
        }
      } catch (err) {
        console.error("💥 CRITICAL TRADE ERROR:", {
          message: err.message,
          stack: err.stack,
          opportunity: opportunity,
          settings: settingsStable,
          currentPrices: currentPricesStable,
          isDemoMode: isDemoMode,
          timestamp: new Date().toISOString(),
        });

        let userFriendlyMessage = "Trade execution failed";

        if (err.message.includes("timeout")) {
          userFriendlyMessage = "Trade execution timed out. Please try again.";
        } else if (err.message.includes("400")) {
          userFriendlyMessage =
            "Invalid trade parameters. Please check your settings.";
        } else if (err.message.includes("503") || err.message.includes("502")) {
          userFriendlyMessage =
            "Trading service temporarily unavailable. Please try again.";
        } else if (err.message.includes("price")) {
          userFriendlyMessage =
            "Price data is stale or invalid. Waiting for fresh prices.";
        } else if (err.message.includes("amount")) {
          userFriendlyMessage =
            "Trade amount is invalid. Please check your settings.";
        } else if (err.message.includes("Expected loss too high")) {
          userFriendlyMessage = "Trade rejected: " + err.message;
        }

        setError(userFriendlyMessage + " (Check console for details)");

        try {
          await fetchTrades();
        } catch (refreshError) {
          console.error("Failed to refresh trades after error:", refreshError);
        }
      } finally {
        clearTimeout(executionTimeout);
        setIsExecuting(false);
      }
    },
    [
      isExecuting,
      settingsStable,
      currentPricesStable,
      isDemoMode,
      fetchTrades,
      fetchOpportunities,
    ],
  );

  useEffect(() => {
    if (isRunning && !isExecuting) {
      console.log(
        "🚀 Bot is running - checking for opportunities every 5 seconds",
      );
      intervalRef.current = setInterval(() => {
        console.log("🔄 Bot cycle starting - checking opportunity...");
        const opportunity = calculateOpportunity();
        if (opportunity) {
          console.log(`📊 Opportunity detected:`, {
            isValid: opportunity.isValid,
            profitPercentage: opportunity.profitPercentage?.toFixed(6) + "%",
            potentialProfit: "$" + opportunity.potentialProfit?.toFixed(6),
            conditions: opportunity.conditions,
            timestamp: opportunity.timestamp?.toISOString(),
          });

          if (opportunity.isValid) {
            console.log(
              "💰 Executing valid opportunity:",
              opportunity.profitPercentage.toFixed(6) + "% profit",
            );
            recordOpportunity({ ...opportunity, was_executed: true });
            executeArbitrageTrade(opportunity);
          } else if (Math.abs(opportunity.profitPercentage) > 0.001) {
            console.log(
              "📋 Recording opportunity (not executed):",
              opportunity.profitPercentage.toFixed(6) + "% - Reasons invalid:",
              opportunity.conditions?.reasonsValid || "No valid reasons",
            );
            recordOpportunity({ ...opportunity, was_executed: false });
          } else {
            console.log(
              "❌ Opportunity too small:",
              opportunity.profitPercentage.toFixed(6) + "%",
            );
          }
        } else {
          console.log(
            "⏳ No opportunities found this cycle - checking data availability:",
            {
              currentPrices:
                Object.keys(currentPricesStable).length > 0 ? "✓" : "❌",
              movingAverages:
                Object.keys(movingAveragesStable).length > 0 ? "✓" : "❌",
              pricesData: {
                "XRP/USDT": currentPricesStable["XRP/USDT"] || "missing",
                "BTC/USDT": currentPricesStable["BTC/USDT"] || "missing",
                "XRP/BTC": currentPricesStable["XRP/BTC"] || "missing",
              },
            },
          );
        }
      }, 5000);
    } else {
      if (intervalRef.current) {
        console.log(
          `⛔ Bot stopped - State: running=${isRunning}, executing=${isExecuting}`,
        );
        clearInterval(intervalRef.current);
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [
    isRunning,
    isExecuting,
    calculateOpportunity,
    executeArbitrageTrade,
    recordOpportunity,
    currentPricesStable,
    movingAveragesStable,
  ]);

  const saveBotStatus = useCallback(
    async (newIsRunning) => {
      try {
        const response = await fetch("/api/bot-settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            isActive: newIsRunning,
            isDemoMode: isDemoMode,
          }),
        });
        if (!response.ok) throw new Error("Failed to save bot status");
        const data = await response.json();
        if (!data.success)
          throw new Error(data.error || "Failed to save bot status");
      } catch (err) {
        console.error("Error saving bot status:", err);
        setError("Failed to save bot status: " + err.message);
      }
    },
    [isDemoMode],
  );

  const setIsRunningWithPersistence = useCallback(
    (newIsRunning) => {
      setIsRunning(newIsRunning);
      saveBotStatus(newIsRunning);
    },
    [saveBotStatus],
  );

  const saveSettings = useCallback(
    async (newSettings) => {
      setIsSavingSettings(true);
      try {
        const response = await fetch("/api/bot-settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entryThreshold: newSettings.entryThreshold,
            profitTarget: newSettings.profitTarget,
            stopLoss: newSettings.stopLoss,
            tradeAmount: newSettings.tradeAmount,
            maxConcurrentTrades: newSettings.maxConcurrentTrades,
            apiKey: newSettings.apiKey,
            secretKey: newSettings.secretKey,
            passphrase: newSettings.passphrase,
            isDemoMode: isDemoMode,
            isActive: isRunning,
          }),
        });
        if (!response.ok) throw new Error("Failed to save settings");
        const data = await response.json();
        if (!data.success)
          throw new Error(data.error || "Failed to save settings");
      } catch (err) {
        console.error("Error saving settings:", err);
        setError("Failed to save settings: " + err.message);
      } finally {
        setIsSavingSettings(false);
      }
    },
    [isDemoMode, isRunning],
  );

  const updateSettings = useCallback(
    (field, value) => {
      const newSettings = { ...settingsStable, [field]: value };
      setSettings(newSettings);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(
        () => saveSettings(newSettings),
        1000,
      );
    },
    [settingsStable, saveSettings],
  );

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const currentOpportunity = useMemo(
    () => calculateOpportunity(),
    [calculateOpportunity],
  );

  useEffect(() => {
    fetchTrades();
  }, [isDemoMode, fetchTrades]);

  const setIsDemoModeWithSync = useCallback(
    async (newDemoMode) => {
      console.log(`🔄 Switching to ${newDemoMode ? "DEMO" : "LIVE"} mode...`);

      if (!newDemoMode) {
        console.log(
          "⚠️ Switching to LIVE mode - API credentials may be required for actual trading",
        );
      }

      setIsDemoMode(newDemoMode);

      try {
        const response = await fetch("/api/bot-settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            isDemoMode: newDemoMode,
            isActive: isRunning,
          }),
        });
        if (!response.ok) throw new Error("Failed to save demo mode");
        const data = await response.json();
        if (!data.success)
          throw new Error(data.error || "Failed to save demo mode");

        console.log(
          `✅ Successfully switched to ${newDemoMode ? "DEMO" : "LIVE"} mode`,
        );

        await Promise.all([fetchBalances()]);
      } catch (err) {
        console.error("Error saving demo mode:", err);
        setError("Failed to save demo mode: " + err.message);
      }
    },
    [isRunning, fetchTrades, fetchBalances],
  );

  const refreshAllData = useCallback(async () => {
    await Promise.all([
      fetchPrices(),
      fetchMovingAverages(),
      fetchTrades(),
      fetchOpportunities(),
      fetchBalances(),
      loadSettings(),
    ]);
    setLastUpdated(new Date());
  }, [
    fetchPrices,
    fetchMovingAverages,
    fetchTrades,
    fetchOpportunities,
    fetchBalances,
    loadSettings,
  ]);

  return {
    isRunning,
    setIsRunning: setIsRunningWithPersistence,
    isDemoMode,
    setIsDemoMode: setIsDemoModeWithSync,
    balances,
    currentPrices: currentPricesStable,
    movingAverages: movingAveragesStable,
    opportunities,
    trades,
    totalProfit,
    stats,
    settings: settingsStable,
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
  };
}
