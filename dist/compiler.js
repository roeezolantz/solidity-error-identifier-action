"use strict";
/**
 * @fileoverview Compiler utilities for compiling Solidity contracts
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
exports.compile = compile;
const core = __importStar(require("@actions/core"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
/**
 * Detect Solidity version from contract files
 */
function detectSolidityVersion(contractPath) {
    const content = fs.readFileSync(contractPath, 'utf-8');
    const pragmaMatch = content.match(/pragma solidity\s+([^;]+);/);
    if (pragmaMatch) {
        // Extract version like "^0.8.0" or "0.8.25"
        const version = pragmaMatch[1].replace(/[\^~>=<\s]/g, '');
        return version;
    }
    return null;
}
/**
 * Create a minimal hardhat config for standalone compilation
 */
function createHardhatConfig(solidityVersion, outputDir) {
    return `
module.exports = {
  solidity: {
    version: "${solidityVersion}",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  paths: {
    sources: "./.temp-contracts",
    artifacts: "${outputDir}"
  }
};
`;
}
/**
 * Compile contracts using Hardhat
 */
async function compileWithHardhat(options) {
    core.info('📦 Compiling with Hardhat...');
    // If working directory is provided, use existing config
    if (options.workingDirectory) {
        const workDir = path.resolve(options.workingDirectory);
        core.info(`Using existing Hardhat config in: ${workDir}`);
        try {
            // Find hardhat config
            const configFiles = ['hardhat.config.ts', 'hardhat.config.js'];
            let configPath = null;
            for (const configFile of configFiles) {
                const fullPath = path.join(workDir, configFile);
                if (fs.existsSync(fullPath)) {
                    configPath = fullPath;
                    core.info(`Found config: ${configFile}`);
                    break;
                }
            }
            if (!configPath) {
                throw new Error(`No hardhat.config.ts or hardhat.config.js found in ${workDir}`);
            }
            // Check if dependencies are installed
            const nodeModulesPath = path.join(workDir, 'node_modules');
            if (!fs.existsSync(nodeModulesPath)) {
                core.info('Installing dependencies...');
                (0, child_process_1.execSync)('npm install', { cwd: workDir, stdio: 'inherit' });
            }
            // Compile using existing config
            core.info('Running Hardhat compile...');
            const compileCmd = `npx hardhat compile ${options.compileArgs || ''}`;
            (0, child_process_1.execSync)(compileCmd, { cwd: workDir, stdio: 'inherit' });
            // Find artifacts directory from config
            const artifactsDir = path.join(workDir, 'artifacts');
            if (!fs.existsSync(artifactsDir)) {
                throw new Error(`Artifacts directory not found at ${artifactsDir}`);
            }
            core.info(`✅ Compiled successfully using existing config.`);
            return {
                artifactPaths: [artifactsDir],
                success: true
            };
        }
        catch (error) {
            core.error(`Compilation failed: ${error}`);
            return {
                artifactPaths: [],
                success: false,
                errors: [String(error)]
            };
        }
    }
    // Otherwise, use temp config approach (original behavior)
    // Detect or use provided Solidity version
    let solidityVersion = options.solidityVersion;
    if (!solidityVersion && options.contractPaths.length > 0) {
        const firstContract = options.contractPaths.find(p => p.endsWith('.sol'));
        if (firstContract) {
            solidityVersion = detectSolidityVersion(firstContract) || '0.8.25';
        }
        else {
            solidityVersion = '0.8.25';
        }
    }
    core.info(`Using Solidity version: ${solidityVersion}`);
    // Create temporary directory for contracts
    const tempDir = path.join(process.cwd(), '.temp-contracts');
    const artifactsDir = path.join(process.cwd(), '.temp-artifacts');
    try {
        // Create temp directories
        fs.mkdirSync(tempDir, { recursive: true });
        fs.mkdirSync(artifactsDir, { recursive: true });
        // Copy contracts to temp directory
        for (const contractPath of options.contractPaths) {
            const resolved = path.resolve(contractPath);
            if (fs.statSync(resolved).isDirectory()) {
                // Copy all .sol files from directory
                const solFiles = fs.readdirSync(resolved).filter(f => f.endsWith('.sol'));
                for (const file of solFiles) {
                    const srcPath = path.join(resolved, file);
                    const destPath = path.join(tempDir, file);
                    fs.copyFileSync(srcPath, destPath);
                    core.info(`  Copied: ${file}`);
                }
            }
            else {
                // Copy single file
                const fileName = path.basename(resolved);
                const destPath = path.join(tempDir, fileName);
                fs.copyFileSync(resolved, destPath);
                core.info(`  Copied: ${fileName}`);
            }
        }
        // Create hardhat config
        const configPath = path.join(process.cwd(), 'hardhat.temp.config.js');
        fs.writeFileSync(configPath, createHardhatConfig(solidityVersion, artifactsDir));
        // Install hardhat if needed
        if (!fs.existsSync('node_modules/hardhat')) {
            core.info('Installing Hardhat...');
            (0, child_process_1.execSync)('npm install --no-save hardhat @nomicfoundation/hardhat-toolbox @openzeppelin/contracts', {
                stdio: 'inherit'
            });
        }
        // Compile
        core.info('Running Hardhat compile...');
        const compileCmd = `npx hardhat compile --config ${configPath} ${options.compileArgs || ''}`;
        (0, child_process_1.execSync)(compileCmd, { stdio: 'inherit' });
        // Find generated artifacts
        const artifactPaths = [];
        function scanArtifacts(dir) {
            if (!fs.existsSync(dir))
                return;
            const items = fs.readdirSync(dir);
            for (const item of items) {
                const fullPath = path.join(dir, item);
                if (fs.statSync(fullPath).isDirectory()) {
                    scanArtifacts(fullPath);
                }
                else if (item.endsWith('.json') && !item.endsWith('.dbg.json')) {
                    artifactPaths.push(fullPath);
                }
            }
        }
        scanArtifacts(artifactsDir);
        core.info(`✅ Compiled successfully. Generated ${artifactPaths.length} artifacts.`);
        return {
            artifactPaths: [artifactsDir],
            success: true
        };
    }
    catch (error) {
        core.error(`Compilation failed: ${error}`);
        return {
            artifactPaths: [],
            success: false,
            errors: [String(error)]
        };
    }
}
/**
 * Compile contracts using Foundry
 */
