# @windowsworldcartoon/codeinspector-cli

Command line interface for managing CodeInspector extensions.

## Installation

```bash
npm install -g @windowsworldcartoon/codeinspector-cli
```

Or use locally in your project:

```bash
npm install --save-dev @windowsworldcartoon/codeinspector-cli
npx codeinspector [command]
```

## Commands

### create
Create a new CodeInspector extension with boilerplate code.

```bash
codeinspector create my-extension
```

This creates:
- `extensions/my-extension/manifest.json` - Extension metadata
- `extensions/my-extension/index.js` - Extension class
- `extensions/my-extension/package.json` - npm configuration

### list
List all installed extensions in the current project.

```bash
codeinspector list
```

Shows:
- Extension name and ID
- Version
- File path

### validate
Validate an extension's manifest.json for correctness.

```bash
codeinspector validate [path]
```

Checks:
- Required fields (id, name, version, main)
- Valid semantic versioning
- Main file exists
- Recommended fields

### dev
Start development mode for an extension with file watching.

```bash
codeinspector dev [path]
```

Features:
- Watches for file changes
- Provides reload instructions
- Shows file modification logs

### publish
Prepare extension for npm publishing.

```bash
codeinspector publish [path]
```

Validates and guides you through:
- Version checking
- npm login verification
- Publishing commands

## Global Options

```bash
--help, -h      Show help message
--version, -v   Show CLI version
```

## Workflow Example

```bash
# Create new extension
codeinspector create logger

# Navigate to extension
cd extensions/logger

# Install dependencies
npm install

# Update manifest.json with your details

# Start development
codeinspector dev

# In another terminal, run CodeInspector
# Make changes and reload (Ctrl+Shift+R)

# When ready to publish
codeinspector publish

# Update version
npm version patch

# Publish to npm
npm publish
```

## Extension Structure

```
my-extension/
├── manifest.json      # Extension metadata
├── index.js          # Main extension class
├── package.json      # npm configuration
└── [other files]     # Your extension code
```

### manifest.json

```json
{
  "id": "my-extension",
  "name": "My Extension",
  "version": "1.0.0",
  "description": "What this extension does",
  "author": "Your Name",
  "main": "index.js"
}
```

### index.js

```javascript
const Extension = require('@windowsworldcartoon/codeinspector-extension-handler');

class MyExtension extends Extension {
  activate() {
    // Initialize extension
  }

  deactivate() {
    // Cleanup
  }
}

module.exports = MyExtension;
```

## License

MIT
