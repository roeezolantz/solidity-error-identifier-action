"use strict";
/**
 * @fileoverview Utility functions for GitHub Action
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
exports.scanAbiDirectory = scanAbiDirectory;
exports.getAbiPaths = getAbiPaths;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Recursively scan directory for ABI JSON files
 * @param dir Directory to scan
 * @returns Array of absolute paths to valid ABI files
 */
function scanAbiDirectory(dir) {
    if (!fs.existsSync(dir)) {
        console.warn(`Warning: Directory not found: ${dir}`);
        return [];
    }
    const results = [];
    const items = fs.readdirSync(dir);
    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            results.push(...scanAbiDirectory(fullPath));
        }
        else if (item.endsWith('.json') && !item.endsWith('.dbg.json')) {
            // Verify it's a valid ABI file by checking for "abi" field
            try {
                const content = fs.readFileSync(fullPath, 'utf-8');
                const json = JSON.parse(content);
                if (json.abi && Array.isArray(json.abi)) {
                    results.push(fullPath);
                }
            }
            catch (error) {
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
function getAbiPaths(abiPathsInput) {
    const directories = abiPathsInput.split(',').map(p => p.trim());
    const allPaths = [];
    for (const dir of directories) {
        const absoluteDir = path.resolve(dir);
        console.log(`Scanning directory: ${absoluteDir}`);
        const paths = scanAbiDirectory(absoluteDir);
        console.log(`Found ${paths.length} ABI files in ${dir}`);
        allPaths.push(...paths);
    }
    return allPaths;
}
//# sourceMappingURL=utils.js.map