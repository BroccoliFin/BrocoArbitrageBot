# 🚀 Crypto Trading Bot

A professional, industry-ready cryptocurrency arbitrage trading bot. This bot automatically detects circular arbitrage opportunities and executes profitable trades between various tokens with advanced risk management and safety features.

## 🎯 Features

- **🔄 Automated Arbitrage**: Detects and executes circular arbitrage opportunities (Token A → Token B → Token A)
- **🏗️ Multi-Token Support**: Trade between POL, USDC, USDT, WETH with dynamic pair selection
- **📊 Real-time Monitoring**: Continuously scans prices across multiple fee tiers (0.05%, 0.3%, 1%)
- **🛡️ Advanced Risk Management**: Built-in slippage protection, gas optimization, and balance validation
- **🎭 Simulation Mode**: Safe testing environment to validate strategies without real money
- **⚡ Gas Optimization**: Smart gas price management and transaction batching
- **📈 Performance Tracking**: Comprehensive trade statistics and profit monitoring
- **🔒 Production Ready**: Professional error handling, logging, and recovery mechanisms

## 🏗️ Complete Bot Architecture

### High-Level System Design

```
┌─────────────────────────────────────────────────────────────┐
│                    UNISWAP TRADING BOT                      │
├─────────────────────────────────────────────────────────────┤
│  🧠 Brain: JavaScript Class (UniswapTradingBot)             │
│  🌐 Network: Polygon Blockchain                             │
│  💰 Protocol: Uniswap V3 DEX                                │
│  🔄 Strategy: Circular Arbitrage                            │
└─────────────────────────────────────────────────────────────┘
```

### Core Components

```javascript
// Connection Layer
Provider (RPC) ────► Polygon Network ────► Uniswap V3 Contracts
     │                     │                        │
  Your Bot ←──────── Transaction ←────────── Smart Contract
```

**Key Smart Contracts:**

- **Quoter V1**: `0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6` (Price quotes)
- **SwapRouter**: `0xE592427A0AEce92De3Edee1F18E0157C05861564` (Trade execution)
- **Factory**: `0x1F98431c8aD98523631AE4a59f267346ea31F984` (Pool verification)
- **WPOL**: `0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270` (Wrapped POL)

### Token Management System

```javascript
Supported Tokens:
├── POL (Native) ──── 18 decimals ──── Gas & Trading
├── USDC ──────────── 6 decimals ───── Stablecoin
├── USDT ──────────── 6 decimals ───── Stablecoin
├── WETH ──────────── 18 decimals ──── Ethereum
└── WBTC ──────────── 8 decimals ───── Bitcoin
```

### Trading Pairs Matrix

```
     POL   USDC  USDT  WETH
POL   -     ✅    ✅    ✅
USDC  ✅    -     ✅    ✅
USDT  ✅    ✅    -     ❌
WETH  ✅    ✅    ❌    -
```

## 🔄 Complete Trading Flow

### Phase 1: Initialization (Bot Startup)

```
1. Load Environment Variables (.env)
   ├── Private Key, RPC URL
   ├── Trading Parameters
   └── Safety Settings

2. Connect to Blockchain
   ├── Create Provider (Polygon RPC)
   ├── Initialize Wallet
   └── Setup Contract Interfaces

3. Test Quoter Contracts
   ├── Try QuoterV2 (fallback available)
   ├── Use QuoterV1 ✅ (proven reliable)
   └── Validate with test quote

4. Ready to Trade! 🚀
```

### Phase 2: Opportunity Detection Loop

```
Every 90 seconds (configurable):

1. Check Account Balances
   ├── POL: 10.791436
   ├── USDT: 1.120141
   └── Others: 0.000000

2. Scan All Trading Pairs
   ├── POL ↔ USDC
   ├── POL ↔ USDT  ← Found 2.57% profit!
   ├── POL ↔ WETH
   ├── USDC ↔ USDT
   └── USDC ↔ WETH

3. For Each Pair, Calculate Arbitrage
```

### Phase 3: Arbitrage Calculation

