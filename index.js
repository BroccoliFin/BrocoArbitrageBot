const { ethers } = require("ethers");
const axios = require("axios");
require("dotenv").config();

class UniswapTradingBot {
  constructor() {
    // Initialize provider and wallet
    this.provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
    this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);

    // Contract addresses on Polygon (official Uniswap deployments)
    this.UNISWAP_V3_ROUTER = "0xE592427A0AEce92De3Edee1F18E0157C05861564";
    this.UNISWAP_V3_QUOTER_V2 = "0x61fFE014bA17989E743c5F6cB21bF9697530B21e"; // QuoterV2
    this.UNISWAP_V3_QUOTER_V1 = "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6"; // Original Quoter
    this.UNISWAP_V3_FACTORY = "0x1F98431c8aD98523631AE4a59f267346ea31F984";
    this.WPOL_ADDRESS = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270"; // Wrapped POL

    // Token configurations
    this.tokens = {
      POL: {
        address: "0x0000000000000000000000000000000000001010", // Native POL
        decimals: 18,
        symbol: "POL",
      },
      USDC: {
        address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
        decimals: 6,
        symbol: "USDC",
      },
      USDT: {
        address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
        decimals: 6,
        symbol: "USDT",
      },
      WETH: {
        address: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
        decimals: 18,
        symbol: "WETH",
      },
      WBTC: {
        address: "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6",
        decimals: 8,
        symbol: "WBTC",
      },
    };

    // Trading parameters
    this.minProfitPercentage =
      parseFloat(process.env.MIN_PROFIT_PERCENTAGE) || 1.0;
    this.maxGasPrice = ethers.parseUnits(
      process.env.MAX_GAS_PRICE || "100",
      "gwei"
    );
    this.slippageTolerance = parseFloat(process.env.SLIPPAGE_TOLERANCE) || 0.5;
    this.checkInterval = parseInt(process.env.CHECK_INTERVAL) || 60000; // 1 minute
    this.tradeAmount = parseFloat(process.env.TRADE_AMOUNT) || 10;
    this.simulationMode = process.env.SIMULATION_MODE === "true"; // Add simulation mode

    // Contract ABIs (minimal required functions)
    this.routerABI = [
      "function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96) params) external payable returns (uint256 amountOut)",
      "function exactOutputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountOut, uint256 amountInMaximum, uint160 sqrtPriceLimitX96) params) external payable returns (uint256 amountIn)",
    ];

    this.quoterABI = [
      "function quoteExactInputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountIn, uint160 sqrtPriceLimitX96) external view returns (uint256 amountOut)",
      "function quoteExactOutputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountOut, uint160 sqrtPriceLimitX96) external view returns (uint256 amountIn)",
    ];

    this.erc20ABI = [
      "function balanceOf(address) external view returns (uint256)",
      "function approve(address,uint256) external returns (bool)",
      "function allowance(address,address) external view returns (uint256)",
      "function decimals() external view returns (uint8)",
      "function symbol() external view returns (string)",
      "function transfer(address,uint256) external returns (bool)",
    ];

    this.factoryABI = [
      "function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)",
    ];

    // Initialize contracts
    this.router = new ethers.Contract(
      this.UNISWAP_V3_ROUTER,
      this.routerABI,
      this.wallet
    );
    this.factory = new ethers.Contract(
      this.UNISWAP_V3_FACTORY,
      this.factoryABI,
      this.provider
    );

    // Quoter will be initialized later
    this.quoter = null;
    this.workingQuoterAddress = null;

    // Trading state
    this.isTrading = false;
    this.lastPrices = new Map();
    this.totalTrades = 0;
    this.totalProfit = 0;

