import { Contract, ethers, providers, Wallet } from "ethers";
import dotenv from "dotenv";
import cron from "node-cron";
import {
  ChainId,
  Token,
  TokenAmount,
  Pair,
  Route,
  Trade,
  TradeType,
  Fetcher,
  Percent,
  JSBI,
} from "@uniswap/sdk";
import ERC20_ABI from "./src/abis/ERC20_ABI.json";
import UNISWAP_ROUTER_ABI from "./src/abis/UNISWAP_ROUTER_ABI.json";

dotenv.config();

const rpc = `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`;

const provider = new providers.JsonRpcProvider(rpc);
const signer = new Wallet(process.env.EVM_PRIVATE_KEY, provider);

// const uniswapV2FactoryAddress = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";
const UNISWAP_V2ROUTER_ADDRESS = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
// const UNISWAP_V2_FACTORY_ABI =
//   '[{"inputs":[{"internalType":"address","name":"_feeToSetter","type":"address"}],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"token0","type":"address"},{"indexed":true,"internalType":"address","name":"token1","type":"address"},{"indexed":false,"internalType":"address","name":"pair","type":"address"},{"indexed":false,"internalType":"uint256","name":"","type":"uint256"}],"name":"PairCreated","type":"event"},{"constant":true,"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"allPairs","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"allPairsLength","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"tokenA","type":"address"},{"internalType":"address","name":"tokenB","type":"address"}],"name":"createPair","outputs":[{"internalType":"address","name":"pair","type":"address"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"feeTo","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"feeToSetter","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"address","name":"","type":"address"}],"name":"getPair","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"_feeTo","type":"address"}],"name":"setFeeTo","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"_feeToSetter","type":"address"}],"name":"setFeeToSetter","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"}]';

// const SEAN_ADDRESS = "0xA719CB79Af39A9C10eDA2755E0938bCE35e9DE24";
const SEAN_ADDRESS = "0xB8c77482e45F1F44dE1745F52C74426C631bDD52";
const USDT_ADDRESS = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

var task;

const fetchSeanUSDPair = async () => {
  console.log(
    `=================================================================`
  );
  console.log(`Current signer: ${signer.address}`);

  // const TokenA = new Token(3, USDT_ADDRESS, 6, "USDT", "Tether USD");
  const SEAN_Token = new Token(ChainId.MAINNET, SEAN_ADDRESS, 18);
  const USDT_Token = new Token(ChainId.MAINNET, USDT_ADDRESS, 6);
  const USDC_Token = new Token(ChainId.MAINNET, USDC_ADDRESS, 6);

  const USDT_USDC_PAIR = await Fetcher.fetchPairData(USDT_Token, USDC_Token);
  // console.log(USDT_USDC_PAIR);

  let SEAN_USDC_PAIR = null;
  try {
    SEAN_USDC_PAIR = await Fetcher.fetchPairData(SEAN_Token, USDC_Token);
  } catch (error) {
    console.log(`SEAN_USDC_PAIR not exist...`);
  }

  let SEAN_USDT_PAIR = null;
  try {
    SEAN_USDT_PAIR = await Fetcher.fetchPairData(SEAN_Token, USDT_Token);
  } catch (error) {
    console.log(`SEAN_USDT_PAIR not exist...`);
  }

  if (!SEAN_USDC_PAIR && !SEAN_USDT_PAIR) {
    console.log(`Pairs not exist...`);
    return;
  }

  let route = null;
  if (SEAN_USDC_PAIR) {
    route = new Route([SEAN_USDC_PAIR, USDT_USDC_PAIR], USDT_Token);
    console.log(route);
  }

  if (SEAN_USDT_PAIR) {
    route = new Route([SEAN_USDT_PAIR], USDT_Token);
    console.log(route);
  }

  const amountIn = ethers.utils.parseUnits("500", 6).toString(); //500 USD
  const trade = new Trade(
    route,
    new TokenAmount(USDT_Token, amountIn),
    TradeType.EXACT_INPUT
  );

  const slippageTolerance = new Percent("1000", "10000"); // 1000 bips, or 10%

  const amountOutMin = trade.minimumAmountOut(slippageTolerance).raw; // needs to be converted to e.g. hex
  console.log(trade.route.path);
  // route
  // const path = [
  //   SEAN_USDT_PAIR
  //     ? USDT_Token[SEAN_Token.chainId].address
  //     : USDC_Token[SEAN_Token.chainId].address,
  //   SEAN_Token.address,
  // ];
  const path = trade.route.path.map(({ address }) => address);
  const to = signer.address; // should be a checksummed recipient address
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes from the current Unix time
  const value = trade.inputAmount.raw; // // needs to be converted to e.g. hex

  // found a SEAN/USDT or SEAN/USDC pair
  if (trade) {
    await swap(amountIn, amountOutMin, path, to, deadline, value);
    task.stop();
  }
};

async function swap(
  amountIn: string,
  amountOutMin: JSBI,
  path: any[],
  to: string,
  deadline: number,
  value: JSBI
) {
  const uniswapRouter = new Contract(
    UNISWAP_V2ROUTER_ADDRESS,
    UNISWAP_ROUTER_ABI,
    signer
  );

  const usdt = new Contract(USDT_ADDRESS, ERC20_ABI, provider);

  console.log("Swapping on Uniswap...");
  let amounts: Array<Number>;
  try {
    amounts = await uniswapRouter.swapExactTokensForTokens(
      amountIn,
      amountOutMin,
      path,
      to,
      deadline,
      {
        value: value,
      }
    );
  } catch (error) {
    console.log(error);
  }
  console.log(`Swapped ${amounts[0]} for ${amounts[1]}`);

  const usdtBalance =
    (await usdt.balanceOf(signer.address)) / 10 ** (await usdt.decimals());
  console.log(`Signer USDT balance: ${usdtBalance} USDT`);
}

(async () => {
  await fetchSeanUSDPair();
  // task = cron.schedule("0-59/3 * * * * *", fetchSeanUSDPair);
  // task.start();
})();