```
Example: POL → USDT → POL

Step 1: Get Quote POL → USDT
├── Input: 1 POL
├── Check Fee Tiers: 0.05%, 0.3%, 1%
├── Best Quote: 0.240782 USDT (0.3% fee)
└── Price: 1 POL = 0.240782 USDT

Step 2: Get Quote USDT → POL
├── Input: 0.240782 USDT
├── Check Fee Tiers: 0.05%, 0.3%, 1%
├── Best Quote: 1.025684 POL (0.3% fee)
└── Price: 0.240782 USDT = 1.025684 POL

Step 3: Calculate Profit
├── Initial: 1.000000 POL
├── Final: 1.025684 POL
├── Profit: 0.025684 POL
└── Percentage: 2.57% ✅ (Above 1.5% threshold)
```

### Phase 4: Trade Execution (Live Mode)

#### 🔄 Step 1: First Swap (POL → USDT)

```javascript
1. Validate Trade Amount
   ├── Available: 10.791436 POL
   ├── Configured: 0.3 POL
   └── Using: 0.3 POL ✅

2. Get Fresh Quote (right before execution)
   ├── Input: 0.3 POL
   ├── Expected: 0.072235 USDT
   └── Min Expected (3% slippage): 0.070068 USDT

3. Prepare Swap Parameters
   ├── tokenIn: WPOL address
   ├── tokenOut: USDT address
   ├── fee: 3000 (0.3%)
   ├── recipient: Your Wallet
   ├── deadline: Now + 10 minutes
   ├── amountIn: 300000000000000000 (0.3 POL in wei)
   ├── amountOutMinimum: 70068 (min USDT)
   └── sqrtPriceLimitX96: 0

4. Execute Transaction
   ├── Estimate Gas: ~185,000
   ├── Submit Transaction
   ├── Wait for Confirmation
   └── ✅ Success: Received ~0.072235 USDT
```

#### 🔄 Step 2: Second Swap (USDT → POL)

```javascript
1. Check Received Amount
   ├── Wait 5 seconds for balance update
   ├── Query USDT balance
   └── Found: 0.072235 USDT

2. Get Fresh Quote USDT → POL
   ├── Input: 0.072235 USDT
   ├── Expected: 0.307764 POL
   └── Min Expected (3% slippage): 0.298532 POL

3. Execute Second Swap
   ├── Same process as Step 1
   ├── USDT → POL conversion
   └── ✅ Success: Received ~0.307764 POL

4. Calculate Final Profit
   ├── Initial POL: 10.791436
   ├── Final POL: 11.099200
   ├── Net Profit: +0.007764 POL
   └── Actual Profit %: 2.59%
```

## 🧠 Smart Features & Safety

### Risk Management

```javascript
✅ Slippage Protection: Minimum 3% buffer
✅ Fresh Quotes: Real-time pricing before execution
✅ Gas Estimation: Pre-calculate transaction costs
✅ Balance Validation: Check funds before trading
✅ Pool Verification: Ensure liquidity exists
✅ Error Recovery: Continue despite individual failures
```

### Profit Optimization

```javascript
✅ Multi-Fee Tier Scanning: 0.05%, 0.3%, 1%
✅ Best Route Selection: Highest output amount
✅ Gas Price Optimization: Smart fee calculation
✅ Trade Size Management: Risk-appropriate amounts
```

### Monitoring & Logging

```javascript
✅ Real-time Balance Tracking
✅ Performance Statistics
✅ Detailed Transaction Logs
✅ Error Reporting & Recovery
✅ Profit/Loss Tracking
```

## 📊 Mathematical Model

### Arbitrage Formula

```
Profit = (Amount × Rate1 × Rate2) - Amount - Fees

Where:
- Amount = Trade size (0.3 POL)
- Rate1 = POL→USDT rate (0.240782)
- Rate2 = USDT→POL rate (4.262847)
- Fees = Gas costs + Uniswap fees (0.6% total)

Example:
Profit = (1 × 0.240782 × 4.262847) - 1 - 0.006
Profit = 1.025684 - 1 - 0.006 = 0.019684 POL (1.97%)
```

### Success Conditions

```
✅ Profit > MIN_PROFIT_PERCENTAGE (1.5%)
✅ Available Balance > Trade Amount
✅ Network Gas < MAX_GAS_PRICE
✅ Pool Liquidity Sufficient
✅ No Pending Transactions
```

## 🚀 Execution Timeline

