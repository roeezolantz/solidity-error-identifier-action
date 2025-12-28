/**
 * @fileoverview NPM package publisher for error database
 */
export interface PublishOptions {
    packageName: string;
    binaryName?: string;
    version?: string;
    description?: string;
    errorsJson: string;
    npmToken?: string;
    registry?: string;
    useProvenance?: boolean;
}
export interface PublishResult {
    success: boolean;
    packageName: string;
    version: string;
    error?: string;
}
/**
 * Publish error database as npm package
 */
export declare function publishToNpm(options: PublishOptions): Promise<PublishResult>;
//# sourceMappingURL=npm-publisher.d.ts.map