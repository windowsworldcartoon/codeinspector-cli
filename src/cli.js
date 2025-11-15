#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import * as commands from './commands/index.js';
import { checkForUpdates, displayUpdateNotification } from './utils/check-updates.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
const command = args[0];
const options = args.slice(1);

if (!command || command === '--help' || command === '-h') {
  showHelp();
  process.exit(0);
}

if (command === '--version' || command === '-v') {
  const pkgPath = path.join(__dirname, '..', 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  console.log(pkg.version);
  process.exit(0);
}

if (typeof commands[command] === 'function') {
  // Check for updates in background
  checkForUpdates().then(displayUpdateNotification);

  commands[command](options).catch(err => {
    console.error(chalk.red(`Error: ${err.message}`));
    process.exit(1);
  });
} else {
  console.error(chalk.red(`Unknown command: ${command}`));
  showHelp();
  process.exit(1);
}

function showHelp() {
  console.log(`
${chalk.cyan('CodeInspector CLI')}

${chalk.yellow('Usage:')}
  codeinspector [command] [options]

${chalk.yellow('Commands:')}
  ${chalk.cyan('create [name]')}         Create a new extension
  ${chalk.cyan('list')}                  List installed extensions
  ${chalk.cyan('validate [path]')}       Validate extension manifest
  ${chalk.cyan('publish [path]')}        Publish extension (git, github)
  ${chalk.cyan('git [path]')}            Manage git repository
  ${chalk.cyan('dev [path]')}            Start development server with file watching
  ${chalk.cyan('check-updates')}         Check for CLI updates
  ${chalk.cyan('help')}                  Show this help message

${chalk.yellow('Options:')}
  ${chalk.green('--help, -h')}          Show help
  ${chalk.green('--version, -v')}       Show version

${chalk.yellow('Examples:')}
  ${chalk.gray('codeinspector create my-extension')}
  ${chalk.gray('codeinspector list')}
  ${chalk.gray('codeinspector validate')}
  ${chalk.gray('codeinspector git')}
  ${chalk.gray('codeinspector publish')}
  ${chalk.gray('codeinspector dev')}
  ${chalk.gray('codeinspector check-updates')}
  `);
}
