import { P as PayController, A as AppKitPayError, a as AppKitPayErrorCodes } from "./index-CNGtVqwE.js";
import { b, c, W } from "./index-CNGtVqwE.js";
import "./walletconnect-BVoLvI4P.js";
import "./index-73GArslZ.js";
import "./index-5878y4Sm.js";
import "./if-defined-DpCpmSxP.js";
import "./index-Bag94m_F.js";
import "./index-DAKl5XGv.js";
import "./index-W8RzVVH7.js";
import "./index-SiM7Ib3-.js";
import "./index-B80WMNJI.js";
import "./index-FTJ7N_Mw.js";
import "./index-Cztg-IpD.js";
import "./index-Cm7UDlkl.js";
import "./index-B9aMMm-V.js";
import "./index-xvpTmtDJ.js";
import "./MathUtil-BspOY7Kj.js";
const PAYMENT_TIMEOUT_MS = 3e5;
async function openPay(options) {
  return PayController.handleOpenPay(options);
}
async function pay(options, timeoutMs = PAYMENT_TIMEOUT_MS) {
  if (timeoutMs <= 0) {
    throw new AppKitPayError(AppKitPayErrorCodes.INVALID_PAYMENT_CONFIG, "Timeout must be greater than 0");
  }
  try {
    await openPay(options);
  } catch (error) {
    if (error instanceof AppKitPayError) {
      throw error;
    }
    throw new AppKitPayError(AppKitPayErrorCodes.UNABLE_TO_INITIATE_PAYMENT, error.message);
  }
  return new Promise((resolve, reject) => {
    let isSettled = false;
    const timeoutId = setTimeout(() => {
      if (isSettled) {
        return;
      }
      isSettled = true;
      cleanup();
      reject(new AppKitPayError(AppKitPayErrorCodes.GENERIC_PAYMENT_ERROR, "Payment timeout"));
    }, timeoutMs);
    function checkAndResolve() {
      if (isSettled) {
        return;
      }
      const currentPayment = PayController.state.currentPayment;
      const error = PayController.state.error;
      const isInProgress = PayController.state.isPaymentInProgress;
      if (currentPayment?.status === "SUCCESS") {
        isSettled = true;
        cleanup();
        clearTimeout(timeoutId);
        resolve({
          success: true,
          result: currentPayment.result
        });
        return;
      }
      if (currentPayment?.status === "FAILED") {
        isSettled = true;
        cleanup();
        clearTimeout(timeoutId);
        resolve({
          success: false,
          error: error || "Payment failed"
        });
        return;
      }
      if (error && !isInProgress && !currentPayment) {
        isSettled = true;
        cleanup();
        clearTimeout(timeoutId);
        resolve({
          success: false,
          error
        });
      }
    }
    const unsubscribePayment = subscribeStateKey("currentPayment", checkAndResolve);
    const unsubscribeError = subscribeStateKey("error", checkAndResolve);
    const unsubscribeProgress = subscribeStateKey("isPaymentInProgress", checkAndResolve);
    const cleanup = createCleanupHandler([
      unsubscribePayment,
      unsubscribeError,
      unsubscribeProgress
    ]);
    checkAndResolve();
  });
}
function getExchanges() {
  return PayController.getExchanges();
}
function getPayResult() {
  return PayController.state.currentPayment?.result;
}
function getPayError() {
  return PayController.state.error;
}
function getIsPaymentInProgress() {
  return PayController.state.isPaymentInProgress;
}
function subscribeStateKey(key, callback) {
  return PayController.subscribeKey(key, callback);
}
function createCleanupHandler(unsubscribeFunctions) {
  return () => {
    unsubscribeFunctions.forEach((unsubscribe) => {
      try {
        unsubscribe();
      } catch {
      }
    });
  };
}
const baseETH = {
  network: "eip155:8453",
  asset: "native",
  metadata: {
    name: "Ethereum",
    symbol: "ETH",
    decimals: 18
  }
};
const baseUSDC = {
  network: "eip155:8453",
  asset: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
  metadata: {
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6
  }
};
const baseSepoliaETH = {
  network: "eip155:84532",
  asset: "native",
  metadata: {
    name: "Ethereum",
    symbol: "ETH",
    decimals: 18
  }
};
const ethereumUSDC = {
  network: "eip155:1",
  asset: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  metadata: {
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6
  }
};
const optimismUSDC = {
  network: "eip155:10",
  asset: "0x0b2c639c533813f4aa9d7837caf62653d097ff85",
  metadata: {
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6
  }
};
const arbitrumUSDC = {
  network: "eip155:42161",
  asset: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  metadata: {
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6
  }
};
const polygonUSDC = {
  network: "eip155:137",
  asset: "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359",
  metadata: {
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6
  }
};
const solanaUSDC = {
  network: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
  asset: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  metadata: {
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6
  }
};
const ethereumUSDT = {
  network: "eip155:1",
  asset: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  metadata: {
    name: "Tether USD",
    symbol: "USDT",
    decimals: 6
  }
};
const optimismUSDT = {
  network: "eip155:10",
  asset: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
  metadata: {
    name: "Tether USD",
    symbol: "USDT",
    decimals: 6
  }
};
const arbitrumUSDT = {
  network: "eip155:42161",
  asset: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
  metadata: {
    name: "Tether USD",
    symbol: "USDT",
    decimals: 6
  }
};
const polygonUSDT = {
  network: "eip155:137",
  asset: "0xc2132d05d31c914a87c6611c10748aeb04b58e8f",
  metadata: {
    name: "Tether USD",
    symbol: "USDT",
    decimals: 6
  }
};
const solanaUSDT = {
  network: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
  asset: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  metadata: {
    name: "Tether USD",
    symbol: "USDT",
    decimals: 6
  }
};
const solanaSOL = {
  network: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
  asset: "native",
  metadata: {
    name: "Solana",
    symbol: "SOL",
    decimals: 9
  }
};
export {
  PayController,
  b as W3mPayLoadingView,
  c as W3mPayQuoteView,
  W as W3mPayView,
  arbitrumUSDC,
  arbitrumUSDT,
  baseETH,
  baseSepoliaETH,
  baseUSDC,
  ethereumUSDC,
  ethereumUSDT,
  getExchanges,
  getIsPaymentInProgress,
  getPayError,
  getPayResult,
  openPay,
  optimismUSDC,
  optimismUSDT,
  pay,
  polygonUSDC,
  polygonUSDT,
  solanaSOL,
  solanaUSDC,
  solanaUSDT
};
