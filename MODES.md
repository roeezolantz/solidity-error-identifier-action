# Mode Comparison: ABI vs Compile

This action supports two modes for extracting errors from Solidity contracts.

## Mode 1: ABI Mode (Default)

**Use when**: You already have compiled ABIs

```yaml
- uses: FhenixProtocol/solidity-error-identifier-action@v1
  with:
    mode: 'abi'                          # or omit (default)
    abi-paths: 'artifacts/contracts'     # Path to existing ABIs
    output-path: 'errors.json'
```

### How It Works:

```
┌─────────────────────────────┐
│  YOU compile contracts      │
│  (hardhat/foundry/etc)      │
└──────────┬──────────────────┘
           │
           ▼
    ABIs generated
    (artifacts/*.json)
           │
           ▼
┌─────────────────────────────┐
│  ACTION scans ABIs          │
│  - Finds error definitions  │
│  - Computes selectors       │
│  - Generates database       │
└──────────┬──────────────────┘
           │
           ▼
    errors.json created
```

### Example Workflow:

```yaml
jobs:
  extract-errors:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      # YOU handle compilation
      - run: npm install
      - run: npx hardhat compile

      # ACTION extracts from ABIs
      - uses: FhenixProtocol/solidity-error-identifier-action@v1
        with:
          abi-paths: 'artifacts/contracts'
```

### Pros:
- ✅ Full control over compilation
- ✅ Use your existing build setup
- ✅ Supports complex projects with custom configs
- ✅ Faster (reuses existing artifacts)

### Cons:
- ❌ Requires separate compilation step
- ❌ Must maintain build configuration

---

## Mode 2: Compile Mode

**Use when**: You only have `.sol` files (no ABIs yet)

```yaml
- uses: FhenixProtocol/solidity-error-identifier-action@v1
  with:
    mode: 'compile'                      # Enable compile mode
    contract-paths: 'contracts'          # Path to .sol files
    compiler: 'hardhat'                  # hardhat, foundry, or solc
    solidity-version: '0.8.25'          # Optional - auto-detected if omitted
    output-path: 'errors.json'
```

### How It Works:

```
┌─────────────────────────────┐
│  YOU provide .sol files     │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│  ACTION compiles for you    │
│  - Detects Solidity version │
│  - Creates temp config      │
│  - Runs compiler            │
│  - Generates ABIs           │
└──────────┬──────────────────┘
           │
           ▼
    Temporary ABIs
    (.temp-artifacts/*.json)
           │
           ▼
┌─────────────────────────────┐
│  ACTION extracts errors     │
│  - Finds error definitions  │
│  - Computes selectors       │
│  - Generates database       │
└──────────┬──────────────────┘
           │
           ▼
    errors.json created
```

### Example Workflow:

```yaml
jobs:
  extract-errors:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      # NO COMPILATION NEEDED!
      # ACTION does everything
      - uses: FhenixProtocol/solidity-error-identifier-action@v1
        with:
          mode: 'compile'
          contract-paths: 'contracts'
          compiler: 'hardhat'
```

### Pros:
- ✅ Zero setup - just point at .sol files
- ✅ No build configuration needed
- ✅ Works with standalone contracts
- ✅ Perfect for simple projects

### Cons:
- ❌ May not work with complex imports
- ❌ Limited control over compiler settings
- ❌ Slower (compiles on every run)

---

## Compiler Options

### Hardhat (Default)

```yaml
compiler: 'hardhat'
```

**How it works:**
1. Copies .sol files to `.temp-contracts/`
2. Creates minimal `hardhat.temp.config.js`
3. Auto-detects Solidity version from `pragma solidity ...;`
4. Runs `npx hardhat compile`
5. Outputs to `.temp-artifacts/`

**Best for:**
- Most Solidity projects
- Contracts with `@openzeppelin` imports
- Standard Ethereum contracts

---

### Foundry

```yaml
compiler: 'foundry'
```

**How it works:**
1. Uses existing `foundry.toml` if present
2. Runs `forge build`
3. Outputs to `out/`

**Best for:**
- Projects already using Foundry
- Performance-critical compilation
- Advanced Solidity features

**Requires:**
- Foundry installed (`forge --version` must work)

---

### Solc (Standalone)

```yaml
compiler: 'solc'
solidity-version: '0.8.20'
```

