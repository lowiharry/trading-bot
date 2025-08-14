export function ApiInstructions() {
  return (
    <div className="mt-8 bg-gray-800 p-6 rounded-lg">
      <h3 className="text-lg font-semibold mb-4">
        How to Get Bitget API Credentials
      </h3>
      <div className="space-y-3 text-sm text-gray-300">
        <p>1. Log in to your Bitget account and go to API Management</p>
        <p>2. Create a new API key with the following permissions:</p>
        <ul className="list-disc list-inside ml-4 space-y-1">
          <li>Spot Trading</li>
          <li>Read Account Information</li>
          <li>Read Market Data</li>
        </ul>
        <p>3. Copy the API Key, Secret Key, and Passphrase</p>
        <p>4. Paste them into the fields above and they will auto-save</p>
        <p className="text-yellow-400 font-medium">
          ⚠️ Always test with demo mode first before enabling live trading
        </p>
      </div>
    </div>
  );
}
