const { ethers } = require("ethers");
require("dotenv").config();

async function testConnection() {
  console.log("🧪 Testing Uniswap Trading Bot Connection...\n");

  try {
    // Test 1: RPC Connection
    console.log("1️⃣ Testing RPC connection...");
    const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
    const network = await provider.getNetwork();
    const blockNumber = await provider.getBlockNumber();
    console.log(
      `✅ Connected to ${network.name} (Chain ID: ${network.chainId})`
    );
    console.log(`📦 Latest block: ${blockNumber}\n`);

    // Test 2: Wallet Connection
    console.log("2️⃣ Testing wallet connection...");
    if (!process.env.PRIVATE_KEY) {
      throw new Error("PRIVATE_KEY not found in .env file");
    }
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const balance = await provider.getBalance(wallet.address);
    console.log(`✅ Wallet connected: ${wallet.address}`);
    console.log(`💰 POL Balance: ${ethers.formatEther(balance)} POL\n`);

    // Test 3: Uniswap V3 Quoter Contract (try both versions)
    console.log("3️⃣ Testing Uniswap V3 Quoter...");
    const quoterABI = [
      "function quoteExactInputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountIn, uint160 sqrtPriceLimitX96) external view returns (uint256 amountOut)",
    ];

    // Try QuoterV2 first
    const quoterAddresses = [
      "0x61fFE014bA17989E743c5F6cB21bF9697530B21e", // QuoterV2
      "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6", // Original Quoter
    ];

    let workingQuoter = null;
    const WPOL = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270";
    const USDC = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
    const amountIn = ethers.parseEther("1"); // 1 POL

    for (let i = 0; i < quoterAddresses.length; i++) {
      try {
        console.log(`   Testing Quoter ${i + 1}: ${quoterAddresses[i]}`);
        const quoter = new ethers.Contract(
          quoterAddresses[i],
          quoterABI,
          provider
        );

        const quote = await quoter.quoteExactInputSingle.staticCall(
          WPOL,
          USDC,
          3000, // 0.3% fee
          amountIn,
          0
        );

        const amountOut = ethers.formatUnits(quote, 6); // USDC has 6 decimals
        const price = parseFloat(amountOut);

        console.log(
          `   ✅ Quoter ${i + 1} working! 1 POL = ${price.toFixed(4)} USDC`
        );
        workingQuoter = quoterAddresses[i];
        break;
      } catch (error) {
        console.log(`   ❌ Quoter ${i + 1} failed: ${error.message}`);
      }
    }

    if (!workingQuoter) {
      throw new Error("No working quoter found");
    }

    console.log(`\n✅ Using working quoter: ${workingQuoter}\n`);

    // Test 4: Different Fee Tiers
    console.log("4️⃣ Testing different fee tiers...");
    const quoter = new ethers.Contract(workingQuoter, quoterABI, provider);
    const feeTiers = [500, 3000, 10000]; // 0.05%, 0.3%, 1%

    for (const fee of feeTiers) {
      try {
        const quote = await quoter.quoteExactInputSingle.staticCall(
          WPOL,
          USDC,
          fee,
          amountIn,
          0
        );
        const amountOut = ethers.formatUnits(quote, 6);
        const price = parseFloat(amountOut);
        console.log(`   Fee ${fee / 10000}%: 1 POL = ${price.toFixed(4)} USDC`);
      } catch (error) {
        console.log(`   Fee ${fee / 10000}%: No liquidity pool`);
      }
    }

    // Test 5: Token Contracts
    console.log("\n5️⃣ Testing token contracts...");
    const erc20ABI = [
      "function symbol() external view returns (string)",
      "function decimals() external view returns (uint8)",
      "function balanceOf(address) external view returns (uint256)",
    ];

    const tokens = {
      USDC: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
      USDT: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
      WETH: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
    };

    for (const [symbol, address] of Object.entries(tokens)) {
      try {
        const contract = new ethers.Contract(address, erc20ABI, provider);
        const tokenSymbol = await contract.symbol();
        const decimals = await contract.decimals();
        const balance = await contract.balanceOf(wallet.address);
        const formattedBalance = ethers.formatUnits(balance, decimals);

        console.log(
          `   ${tokenSymbol}: ${parseFloat(formattedBalance).toFixed(
            6
          )} (${decimals} decimals)`
        );
      } catch (error) {
        console.log(`   ❌ Error reading ${symbol}: ${error.message}`);
      }
    }

    // Test 6: Pool Existence Check
    console.log("\n6️⃣ Testing pool existence...");
    const factoryABI = [
      "function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)",
    ];

    const factory = new ethers.Contract(
      "0x1F98431c8aD98523631AE4a59f267346ea31F984", // UniswapV3Factory
      factoryABI,
      provider
    );

    const testPairs = [
      { tokenA: WPOL, tokenB: USDC, name: "WPOL/USDC" },
      { tokenA: WPOL, tokenB: tokens.USDT, name: "WPOL/USDT" },
      { tokenA: USDC, tokenB: tokens.USDT, name: "USDC/USDT" },
    ];

    for (const pair of testPairs) {
      for (const fee of feeTiers) {
        try {
          const poolAddress = await factory.getPool(
            pair.tokenA,
            pair.tokenB,
            fee
          );
          if (poolAddress !== "0x0000000000000000000000000000000000000000") {
            console.log(
              `   ✅ ${pair.name} pool (${fee / 10000}%): ${poolAddress}`
            );
          }
        } catch (error) {
          // Silent fail for non-existent pools
        }
      }
    }

    console.log("\n🎉 All tests completed successfully!");
    console.log(`\n📋 Configuration for your bot:`);
    console.log(`WORKING_QUOTER=${workingQuoter}`);
    console.log("\n💡 Tips:");
    console.log("   - Your bot should now work with these addresses");
    console.log("   - Start with small TRADE_AMOUNT values for testing");
    console.log("   - Monitor the first few trades carefully");
  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
    console.log("\n🔧 Troubleshooting:");
    console.log("   1. Check your .env file configuration");
    console.log("   2. Verify your POLYGON_RPC_URL is working");
    console.log("   3. Ensure your PRIVATE_KEY is valid");
    console.log("   4. Try a different RPC endpoint if issues persist");
    console.log("   5. Make sure you have POL for gas fees");
  }
}

// Run the test
testConnection();
