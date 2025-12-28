/**
 * @fileoverview Utility functions for GitHub Action
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Recursively scan directory for ABI JSON files
 * @param dir Directory to scan
 * @returns Array of absolute paths to valid ABI files
 */
export function scanAbiDirectory(dir: string): string[] {
	if (!fs.existsSync(dir)) {
		console.warn(`Warning: Directory not found: ${dir}`);
		return [];
	}

	const results: string[] = [];
	const items = fs.readdirSync(dir);

	for (const item of items) {
		const fullPath = path.join(dir, item);
		const stat = fs.statSync(fullPath);

		if (stat.isDirectory()) {
			results.push(...scanAbiDirectory(fullPath));
		} else if (item.endsWith('.json') && !item.endsWith('.dbg.json')) {
			// Verify it's a valid ABI file by checking for "abi" field
			try {
				const content = fs.readFileSync(fullPath, 'utf-8');
				const json = JSON.parse(content);
				if (json.abi && Array.isArray(json.abi)) {
					results.push(fullPath);
				}
			} catch (error) {
				console.warn(`Warning: Failed to parse ${fullPath}, skipping`);
			}
		}
	}

	return results;
}

/**
 * Get ABI paths from comma-separated input
 * @param abiPathsInput Comma-separated list of directories
 * @returns Array of all ABI file paths found
 */
export function getAbiPaths(abiPathsInput: string): string[] {
	const directories = abiPathsInput.split(',').map(p => p.trim());
	const allPaths: string[] = [];

	for (const dir of directories) {
		const absoluteDir = path.resolve(dir);
		console.log(`Scanning directory: ${absoluteDir}`);
		const paths = scanAbiDirectory(absoluteDir);
		console.log(`Found ${paths.length} ABI files in ${dir}`);
		allPaths.push(...paths);
	}

	return allPaths;
}
