/**
 * @fileoverview Utility functions for GitHub Action
 */
/**
 * Recursively scan directory for ABI JSON files
 * @param dir Directory to scan
 * @returns Array of absolute paths to valid ABI files
 */
export declare function scanAbiDirectory(dir: string): string[];
/**
 * Get ABI paths from comma-separated input
 * @param abiPathsInput Comma-separated list of directories
 * @returns Array of all ABI file paths found
 */
export declare function getAbiPaths(abiPathsInput: string): string[];
//# sourceMappingURL=utils.d.ts.map