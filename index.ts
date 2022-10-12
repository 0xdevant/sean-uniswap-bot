import { Contract, providers, Wallet } from "ethers";
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
} from "@uniswap/sdk";
import ERC20_ABI from "./src/abis/ERC20_ABI.json";

dotenv.config();

const rpc = `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`;

const provider = new providers.JsonRpcProvider(rpc);
const signer = new Wallet(process.env.EVM_PRIVATE_KEY, provider);

const uniswapV2FactoryAddress = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";
const UNISWAP_V2_FACTORY_ABI =
  '[{"inputs":[{"internalType":"address","name":"_feeToSetter","type":"address"}],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"token0","type":"address"},{"indexed":true,"internalType":"address","name":"token1","type":"address"},{"indexed":false,"internalType":"address","name":"pair","type":"address"},{"indexed":false,"internalType":"uint256","name":"","type":"uint256"}],"name":"PairCreated","type":"event"},{"constant":true,"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"allPairs","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"allPairsLength","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"tokenA","type":"address"},{"internalType":"address","name":"tokenB","type":"address"}],"name":"createPair","outputs":[{"internalType":"address","name":"pair","type":"address"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"feeTo","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"feeToSetter","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"address","name":"","type":"address"}],"name":"getPair","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"_feeTo","type":"address"}],"name":"setFeeTo","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"_feeToSetter","type":"address"}],"name":"setFeeToSetter","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"}]';

const SEAN_ADDRESS = "0xA719CB79Af39A9C10eDA2755E0938bCE35e9DE24";
const USDT_ADDRESS = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const execute = async () => {
  console.log(
    `=================================================================`
  );
  console.log(`Current signer: ${signer.address}`);
  // const factory = new Contract(
  //   uniswapV2FactoryAddress,
  //   UNISWAP_V2_FACTORY_ABI,
  //   provider
  // );

  // const usdt = new Contract(USDT_ADDRESS, ERC20_ABI, provider);

  // const TokenA = new Token(3, USDT_ADDRESS, 6, "USDT", "Tether USD");

  // const TokenB = new Token(3, SEAN_ADDRESS, 18, "SEAN", "Starfish Token");
  const TokenA = new Token(
    3,
    "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
    8,
    "WBTC",
    "Wrapped BTC"
  );
  const TokenB = new Token(
    3,
    "0x3F382DbD960E3a9bbCeaE22651E88158d2791550",
    18,
    "GHST",
    "Aavegotchi GHST Token"
  );

  const pair = new Pair(
    new TokenAmount(TokenB, "2000000000000000000"),
    new TokenAmount(TokenA, "1000000000000000000")
  );

  const route = new Route([pair], TokenA);
  console.log(route.pairs);
  console.log(route.path);

  const trade = new Trade(
    route,
    new TokenAmount(TokenA, "1000000000000000"),
    TradeType.EXACT_INPUT
  );

  const bestTrade = Trade.bestTradeExactIn(
    [pair],
    new TokenAmount(TokenA, "1000000000000000"),
    TokenB,
    { maxNumResults: 3, maxHops: 3 }
  );
  console.log(bestTrade.length);
  console.log(bestTrade[0].route);

  // const usdtBalance =
  //   (await usdt.balanceOf(signer.address)) / 10 ** (await usdt.decimals());
  // console.log(`Signer USDT balance: ${usdtBalance} USDT`);

  // const pair = await factory.getPair(SEAN_ADDRESS, USDT_ADDRESS);
  // console.log(pair);
  // if (pair === ZERO_ADDRESS) {
  //   return;
  // }
};

(async () => {
  cron.schedule("0-59/3 * * * * *", execute);
})();
