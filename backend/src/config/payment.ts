/**
 * Payment Configuration for x402
 *
 * Configures pay-per-query payments using USDC on Base Sepolia testnet.
 * The x402 facilitator officially supports Base Sepolia for the "exact" scheme.
 * See: https://docs.cdp.coinbase.com/x402/quickstart-for-sellers
 */

export const PAYMENT_CONFIG = {
  // Network: Base Sepolia testnet (CAIP-2 format) - supported by x402 facilitator
  network: 'eip155:84532',

  // x402 facilitator for testnet
  facilitatorUrl: 'https://x402.org/facilitator',

  // USDC token address on Base Sepolia
  // See: https://developers.circle.com/stablecoins/docs/usdc-on-testing-networks
  usdcAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',

  // Default price per query (can be overridden via env)
  defaultPrice: '$0.01',
};

/**
 * Get the payment wallet address from environment
 */
export function getPaymentWallet(): string {
  const wallet = process.env.PAYMENT_WALLET_ADDRESS;
  if (!wallet) {
    throw new Error('PAYMENT_WALLET_ADDRESS environment variable is required');
  }
  return wallet;
}

/**
 * Get the price per query from environment or use default
 */
export function getQueryPrice(): string {
  return process.env.X402_PRICE || PAYMENT_CONFIG.defaultPrice;
}