async function compileWithFoundry(options) {
    core.info('📦 Compiling with Foundry...');
    try {
        // Check if forge is available
        (0, child_process_1.execSync)('forge --version', { stdio: 'pipe' });
        // Compile
        const compileCmd = `forge build ${options.compileArgs || ''}`;
        (0, child_process_1.execSync)(compileCmd, { stdio: 'inherit' });
        core.info('✅ Compiled successfully with Foundry.');
        return {
            artifactPaths: ['out'],
            success: true
        };
    }
    catch (error) {
        core.error(`Foundry compilation failed: ${error}`);
        return {
            artifactPaths: [],
            success: false,
            errors: [String(error)]
        };
    }
}
/**
 * Compile contracts using standalone solc
 */
async function compileWithSolc(options) {
    core.info('📦 Compiling with solc...');
    const solidityVersion = options.solidityVersion || '0.8.25';
    const outputDir = '.temp-artifacts';
    try {
        // Install solc if needed
        (0, child_process_1.execSync)(`npm install --no-save solc@${solidityVersion}`, { stdio: 'inherit' });
        fs.mkdirSync(outputDir, { recursive: true });
        // Compile each contract
        for (const contractPath of options.contractPaths) {
            const resolved = path.resolve(contractPath);
            const fileName = path.basename(resolved, '.sol');
            const compileCmd = `npx solcjs ${resolved} --abi --bin --optimize -o ${outputDir}`;
            (0, child_process_1.execSync)(compileCmd, { stdio: 'inherit' });
            core.info(`  Compiled: ${fileName}`);
        }
        core.info('✅ Compiled successfully with solc.');
        return {
            artifactPaths: [outputDir],
            success: true
        };
    }
    catch (error) {
        core.error(`solc compilation failed: ${error}`);
        return {
            artifactPaths: [],
            success: false,
            errors: [String(error)]
        };
    }
}
/**
 * Main compile function
 */
async function compile(options) {
    core.info(`🔨 Compile Mode: ${options.compiler}`);
    core.info(`Contracts: ${options.contractPaths.join(', ')}`);
    core.info('');
    switch (options.compiler) {
        case 'hardhat':
            return compileWithHardhat(options);
        case 'foundry':
            return compileWithFoundry(options);
        case 'solc':
            return compileWithSolc(options);
        default:
            return {
                artifactPaths: [],
                success: false,
                errors: [`Unknown compiler: ${options.compiler}`]
            };
    }
}
//# sourceMappingURL=compiler.js.map