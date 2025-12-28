# Solidity Error Identifier - GitHub Action

A reusable GitHub Action that extracts custom error definitions from Solidity contract ABIs and generates a searchable error database.

## Features

- 🔍 **Automatic Error Extraction**: Scans compiled contract ABIs for custom error definitions
- 🎯 **Selector Computation**: Calculates 4-byte error selectors using keccak256
- 📊 **Detailed Reporting**: Provides statistics and grouping by source contract
- 📦 **NPM Publishing**: Automatically publish error database as npm package with CLI tool
- 🔨 **Compile Mode**: Can compile contracts for you (no pre-compiled ABIs needed)
- ♻️ **Reusable**: Can be used across multiple Solidity projects
- 🚀 **Zero Configuration**: Works with any Hardhat/Truffle/Foundry project

## Usage

### Basic Usage

```yaml
name: Extract Errors
on:
  push:
    branches: [main]

jobs:
  extract-errors:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      # Compile your contracts first
      - name: Install dependencies
        run: npm install

      - name: Compile contracts
        run: npx hardhat compile

      # Extract errors
      - uses: FhenixProtocol/solidity-error-identifier-action@v1
        with:
          abi-paths: 'artifacts/contracts'
          output-path: 'errors.json'

      - name: Upload error database
        uses: actions/upload-artifact@v3
        with:
          name: error-database
          path: errors.json
```

### Advanced Usage - Multiple ABI Directories

```yaml
- uses: FhenixProtocol/solidity-error-identifier-action@v1
  with:
    abi-paths: 'artifacts/contracts,other-artifacts/contracts'
    output-path: 'dist/errors.json'
```

### Auto-commit Updated Errors

```yaml
- uses: FhenixProtocol/solidity-error-identifier-action@v1
  with:
    abi-paths: 'artifacts/contracts'
    output-path: 'errors.json'

- name: Commit updated errors
  run: |
    git config user.name "GitHub Actions"
    git config user.email "actions@github.com"
    git add errors.json
    git diff --quiet && git diff --staged --quiet || \
      (git commit -m "chore: update error database" && git push)
```

### NPM Publishing - Publish as npm Package with CLI

```yaml
- uses: FhenixProtocol/solidity-error-identifier-action@v1
  with:
    abi-paths: 'artifacts/contracts'

    # Enable NPM publishing
    publish-npm: 'true'
    npm-package-name: '@myorg/error-identifier'
    npm-binary-name: 'my-error-lookup'
    npm-token: ${{ secrets.NPM_TOKEN }}

# Now users can run:
# npm install @myorg/error-identifier
# npx my-error-lookup 0x118cdaa7
```

See [NPM-PUBLISHING.md](./NPM-PUBLISHING.md) for complete documentation.

### Compile Mode - No ABIs Needed

```yaml
- uses: FhenixProtocol/solidity-error-identifier-action@v1
  with:
    mode: 'compile'                  # Action compiles contracts for you
    contract-paths: 'contracts'      # Just provide .sol files
    compiler: 'hardhat'              # hardhat, foundry, or solc
    output-path: 'errors.json'

# No compilation step needed - action handles it!
```

See [MODES.md](./MODES.md) for mode comparison and examples.

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `abi-paths` | Comma-separated list of ABI directory paths to scan | Yes | - |
| `output-path` | Path where the error database JSON should be written | No | `errors.json` |

## Outputs

| Output | Description |
|--------|-------------|
| `errors-json` | Path to the generated error database JSON file |
| `error-count` | Total number of errors extracted |
| `errors-by-source` | JSON object with error counts grouped by source contract |

## Output Format

The generated `errors.json` file contains an array of error objects:

```json
[
  {
    "name": "InvalidHexCharacter",
    "signature": "InvalidHexCharacter(bytes1)",
    "inputs": ["char"],
    "inputTypes": ["bytes1"],
    "source": "FHE.sol",
    "selector": "0x01d4fab6"
  }
]
```

## Example Output

When the action runs, you'll see:

```
🔍 Solidity Error Identifier Action
=====================================

📦 Found 31 ABI files to process

⚙️  Extracting errors from ABIs...
✅ Extracted 41 unique errors

📝 Wrote error database to: /path/to/errors.json

📊 Error Database Summary:
─────────────────────────
  ACL.sol: 18 errors
  FHE.sol: 3 errors
  PlaintextsStorage.sol: 1 error
  TaskManager.sol: 19 errors

Total: 41 errors from 4 contracts

✨ Action completed successfully!
```

## How It Works

### 1. Error Selector Computation

Solidity error selectors are computed using:
1. Construct canonical signature: `ErrorName(type1,type2,...)`
2. Compute keccak256 hash of UTF-8 encoded signature
3. Take first 4 bytes as the selector

Example:
```
Signature: "OwnableUnauthorizedAccount(address)"
Hash:      keccak256("OwnableUnauthorizedAccount(address)")
         = 0x118cdaa7...
Selector:  0x118cdaa7
```

### 2. ABI Scanning

The action:
- Recursively scans specified directories
- Finds all `.json` files (excluding `.dbg.json`)
- Validates each file has an `abi` array field
- Extracts error definitions from ABIs
- Deduplicates based on signature
- Tracks source contract for each error

## Requirements

- Node.js 20 or later
- Compiled Solidity contracts (ABIs must exist)
- GitHub Actions runner

## Development

### Building the Action

```bash
npm install
npm run build
```

This compiles TypeScript and bundles everything into `dist/index.js` using `@vercel/ncc`.

### Local Testing

```bash
# Set inputs as environment variables
export INPUT_ABI-PATHS="path/to/artifacts"
export INPUT_OUTPUT-PATH="errors.json"
export INPUT_MODE='abi'

# Run the action
node dist/index.js
```

## License

MIT License - see LICENSE file for details

## Support

- Issues: [GitHub Issues](https://github.com/FhenixProtocol/solidity-error-identifier-action/issues)
- Docs: [Fhenix Documentation](https://docs.fhenix.io)

## Related Projects

- [@fhenixprotocol/cofhe-contracts](https://www.npmjs.com/package/@fhenixprotocol/cofhe-contracts) - CoFHE protocol contracts
- [fhenix-error-identifier](https://www.npmjs.com/package/fhenix-error-identifier) - CLI tool for error lookup

## Acknowledgments

Built for the Fhenix ecosystem by the Fhenix team.