    console.log("🚀 Uniswap Trading Bot Initialized");
    console.log(`📍 Wallet: ${this.wallet.address}`);
    console.log(`⚙️ Min Profit: ${this.minProfitPercentage}%`);
    console.log(`💰 Trade Amount: ${this.tradeAmount}`);
    console.log(`⏱️ Check Interval: ${this.checkInterval / 1000}s`);
    console.log(
      `🎭 Mode: ${this.simulationMode ? "SIMULATION (Safe)" : "LIVE TRADING"}`
    );
  }

  // Initialize and test quoter contracts
  async initializeQuoter() {
    console.log("\n🔍 Testing quoter contracts...");

    const quoterAddresses = [
      { address: this.UNISWAP_V3_QUOTER_V2, name: "QuoterV2" },
      { address: this.UNISWAP_V3_QUOTER_V1, name: "QuoterV1" },
    ];

    const testAmount = ethers.parseEther("1");

    for (const quoterInfo of quoterAddresses) {
      try {
        console.log(`   Testing ${quoterInfo.name}: ${quoterInfo.address}`);
        const testQuoter = new ethers.Contract(
          quoterInfo.address,
          this.quoterABI,
          this.provider
        );

        // Test with a simple quote WPOL -> USDC
        const quote = await testQuoter.quoteExactInputSingle.staticCall(
          this.WPOL_ADDRESS,
          this.tokens.USDC.address,
          3000,
          testAmount,
          0
        );

        const amountOut = ethers.formatUnits(quote, 6);
        console.log(
          `   ✅ ${quoterInfo.name} working! Test quote: 1 POL = ${parseFloat(
            amountOut
          ).toFixed(4)} USDC`
        );

        this.quoter = testQuoter;
        this.workingQuoterAddress = quoterInfo.address;
        break;
      } catch (error) {
        console.log(`   ❌ ${quoterInfo.name} failed: ${error.message}`);
      }
    }

    if (!this.quoter) {
      throw new Error(
        "No working quoter contract found. Please check your RPC connection."
      );
    }

    console.log(`✅ Using quoter: ${this.workingQuoterAddress}\n`);
  }

  // Check if a pool exists for given token pair and fee
  async poolExists(tokenA, tokenB, fee) {
    try {
      const poolAddress = await this.factory.getPool(tokenA, tokenB, fee);
      return poolAddress !== "0x0000000000000000000000000000000000000000";
    } catch (error) {
      return false;
    }
  }

  // Get token balance
  async getTokenBalance(tokenSymbol) {
    try {
      const token = this.tokens[tokenSymbol];
      if (!token) throw new Error(`Token ${tokenSymbol} not supported`);

      if (tokenSymbol === "POL") {
        const balance = await this.provider.getBalance(this.wallet.address);
        return ethers.formatEther(balance);
      } else {
        const contract = new ethers.Contract(
          token.address,
          this.erc20ABI,
          this.provider
        );
        const balance = await contract.balanceOf(this.wallet.address);
        return ethers.formatUnits(balance, token.decimals);
      }
    } catch (error) {
      console.error(
        `❌ Error getting balance for ${tokenSymbol}:`,
        error.message
      );
      return "0";
    }
  }

  // Get the correct token address for swapping
  getSwapAddress(tokenSymbol) {
    if (tokenSymbol === "POL") {
      return this.WPOL_ADDRESS; // Use WPOL for swaps
    }
    return this.tokens[tokenSymbol].address;
  }

  // Get quote for token swap with multiple fee tier support
  async getQuote(tokenInSymbol, tokenOutSymbol, amountIn) {
    try {
      if (!this.quoter) {
        throw new Error("Quoter not initialized");
      }

      const tokenIn = this.tokens[tokenInSymbol];
      const tokenOut = this.tokens[tokenOutSymbol];

      if (!tokenIn || !tokenOut) {
        throw new Error("Unsupported token pair");
      }

      // Convert amount to proper decimals
      const amountInWei = ethers.parseUnits(
        amountIn.toString(),
        tokenIn.decimals
      );

      // Get correct addresses for swapping
      const tokenInAddress = this.getSwapAddress(tokenInSymbol);
      const tokenOutAddress = this.getSwapAddress(tokenOutSymbol);

      // Try different fee tiers to find the best quote
      const feeTiers = [500, 3000, 10000]; // 0.05%, 0.3%, 1%
      let bestQuote = null;
      let bestAmountOut = 0;
      let bestFee = 3000;

      for (const fee of feeTiers) {
        try {
          // Check if pool exists first
          const poolExists = await this.poolExists(
            tokenInAddress,
            tokenOutAddress,
            fee
          );
          if (!poolExists) continue;

          // Get quote
          const quote = await this.quoter.quoteExactInputSingle.staticCall(
            tokenInAddress,
            tokenOutAddress,
            fee,
            amountInWei,
            0
          );

          const amountOut = ethers.formatUnits(quote, tokenOut.decimals);
          let amountOutNum = parseFloat(amountOut);

          // Handle very small numbers that might be in scientific notation
          if (amountOutNum < 0.000001) {
            console.log(
              `   ⚠️ Very small quote for fee ${
                fee / 10000
              }%: ${amountOut} (skipping)`
            );
            continue;
          }

          if (amountOutNum > bestAmountOut) {
            bestAmountOut = amountOutNum;
            bestQuote = quote;
            bestFee = fee;
          }
        } catch (feeError) {
          // This fee tier might not have sufficient liquidity, continue to next
          continue;
        }
      }

      if (!bestQuote || bestAmountOut === 0) {
        throw new Error(
          `No liquidity pool found for ${tokenInSymbol}/${tokenOutSymbol}`
        );
      }

      const price = bestAmountOut / parseFloat(amountIn);

      return {
        amountOut: bestAmountOut,
        price: price,
        fee: bestFee,
      };
    } catch (error) {
      // Only log if it's not a "no liquidity" error to reduce noise
      if (!error.message.includes("No liquidity pool found")) {
        console.error(
          `❌ Error getting quote ${tokenInSymbol} -> ${tokenOutSymbol}:`,
          error.message
        );
      }
      return null;
    }
  }

  // Check for arbitrage opportunities with better validation
  async checkArbitrageOpportunity(tokenA, tokenB, amount = 1) {
    try {
      // Get quotes for both directions with small delay to reduce simultaneous calls
      const quote1 = await this.getQuote(tokenA, tokenB, amount);
      if (!quote1) return null;

      await new Promise((resolve) => setTimeout(resolve, 100)); // 100ms delay

      const quote2 = await this.getQuote(tokenB, tokenA, quote1.amountOut);
      if (!quote2) return null;

      // Calculate profit
      const finalAmount = quote2.amountOut;
      const profit = finalAmount - amount;
      const profitPercentage = (profit / amount) * 100;

      const key = `${tokenA}-${tokenB}`;
      this.lastPrices.set(key, {
        price1: quote1.price,
        price2: 1 / quote2.price,
        profit: profitPercentage,
        timestamp: Date.now(),
      });

      // Only consider opportunities with substantial profit to account for slippage
      const minProfitWithBuffer = this.minProfitPercentage + 1.0; // Add 1% buffer for slippage

      if (profitPercentage > minProfitWithBuffer) {
        return {
          tokenA,
          tokenB,
          amount,
          expectedProfit: profit,
          profitPercentage,
          path: [
            {
              from: tokenA,
              to: tokenB,
              amountOut: quote1.amountOut,
              fee: quote1.fee,
            },
            {
              from: tokenB,
              to: tokenA,
              amountOut: quote2.amountOut,
              fee: quote2.fee,
            },
          ],
        };
      }

      return null;
    } catch (error) {
      console.error(
        `❌ Error checking arbitrage ${tokenA}-${tokenB}:`,
        error.message
      );
      return null;
    }
  }

  // Execute token swap with improved slippage handling
  async executeSwap(tokenInSymbol, tokenOutSymbol, amountIn) {
    try {
      console.log(
        `🔄 Executing swap: ${amountIn} ${tokenInSymbol} -> ${tokenOutSymbol}`
      );

      const tokenIn = this.tokens[tokenInSymbol];
      const tokenOut = this.tokens[tokenOutSymbol];
      const amountInWei = ethers.parseUnits(
        amountIn.toString(),
        tokenIn.decimals
      );

      // Get fresh quote for minimum output (get quote right before execution)
      console.log(`   📊 Getting fresh quote...`);
      const quote = await this.getQuote(
        tokenInSymbol,
        tokenOutSymbol,
        amountIn
      );
      if (!quote) throw new Error("Unable to get fresh quote");

      console.log(
        `   💱 Quote: ${amountIn} ${tokenInSymbol} = ${quote.amountOut.toFixed(
          6
        )} ${tokenOutSymbol} (Fee: ${quote.fee / 10000}%)`
      );

      // Calculate minimum output with slippage (fix decimal precision and scientific notation)
      const effectiveSlippage = Math.max(this.slippageTolerance, 2.0); // At least 2% slippage
      const slippageAdjustedAmount =
        (quote.amountOut * (100 - effectiveSlippage)) / 100;

      // Handle very small amounts that might cause precision issues
      let minAmountString;
      if (slippageAdjustedAmount < 0.000001) {
        minAmountString = "0";
      } else {
        minAmountString = slippageAdjustedAmount.toFixed(tokenOut.decimals);
      }

      const minAmountOut = ethers.parseUnits(
        minAmountString,
        tokenOut.decimals
      );

      console.log(
        `   🛡️ Min expected (${effectiveSlippage}% slippage): ${slippageAdjustedAmount.toFixed(
          6
        )} ${tokenOutSymbol}`
      );

      // Approve token spending if needed (not for native POL)
      if (tokenInSymbol !== "POL") {
        await this.approveToken(tokenIn.address, amountInWei);
      }

      // Prepare swap parameters as struct (correct format for Uniswap V3)
      const swapParams = {
        tokenIn: this.getSwapAddress(tokenInSymbol),
        tokenOut: this.getSwapAddress(tokenOutSymbol),
        fee: quote.fee || 3000,
        recipient: this.wallet.address,
        deadline: Math.floor(Date.now() / 1000) + 60 * 10, // Reduced to 10 minutes
        amountIn: amountInWei,
        amountOutMinimum: minAmountOut,
        sqrtPriceLimitX96: 0,
      };

      // Check gas estimate first to catch any issues
      console.log(`   ⛽ Estimating gas...`);
      const gasEstimate = await this.router.exactInputSingle.estimateGas(
        swapParams,
        { value: tokenInSymbol === "POL" ? amountInWei : 0 }
      );

      console.log(`   ⛽ Gas estimate: ${gasEstimate.toString()}`);

      // Execute swap
      console.log(`   🚀 Submitting transaction...`);
      const tx = await this.router.exactInputSingle(swapParams, {
        value: tokenInSymbol === "POL" ? amountInWei : 0,
        gasLimit: gasEstimate + BigInt(50000), // Add buffer
        gasPrice: await this.getOptimalGasPrice(),
      });

      console.log(`⏳ Transaction submitted: ${tx.hash}`);

      const receipt = await tx.wait();

      if (receipt.status === 1) {
        console.log(`✅ Swap completed successfully!`);
        console.log(`📊 Gas used: ${receipt.gasUsed.toString()}`);
        return true;
      } else {
        console.log(`❌ Swap failed`);
        return false;
      }
    } catch (error) {
      if (error.message.includes("Too little received")) {
        console.error(
          `❌ Swap failed: Market moved unfavorably (high slippage)`
        );
        console.log(
          `   💡 Consider increasing SLIPPAGE_TOLERANCE or reducing trade frequency`
        );
      } else if (error.message.includes("Insufficient funds")) {
        console.error(`❌ Swap failed: Insufficient balance for transaction`);
      } else {
        console.error(`❌ Swap execution failed:`, error.message);
      }
      return false;
    }
  }

  // Approve token spending
  async approveToken(tokenAddress, amount) {
    try {
      const contract = new ethers.Contract(
        tokenAddress,
        this.erc20ABI,
        this.wallet
      );
      const currentAllowance = await contract.allowance(
        this.wallet.address,
        this.UNISWAP_V3_ROUTER
      );

      if (currentAllowance < amount) {
        console.log(`🔓 Approving token spending...`);
        const tx = await contract.approve(
          this.UNISWAP_V3_ROUTER,
          ethers.MaxUint256
        );
        await tx.wait();
        console.log(`✅ Token approved`);
      }
    } catch (error) {
      console.error(`❌ Token approval failed:`, error.message);
      throw error;
    }
  }

  // Get optimal gas price
  async getOptimalGasPrice() {
    try {
      const feeData = await this.provider.getFeeData();
      const gasPrice = feeData.gasPrice || feeData.maxFeePerGas;

      return gasPrice > this.maxGasPrice ? this.maxGasPrice : gasPrice;
    } catch (error) {
      console.error("❌ Error getting gas price:", error.message);
      return this.maxGasPrice;
    }
  }

  // Execute arbitrage trade (with simulation mode support)
  async executeArbitrage(opportunity) {
    if (this.isTrading) {
      console.log("⚠️ Already trading, skipping...");
      return;
    }

    this.isTrading = true;

    try {
      console.log(`\n🎯 ARBITRAGE OPPORTUNITY FOUND!`);
      console.log(
        `💰 Potential Profit: ${opportunity.expectedProfit.toFixed(6)} ${
          opportunity.tokenA
        } (${opportunity.profitPercentage.toFixed(2)}%)`
      );

      if (this.simulationMode) {
        console.log(`\n🎭 SIMULATION MODE - No real trades executed`);
        console.log(`📊 Would execute:`);
        console.log(
          `   Step 1: ${this.tradeAmount} ${opportunity.tokenA} -> ${opportunity.tokenB}`
        );
        console.log(
          `   Step 2: ${opportunity.path[0].amountOut.toFixed(6)} ${
            opportunity.tokenB
          } -> ${opportunity.tokenA}`
        );
        console.log(
          `   Expected final: ${(
            this.tradeAmount + opportunity.expectedProfit
          ).toFixed(6)} ${opportunity.tokenA}`
        );

        this.totalTrades++;
        this.totalProfit += opportunity.expectedProfit;

        console.log(
          `📊 Simulation Stats: ${
            this.totalTrades
          } trades, ${this.totalProfit.toFixed(6)} ${opportunity.tokenA} profit`
        );
        return;
      }

      // Check if we have enough balance
      const balance = parseFloat(
        await this.getTokenBalance(opportunity.tokenA)
      );

      // Use smaller of: configured trade amount, 90% of balance, or opportunity amount
      let tradeAmount = Math.min(
        this.tradeAmount,
        balance * 0.9,
        opportunity.amount
      );

      // Round to avoid precision errors
      tradeAmount = parseFloat(tradeAmount.toFixed(8));

      if (balance < tradeAmount) {
        console.log(
          `⚠️ Insufficient balance. Have: ${balance.toFixed(
            6
          )}, Need: ${tradeAmount.toFixed(6)}`
        );
        return;
      }

      const initialBalance = balance;

      // Execute first trade
      console.log(
        `\n🔄 Step 1: ${tradeAmount.toFixed(6)} ${opportunity.tokenA} -> ${
          opportunity.tokenB
        }`
      );
      const swap1Success = await this.executeSwap(
        opportunity.tokenA,
        opportunity.tokenB,
        tradeAmount
      );

      if (!swap1Success) {
        console.log(`❌ First swap failed`);
        return;
      }

      // Wait a bit and get actual received amount
      await new Promise((resolve) => setTimeout(resolve, 5000));
      const intermediateBalance = parseFloat(
        await this.getTokenBalance(opportunity.tokenB)
      );

      if (intermediateBalance === 0) {
        console.log(`❌ No tokens received from first swap`);
        return;
      }

      // Execute second trade (round the amount)
      const roundedIntermediateBalance = parseFloat(
        intermediateBalance.toFixed(this.tokens[opportunity.tokenB].decimals)
      );
      console.log(
        `\n🔄 Step 2: ${roundedIntermediateBalance.toFixed(6)} ${
          opportunity.tokenB
        } -> ${opportunity.tokenA}`
      );
      const swap2Success = await this.executeSwap(
        opportunity.tokenB,
        opportunity.tokenA,
        roundedIntermediateBalance
      );

      if (swap2Success) {
        // Wait and get final balance
        await new Promise((resolve) => setTimeout(resolve, 5000));
        const finalBalance = parseFloat(
          await this.getTokenBalance(opportunity.tokenA)
        );
        const actualProfit = finalBalance - initialBalance;

        console.log(`\n🎉 ARBITRAGE COMPLETED!`);
        console.log(
          `📈 Initial: ${initialBalance.toFixed(6)} ${opportunity.tokenA}`
        );
        console.log(
          `📈 Final: ${finalBalance.toFixed(6)} ${opportunity.tokenA}`
        );
        console.log(
          `💰 Actual Profit: ${actualProfit.toFixed(6)} ${opportunity.tokenA}`
        );

        this.totalTrades++;
        this.totalProfit += actualProfit;

        console.log(
          `📊 Total Trades: ${
            this.totalTrades
          }, Total Profit: ${this.totalProfit.toFixed(6)} ${opportunity.tokenA}`
        );
      }
    } catch (error) {
      console.error(`❌ Arbitrage execution failed:`, error.message);
    } finally {
      this.isTrading = false;
    }
  }

  // Main trading loop
  async startTrading() {
    console.log(`\n🤖 Starting trading bot...`);

    // Initialize quoter first
    await this.initializeQuoter();

    // Define trading pairs to monitor (removed problematic pairs)
    const tradingPairs = [
      ["POL", "USDC"],
      ["POL", "USDT"],
      ["USDC", "USDT"],
      ["POL", "WETH"],
      ["USDC", "WETH"],
      // Removed POL-WBTC due to very small amounts causing precision issues
    ];

    const tradeLoop = async () => {
      try {
        console.log(
          `\n⏰ ${new Date().toISOString()} - Checking opportunities...`
        );

        // Display current balances
        console.log("\n💼 Current Balances:");
        for (const symbol of Object.keys(this.tokens)) {
          const balance = await this.getTokenBalance(symbol);
          if (parseFloat(balance) > 0) {
            console.log(`   ${symbol}: ${parseFloat(balance).toFixed(6)}`);
          }
        }

        // Check each trading pair for opportunities
        for (const [tokenA, tokenB] of tradingPairs) {
          if (this.isTrading) break; // Don't check new opportunities while trading

          const opportunity = await this.checkArbitrageOpportunity(
            tokenA,
            tokenB,
            this.tradeAmount
          );

          if (opportunity) {
            await this.executeArbitrage(opportunity);
            // Wait before checking next opportunity
            await new Promise((resolve) => setTimeout(resolve, 10000));
          }

          // Small delay between checks to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        // Display price tracking
        console.log("\n📊 Price Tracking:");
        if (this.lastPrices.size === 0) {
          console.log("   No price data yet...");
        } else {
          for (const [pair, data] of this.lastPrices) {
            console.log(`   ${pair}: Profit ${data.profit.toFixed(2)}%`);
          }
        }
      } catch (error) {
        console.error("❌ Error in trade loop:", error.message);
      }
    };

    // Run initial check
    await tradeLoop();

    // Set up interval
    console.log(
      `\n⏰ Bot will check for opportunities every ${
        this.checkInterval / 1000
      } seconds...`
    );
    setInterval(tradeLoop, this.checkInterval);
  }

  // Emergency stop function
  stop() {
    console.log("🛑 Stopping trading bot...");
    process.exit(0);
  }
}

