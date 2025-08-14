import asyncio
import ccxt.async_support as ccxt
import os
import pandas as pd
from dotenv import load_dotenv
import time
import websockets
import json

# --- Configuration ---
WEBSOCKET_HOST = "localhost"
WEBSOCKET_PORT = 8765
DEMO_MODE = True
TRADE_AMOUNT_USDT = 100
FEE_RATE = 0.001

# --- Global State ---
# This dictionary will hold the single source of truth for the application's state.
STATE = {
    "prices": {
        "XRP/USDT": None,
        "BTC/USDT": None,
        "XRP/BTC": None,
    },
    "mas": {
        "XRP/USDT": None,
        "BTC/USDT": None,
    },
    "portfolio": {
        "USDT": 1000.0,
        "BTC": 0.0,
        "XRP": 0.0,
    },
    "last_trade_log": [],
    "opportunity_detected": False,
}
CONNECTED_CLIENTS = set()

# --- Exchange Initialization ---
load_dotenv()
exchange = ccxt.bitget({
    'apiKey': os.getenv('BITGET_API_KEY'),
    'secret': os.getenv('BITGET_SECRET_KEY'),
    'options': {'defaultType': 'spot'},
})

# --- WebSocket Server Logic ---
async def register_client(websocket):
    CONNECTED_CLIENTS.add(websocket)
    print(f"New client connected. Total clients: {len(CONNECTED_CLIENTS)}")

async def unregister_client(websocket):
    CONNECTED_CLIENTS.remove(websocket)
    print(f"Client disconnected. Total clients: {len(CONNECTED_CLIENTS)}")

async def broadcast_state():
    if CONNECTED_CLIENTS:
        message = json.dumps(STATE)
        await asyncio.wait([client.send(message) for client in CONNECTED_CLIENTS])

async def websocket_handler(websocket, path):
    await register_client(websocket)
    try:
        # Keep the connection open and listen for messages (if any)
        async for message in websocket:
            # Not expecting messages from client in this version
            pass
    finally:
        await unregister_client(websocket)

# --- Core Application Logic ---
async def fetch_price_and_ma():
    """Fetches latest prices and moving averages and updates the state."""
    symbols_to_fetch = ['XRP/USDT', 'BTC/USDT']
    for symbol in symbols_to_fetch:
        try:
            # Fetch price
            ticker = await exchange.fetch_ticker(symbol)
            STATE['prices'][symbol] = ticker['last']
            # Fetch MA
            ohlcv = await exchange.fetch_ohlcv(symbol, '12h', limit=20)
            if ohlcv and len(ohlcv) >= 20:
                df = pd.DataFrame(ohlcv, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
                STATE['mas'][symbol] = df['close'].rolling(window=20).mean().iloc[-1]
        except Exception as e:
            print(f"Error fetching data for {symbol}: {e}")
    # Also fetch price for the intermediate pair
    try:
        ticker = await exchange.fetch_ticker('XRP/BTC')
        STATE['prices']['XRP/BTC'] = ticker['last']
    except Exception as e:
        print(f"Error fetching price for XRP/BTC: {e}")


async def check_and_execute_arbitrage():
    """Checks for arbitrage opportunity and executes trade in demo mode."""
    price_xrp = STATE['prices']['XRP/USDT']
    ma_xrp = STATE['mas']['XRP/USDT']
    price_btc = STATE['prices']['BTC/USDT']
    ma_btc = STATE['mas']['BTC/USDT']

    if not all([price_xrp, ma_xrp, price_btc, ma_btc]):
        STATE['opportunity_detected'] = False
        return

    xrp_is_low = price_xrp <= ma_xrp * 0.97
    btc_is_high = price_btc >= ma_btc * 1.03
    STATE['opportunity_detected'] = xrp_is_low and btc_is_high

    if STATE['opportunity_detected']:
        print("Arbitrage Opportunity Detected! Executing demo trade...")
        await execute_demo_trade()

async def execute_demo_trade():
    """Simulates the three-legged arbitrage trade and updates the state."""
    log = []
    initial_usdt = STATE['portfolio']['USDT']
    log.append(f"Initial portfolio: {STATE['portfolio']}")

    # Leg 1: Buy XRP
    price_xrp_usdt = STATE['prices']['XRP/USDT']
    xrp_bought = TRADE_AMOUNT_USDT / price_xrp_usdt
    xrp_received = xrp_bought * (1 - FEE_RATE)
    STATE['portfolio']['USDT'] -= TRADE_AMOUNT_USDT
    STATE['portfolio']['XRP'] += xrp_received
    log.append(f"Leg 1: Bought {xrp_received:.6f} XRP. Portfolio: {STATE['portfolio']}")

    await asyncio.sleep(10) # Simulate 10s delay

    # Leg 2: Sell XRP for BTC
    price_xrp_btc = STATE['prices']['XRP/BTC']
    if not price_xrp_btc: # refetch if not available
        ticker = await exchange.fetch_ticker('XRP/BTC')
        price_xrp_btc = ticker['last']

    btc_bought = STATE['portfolio']['XRP'] * price_xrp_btc
    btc_received = btc_bought * (1 - FEE_RATE)
    STATE['portfolio']['XRP'] = 0
    STATE['portfolio']['BTC'] += btc_received
    log.append(f"Leg 2: Sold XRP for {btc_received:.8f} BTC. Portfolio: {STATE['portfolio']}")

    await asyncio.sleep(10) # Simulate 10s delay

    # Leg 3: Sell BTC for USDT
    price_btc_usdt = STATE['prices']['BTC/USDT']
    usdt_bought = STATE['portfolio']['BTC'] * price_btc_usdt
    usdt_received = usdt_bought * (1 - FEE_RATE)
    STATE['portfolio']['BTC'] = 0
    STATE['portfolio']['USDT'] += usdt_received
    log.append(f"Leg 3: Sold BTC for {usdt_received:.4f} USDT. Portfolio: {STATE['portfolio']}")

    pnl = STATE['portfolio']['USDT'] - initial_usdt
    log.append(f"Trade cycle complete. P&L: {pnl:.4f} USDT")
    STATE['last_trade_log'] = log
    print(f"Demo trade complete. P&L: {pnl:.4f} USDT")


async def main_logic_loop():
    """The main loop for the bot's logic."""
    print("Starting main logic loop...")
    while True:
        await fetch_price_and_ma()
        await check_and_execute_arbitrage()
        await broadcast_state()
        print(f"State updated and broadcasted at {time.strftime('%H:%M:%S')}. Waiting 30s...")
        await asyncio.sleep(30) # Run the cycle every 30 seconds

# --- Main Execution Block ---
async def main():
    """Starts the WebSocket server and the main logic loop."""
    server = await websockets.serve(websocket_handler, WEBSOCKET_HOST, WEBSOCKET_PORT)
    print(f"WebSocket server started on ws://{WEBSOCKET_HOST}:{WEBSOCKET_PORT}")

    try:
        await main_logic_loop()
    except KeyboardInterrupt:
        print("Shutting down...")
    finally:
        server.close()
        await server.wait_closed()
        await exchange.close()
        print("Server and exchange connection closed.")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("Application stopped by user.")
