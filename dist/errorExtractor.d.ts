/**
 * @fileoverview Error extraction from Solidity ABI JSON files
 * @module errorExtractor
 */
/**
 * Represents an error definition from a Solidity ABI
 */
export interface AbiError {
    /** Error name */
    name: string;
    /** Error input parameters */
    inputs: Array<{
        /** Solidity internal type (e.g., "address", "uint256") */
        internalType: string;
        /** Parameter name */
        name: string;
        /** Canonical type (e.g., "address", "uint256") */
        type: string;
    }>;
}
/**
 * Represents an extracted error with computed signature
 */
export interface ExtractedError {
    /** Error name */
    name: string;
    /** Full error signature (e.g., "Transfer(address,address,uint256)") */
    signature: string;
    /** Parameter names */
    inputs: string[];
    /** Parameter types */
    inputTypes: string[];
    /** Source contract file path (optional, for tracking origin) */
    source?: string;
}
/**
 * Extracts custom error definitions from Solidity ABI JSON files
 *
 * @example
 * ```typescript
 * const errors = ErrorExtractor.extractErrorsFromAbi('./ACL.json');
 * console.log(errors[0].signature); // "PermissionInvalid_Expired()"
 * ```
 */
export declare class ErrorExtractor {
    /**
     * Extract all error definitions from an ABI JSON file
     * @param abiPath - Path to the ABI JSON file
     * @returns Array of extracted errors with signatures
     */
    static extractErrorsFromAbi(abiPath: string): ExtractedError[];
    /**
     * Extract errors from multiple ABI files
     * @param abiPaths - Array of ABI file paths
     * @returns Combined array of extracted errors
     */
    static extractErrorsFromMultiple(abiPaths: string[]): ExtractedError[];
}
//# sourceMappingURL=errorExtractor.d.ts.map