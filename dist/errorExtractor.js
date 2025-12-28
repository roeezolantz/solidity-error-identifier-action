"use strict";
/**
 * @fileoverview Error extraction from Solidity ABI JSON files
 * @module errorExtractor
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorExtractor = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Extracts custom error definitions from Solidity ABI JSON files
 *
 * @example
 * ```typescript
 * const errors = ErrorExtractor.extractErrorsFromAbi('./ACL.json');
 * console.log(errors[0].signature); // "PermissionInvalid_Expired()"
 * ```
 */
class ErrorExtractor {
    /**
     * Extract all error definitions from an ABI JSON file
     * @param abiPath - Path to the ABI JSON file
     * @returns Array of extracted errors with signatures
     */
    static extractErrorsFromAbi(abiPath) {
        if (!fs.existsSync(abiPath)) {
            throw new Error(`ABI file not found: ${abiPath}`);
        }
        const content = fs.readFileSync(abiPath, 'utf-8');
        const abi = JSON.parse(content);
        // Extract source contract name from ABI content or path
        // Priority: 1) contractName field, 2) sourceName field, 3) path-based extraction
        let sourceContract = 'Unknown';
        if (abi.contractName) {
            sourceContract = abi.contractName;
        }
        else if (abi.sourceName) {
            // Extract contract name from sourceName (e.g., "contracts/ACL.sol" -> "ACL.sol")
            sourceContract = path.basename(abi.sourceName);
        }
        else {
            // Fallback: extract from file path
            // Example: artifacts/.temp-sources/FHE.sol/Common.json -> FHE.sol
            const pathParts = abiPath.split(path.sep);
            const solFileIndex = pathParts.findIndex(p => p.endsWith('.sol'));
            if (solFileIndex >= 0) {
                sourceContract = pathParts[solFileIndex];
            }
        }
        const errors = abi.abi
            .filter((item) => item.type === 'error')
            .map((item) => {
            const inputs = item.inputs || [];
            const inputTypes = inputs.map((input) => input.type);
            const signature = `${item.name}(${inputTypes.join(',')})`;
            return {
                name: item.name,
                signature,
                inputs: inputs.map((i) => i.name),
                inputTypes,
                source: sourceContract,
            };
        });
        return errors;
    }
    /**
     * Extract errors from multiple ABI files
     * @param abiPaths - Array of ABI file paths
     * @returns Combined array of extracted errors
     */
    static extractErrorsFromMultiple(abiPaths) {
        const allErrors = [];
        const seen = new Set();
        for (const abiPath of abiPaths) {
            const errors = this.extractErrorsFromAbi(abiPath);
            for (const error of errors) {
                // Avoid duplicates based on signature
                if (!seen.has(error.signature)) {
                    allErrors.push(error);
                    seen.add(error.signature);
                }
            }
        }
        return allErrors;
    }
}
exports.ErrorExtractor = ErrorExtractor;
//# sourceMappingURL=errorExtractor.js.map