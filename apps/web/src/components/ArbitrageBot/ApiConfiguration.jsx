import { useState, useEffect, useRef } from "react";
import {
  Eye,
  EyeOff,
  Shield,
  AlertTriangle,
  Save,
  Wifi,
  WifiOff,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

export function ApiConfiguration({ settings, updateSettings }) {
  const [showSecrets, setShowSecrets] = useState({
    apiKey: false,
    secretKey: false,
    passphrase: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null); // null, 'success', 'error'
  const [connectionMessage, setConnectionMessage] = useState("");
  const saveTimeoutRef = useRef();

  // Auto-save when credentials change
  useEffect(() => {
    if (settings.apiKey && !settings.apiKey.includes("••••")) {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        handleAutoSave();
      }, 2000); // Auto-save after 2 seconds of no changes
    }
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [settings.apiKey, settings.secretKey, settings.passphrase]);

  const handleAutoSave = async () => {
    // Skip if fields are empty or masked
    if (!settings.apiKey || settings.apiKey.includes("••••")) return;

    try {
      setIsSaving(true);
      const response = await fetch("/api/bot-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: settings.apiKey,
          secretKey: settings.secretKey,
          passphrase: settings.passphrase,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save API credentials");
      }

      toast.success("API credentials auto-saved!", {
        duration: 2000,
      });
    } catch (error) {
      console.error("Error auto-saving API credentials:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const testConnection = async () => {
    if (!settings.apiKey || !settings.secretKey || !settings.passphrase) {
      toast.error("Please fill in all API credentials first");
      return;
    }

    if (settings.apiKey.includes("••••")) {
      toast.error(
        "Cannot test with masked credentials. Please re-enter your API key.",
      );
      return;
    }

    setIsTestingConnection(true);
    setConnectionStatus(null);
    setConnectionMessage("");

    try {
      const response = await fetch("/api/bitget/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: settings.apiKey,
          secretKey: settings.secretKey,
          passphrase: settings.passphrase,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setConnectionStatus("success");
        setConnectionMessage(
          `✅ Connected successfully! Found ${data.data.totalAssets} assets in your ${data.data.accountType}.`,
        );
        toast.success("Connection successful!", {
          description: data.message,
          duration: 4000,
        });
      } else {
        setConnectionStatus("error");
        setConnectionMessage(`❌ ${data.error}: ${data.details || ""}`);
        toast.error("Connection failed", {
          description: data.error,
          duration: 6000,
        });
      }
    } catch (error) {
      console.error("Connection test error:", error);
      setConnectionStatus("error");
      setConnectionMessage(`❌ Network error: ${error.message}`);
      toast.error("Connection test failed", {
        description: "Unable to test connection. Please try again.",
        duration: 4000,
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const toggleShow = (key) => {
    setShowSecrets((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Force immediate save of API credentials
      const response = await fetch("/api/bot-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: settings.apiKey,
          secretKey: settings.secretKey,
          passphrase: settings.passphrase,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save API credentials");
      }

      // Show success toast notification
      toast.success("API credentials saved successfully!");
    } catch (error) {
      console.error("Error saving API credentials:", error);
      toast.error("Failed to save API credentials. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="text-blue-400" size={24} />
        <h2 className="text-xl font-semibold">Bitget API Configuration</h2>
        {isSaving && (
          <div className="flex items-center gap-2 text-sm text-blue-400">
            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
            <span>Saving...</span>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">API Key</label>
          <div className="relative">
            <input
              type={showSecrets.apiKey ? "text" : "password"}
              value={settings.apiKey}
              onChange={(e) => updateSettings("apiKey", e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 pr-10"
              placeholder="Enter your Bitget API key"
            />
            <button
              type="button"
              onClick={() => toggleShow("apiKey")}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
            >
              {showSecrets.apiKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <div className="text-xs text-green-400 mt-1">Auto-saves changes</div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Secret Key</label>
          <div className="relative">
            <input
              type={showSecrets.secretKey ? "text" : "password"}
              value={settings.secretKey}
              onChange={(e) => updateSettings("secretKey", e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 pr-10"
              placeholder="Enter your Bitget secret key"
            />
            <button
              type="button"
              onClick={() => toggleShow("secretKey")}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
            >
              {showSecrets.secretKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <div className="text-xs text-green-400 mt-1">Auto-saves changes</div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Passphrase</label>
          <div className="relative">
            <input
              type={showSecrets.passphrase ? "text" : "password"}
              value={settings.passphrase}
              onChange={(e) => updateSettings("passphrase", e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 pr-10"
              placeholder="Enter your Bitget passphrase"
            />
            <button
              type="button"
              onClick={() => toggleShow("passphrase")}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
            >
              {showSecrets.passphrase ? (
                <EyeOff size={16} />
              ) : (
                <Eye size={16} />
              )}
            </button>
          </div>
          <div className="text-xs text-green-400 mt-1">Auto-saves changes</div>
        </div>

        {/* Manual Save Button */}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-colors ${
            isSaving
              ? "bg-gray-600 cursor-not-allowed opacity-50"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          <Save size={16} />
          {isSaving ? "Saving..." : "Save API Credentials"}
        </button>

        <div className="bg-yellow-900 border border-yellow-600 rounded p-3 mt-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="text-yellow-400 mt-0.5" size={16} />
            <div className="text-sm text-yellow-200">
              <p className="font-medium mb-1">Live Trading Requirements</p>
              <p className="mb-2">
                Your API credentials are encrypted and stored securely. Never
                share these credentials with anyone.
              </p>
              <p className="mb-2">
                <strong>Demo Mode:</strong> All trades are simulated - no API
                calls made to Bitget
              </p>
              <p>
                <strong>Live Mode:</strong> Requires valid API credentials to
                execute real trades on Bitget exchange
              </p>
            </div>
          </div>
        </div>

        {/* Test Connection Button */}
        <button
          onClick={testConnection}
          disabled={
            isTestingConnection ||
            !settings.apiKey ||
            !settings.secretKey ||
            !settings.passphrase
          }
          className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-colors ${
            isTestingConnection ||
            !settings.apiKey ||
            !settings.secretKey ||
            !settings.passphrase
              ? "bg-gray-600 cursor-not-allowed opacity-50"
              : "bg-green-600 hover:bg-green-700"
          }`}
        >
          {isTestingConnection ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <Wifi size={16} />
          )}
          {isTestingConnection ? "Testing Connection..." : "Test Connection"}
        </button>

        {/* Connection Status Display */}
        {connectionStatus && (
          <div
            className={`border rounded p-3 mt-4 ${
              connectionStatus === "success"
                ? "bg-green-900 border-green-600"
                : "bg-red-900 border-red-600"
            }`}
          >
            <div className="flex items-start gap-2">
              {connectionStatus === "success" ? (
                <CheckCircle
                  className="text-green-400 mt-0.5 flex-shrink-0"
                  size={16}
                />
              ) : (
                <XCircle
                  className="text-red-400 mt-0.5 flex-shrink-0"
                  size={16}
                />
              )}
              <div
                className={`text-sm ${
                  connectionStatus === "success"
                    ? "text-green-200"
                    : "text-red-200"
                }`}
              >
                {connectionMessage}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
