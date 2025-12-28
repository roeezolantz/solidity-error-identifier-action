"use strict";
/**
 * @fileoverview Computes 4-byte error selectors using keccak256 hashing
 * @module errorSelector
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorSelector = void 0;
const ethers_1 = require("ethers");
/**
 * Computes and manages Solidity error selectors
 *
 * Error selectors are the first 4 bytes of the keccak256 hash of the error signature.
 * This follows the same convention as Solidity function selectors.
 *
 * @example
 * ```typescript
 * const selector = ErrorSelector.computeSelector("Transfer(address,address,uint256)");
 * console.log(selector); // "0xddf252ad"
 * ```
 */
class ErrorSelector {
    /**
     * Compute the 4-byte error selector from a function signature
     * Selector = first 4 bytes of keccak256(signature)
     *
     * @param signature - Full error signature, e.g., "Transfer(address,address,uint256)"
     * @returns 4-byte selector as hex string with 0x prefix
     */
    static computeSelector(signature) {
        const hash = (0, ethers_1.keccak256)((0, ethers_1.toUtf8Bytes)(signature));
        // Take first 8 characters after '0x' (4 bytes = 8 hex chars)
        return hash.slice(0, 10); // '0x' + 8 chars
    }
    /**
     * Normalize a selector to standard format
     * Accepts: '57bfc234', '0x57bfc234', etc.
     * Returns: '0x57bfc234'
     */
    static normalizeSelector(selector) {
        const hex = selector.toLowerCase().replace(/^0x/, '');
        if (hex.length !== 8) {
            throw new Error(`Invalid error selector: ${selector}. Must be 4 bytes (8 hex chars).`);
        }
        return `0x${hex}`;
    }
    /**
     * Add selectors to extracted errors
     */
    static addSelectors(errors) {
        return errors.map((error) => ({
            ...error,
            selector: this.computeSelector(error.signature),
        }));
    }
}
exports.ErrorSelector = ErrorSelector;
//# sourceMappingURL=errorSelector.js.map