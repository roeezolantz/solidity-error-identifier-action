/**
 * @fileoverview NPM package publisher for error database
 */

import * as core from '@actions/core';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

export interface PublishOptions {
	packageName: string;
	binaryName?: string;
	version?: string;
	description?: string;
	errorsJson: string;
	npmToken?: string; // Optional when using provenance/trusted publishing
	registry?: string;
	useProvenance?: boolean; // Enable NPM provenance (trusted publishing)
}

export interface PublishResult {
	success: boolean;
	packageName: string;
	version: string;
	error?: string;
}

/**
 * CLI template - minimal error lookup tool
 */
const CLI_TEMPLATE = `#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ERRORS_DB = require('./errors.json');

function findErrorBySelector(selector) {
	const normalized = selector.toLowerCase().replace(/^0x/, '');
	const fullSelector = '0x' + normalized;
	return ERRORS_DB.find(e => e.selector === fullSelector);
}

function searchByName(name) {
	const lowerName = name.toLowerCase();
	return ERRORS_DB.filter(e => e.name.toLowerCase().includes(lowerName));
}

function formatError(error) {
	const lines = [
		\`Name:      \${error.name}\`,
		\`Selector:  \${error.selector}\`,
		\`Signature: \${error.signature}\`
	];
	if (error.source) {
		lines.push(\`Source:    \${error.source}\`);
	}
	if (error.inputTypes.length > 0) {
		lines.push(\`Inputs:    \${error.inputTypes.join(', ')}\`);
	}
	return lines.join('\\n');
}

function printHelp(binName) {
	console.log(\`
Usage: \${binName} <selector>              Look up error by 4-byte selector
       \${binName} --name <name>           Search errors by name
       \${binName} --list                  List all known errors
       \${binName} --json <selector>       Output as JSON
       \${binName} --help                  Show this help

Examples:
  \${binName} 0x118cdaa7
  \${binName} --name Permission
  \${binName} --list
  \${binName} --json 0x118cdaa7
\`);
}

function main() {
	const args = process.argv.slice(2);
	const binName = path.basename(process.argv[1]);

	if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
		printHelp(binName);
		process.exit(0);
	}

	const isJson = args.includes('--json');

	// List all errors
	if (args.includes('--list')) {
		if (isJson) {
			console.log(JSON.stringify(ERRORS_DB, null, 2));
		} else {
			ERRORS_DB.forEach(err => {
				const source = err.source ? \` (\${err.source})\` : '';
				console.log(\`\${err.selector} \${err.name}\${source}\`);
			});
		}
		process.exit(0);
	}

	// Search by name
	const nameIndex = args.indexOf('--name');
	if (nameIndex !== -1 && nameIndex + 1 < args.length) {
		const searchTerm = args[nameIndex + 1];
		const results = searchByName(searchTerm);

		if (results.length === 0) {
			console.error(\`No errors found matching: \${searchTerm}\`);
			process.exit(1);
		}

		if (isJson) {
			console.log(JSON.stringify(results, null, 2));
		} else {
			results.forEach(err => {
				const source = err.source ? \` (\${err.source})\` : '';
				console.log(\`\${err.selector} \${err.name}\${source}\`);
			});
		}
		process.exit(0);
	}

	// Lookup by selector
	const selector = args.find(arg => !arg.startsWith('--'));
	if (!selector) {
		console.error('No selector provided');
		printHelp(binName);
		process.exit(1);
	}

	const error = findErrorBySelector(selector);
	if (!error) {
		console.error(\`Error not found for selector: \${selector}\`);
		console.error(\`Try '\${binName} --list' to see all known errors\`);
		process.exit(1);
	}

	if (isJson) {
		console.log(JSON.stringify(error, null, 2));
	} else {
		console.log(formatError(error));
	}
}

main();
`;

/**
 * Get current version from npm registry
 */