```
T+0s:   🔍 Scan for opportunities
T+1s:   📊 Calculate POL→USDT→POL profit: 2.57%
T+2s:   ✅ Opportunity confirmed (above 1.5% threshold)
T+3s:   🔄 Begin Step 1: POL→USDT
T+4s:   📊 Get fresh quote: 0.3 POL = 0.072235 USDT
T+5s:   ⛽ Estimate gas: 185,000
T+6s:   🚀 Submit transaction 1
T+18s:  ✅ Transaction 1 confirmed
T+23s:  🔄 Begin Step 2: USDT→POL
T+24s:  📊 Get fresh quote: 0.072235 USDT = 0.307764 POL
T+25s:  🚀 Submit transaction 2
T+37s:  ✅ Transaction 2 confirmed
T+42s:  🎉 Arbitrage complete! Profit: 0.007764 POL

Total Time: ~42 seconds per arbitrage cycle
```

## 💰 Economic Model

### Revenue Streams

- ✅ **Arbitrage Profits**: 1.5-5% per successful trade
- ✅ **Compound Growth**: Reinvesting profits increases trade size

### Cost Structure

- ❌ **Gas Fees**: ~$0.01-0.05 per transaction (2 tx per arbitrage)
- ❌ **Uniswap Fees**: 0.05-1% per swap (depends on pool)
- ❌ **Slippage**: 1-3% maximum protection

### Break-even Analysis

```
Minimum Profitable Trade:
Gas Cost ($0.03) + Uniswap Fees (0.6%) + Buffer (1%) = ~2.6%

Bot Threshold: 1.5% + 1% buffer = 2.5% ✅
Success Rate: High (conservative settings)
```

## 🛠 Prerequisites

- Node.js v16 or higher
- NPM or Yarn package manager
- Polygon wallet with POL for gas fees
- Basic understanding of DeFi and trading risks
- RPC endpoint (free options available)

## 📦 Installation

1. **Clone or create the project:**

```bash
mkdir uniswap-trading-bot
cd uniswap-trading-bot
```

2. **Install dependencies:**

```bash
npm install ethers axios dotenv
```

3. **Create environment file:**

```bash
cp .env.example .env
```

4. **Configure your settings in `.env`:**

```bash
# Required Settings
PRIVATE_KEY=0x1234...your_private_key_here
POLYGON_RPC_URL=https://polygon.llamarpc.com

# Trading Parameters
MIN_PROFIT_PERCENTAGE=1.5
TRADE_AMOUNT=0.3
SLIPPAGE_TOLERANCE=3.0
CHECK_INTERVAL=90000

# Safety Features
SIMULATION_MODE=true
```

## ⚙️ Configuration

### Essential Settings (.env file)

| Variable                | Description               | Default      | Recommended                  |
| ----------------------- | ------------------------- | ------------ | ---------------------------- |
| `PRIVATE_KEY`           | Your wallet private key   | **Required** | Use dedicated trading wallet |
| `POLYGON_RPC_URL`       | Polygon network RPC URL   | **Required** | https://polygon.llamarpc.com |
| `MIN_PROFIT_PERCENTAGE` | Minimum profit % to trade | 1.0          | 1.5                          |
| `TRADE_AMOUNT`          | Base trade amount         | 10           | 0.3                          |
| `SLIPPAGE_TOLERANCE`    | Slippage tolerance %      | 0.5          | 3.0                          |
| `CHECK_INTERVAL`        | Price check interval (ms) | 60000        | 90000                        |
| `SIMULATION_MODE`       | Safe testing mode         | false        | true (for testing)           |
| `MAX_GAS_PRICE`         | Maximum gas price (gwei)  | 100          | 100                          |

### Advanced Settings

```bash
# Risk Management
MAX_TRADE_SIZE=1000
MAX_DAILY_TRADES=50
STOP_LOSS_PERCENTAGE=5.0

# Performance Optimization
GAS_LIMIT=300000
RETRY_ATTEMPTS=3
TIMEOUT_SECONDS=30

# Monitoring (Optional)
TELEGRAM_BOT_TOKEN=your_telegram_token
DISCORD_WEBHOOK_URL=your_discord_webhook
```

## 🚀 Usage

### 1. Test Your Setup

```bash
node test.js
```

Expected output:

