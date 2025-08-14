# Crypto Arbitrage Auto-Trading Bot

This is a full-stack web application that implements a triangular arbitrage trading bot for the Bitget exchange. It includes a real-time dashboard for monitoring the bot's activity, managing settings, and viewing trade history.

## Features

- **Triangular Arbitrage Bot:** Executes a `USDT → XRP → BTC → USDT` arbitrage strategy.
- **Real-time Dashboard:** A comprehensive UI to monitor prices, portfolio, and opportunities.
- **Demo & Live Modes:** Switch between a safe, simulated trading environment and live trading with real funds.
- **Risk Management:** Includes slippage-based stop-loss and API rate limiting.
- **Persistent Storage:** Uses a Neon serverless Postgres database to store trades, opportunities, and settings.

## Arbitrage Strategy

The bot continuously monitors the prices of `XRP/USDT` and `BTC/USDT` on Bitget. It triggers a trade when the following conditions are met:

- The price of **XRP/USDT** is **3% or more below** its 12-hour moving average.
- The price of **BTC/USDT** is **3% or more above** its 12-hour moving average.

When these conditions are met, the bot executes the following trade sequence:
1.  **Buy XRP** with USDT.
2.  **(10s later)** Sell the acquired XRP for **BTC**.
3.  **(10s later)** Sell the acquired BTC back to **USDT**.

## Tech Stack

- **Frontend:** React (Next.js-like file-based routing), Tailwind CSS
- **Backend:** Node.js (within Next.js API routes)
- **Database:** Neon (Serverless Postgres)
- **Exchange Integration:** Bitget API

## Setup and Installation

### 1. Install Dependencies

The project uses `bun` for package management.

```bash
bun install
```

### 2. Set up the Database

This project requires a Postgres database from [Neon](https://neon.tech/).

1.  Create a new project on Neon.
2.  In your project dashboard, find your database connection string. It will look something like `postgres://user:password@host/dbname`.

### 3. Configure Environment Variables

Create a `.env` file in the root of the `apps/web` directory. Add the following variables:

```
# The connection string for your Neon database
DATABASE_URL="postgres://user:password@host/dbname"

# Your Bitget API credentials (only required for live trading)
BITGET_API_KEY="YOUR_API_KEY"
BITGET_SECRET_KEY="YOUR_SECRET_KEY"
BITGET_PASSPHRASE="YOUR_API_PASSPHRASE"
```

### 4. Set up the Database Schema

You will need to create the necessary tables in your database. Connect to your Neon database and run the following SQL commands:

```sql
CREATE TABLE trades (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    trade_type VARCHAR(50),
    entry_price_xrp NUMERIC,
    entry_price_btc NUMERIC,
    trade_amount NUMERIC,
    is_demo BOOLEAN,
    status VARCHAR(50),
    exit_price_xrp NUMERIC,
    exit_price_btc NUMERIC,
    profit_loss NUMERIC,
    profit_percentage NUMERIC,
    fees_paid NUMERIC,
    execution_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT
);

CREATE TABLE arbitrage_opportunities (
    id SERIAL PRIMARY KEY,
    xrp_price NUMERIC,
    btc_price NUMERIC,
    xrp_ma NUMERIC,
    btc_ma NUMERIC,
    xrp_deviation NUMERIC,
    btc_deviation NUMERIC,
    potential_profit NUMERIC,
    profit_percentage NUMERIC,
    was_executed BOOLEAN,
    trade_id INTEGER REFERENCES trades(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bot_settings (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    api_key_encrypted TEXT,
    entryThreshold NUMERIC,
    profitTarget NUMERIC,
    stopLoss NUMERIC,
    tradeAmount NUMERIC,
    maxConcurrentTrades INTEGER,
    isDemoMode BOOLEAN,
    isActive BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## Running the Application

To start the development server, run:

```bash
bun run dev
```

The application will be available at `http://localhost:3000`.

## Using the Dashboard

- **Main View:** The dashboard provides cards for `Current Prices`, `Portfolio Balance`, `Recent Opportunities`, and `Trade History`.
- **Bot Controls:** Use the buttons in the header to `Start/Stop` the bot and to switch between `Demo` and `Live` modes.
- **Settings:** Adjust the `Profit Target` and `Trade Amount` in the Bot Settings section.

## Live Trading

To enable live trading:
1.  Add your Bitget API key, secret, and passphrase to the `.env` file.
2.  Switch the bot to "Live" mode using the toggle on the dashboard.

**Disclaimer:** Live trading involves real financial risk. The creators of this bot are not responsible for any financial losses. Use at your own risk.
