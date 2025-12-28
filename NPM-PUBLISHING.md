# NPM Publishing Guide

The action can automatically publish your error database as an npm package with a built-in CLI tool for error lookup.

## Quick Start

```yaml
- uses: FhenixProtocol/solidity-error-identifier-action@v1
  with:
    abi-paths: 'artifacts/contracts'
    publish-npm: 'true'
    npm-package-name: '@myorg/error-identifier'
    npm-token: ${{ secrets.NPM_TOKEN }}
```

After this runs, users can:

```bash
npm install @myorg/error-identifier
npx error-identifier 0x118cdaa7
```

## How It Works

```
┌─────────────────────────────────┐
│ 1. Extract errors from ABIs     │
│    - Scans compiled contracts   │
│    - Computes error selectors   │
│    - Creates errors.json        │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ 2. Generate NPM package         │
│    - Creates package.json       │
│    - Bundles errors.json        │
│    - Generates CLI tool (cli.js)│
│    - Creates README.md          │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ 3. Publish to NPM registry      │
│    - Auto-increments version    │
│    - Publishes with npm token   │
│    - Creates public package     │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ 4. Users install & use          │
│    npm install @myorg/errors    │
│    npx my-error-lookup --help   │
└─────────────────────────────────┘
```

## Configuration

### Required Inputs

```yaml
publish-npm: 'true'                         # Enable publishing
npm-package-name: '@myorg/error-identifier' # Package name
npm-token: ${{ secrets.NPM_TOKEN }}         # NPM auth token
```

### Optional Inputs

```yaml
npm-binary-name: 'my-error-lookup'  # CLI command name (defaults to package name without scope)
npm-registry: 'https://registry.npmjs.org/'  # NPM registry URL
package-version: '1.0.0'            # Version (auto-increments if omitted)
package-description: 'My error decoder'  # Package description
```

## NPM Token Setup

### 1. Create NPM Token

