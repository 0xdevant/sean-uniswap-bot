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
  Router,
} from "@uniswap/sdk";
import ERC20_ABI from "./src/abis/ERC20_ABI.json";
import UNISWAP_ROUTER_ABI from "./src/abis/UNISWAP_ROUTER_ABI.json";

dotenv.config();

const rpc = `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`;

const provider = ethers.getDefaultProvider(); //new providers.JsonRpcProvider(rpc);
const signer = new Wallet(process.env.EVM_PRIVATE_KEY, provider);

// const uniswapV2FactoryAddress = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";
const UNISWAP_V2ROUTER_ADDRESS = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
// const UNISWAP_V2_FACTORY_ABI =
//   '[{"inputs":[{"internalType":"address","name":"_feeToSetter","type":"address"}],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"token0","type":"address"},{"indexed":true,"internalType":"address","name":"token1","type":"address"},{"indexed":false,"internalType":"address","name":"pair","type":"address"},{"indexed":false,"internalType":"uint256","name":"","type":"uint256"}],"name":"PairCreated","type":"event"},{"constant":true,"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"allPairs","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"allPairsLength","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"tokenA","type":"address"},{"internalType":"address","name":"tokenB","type":"address"}],"name":"createPair","outputs":[{"internalType":"address","name":"pair","type":"address"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"feeTo","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"feeToSetter","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"address","name":"","type":"address"}],"name":"getPair","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"_feeTo","type":"address"}],"name":"setFeeTo","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"_feeToSetter","type":"address"}],"name":"setFeeToSetter","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"}]';

const SEAN_ADDRESS = "0xA719CB79Af39A9C10eDA2755E0938bCE35e9DE24";
const DAI_ADDRESS = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const uniswapRouter = new Contract(
  UNISWAP_V2ROUTER_ADDRESS,
  UNISWAP_ROUTER_ABI,
  signer
);
const usdc = new Contract(USDC_ADDRESS, ERC20_ABI, signer);

var task;

const fetchSeanUSDPair = async () => {
  console.log(
    `=================================================================`
  );
  console.log(`Current signer: ${signer.address}`);

  const SEAN_Token = new Token(ChainId.MAINNET, DAI_ADDRESS, 18);
  const USDC_Token = new Token(ChainId.MAINNET, USDC_ADDRESS, 6);

  // const USDT_USDC_PAIR = await Fetcher.fetchPairData(USDT_Token, USDC_Token);
  // console.log(USDT_USDC_PAIR);

  let SEAN_USDC_PAIR = null;
  try {
    SEAN_USDC_PAIR = await Fetcher.fetchPairData(SEAN_Token, USDC_Token);
  } catch (error) {
    console.log(`SEAN_USDC_PAIR not exist...`);
  }

  // let SEAN_USDT_PAIR = null;
  // try {
  //   SEAN_USDT_PAIR = await Fetcher.fetchPairData(SEAN_Token, USDT_Token);
  // } catch (error) {
  //   console.log(`DAI_USDT_PAIR not exist...`);
  // }

  // if (!SEAN_USDC_PAIR && !SEAN_USDT_PAIR) {
  if (!SEAN_USDC_PAIR) {
    console.log(`Pairs not exist...`);
    return;
  }

  let route: Route = null;
  if (SEAN_USDC_PAIR) {
    console.log("Choosing SEAN-USDC...");
    route = new Route([SEAN_USDC_PAIR], USDC_Token);
  }

  // if (SEAN_USDT_PAIR) {
  //   console.log("Choosing SEAN-USDT...");
  //   route = new Route([SEAN_USDT_PAIR], USDT_Token);
  // }

  // const amountIn = ethers.utils.parseUnits("5", 6).toString(); //10 USD
  const amountIn = await usdc.balanceOf(signer.address); //10 USD
  await usdc.connect(signer).approve(uniswapRouter.address, amountIn);
  const trade = new Trade(
    route,
    new TokenAmount(USDC_Token, amountIn),
    TradeType.EXACT_INPUT
  );

  // console.log(trade.executionPrice);
  const slippageTolerance = new Percent("5", "10000"); // 1000 bips, or 0.05%

  const { methodName, args, value } = Router.swapCallParameters(trade, {
    allowedSlippage: slippageTolerance,
    recipient: signer.address,
    ttl: Math.floor(Date.now() / 1000) + 60 * 20,
  });

  const midPrice = Number(route.midPrice.toSignificant(6));
  console.log(`Current mid price: ${midPrice}`);
  if (midPrice < 1.333) {
    console.log({ methodName, args, value });
    const gasPrice = await provider.getGasPrice();
    // const gasPrice = await provider.getGas();
    const result = await uniswapRouter[methodName](...args, {
      value,
      gasPrice,
      gasLimit: 210000,
    });
    console.log("Done!!! Here is the result:");
    console.log(result);
    // await swap(amountIn, amountOutMin, path, to, deadline);
    // task.stop();
  }
};

(async () => {
  await fetchSeanUSDPair();
  // task = cron.schedule("0-59/3 * * * * *", fetchSeanUSDPair);
  // task.start();
})();

// async function swap(
//   amountIn: string,
//   amountOutMin: JSBI,
//   path: any[],
//   to: string,
//   deadline: number
//   // value: JSBI
// ) {
//   const usdt = new Contract(USDT_ADDRESS, ERC20_ABI, provider);

//   await usdt
//     .connect(signer)
//     .approve(uniswapRouter.address, ethers.utils.parseUnits("10", 10));

//   console.log("Swapping on Uniswap...");
//   let amounts: Array<Number>;
//   try {
//     amounts = await uniswapRouter.swapExactTokensForTokens(
//       amountIn,
//       amountOutMin,
//       path,
//       to,
//       deadline,
//       { gasLimit: 5000000 }
//       // {
//       //   value,
//       // }
//     );
//   } catch (error) {
//     console.log(error);
//   }
//   console.log(`Swapped ${amounts[0]} for ${amounts[1]}`);

//   const usdtBalance =
//     (await usdt.balanceOf(signer.address)) / 10 ** (await usdt.decimals());
//   console.log(`Signer USDT balance: ${usdtBalance} USDT`);
// }
