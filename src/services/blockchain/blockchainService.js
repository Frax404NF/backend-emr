const { ethers } = require("ethers");
const blockchainConfig = require("../../config/blockchain");
const { DIAGNOSTIC_TEST_HASH_ABI } = require("../../config/contractABI");

class BlockchainError extends Error {
  constructor(message, code = "BLOCKCHAIN_ERROR") {
    super(message);
    this.name = "BlockchainError";
    this.code = code;
  }
}

class BlockchainService {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.contract = null;
    this.initialized = false;
  }

  async initialize() {
    if (!blockchainConfig.enabled) {
      console.log("[BLOCKCHAIN] Blockchain integration disabled");
      return false;
    }

    try {
      this.provider = new ethers.JsonRpcProvider(blockchainConfig.rpcUrl);
      this.signer = new ethers.Wallet(
        blockchainConfig.privateKey,
        this.provider
      );
      this.contract = new ethers.Contract(
        blockchainConfig.contractAddress,
        DIAGNOSTIC_TEST_HASH_ABI,
        this.signer
      );

      // Test connection
      await this.provider.getNetwork();
      this.initialized = true;

      console.log("[BLOCKCHAIN] Successfully connected to blockchain");
      console.log(`[BLOCKCHAIN] Contract: ${blockchainConfig.contractAddress}`);
      console.log(`[BLOCKCHAIN] Signer: ${this.signer.address}`);

      return true;
    } catch (error) {
      console.error("[BLOCKCHAIN] Initialization failed:", error.message);
      this.initialized = false;
      return false;
    }
  }

  ensureInitialized() {
    if (!this.initialized) {
      throw new BlockchainError(
        "Blockchain service not initialized",
        "NOT_INITIALIZED"
      );
    }
  }

  stringToBytes32(str) {
    if (typeof str !== "string") {
      throw new BlockchainError("Hash must be a string", "INVALID_HASH_TYPE");
    }

    // Remove 0x prefix if present
    const cleanStr = str.startsWith("0x") ? str.slice(2) : str;

    // Validate hex string length (64 characters for SHA-256)
    if (cleanStr.length !== 64 || !/^[0-9a-fA-F]+$/.test(cleanStr)) {
      throw new BlockchainError(
        "Invalid hash format - must be 64 character hex string",
        "INVALID_HASH_FORMAT"
      );
    }

    return "0x" + cleanStr;
  }

  bytes32ToString(bytes32) {
    if (
      !bytes32 ||
      bytes32 ===
        "0x0000000000000000000000000000000000000000000000000000000000000000"
    ) {
      return null;
    }
    return bytes32.slice(2); // Remove 0x prefix
  }

  async executeWithRetry(operation, operationName) {
    let lastError;

    for (let attempt = 1; attempt <= blockchainConfig.maxRetries; attempt++) {
      try {
        const result = await Promise.race([
          operation(),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error("Operation timeout")),
              blockchainConfig.timeout
            )
          ),
        ]);

        if (attempt > 1) {
          console.log(
            `[BLOCKCHAIN] ${operationName} succeeded on attempt ${attempt}`
          );
        }

        return result;
      } catch (error) {
        lastError = error;
        console.warn(
          `[BLOCKCHAIN] ${operationName} failed (attempt ${attempt}/${blockchainConfig.maxRetries}):`,
          error.message
        );

        if (attempt < blockchainConfig.maxRetries) {
          await new Promise((resolve) =>
            setTimeout(resolve, blockchainConfig.retryDelay)
          );
        }
      }
    }

    throw new BlockchainError(
      `${operationName} failed after ${blockchainConfig.maxRetries} attempts: ${lastError.message}`,
      "OPERATION_FAILED"
    );
  }

  async storeHash(testId, hash) {
    this.ensureInitialized();

    if (!testId || testId <= 0) {
      throw new BlockchainError("Invalid test ID", "INVALID_TEST_ID");
    }

    const bytes32Hash = this.stringToBytes32(hash);

    return await this.executeWithRetry(async () => {
      console.log(`[BLOCKCHAIN] Storing hash for test ${testId}`);

      const tx = await this.contract.storeHash(testId, bytes32Hash, {
        gasLimit: blockchainConfig.gasLimit,
      });

      console.log(`[BLOCKCHAIN] Transaction sent: ${tx.hash}`);
      const receipt = await tx.wait();

      console.log(`[BLOCKCHAIN] Hash stored successfully for test ${testId}`);
      console.log(`[BLOCKCHAIN] Transaction hash: ${receipt.hash}`);
      console.log(`[BLOCKCHAIN] Gas used: ${receipt.gasUsed.toString()}`);

      return {
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
      };
    }, `Store hash for test ${testId}`);
  }


  async checkConnection() {
    if (!this.initialized) {
      return { connected: false, error: "Not initialized" };
    }

    try {
      const network = await this.provider.getNetwork();
      const balance = await this.provider.getBalance(this.signer.address);

      return {
        connected: true,
        network: {
          name: network.name,
          chainId: network.chainId.toString(),
        },
        signer: {
          address: this.signer.address,
          balance: ethers.formatEther(balance),
        },
        contract: blockchainConfig.contractAddress,
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message,
      };
    }
  }
}

// Singleton instance
const blockchainService = new BlockchainService();

module.exports = {
  BlockchainService,
  blockchainService,
  BlockchainError,
};