async function getCurrentVersion(packageName: string, registry: string): Promise<string | null> {
	try {
		const result = execSync(`npm view ${packageName} version --registry ${registry}`, {
			encoding: 'utf-8',
			stdio: 'pipe'
		});
		return result.trim();
	} catch (error) {
		// Package doesn't exist yet
		return null;
	}
}

/**
 * Increment version
 */
function incrementVersion(version: string): string {
	const parts = version.split('.');
	parts[2] = String(parseInt(parts[2]) + 1);
	return parts.join('.');
}

/**
 * Publish error database as npm package
 */
export async function publishToNpm(options: PublishOptions): Promise<PublishResult> {
	const packageDir = path.join(process.cwd(), '.npm-package-temp');

	try {
		core.info('📦 Publishing to NPM...');
		core.info('');

		// Clean and create package directory
		if (fs.existsSync(packageDir)) {
			fs.rmSync(packageDir, { recursive: true });
		}
		fs.mkdirSync(packageDir, { recursive: true });

		// Determine version
		let version = options.version;
		if (!version) {
			const currentVersion = await getCurrentVersion(options.packageName, options.registry || 'https://registry.npmjs.org/');
			if (currentVersion) {
				version = incrementVersion(currentVersion);
				core.info(`Auto-incrementing version: ${currentVersion} → ${version}`);
			} else {
				version = '1.0.0';
				core.info(`New package - starting at version ${version}`);
			}
		}

		// Determine binary name
		const binaryName = options.binaryName || options.packageName.replace(/^@[^/]+\//, '');

		// Get repository information from GitHub Actions environment
		const githubRepository = process.env.GITHUB_REPOSITORY; // e.g., "owner/repo"
		const repositoryUrl = githubRepository
			? `https://github.com/${githubRepository}`
			: undefined;

		// Create package.json
		const packageJson: any = {
			name: options.packageName,
			version: version,
			description: options.description || 'Error decoder for Solidity smart contracts',
			main: 'cli.js',
			bin: {
				[binaryName]: './cli.js'
			},
			files: [
				'cli.js',
				'errors.json',
				'README.md'
			],
			keywords: [
				'solidity',
				'ethereum',
				'errors',
				'smart-contracts',
				'blockchain',
				'decoder'
			],
			publishConfig: {
				access: 'public',
				registry: options.registry || 'https://registry.npmjs.org/'
			}
		};

		// Add repository field for provenance (required for npm publish --provenance)
		if (repositoryUrl) {
			packageJson.repository = {
				type: 'git',
				url: `git+${repositoryUrl}.git`
			};
		}

		fs.writeFileSync(
			path.join(packageDir, 'package.json'),
			JSON.stringify(packageJson, null, 2)
		);

		// Copy errors.json
		fs.copyFileSync(options.errorsJson, path.join(packageDir, 'errors.json'));

		// Read errors for README
		const errorsData = JSON.parse(fs.readFileSync(options.errorsJson, 'utf-8'));
		const errorsBySource = new Map<string, any[]>();
		errorsData.forEach((err: any) => {
			const source = err.source || 'Unknown';
			if (!errorsBySource.has(source)) {
				errorsBySource.set(source, []);
			}
			errorsBySource.get(source)!.push(err);
		});

		// Generate error summary
		let errorSummary = '';
		const sortedSources = Array.from(errorsBySource.keys()).sort();
		sortedSources.forEach((source) => {
			const errors = errorsBySource.get(source)!;
			errorSummary += `- **${source}**: ${errors.length} error${errors.length !== 1 ? 's' : ''}\n`;
		});

		// Generate unified error table with contract column
		let errorTable = '\n| Selector | Name | Contract | Signature |\n';
		errorTable += '|----------|------|----------|--------|\n';
		errorsData.forEach((err: any) => {
			const source = err.source || 'Unknown';
			errorTable += `| \`${err.selector}\` | ${err.name} | ${source} | \`${err.signature}\` |\n`;
		});

		// Create CLI
		fs.writeFileSync(path.join(packageDir, 'cli.js'), CLI_TEMPLATE);
		fs.chmodSync(path.join(packageDir, 'cli.js'), '755');

		// Create README
		const readme = `# ${options.packageName}

Error decoder for Solidity smart contracts.

## Installation

\`\`\`bash
npm install ${options.packageName}
\`\`\`

## Usage

\`\`\`bash
# Look up error by selector
npx ${binaryName} 0x118cdaa7

# Search by name
npx ${binaryName} --name Permission

# List all errors
npx ${binaryName} --list

# Get JSON output
npx ${binaryName} --json 0x118cdaa7
\`\`\`

## Error Database

This package contains **${errorsData.length} error${errorsData.length !== 1 ? 's' : ''}** from **${errorsBySource.size} contract${errorsBySource.size !== 1 ? 's' : ''}**:

${errorSummary}
## All Errors
${errorTable}
## Generated by

This package was automatically generated using [solidity-error-identifier-action](https://github.com/FhenixProtocol/solidity-error-identifier-action).

Version: ${version}
`;

		fs.writeFileSync(path.join(packageDir, 'README.md'), readme);

		// Configure npm registry and auth
		const npmrcPath = path.join(packageDir, '.npmrc');
		const registryUrl = options.registry || 'https://registry.npmjs.org/';
		const registryHost = new URL(registryUrl).host;

		if (options.npmToken) {
			// Use provided token
			fs.writeFileSync(npmrcPath, `//${registryHost}/:_authToken=\${NPM_TOKEN}\n`);
		} else if (options.useProvenance) {
			// When using NPM Trusted Publishers with OIDC (no token provided)
			core.info('Using NPM Trusted Publishers with GitHub Actions OIDC');

			// Check if we have OIDC environment variables
			if (!process.env.ACTIONS_ID_TOKEN_REQUEST_URL || !process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN) {
				throw new Error('GitHub Actions OIDC is not available. Make sure "id-token: write" permission is set in the workflow.');
			}

			core.info('GitHub Actions OIDC environment detected');
			core.info('npm will automatically use OIDC for authentication via --provenance flag');

			// Don't create .npmrc - let npm handle OIDC automatically
			// When --provenance is used, npm will automatically detect GitHub Actions
			// and use OIDC for authentication
		}

		core.info(`Publishing ${options.packageName}@${version}...`);
		if (options.useProvenance) {
			core.info('Using NPM Provenance (Trusted Publishing)');
		}
		core.info('');

		// Publish with optional provenance
		const publishFlags = ['--access public'];
		if (options.useProvenance) {
			publishFlags.push('--provenance');
		}

		// Prepare environment with auth token
		const publishEnv: NodeJS.ProcessEnv = {
			...process.env
		};

		if (options.npmToken) {
			publishEnv.NPM_TOKEN = options.npmToken;
		}
		// NPM_OIDC_TOKEN is already in process.env if OIDC was used

		execSync(`npm publish ${publishFlags.join(' ')}`, {
			cwd: packageDir,
			stdio: 'inherit',
			env: publishEnv
		});

		core.info('');
		core.info(`✅ Published ${options.packageName}@${version}`);
		core.info('');
		core.info('Users can now run:');
		core.info(`  npm install ${options.packageName}`);
		core.info(`  npx ${binaryName} --help`);

		return {
			success: true,
			packageName: options.packageName,
			version: version
		};

	} catch (error) {
		core.error(`NPM publish failed: ${error}`);
		return {
			success: false,
			packageName: options.packageName,
			version: '0.0.0',
			error: String(error)
		};
	} finally {
		// Clean up (unless in test mode)
		if (process.env.TEST_MODE !== 'true' && fs.existsSync(packageDir)) {
			fs.rmSync(packageDir, { recursive: true });
		} else if (process.env.TEST_MODE === 'true') {
			core.info(`📁 Test mode: Preserving ${packageDir} for inspection`);
		}
	}
}
