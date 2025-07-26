const { blockchainService } = require("./blockchainService");

let initializationPromise = null;

async function initializeBlockchain() {
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = blockchainService.initialize();
  return initializationPromise;
}

function getBlockchainService() {
  return blockchainService;
}

async function isBlockchainAvailable() {
  try {
    await initializeBlockchain();
    return blockchainService.initialized;
  } catch (error) {
    console.warn("[BLOCKCHAIN] Service unavailable:", error.message);
    return false;
  }
}

module.exports = {
  initializeBlockchain,
  getBlockchainService,
  isBlockchainAvailable,
};
