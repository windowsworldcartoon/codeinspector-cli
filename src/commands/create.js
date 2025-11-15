import fs from 'fs';
import path from 'path';
import ora from 'ora';
import inquirer from 'inquirer';

export default async function create(options) {
  let name;

  if (options && options.length > 0) {
    name = options[0];
  } else {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Extension name:',
        validate: (input) => input.length > 0 || 'Name cannot be empty'
      }
    ]);
    name = answers.name;
  }

  const extensionPath = path.join(process.cwd(), 'extensions', name);

  if (fs.existsSync(extensionPath)) {
    throw new Error(`Extension "${name}" already exists at ${extensionPath}`);
  }

  // Prompt for manifest details
  const manifestAnswers = await inquirer.prompt([
    {
      type: 'input',
      name: 'description',
      message: 'Extension description:',
      default: `${name} extension for CodeInspector`
    },
    {
      type: 'input',
      name: 'author',
      message: 'Author name:',
      default: 'Your Name'
    },
    {
      type: 'input',
      name: 'version',
      message: 'Initial version:',
      default: '1.0.0',
      validate: (input) => /^\d+\.\d+\.\d+/.test(input) || 'Invalid version (use semver: x.y.z)'
    },
    {
      type: 'list',
      name: 'language',
      message: 'Select language:',
      choices: ['JavaScript', 'TypeScript'],
      default: 'JavaScript'
    }
  ]);

  const spinner = ora('Creating extension...').start();

  try {
    // Create directory structure
    spinner.text = 'Creating directories...';
    fs.mkdirSync(extensionPath, { recursive: true });

    // Create manifest.json
    spinner.text = 'Creating manifest.json...';
    const manifest = {
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name: name,
      version: manifestAnswers.version,
      description: manifestAnswers.description,
      author: manifestAnswers.author,
      main: 'index.js'
    };

    fs.writeFileSync(
      path.join(extensionPath, 'manifest.json'),
      JSON.stringify(manifest, null, 2)
    );

    // Create index file (JS or TS)
    spinner.text = 'Creating extension class...';
    const isTypeScript = manifestAnswers.language === 'TypeScript';
    const mainFile = isTypeScript ? 'index.ts' : 'index.js';
    
    const indexContent = isTypeScript
      ? generateTypeScriptTemplate(name, manifest)
      : generateJavaScriptTemplate(name, manifest);

    fs.writeFileSync(path.join(extensionPath, mainFile), indexContent);
    
    // Update manifest.json to point to correct main file
    manifest.main = mainFile;

    // Stop spinner for user input
    spinner.stop();

    // Ask for npm scope
    const pkgAnswers = await inquirer.prompt([
      {
        type: 'input',
        name: 'scope',
        message: 'npm scope (e.g., "yourname") [optional]:',
        default: ''
      }
    ]);

    // Restart spinner for file creation
    spinner.start('Creating package.json...');

    const pkgName = pkgAnswers.scope 
      ? `@${pkgAnswers.scope}/${manifest.id}`
      : manifest.id;

    const pkg = {
      name: pkgName,
      version: manifest.version,
      description: manifest.description,
      main: manifest.main,
      type: 'module',
      author: manifest.author,
      dependencies: {
        '@codeinspector/extension-handler': '^1.0.0'
      }
    };

    // Add TypeScript dependencies if needed
    if (isTypeScript) {
      pkg.devDependencies = {
        'typescript': '^5.0.0'
      };
      pkg.scripts = {
        'build': 'tsc',
        'watch': 'tsc --watch'
      };
    }

    fs.writeFileSync(
      path.join(extensionPath, 'package.json'),
      JSON.stringify(pkg, null, 2)
    );

    // Create README.md
    spinner.text = 'Creating README.md...';
    const readmeContent = `# ${name}

${manifestAnswers.description}

## Installation

\`\`\`bash
npm install
\`\`\`

## Development

Edit \`${mainFile}\` to add your extension logic.

## Publishing

\`\`\`bash
codeinspector publish
\`\`\`
`;

    fs.writeFileSync(
      path.join(extensionPath, 'README.md'),
      readmeContent
    );

    // Create .gitignore
    spinner.text = 'Creating .gitignore...';
    const gitignoreContent = `node_modules/
dist/
*.log
.DS_Store
`;

    fs.writeFileSync(
      path.join(extensionPath, '.gitignore'),
      gitignoreContent
    );

    // Create TypeScript config if needed
    if (isTypeScript) {
      spinner.text = 'Creating tsconfig.json...';
      const tsconfig = {
        'compilerOptions': {
          'target': 'ES2020',
          'module': 'ESNext',
          'lib': ['ES2020'],
          'declaration': true,
          'declarationMap': true,
          'sourceMap': true,
          'outDir': './dist',
          'rootDir': './src',
          'strict': true,
          'esModuleInterop': true,
          'skipLibCheck': true,
          'forceConsistentCasingInFileNames': true
        },
        'include': ['src/**/*'],
        'exclude': ['node_modules', 'dist']
      };
      
      fs.writeFileSync(
        path.join(extensionPath, 'tsconfig.json'),
        JSON.stringify(tsconfig, null, 2)
      );

      // Create src directory for TypeScript
      fs.mkdirSync(path.join(extensionPath, 'src'), { recursive: true });
      
      // Move index.ts to src
      const srcPath = path.join(extensionPath, 'src', 'index.ts');
      fs.renameSync(path.join(extensionPath, 'index.ts'), srcPath);
    }

    spinner.succeed(`Extension created at ${extensionPath}`);
    console.log(`\nNext steps:`);
    console.log(`  1. cd ${path.join('extensions', name)}`);
    console.log(`  2. npm install`);
    const mainFileDesc = isTypeScript ? 'src/index.ts' : 'index.js';
    console.log(`  3. Edit ${mainFileDesc} to customize your extension`);
    if (isTypeScript) {
      console.log(`  4. Run 'npm run build' to compile TypeScript`);
      console.log(`  5. Commit and push: git add . && git commit -m "Initial commit" && git push`);
    } else {
      console.log(`  4. Commit and push: git add . && git commit -m "Initial commit" && git push`);
    }
  } catch (err) {
    spinner.fail('Failed to create extension');
    throw err;
  }
}