```
🧪 Testing Uniswap Trading Bot Connection...
✅ Connected to matic (Chain ID: 137)
✅ Wallet connected: 0x1234...5678
✅ QuoterV1 working! Test quote: 1 POL = 0.2337 USDC
✅ Using quoter: 0xb27...AB6
🎉 All tests completed successfully!
```

### 2. Start in Simulation Mode (Safe)

```bash
# Ensure SIMULATION_MODE=true in .env
node bot.js
```

Expected output:

```
🚀 Uniswap Trading Bot Initialized
🎭 Mode: SIMULATION (Safe)

🎯 ARBITRAGE OPPORTUNITY FOUND!
💰 Potential Profit: 0.025684 POL (2.57%)

🎭 SIMULATION MODE - No real trades executed
📊 Would execute:
   Step 1: 0.3 POL -> USDT
   Step 2: 0.072235 USDT -> POL
   Expected final: 0.325684 POL

📊 Simulation Stats: 1 trades, 0.025684 POL profit
```

### 3. Enable Live Trading

```bash
# Update .env: SIMULATION_MODE=false
node bot.js
```

Expected output:

```
🎯 ARBITRAGE OPPORTUNITY FOUND!
💰 Potential Profit: 0.025684 POL (2.57%)

🔄 Step 1: 0.300000 POL -> USDT
🔄 Executing swap: 0.3 POL -> USDT
   📊 Getting fresh quote...
   💱 Quote: 0.3 POL = 0.072235 USDT (Fee: 0.3%)
   🛡️ Min expected (3% slippage): 0.070068 USDT
   ⛽ Gas estimate: 185420
   🚀 Submitting transaction...
⏳ Transaction submitted: 0x1234...5678
✅ Swap completed successfully!

🔄 Step 2: 0.072235 USDT -> POL
[Second transaction execution...]

🎉 ARBITRAGE COMPLETED!
📈 Initial: 10.791436 POL
📈 Final: 10.799200 POL
💰 Actual Profit: 0.007764 POL

📊 Total Trades: 1, Total Profit: 0.007764 POL
```

## 🔒 Security Best Practices

### 1. Private Key Security

```bash
# ✅ DO:
- Use a dedicated trading wallet with limited funds
- Store private key in .env file (never commit to git)
- Consider hardware wallet integration for key management
- Regularly rotate keys and monitor transactions

# ❌ DON'T:
- Use your main wallet with large holdings
- Share private keys or commit them to version control
- Run on shared/public computers
- Ignore security warnings
```

### 2. Risk Management

```bash
# ✅ DO:
- Start with small trade amounts (0.1-0.5 POL)
- Test thoroughly in simulation mode
- Set appropriate stop-loss levels
- Monitor gas prices during high network activity
- Keep some POL reserved for gas fees

# ❌ DON'T:
- Trade with funds you can't afford to lose
- Set trade amounts higher than your balance
- Ignore slippage warnings
- Run without monitoring for extended periods
```

### 3. Network Security

```bash
# ✅ DO:
- Use reputable RPC providers (Polygon official, Alchemy, Infura)
- Implement IP whitelisting if possible
- Monitor for unusual network activity
- Have backup RPC endpoints ready

# ❌ DON'T:
- Use untrusted or unknown RPC providers
- Ignore network connectivity issues
- Run without backup configurations
```

## 🐛 Troubleshooting

### Common Issues

**1. "Too little received" Error:**

```bash
# Cause: High slippage or market movement
# Solution: Increase SLIPPAGE_TOLERANCE to 3-5%

SLIPPAGE_TOLERANCE=3.0
```

**2. "Insufficient balance" Error:**

```bash
# Cause: Not enough tokens for trade
# Solution: Reduce TRADE_AMOUNT or add more tokens

TRADE_AMOUNT=0.1  # Reduce trade size
```

**3. "Missing revert data" Error:**

```bash
# Cause: QuoterV2 compatibility issues
# Solution: Bot automatically uses QuoterV1 (working correctly)

✅ Using quoter: 0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6
```

**4. "No profitable opportunities" Error:**

```bash
# Cause: Market conditions or high thresholds
# Solution: Lower profit threshold temporarily

MIN_PROFIT_PERCENTAGE=1.0  # Lower threshold
```

**5. RPC Connection Issues:**

