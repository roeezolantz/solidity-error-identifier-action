/**
 * @fileoverview Error extraction from Solidity ABI JSON files
 * @module errorExtractor
 */

import * as fs from 'fs';
import * as path from 'path';

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
export class ErrorExtractor {
	/**
	 * Extract all error definitions from an ABI JSON file
	 * @param abiPath - Path to the ABI JSON file
	 * @returns Array of extracted errors with signatures
	 */
	static extractErrorsFromAbi(abiPath: string): ExtractedError[] {
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
		} else if (abi.sourceName) {
			// Extract contract name from sourceName (e.g., "contracts/ACL.sol" -> "ACL.sol")
			sourceContract = path.basename(abi.sourceName);
		} else {
			// Fallback: extract from file path
			// Example: artifacts/.temp-sources/FHE.sol/Common.json -> FHE.sol
			const pathParts = abiPath.split(path.sep);
			const solFileIndex = pathParts.findIndex(p => p.endsWith('.sol'));
			if (solFileIndex >= 0) {
				sourceContract = pathParts[solFileIndex];
			}
		}

		const errors = abi.abi
			.filter((item: any) => item.type === 'error')
			.map((item: AbiError) => {
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
	static extractErrorsFromMultiple(abiPaths: string[]): ExtractedError[] {
		const allErrors: ExtractedError[] = [];
		const seen = new Set<string>();

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
