import ora from 'ora';
import chalk from 'chalk';
import { checkForUpdates } from '../utils/check-updates.js';

export default async function checkUpdates() {
  const spinner = ora('Checking for updates...').start();

  try {
    const updateInfo = await checkForUpdates();

    spinner.stop();

    if (!updateInfo) {
      console.log(chalk.yellow('⚠  Could not check for updates\n'));
      return;
    }

    if (updateInfo.error) {
      console.log(chalk.red(`✗ Error checking updates\n`));
      console.log(`  Status: ${chalk.yellow(updateInfo.status)} ${updateInfo.statusText}`);
      console.log(`  Message: ${updateInfo.error}\n`);
      return;
    }

    if (!updateInfo.current || !updateInfo.latest) {
      console.log(chalk.yellow('⚠  Could not check for updates (no internet connection)\n'));
      return;
    }

    console.log('\nVersion Information:\n');
    console.log(`  Current: ${chalk.cyan(updateInfo.current)}`);
    console.log(`  Latest:  ${chalk.cyan(updateInfo.latest)}`);
    console.log(`  Status:  ${chalk.green(updateInfo.status)} ${updateInfo.statusText}`);

    if (updateInfo.isOutdated === true) {
      console.log(`\n${chalk.yellow('⚠')}  ${chalk.bold('Update available!')}\n`);
      console.log(`  ${chalk.gray('Run:')} ${chalk.cyan('npm install -g @codeinspector/cli')}\n`);
    } else if (updateInfo.isOutdated === false) {
      console.log(`\n${chalk.green('✓')}  ${chalk.bold('Already on the latest version!')}\n`);
    }
  } catch (err) {
    spinner.fail(`Failed to check for updates: ${err.message}`);
  }
}