```bash
# Try alternative RPC endpoints:
POLYGON_RPC_URL=https://rpc.ankr.com/polygon
# or
POLYGON_RPC_URL=https://polygon-rpc.com
```

### Debug Mode

```bash
# Enable detailed logging
DEBUG_MODE=true
LOG_TRADES=true
```

### Performance Optimization

```bash
# For faster execution:
CHECK_INTERVAL=30000      # Check every 30 seconds
SLIPPAGE_TOLERANCE=2.0    # Lower slippage (higher risk)

# For stability:
CHECK_INTERVAL=120000     # Check every 2 minutes
SLIPPAGE_TOLERANCE=5.0    # Higher slippage (lower risk)
```

## 📈 Performance Tips

### 1. RPC Optimization

```bash
# Premium RPC providers for faster response times:
- Alchemy: https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY
- Infura: https://polygon-mainnet.infura.io/v3/YOUR_KEY
- QuickNode: Your custom endpoint
```

### 2. Gas Management

```bash
# Monitor network congestion:
- Use gas tracker websites
- Adjust MAX_GAS_PRICE based on network conditions
- Consider trading during low-traffic hours
```

### 3. Trade Timing

```bash
# Optimal trading conditions:
- Low network congestion (lower gas fees)
- High trading volume (more arbitrage opportunities)
- Market volatility (price discrepancies)
```

### 4. Pair Selection

```bash
# High-liquidity pairs for better opportunities:
✅ POL/USDC (most liquid)
✅ POL/USDT (stable pair)
✅ USDC/USDT (stablecoin arbitrage)
⚠️ POL/WETH (higher volatility)
❌ Small cap tokens (low liquidity)
```

## ⚠️ Disclaimers & Legal

### Financial Risk

- **High Risk**: Cryptocurrency trading involves significant financial risk
- **No Guarantees**: Past performance doesn't guarantee future results
- **Market Risk**: DeFi markets are highly volatile and unpredictable
- **Smart Contract Risk**: Protocols may have bugs or vulnerabilities
- **Impermanent Loss**: Market movements can cause losses

### Technical Risk

- **Software Bugs**: Code may contain errors or unexpected behavior
- **Network Risk**: Blockchain congestion can cause failed transactions
- **RPC Failures**: External services may become unavailable
- **Gas Price Volatility**: Transaction costs can vary significantly

### Legal Compliance

- **Regulatory Risk**: Ensure compliance with local trading regulations
- **Tax Obligations**: Trading profits may be subject to taxation
- **KYC/AML**: Some jurisdictions require identity verification
- **Professional Advice**: Consult legal and financial professionals

### Operational Risk

- **Private Key Security**: Loss of keys means loss of funds
- **Operational Errors**: Incorrect configuration can cause losses
- **Monitoring Required**: Automated systems need human oversight
- **Emergency Procedures**: Have plans for stopping bot operation

## 📞 Support & Community

### Getting Help

1. **Check Troubleshooting Section**: Most issues are covered above
2. **Review Error Messages**: Bot provides detailed error information
3. **Test Configuration**: Use `node test.js` to verify setup
4. **Start Small**: Begin with small trade amounts in simulation mode

### Best Practices for Success

1. **Education**: Understand DeFi, Uniswap, and arbitrage concepts
2. **Testing**: Thoroughly test in simulation mode before live trading
3. **Monitoring**: Regularly check bot performance and market conditions
4. **Risk Management**: Never trade more than you can afford to lose
5. **Continuous Learning**: Stay updated on market trends and technology

### Contributing

- Report bugs and issues with detailed logs
- Suggest improvements and new features
- Share successful configuration strategies
- Help other users in community discussions

## 📄 License

MIT License - Use at your own risk. See LICENSE file for details.

---

**⚠️ Important Notice**: This bot is for educational and research purposes. Always test thoroughly and understand the risks before using real funds. Cryptocurrency trading involves substantial risk of loss and is not suitable for every investor.

**🎯 Ready to Start?**

1. Run `node test.js` to verify setup
2. Enable `SIMULATION_MODE=true` for safe testing
3. Start with small `TRADE_AMOUNT` values
4. Monitor performance and adjust parameters
5. Only enable live trading when confident

**Happy Trading! 🚀💰**
