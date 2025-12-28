/**
 * @fileoverview Compiler utilities for compiling Solidity contracts
 */
export interface CompileOptions {
    contractPaths: string[];
    compiler: 'hardhat' | 'foundry' | 'solc';
    solidityVersion?: string;
    compileArgs?: string;
}
export interface CompileResult {
    artifactPaths: string[];
    success: boolean;
    errors?: string[];
}
/**
 * Main compile function
 */
export declare function compile(options: CompileOptions): Promise<CompileResult>;
//# sourceMappingURL=compiler.d.ts.map