**How it works:**
1. Installs `solc` npm package
2. Compiles each file individually
3. Outputs ABI files to `.temp-artifacts/`

**Best for:**
- Single-file contracts
- No dependencies
- Maximum simplicity

**Limitations:**
- Cannot handle imports between contracts
- No optimization settings
- Basic compilation only

---

## When to Use Each Mode

### Use ABI Mode When:

1. **Complex project setup**
   - Custom hardhat configs
   - Multiple compiler versions
   - Complex import paths

2. **Already have build pipeline**
   - Existing CI/CD with compilation
   - Need to run tests first
   - Build artifacts are cached

3. **Performance matters**
   - Large codebase
   - Frequent re-runs
   - Want to avoid re-compilation

**Example projects**: OpenZeppelin, Uniswap, Aave

---

### Use Compile Mode When:

1. **Simple contracts**
   - Few files
   - Minimal dependencies
   - Standalone contracts

2. **No existing build**
   - Just .sol files in a repo
   - No hardhat/foundry setup
   - Quick one-off extraction

3. **Rapid prototyping**
   - Testing the action
   - Small side projects
   - Educational examples

**Example projects**: Simple ERC20, basic NFTs, tutorials

---

## For cofhe-contracts: Which Mode?

### Recommended: ABI Mode

```yaml
# 1. Compile contracts yourself
- name: Compile root contracts
  run: |
    mkdir -p .temp-sources
    cp contracts/FHE.sol .temp-sources/
    npx hardhat compile --config custom-config.js

- name: Compile internal contracts
  run: |
    cd contracts/internal/host-chain
    pnpm run compile

# 2. Let action extract from ABIs
- uses: FhenixProtocol/solidity-error-identifier-action@v1
  with:
    abi-paths: 'artifacts/.temp-sources,contracts/internal/host-chain/artifacts'
```

**Why?**
- Complex dual-compilation setup (root + internal)
- Circular dependency issues
- Already have working compilation process
- Custom hardhat configs needed

---

## Auto-Detection Features

When using **Compile Mode**, the action auto-detects:

### Solidity Version
Reads from first `pragma solidity ...;` statement:
```solidity
pragma solidity ^0.8.25;  // → Uses 0.8.25
```

### File Structure
- **Directory input**: Copies all `.sol` files
- **File input**: Copies specific file
- **Multiple paths**: Handles comma-separated list

### Dependencies
Auto-installs common dependencies:
- `@openzeppelin/contracts`
- `hardhat` and plugins

---

## Troubleshooting

### Compile Mode Issues

**Problem**: Import not found
```
Error: Cannot find module '@openzeppelin/contracts/...'
```
**Solution**: Use ABI mode with pre-compilation, or add dependencies to your repo

---

**Problem**: Wrong Solidity version
```
Error: Source file requires different compiler version
```
**Solution**: Specify version explicitly:
```yaml
solidity-version: '0.8.20'
```

---

**Problem**: Complex imports fail
```
Error: File import callback not supported
```
**Solution**: Use ABI mode - compile mode is for simple contracts only

---

### ABI Mode Issues

**Problem**: No ABIs found
```
Warning: No ABI files found
```
**Solution**: Make sure you compiled contracts first:
```yaml
- run: npx hardhat compile
- uses: action...
```

---

## Summary Table

| Feature | ABI Mode | Compile Mode |
|---------|----------|--------------|
| Setup complexity | Medium | Zero |
| Compilation control | Full | Limited |
| Project complexity | Any | Simple only |
| Speed | Fast | Slower |
| Dependencies | You handle | Auto-installed |
| Configuration | Required | Auto-generated |
| Best for | Production repos | Prototypes, simple contracts |

---

## Migration Path

**Starting simple?** Use Compile Mode
```yaml
- uses: action@v1
  with:
    mode: 'compile'
    contract-paths: 'contracts'
```

**Growing complex?** Switch to ABI Mode
```yaml
- run: hardhat compile
- uses: action@v1
  with:
    abi-paths: 'artifacts'
```

**Maximum flexibility?** Hybrid approach
```yaml
# Compile simple contracts with action
- uses: action@v1
  with:
    mode: 'compile'
    contract-paths: 'simple-contracts'
    output-path: 'errors-simple.json'

# Pre-compile complex ones yourself
- run: hardhat compile
- uses: action@v1
  with:
    abi-paths: 'artifacts'
    output-path: 'errors-complex.json'
```
