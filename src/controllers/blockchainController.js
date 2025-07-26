const {
  getBlockchainService,
  isBlockchainAvailable,
} = require("../services/blockchain");
const { successResponse, errorResponse } = require("../utils/response");

const ERROR_CODES = {
  VERIFICATION_FAILED: "VERIFICATION_FAILED",
};

// ==================== BLOCKCHAIN CONTROLLER ====================
class BlockchainController {
  static async getStatus(req, res) {
    try {
      const isAvailable = await isBlockchainAvailable();

      if (!isAvailable) {
        return successResponse(res, {
          connected: false,
          message: "Blockchain service is not available",
          hash_approach: "medical_data_only",
        });
      }

      const blockchainService = getBlockchainService();
      const status = await blockchainService.checkConnection();

      return successResponse(res, {
        ...status,
        hash_approach: "medical_data_only",
        excluded_from_hash: ["status", "audit_fields", "blockchain_fields"],
      });
    } catch (error) {
      console.error("[BLOCKCHAIN_CONTROLLER] Status check failed:", error);
      return errorResponse(
        res,
        "Failed to check blockchain status",
        500,
        ERROR_CODES.VERIFICATION_FAILED
      );
    }
  }
}

module.exports = BlockchainController;