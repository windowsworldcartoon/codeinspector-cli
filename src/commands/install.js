import fs from 'fs';
import path from 'path';
import os from 'os';
import ora from 'ora';
import inquirer from 'inquirer';
import { spawn } from 'child_process';
import simpleGit from 'simple-git';

const extensionsDir = path.join(os.homedir(), '.codeinspector', 'extensions');

export default async function install(options) {
  let source;

  if (options && options.length > 0) {
    source = options[0];
  } else {
    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'source',
        message: 'Install from:',
        choices: [
          { name: 'Git URL (GitHub, etc.)', value: 'git' },
          { name: 'Local directory', value: 'local' }
        ]
      }
    ]);

    const inputAnswers = await inquirer.prompt([
      {
        type: 'input',
        name: 'path',
        message: answers.source === 'git' 
          ? 'Git repository URL:' 
          : 'Local extension path:',
        validate: (input) => input.length > 0 || 'Path required'
      }
    ]);

    source = inputAnswers.path;
  }

  const spinner = ora('Installing extension...').start();

  try {
    // Create extensions directory if it doesn't exist
    if (!fs.existsSync(extensionsDir)) {
      fs.mkdirSync(extensionsDir, { recursive: true });
    }

    let extPath;
    
    if (source.startsWith('http') || source.startsWith('git@')) {
      // Clone from git
      spinner.text = 'Cloning repository...';
      
      // Extract extension name from URL
      const match = source.match(/\/([^/]+?)(\.git)?$/);
      const extName = match ? match[1].replace('.git', '') : 'extension';
      
      extPath = path.join(extensionsDir, extName);
      
      // Remove if exists
      if (fs.existsSync(extPath)) {
        fs.rmSync(extPath, { recursive: true });
      }

      const git = simpleGit();
      await git.clone(source, extPath);
    } else {
      // Copy from local directory
      spinner.text = 'Copying extension...';
      
      if (!fs.existsSync(source)) {
        spinner.fail('Source directory not found');
        throw new Error(`Directory not found: ${source}`);
      }

      const extName = path.basename(source);
      extPath = path.join(extensionsDir, extName);

      if (fs.existsSync(extPath)) {
        const answers = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'overwrite',
            message: `Extension "${extName}" already exists. Overwrite?`,
            default: false
          }
        ]);

        if (!answers.overwrite) {
          spinner.fail('Installation cancelled');
          return;
        }

        fs.rmSync(extPath, { recursive: true });
      }

      copyDir(source, extPath);
    }

    // Verify manifest
    spinner.text = 'Verifying extension...';
    const manifestPath = path.join(extPath, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
      spinner.fail('manifest.json not found');
      throw new Error('Invalid extension: missing manifest.json');
    }

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    // Install dependencies
    spinner.text = 'Installing dependencies...';
    const pkgPath = path.join(extPath, 'package.json');
    if (fs.existsSync(pkgPath)) {
      await runCommand('npm', ['install'], extPath);
    }

    spinner.succeed(`✓ Extension installed: ${manifest.name}`);
    console.log(`\nExtension location: ${extPath}`);
    console.log(`Extension ID: ${manifest.id}`);
    console.log('\nRestart CodeInspector to load the extension.');
  } catch (err) {
    spinner.fail('Installation failed');
    throw err;
  }
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const files = fs.readdirSync(src);

  files.forEach(file => {
    if (file === 'node_modules' || file === '.git') {
      return;
    }

    const srcFile = path.join(src, file);
    const destFile = path.join(dest, file);
    const stat = fs.statSync(srcFile);

    if (stat.isDirectory()) {
      copyDir(srcFile, destFile);
    } else {
      fs.copyFileSync(srcFile, destFile);
    }
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
