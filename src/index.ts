/**
 * @fileoverview Main entry point for Solidity Error Identifier GitHub Action
 */

import * as core from '@actions/core';
import * as fs from 'fs';
import * as path from 'path';
import { ErrorExtractor } from './errorExtractor';
import { ErrorSelector } from './errorSelector';
import { getAbiPaths } from './utils';
import { compile } from './compiler';
import { publishToNpm } from './npm-publisher';

async function run(): Promise<void> {
	try {
		const mode = core.getInput('mode') || 'abi';
		const outputPath = core.getInput('output_path') || 'errors.json';

		core.info('🔍 Solidity Error Identifier Action');
		core.info('=====================================');
		core.info(`Mode: ${mode}`);
		core.info('');

		let abiDirectories: string[] = [];

		// Handle different modes
		if (mode === 'compile') {
			// Compile mode: compile contracts first
			const contractPathsInput = core.getInput('contract_paths', { required: true });
			const compiler = (core.getInput('compiler') || 'hardhat') as 'hardhat' | 'foundry' | 'solc';
			const solidityVersion = core.getInput('solidity_version') || undefined;
			const compileArgs = core.getInput('compile_args') || undefined;
			const workingDirectory = core.getInput('working_directory') || undefined;

			const contractPaths = contractPathsInput.split(',').map(p => p.trim());

			// Compile contracts
			const compileResult = await compile({
				contractPaths,
				compiler,
				solidityVersion,
				compileArgs,
				workingDirectory
			});

			if (!compileResult.success) {
				core.setFailed(`Compilation failed: ${compileResult.errors?.join(', ')}`);
				return;
			}

			abiDirectories = compileResult.artifactPaths;
			core.info('');

		} else if (mode === 'abi') {
			// ABI mode: use existing ABIs
			const abiPathsInput = core.getInput('abi_paths', { required: true });
			abiDirectories = abiPathsInput.split(',').map(p => p.trim());

		} else {
			core.setFailed(`Invalid mode: ${mode}. Must be "abi" or "compile".`);
			return;
		}

		// Get all ABI file paths
		const abiPaths = getAbiPaths(abiDirectories.join(','));
		core.info(`📦 Found ${abiPaths.length} ABI files to process`);
		core.info('');

		if (abiPaths.length === 0) {
			core.warning('No ABI files found. Make sure contracts are compiled first.');
			return;
		}

		// Extract errors
		core.info('⚙️  Extracting errors from ABIs...');
		const extractedErrors = ErrorExtractor.extractErrorsFromMultiple(abiPaths);
		core.info(`✅ Extracted ${extractedErrors.length} unique errors`);
		core.info('');

		// Add selectors
		const errorsWithSelectors = ErrorSelector.addSelectors(extractedErrors);

		// Sort by selector
		errorsWithSelectors.sort((a, b) => a.selector.localeCompare(b.selector));

		// Write output file
		const outputFile = path.resolve(outputPath);
		fs.writeFileSync(outputFile, JSON.stringify(errorsWithSelectors, null, 2));
		core.info(`📝 Wrote error database to: ${outputFile}`);
		core.info('');

		// Group by source for statistics
		const errorsBySource = new Map<string, any[]>();
		errorsWithSelectors.forEach((err) => {
			const source = err.source || 'Unknown';
			if (!errorsBySource.has(source)) {
				errorsBySource.set(source, []);
			}
			errorsBySource.get(source)!.push(err);
		});

		// Print summary
		core.info('📊 Error Database Summary:');
		core.info('─────────────────────────');
		const sortedSources = Array.from(errorsBySource.keys()).sort();
		sortedSources.forEach((source) => {
			const errors = errorsBySource.get(source)!;
			core.info(`  ${source}: ${errors.length} error${errors.length !== 1 ? 's' : ''}`);
		});
		core.info('');
		core.info(`Total: ${errorsWithSelectors.length} errors from ${errorsBySource.size} contracts`);

		// Set outputs
		core.setOutput('errors_json', outputFile);
		core.setOutput('error_count', errorsWithSelectors.length);
		core.setOutput('errors_by_source', JSON.stringify(Object.fromEntries(errorsBySource)));

		// NPM Publishing (if enabled)
		const publishNpm = core.getInput('publish_npm') === 'true';
		if (publishNpm) {
			const npmPackageName = core.getInput('npm_package_name', { required: true });
			const useProvenance = core.getInput('npm_provenance') === 'true';
			const npmToken = core.getInput('npm_token') || undefined;
			const npmBinaryName = core.getInput('npm_binary_name') || undefined;
			const npmRegistry = core.getInput('npm_registry') || undefined;
			const packageVersion = core.getInput('package_version') || undefined;
			const packageDescription = core.getInput('package_description') || undefined;
			const packageKeywords = core.getInput('package_keywords') || undefined;

			// Validate: either provenance or token must be provided
			if (!useProvenance && !npmToken) {
				core.setFailed('Either npm_provenance must be enabled or npm_token must be provided');
				return;
			}

			core.info('');
			const publishResult = await publishToNpm({
				packageName: npmPackageName,
				binaryName: npmBinaryName,
				version: packageVersion,
				description: packageDescription,
				keywords: packageKeywords,
				errorsJson: outputFile,
				npmToken: npmToken,
				registry: npmRegistry,
				useProvenance: useProvenance
			});

			if (publishResult.success) {
				core.setOutput('npm_package_name', publishResult.packageName);
				core.setOutput('npm_package_version', publishResult.version);
			} else {
				core.setFailed(`NPM publishing failed: ${publishResult.error}`);
				return;
			}
		}

		core.info('');
		core.info('✨ Action completed successfully!');

	} catch (error) {
		if (error instanceof Error) {
			core.setFailed(error.message);
		} else {
			core.setFailed('Unknown error occurred');
		}
	}
}

run();
