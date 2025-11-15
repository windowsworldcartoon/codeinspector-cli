import ora from 'ora';
import inquirer from 'inquirer';
import simpleGit from 'simple-git';
import fs from 'fs';
import path from 'path';

export default async function git(options) {
  const extensionPath = options && options.length > 0 
    ? options[0]
    : process.cwd();

  const gitAnswers = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'Git action:',
      choices: [
        { name: 'Initialize repository', value: 'init' },
        { name: 'Add remote', value: 'addRemote' },
        { name: 'Commit changes', value: 'commit' },
        { name: 'Push to remote', value: 'push' },
        { name: 'View status', value: 'status' }
      ]
    }
  ]);

  const gitInstance = simpleGit(extensionPath);

  switch (gitAnswers.action) {
    case 'init':
      await initRepository(gitInstance);
      break;
    case 'addRemote':
      await addRemote(gitInstance);
      break;
    case 'commit':
      await commitChanges(gitInstance, extensionPath);
      break;
    case 'push':
      await pushChanges(gitInstance);
      break;
    case 'status':
      await viewStatus(gitInstance);
      break;
  }
}

async function initRepository(git) {
  const spinner = ora('Initializing git repository...').start();

  try {
    const isRepo = await git.checkIsRepo();

    if (isRepo) {
      spinner.warn('Already a git repository');
      return;
    }

    await git.init();
    spinner.succeed('Git repository initialized');
  } catch (err) {
    spinner.fail(`Failed: ${err.message}`);
    throw err;
  }
}

async function addRemote(git) {
  const remoteAnswers = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'Remote name:',
      default: 'origin'
    },
    {
      type: 'input',
      name: 'url',
      message: 'Repository URL:',
      validate: (input) => input.length > 0 || 'URL required'
    }
  ]);

  const spinner = ora(`Adding remote ${remoteAnswers.name}...`).start();

  try {
    await git.addRemote(remoteAnswers.name, remoteAnswers.url);
    spinner.succeed(`Remote added: ${remoteAnswers.name}`);
  } catch (err) {
    spinner.fail(`Failed: ${err.message}`);
    throw err;
  }
}

async function commitChanges(git, extensionPath) {
  const spinner = ora('Preparing commit...').start();

  try {
    spinner.text = 'Staging all changes...';
    await git.add('.');

    const status = await git.status();
    if (status.files.length === 0) {
      spinner.warn('No changes to commit');
      return;
    }

    spinner.text = 'Files staged:';
    status.files.forEach(f => console.log(`  - ${f.path}`));

    const commitAnswers = await inquirer.prompt([
      {
        type: 'input',
        name: 'message',
        message: 'Commit message:',
        validate: (input) => input.length > 0 || 'Message required'
      }
    ]);

    spinner.text = 'Creating commit...';
    await git.commit(commitAnswers.message);
    spinner.succeed(`Commit created: "${commitAnswers.message}"`);
  } catch (err) {
    spinner.fail(`Failed: ${err.message}`);
    throw err;
  }
}

async function pushChanges(git) {
  const remoteAnswers = await inquirer.prompt([
    {
      type: 'input',
      name: 'remote',
      message: 'Remote name:',
      default: 'origin'
    },
    {
      type: 'input',
      name: 'branch',
      message: 'Branch name:',
      default: 'main'
    }
  ]);

  const spinner = ora(`Pushing to ${remoteAnswers.remote}/${remoteAnswers.branch}...`).start();

  try {
    await git.push(remoteAnswers.remote, remoteAnswers.branch);
    spinner.succeed('Push successful');
  } catch (err) {
    spinner.fail(`Failed: ${err.message}`);
    throw err;
  }
}

async function viewStatus(git) {
  const spinner = ora('Checking status...').start();

  try {
    const status = await git.status();
    
    spinner.stop();
    console.log('\nGit Status:\n');
    console.log(`Branch: ${status.current}`);
    console.log(`Tracking: ${status.tracking || 'not set'}\n`);

    if (status.files.length > 0) {
      console.log('Modified files:');
      status.files.forEach(f => {
        const icon = f.index === '?' ? '?' : f.index === 'M' ? '◆' : '■';
        console.log(`  ${icon} ${f.path}`);
      });
    } else {
      console.log('No changes');
    }

    console.log(`\nAhead: ${status.ahead || 0}, Behind: ${status.behind || 0}`);
  } catch (err) {
    spinner.fail(`Failed: ${err.message}`);
    throw err;
  }
}