// Error handling
process.on("uncaughtException", (error) => {
  console.error("💥 Uncaught Exception:", error);
  console.log("Bot will continue running...");
});

process.on("unhandledRejection", (reason) => {
  console.error("💥 Unhandled Rejection:", reason);
  console.log("Bot will continue running...");
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Received SIGINT, shutting down gracefully...");
  process.exit(0);
});

// Main execution
async function main() {
  try {
    console.log("🚀 Starting Uniswap Trading Bot...\n");

    // Validate environment
    if (!process.env.PRIVATE_KEY) {
      throw new Error("PRIVATE_KEY is required in .env file");
    }

    if (!process.env.POLYGON_RPC_URL) {
      throw new Error("POLYGON_RPC_URL is required in .env file");
    }

    const bot = new UniswapTradingBot();

    // Start trading
    await bot.startTrading();
  } catch (error) {
    console.error("💥 Fatal error:", error.message);
    console.log("\n🔧 Troubleshooting tips:");
    console.log('   1. Run "node test.js" to verify your setup');
    console.log("   2. Check your .env configuration");
    console.log("   3. Ensure you have POL for gas fees");
    console.log("   4. Try a different RPC endpoint");
    console.log("   5. Make sure you have tokens to trade");
    process.exit(1);
  }
}

// Start the bot
main();
