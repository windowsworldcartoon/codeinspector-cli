import fs from 'fs';
import path from 'path';
import ora from 'ora';
import inquirer from 'inquirer';
import { spawn } from 'child_process';

export default async function dev(options) {
  let extensionPath;

  if (options && options.length > 0) {
    extensionPath = options[0];
  } else {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'path',
        message: 'Extension directory path:',
        default: process.cwd()
      }
    ]);
    extensionPath = answers.path;
  }

  // Verify extension exists
  const manifestPath = path.join(extensionPath, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error('manifest.json not found in extension directory');
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const spinner = ora(`Starting dev mode for ${manifest.name}...`).start();

  try {
    // Install dependencies if needed
    const pkgPath = path.join(extensionPath, 'package.json');
    const nodeModulesPath = path.join(extensionPath, 'node_modules');
    
    if (!fs.existsSync(nodeModulesPath)) {
      spinner.text = 'Installing dependencies...';
      await runCommand('npm', ['install'], extensionPath);
    }

    spinner.succeed(`✓ Dev mode ready for ${manifest.name}`);
    console.log(`\nWatching for changes in: ${extensionPath}`);
    console.log('Press Ctrl+C to stop\n');

    // Watch for file changes
    watchExtension(extensionPath, manifest);
  } catch (err) {
    spinner.fail('Dev mode setup failed');
    throw err;
  }
}

function watchExtension(extensionPath, manifest) {
  const watcher = fs.watch(extensionPath, { recursive: true }, (eventType, filename) => {
    // Ignore node_modules and common files
    if (filename.includes('node_modules') || filename.startsWith('.')) {
      return;
    }

    if (eventType === 'change' && filename.endsWith('.js')) {
      console.log(`\n✓ File changed: ${filename}`);
      console.log(`  Extension: ${manifest.name}`);
      console.log(`  Reload the extension in CodeInspector to test changes`);
    }
  });

  // Handle cleanup on exit
  process.on('SIGINT', () => {
    watcher.close();
    console.log('\n\n✓ Dev mode stopped');
    process.exit(0);
  });
}

function runCommand(cmd, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd,
      stdio: 'pipe'
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Command failed with code ${code}`));
      } else {
        resolve();
      }
    });

    child.on('error', reject);
  });
}
