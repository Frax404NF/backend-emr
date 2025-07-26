require("dotenv").config();

const blockchainConfig = {
  rpcUrl: process.env.BLOCKCHAIN_RPC_URL || "http://127.0.0.1:8545",
  contractAddress: process.env.CONTRACT_ADDRESS,
  privateKey: process.env.BLOCKCHAIN_PRIVATE_KEY,
  enabled: process.env.BLOCKCHAIN_ENABLED === "true",
  timeout: parseInt(process.env.BLOCKCHAIN_TIMEOUT) || 30000,
  gasLimit: 100000,
  maxRetries: 3,
  retryDelay: 2000,
};

// Validation
const requiredFields = ["contractAddress", "privateKey"];
const missingFields = requiredFields.filter(
  (field) => !blockchainConfig[field]
);

if (blockchainConfig.enabled && missingFields.length > 0) {
  console.error(
    `[BLOCKCHAIN] Missing required config: ${missingFields.join(", ")}`
  );
  blockchainConfig.enabled = false;
}

module.exports = blockchainConfig;