Go to [npmjs.com](https://www.npmjs.com/) → Access Tokens → Generate New Token

Choose: **Automation** token type

### 2. Add to GitHub Secrets

GitHub Repo → Settings → Secrets → Actions → New repository secret

- Name: `NPM_TOKEN`
- Value: `npm_xxx...` (your token)

### 3. Use in Workflow

```yaml
npm-token: ${{ secrets.NPM_TOKEN }}
```

## Version Management

### Auto-Increment (Recommended)

Omit `package-version` - the action will:
1. Check current version on npm
2. Increment patch version
3. Publish new version

```yaml
# First run: publishes 1.0.0
# Second run: publishes 1.0.1
# Third run: publishes 1.0.2
publish-npm: 'true'
npm-package-name: '@myorg/errors'
npm-token: ${{ secrets.NPM_TOKEN }}
# No package-version specified
```

### Manual Version

Specify exact version:

```yaml
publish-npm: 'true'
npm-package-name: '@myorg/errors'
npm-token: ${{ secrets.NPM_TOKEN }}
package-version: '2.1.0'  # Explicit version
```

**Note**: Manual versions must be higher than the published version or publishing will fail.

## Published Package Structure

When published, the package contains:

```
@myorg/error-identifier/
├── package.json         # Package metadata
├── cli.js              # CLI tool (executable)
├── errors.json         # Error database
└── README.md           # Auto-generated docs
```

### package.json

```json
{
  "name": "@myorg/error-identifier",
  "version": "1.0.0",
  "description": "Error decoder for Solidity smart contracts",
  "main": "cli.js",
  "bin": {
    "my-error-lookup": "./cli.js"
  },
  "files": ["cli.js", "errors.json", "README.md"]
}
```

### CLI Features

The generated CLI tool supports:

```bash
# Lookup by selector
npx my-error-lookup 0x118cdaa7

# Search by name
npx my-error-lookup --name Permission

# List all errors
npx my-error-lookup --list

# JSON output
npx my-error-lookup --json 0x118cdaa7

# Help
npx my-error-lookup --help
```

## Usage Examples

### Example 1: Basic Publishing

```yaml
name: Publish Errors
on:
  push:
    branches: [main]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npx hardhat compile

      - uses: FhenixProtocol/solidity-error-identifier-action@v1
        with:
          abi-paths: 'artifacts'
          publish-npm: 'true'
          npm-package-name: '@myorg/errors'
          npm-token: ${{ secrets.NPM_TOKEN }}
```

### Example 2: Custom Binary Name

```yaml
- uses: FhenixProtocol/solidity-error-identifier-action@v1
  with:
    abi-paths: 'artifacts'
    publish-npm: 'true'
    npm-package-name: '@fhenixprotocol/cofhe-errors'
    npm-binary-name: 'fhenix-error-identifier'  # Users run: npx fhenix-error-identifier
    npm-token: ${{ secrets.NPM_TOKEN }}
```

### Example 3: Publish on Version Bump

```yaml
name: Publish on Version Bump
on:
  push:
    branches: [main]
    paths:
      - 'package.json'  # Only when version changes

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      # Check if version was bumped
      - name: Get version
        id: version
        run: |
          VERSION=$(jq -r .version < package.json)
          echo "VERSION=$VERSION" >> $GITHUB_ENV

      - run: npx hardhat compile

      - uses: FhenixProtocol/solidity-error-identifier-action@v1
        with:
          abi-paths: 'artifacts'
          publish-npm: 'true'
          npm-package-name: '@myorg/errors'
          npm-token: ${{ secrets.NPM_TOKEN }}
          package-version: ${{ env.VERSION }}  # Use repo version
```

### Example 4: Complete CoFHE Example

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
          # Compile root contracts
          mkdir -p .temp-sources
          cp contracts/FHE.sol .temp-sources/
          npx hardhat compile --config custom-config.js

          # Compile internal contracts
          cd contracts/internal/host-chain
          pnpm install && pnpm run compile

      - name: Extract and Publish
        uses: FhenixProtocol/solidity-error-identifier-action@v1
        with:
          abi-paths: 'artifacts/.temp-sources,contracts/internal/host-chain/artifacts'
          publish-npm: 'true'
          npm-package-name: '@fhenixprotocol/cofhe-errors'
          npm-binary-name: 'fhenix-error-identifier'
          npm-token: ${{ secrets.NPM_TOKEN }}
          package-description: 'Error decoder for CoFHE protocol'
```

## Private NPM Registry

For private registries:

```yaml
- uses: FhenixProtocol/solidity-error-identifier-action@v1
  with:
    abi-paths: 'artifacts'
    publish-npm: 'true'
    npm-package-name: '@mycompany/errors'
    npm-token: ${{ secrets.NPM_TOKEN }}
    npm-registry: 'https://npm.mycompany.com/'
```

## Outputs

When publishing is enabled, additional outputs are available:

```yaml
- uses: FhenixProtocol/solidity-error-identifier-action@v1
  id: publish
  with:
    publish-npm: 'true'
    # ... other inputs

- name: Get published info
  run: |
    echo "Package: ${{ steps.publish.outputs.npm-package-name }}"
    echo "Version: ${{ steps.publish.outputs.npm-package-version }}"
```

## End User Experience

After publishing, users can:

### Install

```bash
npm install @myorg/error-identifier
# or
yarn add @myorg/error-identifier
# or
pnpm add @myorg/error-identifier
```

### Use CLI

```bash
# Look up specific error
npx error-identifier 0x118cdaa7

# Output:
# Name:      OwnableUnauthorizedAccount
# Selector:  0x118cdaa7
# Signature: OwnableUnauthorizedAccount(address)
# Source:    ACL.sol
# Inputs:    address

# Search errors
npx error-identifier --name Permission

# Output:
# 0x4c40eccb PermissionInvalid_IssuerSignature (ACL.sol)
# 0x8e143bf7 PermissionInvalid_RecipientSignature (ACL.sol)
# ...

# List all errors
npx error-identifier --list

# JSON output for scripting
npx error-identifier --json 0x118cdaa7 | jq .name
```

### Use Programmatically

```javascript
const errors = require('@myorg/error-identifier/errors.json');

const error = errors.find(e => e.selector === '0x118cdaa7');
console.log(error.name);  // "OwnableUnauthorizedAccount"
```

## Troubleshooting

### Error: Version already exists

```
npm ERR! 403 You cannot publish over the previously published versions
```

**Solution**: Either:
- Omit `package-version` to auto-increment
- Specify a higher version manually

### Error: Invalid NPM token

```
npm ERR! code E401
npm ERR! Unable to authenticate
```

**Solution**:
- Check `NPM_TOKEN` secret is set correctly
- Ensure token is an **Automation** token
- Verify token hasn't expired

### Error: Package name not available

```
npm ERR! 403 Forbidden - Package name too similar to existing package
```

**Solution**:
- Use scoped package: `@yourorg/package-name`
- Choose a different name

## Best Practices

### 1. Use Scoped Packages

```yaml
npm-package-name: '@myorg/errors'  # Better
# vs
npm-package-name: 'errors'  # Likely taken
```

### 2. Descriptive Binary Names

```yaml
npm-binary-name: 'myproject-error-lookup'  # Clear
# vs
npm-binary-name: 'errors'  # Generic
```

### 3. Auto-Increment Versions

Let the action manage versions:

```yaml
# Don't specify package-version
# Action will auto-increment on each run
```

### 4. Publish Only on Master

```yaml
on:
  push:
    branches: [master]  # Only publish from main branch
```

### 5. Add Version Bump Check

```yaml
# Only publish when version changes in package.json
on:
  push:
    paths:
      - 'package.json'
```

## Security Considerations

### 1. Protect NPM Token

- Never commit `NPM_TOKEN` to code
- Use GitHub Secrets
- Rotate tokens periodically

### 2. Use Automation Tokens

GitHub Actions should use **Automation** tokens, not **Publish** tokens.

### 3. Verify Package Contents

Review published package:

```bash
npm pack --dry-run @myorg/errors
```

### 4. Public vs Private

By default, packages are public. For private:

```yaml
# This action always publishes as public
# For private packages, use your own npm config
```

## Integration with Existing Packages

If you already have a package (like `@fhenixprotocol/cofhe-contracts`), you can:

### Option 1: Separate Package

Create dedicated error package:

```yaml
npm-package-name: '@fhenixprotocol/cofhe-errors'
npm-binary-name: 'fhenix-error-identifier'
```

### Option 2: Update Existing Package

Don't use `publish-npm` - instead:

1. Extract errors.json only
2. Copy to your existing package
3. Publish using your existing workflow

```yaml
# Just extract, don't publish
- uses: FhenixProtocol/solidity-error-identifier-action@v1
  with:
    abi-paths: 'artifacts'
    output-path: 'path/to/your/package/errors.json'
    # publish-npm: 'false'  (or omit)
```

## Summary

✅ **Benefits**:
- One-step error extraction + publishing
- Auto-managed versioning
- Built-in CLI tool
- Zero configuration for end users

⚠️ **Requirements**:
- NPM account with publish permissions
- GitHub Secrets configured
- Valid package name available

📦 **Result**:
Users get a simple `npx` command to look up errors from your contracts!