function pascalCase(str) {
  return str
    .split(/[-\s]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

function generateJavaScriptTemplate(name, manifest) {
  return `import Extension from '@codeinspector/extension-handler';

class ${pascalCase(name)}Extension extends Extension {
  activate() {
    console.log(\`\${this.name} activated\`);
    
    // Register a command
    this.registerCommand('${manifest.id}.action', () => {
      this.showNotification('${name}', 'Action executed!');
      return { status: 'success' };
    });
    
    // Register a menu item
    this.registerMenu({
      id: '${manifest.id}-menu',
      label: '${name}',
      submenu: [
        {
          id: '${manifest.id}.action',
          label: 'Execute Action',
          command: '${manifest.id}.action'
        }
      ]
    });

    // Register a command menu item (appears in command palette)
    this.registerCommandMenu({
      id: '${manifest.id}.command-palette-action',
      name: '${name}: Execute Action',
      action: 'executeExtensionCommand',
      extensionId: this.id,
      command: 'action',
      description: 'Execute action from ${name}',
      shortcut: 'Ctrl+Shift+M'
    });
  }

  deactivate() {
    console.log(\`\${this.name} deactivated\`);
  }

  action() {
    this.showNotification('${name}', 'Command palette action executed!');
    return { status: 'success' };
  }
}

export default ${pascalCase(name)}Extension;
`;
}

function generateTypeScriptTemplate(name, manifest) {
  return `import Extension, { CommandMenuConfig, MenuConfig } from '@codeinspector/extension-handler';

class ${pascalCase(name)}Extension extends Extension {
  activate(): void {
    console.log(\`\${this.name} activated\`);
    
    // Register a command
    this.registerCommand('${manifest.id}.action', () => {
      this.showNotification('${name}', 'Action executed!');
      return { status: 'success' };
    });
    
    // Register a menu item with proper typing
    const menuConfig: MenuConfig = {
      id: '${manifest.id}-menu',
      label: '${name}',
      submenu: [
        {
          id: '${manifest.id}.action',
          label: 'Execute Action',
          command: '${manifest.id}.action'
        }
      ]
    };
    this.registerMenu(menuConfig);

    // Register a command menu item (appears in command palette)
    const commandMenuConfig: CommandMenuConfig = {
      id: '${manifest.id}.command-palette-action',
      name: '${name}: Execute Action',
      action: 'executeExtensionCommand',
      extensionId: this.id,
      command: 'action',
      description: 'Execute action from ${name}',
      shortcut: 'Ctrl+Shift+M'
    };
    this.registerCommandMenu(commandMenuConfig);
  }

  deactivate(): void {
    console.log(\`\${this.name} deactivated\`);
  }

  action(): { status: string } {
    this.showNotification('${name}', 'Command palette action executed!');
    return { status: 'success' };
  }
}

export default ${pascalCase(name)}Extension;
`;
}
