# Solidity Error Identifier Action - Complete Guide

## What Is This?

A GitHub Action that:
1. Extracts custom errors from Solidity contracts
2. Computes error selectors (4-byte identifiers)
3. Generates a searchable database
4. **Optionally publishes as npm package with CLI tool**

## Three Ways to Use It

### 1. Extract Errors from Existing ABIs (ABI Mode)

You compile, action extracts:

```yaml
- run: npx hardhat compile
- uses: FhenixProtocol/solidity-error-identifier-action@v1
  with:
    abi-paths: 'artifacts/contracts'
```

**Result**: `errors.json` file

---

### 2. Extract Errors from .sol Files (Compile Mode)

Action compiles AND extracts:

```yaml
- uses: FhenixProtocol/solidity-error-identifier-action@v1
  with:
    mode: 'compile'
    contract-paths: 'contracts'
    compiler: 'hardhat'
```

**Result**: `errors.json` file

---

### 3. Extract + Publish to NPM (Publishing Mode)

Action extracts AND publishes as npm package:

```yaml
- uses: FhenixProtocol/solidity-error-identifier-action@v1
  with:
    abi-paths: 'artifacts/contracts'
    publish-npm: 'true'
    npm-package-name: '@myorg/errors'
    npm-token: ${{ secrets.NPM_TOKEN }}
```

**Result**: npm package with built-in CLI

Users can then:
```bash
npm install @myorg/errors
npx myorg-errors 0x118cdaa7
```

## For cofhe-contracts

### Recommended Approach

```yaml
name: Extract and Publish Errors
on:
  push:
    branches: [master]
    paths:
      - 'contracts/**/*.sol'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      # Step 1: Compile contracts (you do this)
      - name: Compile root contracts
        run: |
          mkdir -p .temp-sources
          cp contracts/FHE.sol .temp-sources/
          npx hardhat compile --config custom-config.js

      - name: Compile internal contracts
        run: |
          cd contracts/internal/host-chain
          pnpm install && pnpm run compile

      # Step 2: Extract and publish (action does this)
      - uses: FhenixProtocol/solidity-error-identifier-action@v1
        with:
          # Extract from both artifact directories
          abi-paths: 'artifacts/.temp-sources,contracts/internal/host-chain/artifacts'

          # Publish to npm
          publish-npm: 'true'
          npm-package-name: '@fhenixprotocol/cofhe-errors'
          npm-binary-name: 'fhenix-error-identifier'
          npm-token: ${{ secrets.NPM_TOKEN }}
          package-description: 'Error decoder for CoFHE protocol'
```

### What This Gives You

1. **Clean repo**: No error extraction code in cofhe-contracts
2. **Automatic updates**: Errors update on every merge to master
3. **Published package**: `@fhenixprotocol/cofhe-errors` on npm
4. **CLI tool**: Users run `npx fhenix-error-identifier 0x118cdaa7`
5. **Auto-versioning**: Patch version auto-increments

### cofhe-contracts Structure (AFTER)

```
cofhe-contracts/
├── contracts/
│   ├── FHE.sol
│   ├── ICofhe.sol
│   ├── package.json        # Your existing package (unchanged)
│   └── internal/
│       └── host-chain/
│           └── contracts/
└── .github/
    └── workflows/
        └── extract-errors.yml  # NEW - uses the action
```

**No scripts/ folder needed in cofhe-contracts!**

## The Separate Action Repo

Location: `/Users/roeezolantz/Development/solidity-error-identifier-action/`

Structure:
```
solidity-error-identifier-action/
├── action.yml              # GitHub Action definition
├── src/
│   ├── index.ts           # Main entry point
│   ├── compiler.ts        # Compile mode logic
│   ├── errorExtractor.ts  # Extract errors from ABIs
│   ├── errorSelector.ts   # Compute selectors
│   ├── npm-publisher.ts   # NEW - Publish to npm
│   └── utils.ts
├── examples/
│   ├── npm-publishing.yml
│   ├── compile-mode.yml
│   └── cofhe-contracts-workflow.yml
├── README.md
├── MODES.md               # ABI vs Compile mode comparison
├── NPM-PUBLISHING.md      # NEW - NPM publishing guide
└── SETUP.md              # How to publish the action itself
```

## Next Steps

### 1. Publish the Action

```bash
cd /Users/roeezolantz/Development/solidity-error-identifier-action
git init
git add .
git commit -m "Initial commit"

# Create repo: FhenixProtocol/solidity-error-identifier-action
git remote add origin git@github.com:FhenixProtocol/solidity-error-identifier-action.git
git push -u origin main

# Build and publish
npm install
npm run build
git add dist/
git commit -m "Build action"
git push

# Create release
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
git tag -fa v1 -m "v1"
git push origin v1 --force
```

### 2. Use in cofhe-contracts

Create `.github/workflows/extract-errors.yml`:

```yaml
name: Extract and Publish Errors
on:
  push:
    branches: [master]
    paths:
      - 'contracts/**/*.sol'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Compile contracts
        run: |
          # Your existing compilation logic
          mkdir -p .temp-sources
          cp contracts/FHE.sol .temp-sources/
          npx hardhat compile --config custom-config.js

          cd contracts/internal/host-chain
          pnpm install && pnpm run compile

      - uses: FhenixProtocol/solidity-error-identifier-action@v1
        with:
          abi-paths: 'artifacts/.temp-sources,contracts/internal/host-chain/artifacts'
          publish-npm: 'true'
          npm-package-name: '@fhenixprotocol/cofhe-errors'
          npm-binary-name: 'fhenix-error-identifier'
          npm-token: ${{ secrets.NPM_TOKEN }}
```

### 3. Add NPM Token Secret

GitHub → cofhe-contracts → Settings → Secrets → Actions → New secret

- Name: `NPM_TOKEN`
- Value: Your npm automation token

### 4. Done!

Every merge to master will:
1. Compile contracts
2. Extract errors
3. Publish to `@fhenixprotocol/cofhe-errors`
4. Auto-increment version

Users can then:
```bash
npm install @fhenixprotocol/cofhe-errors
npx fhenix-error-identifier 0x118cdaa7
```

## Benefits

✅ **Clean Separation**: Error extraction logic in separate repo
✅ **Reusable**: Other Solidity projects can use the action
✅ **No Pollution**: cofhe-contracts stays clean
✅ **Automated**: Errors update automatically on contract changes
✅ **Published**: Users get npm package with CLI tool
✅ **Versioned**: Auto-incrementing semantic versions

## Files Created

All files are in: `/Users/roeezolantz/Development/solidity-error-identifier-action/`

**Core:**
- `action.yml` - GitHub Action definition
- `src/index.ts` - Main logic
- `src/compiler.ts` - Compile mode
- `src/npm-publisher.ts` - **NEW** - NPM publishing
- `src/errorExtractor.ts` - Extract errors
- `src/errorSelector.ts` - Compute selectors

**Documentation:**
- `README.md` - Main readme
- `MODES.md` - ABI vs Compile mode guide
- `NPM-PUBLISHING.md` - **NEW** - NPM publishing guide
- `SETUP.md` - Action setup guide
- `SUMMARY.md` - This file

**Examples:**
- `examples/npm-publishing.yml` - **NEW** - NPM examples
- `examples/compile-mode.yml` - Compile mode examples
- `examples/cofhe-contracts-workflow.yml` - cofhe-contracts example

Ready to publish!
