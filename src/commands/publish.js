import fs from 'fs';
import path from 'path';
import ora from 'ora';
import inquirer from 'inquirer';
import simpleGit from 'simple-git';

export default async function publish(options) {
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

  const spinner = ora('Preparing to publish...').start();

  try {
    // Validate extension first
    spinner.text = 'Validating extension...';
    const { default: validate } = await import('./validate.js');
    try {
      await validate([extensionPath]);
    } catch (err) {
      spinner.fail('Validation failed');
      throw new Error(`Cannot publish: ${err.message}`);
    }

    const pkgPath = path.join(extensionPath, 'package.json');
    if (!fs.existsSync(pkgPath)) {
      spinner.fail('package.json not found');
      throw new Error('package.json not found in extension directory');
    }

    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    spinner.succeed('Extension validated\n');

    // Ask where to publish
    const publishAnswers = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'targets',
        message: 'Where would you like to publish?',
        choices: [
          { name: 'GitHub', value: 'github', checked: true },
          { name: 'Git Repository', value: 'git' }
        ],
        validate: (choices) => choices.length > 0 || 'Select at least one target'
      }
    ]);

    // Git initialization and push
    if (publishAnswers.targets.includes('git') || publishAnswers.targets.includes('github')) {
      await setupGit(extensionPath, pkg);
    }

    // GitHub creation and push
    if (publishAnswers.targets.includes('github')) {
      await pushToGitHub(extensionPath, pkg);
    }

    spinner.succeed(`\n✓ Publishing complete!`);
  } catch (err) {
    spinner.fail(err.message);
    throw err;
  }
}

async function setupGit(extensionPath, pkg) {
  const spinner = ora('Setting up git repository...').start();

  try {
    const git = simpleGit(extensionPath);
    const isRepo = await git.checkIsRepo();

    if (!isRepo) {
      spinner.text = 'Initializing git repository...';
      await git.init();
    }

    // Check if remote exists
    const remotes = await git.getRemotes();
    const originExists = remotes.some(r => r.name === 'origin');

    if (!originExists) {
      const gitAnswers = await inquirer.prompt([
        {
          type: 'input',
          name: 'repo',
          message: 'Repository URL (e.g., git@github.com:username/repo.git):',
          validate: (input) => input.length > 0 || 'Repository URL required'
        }
      ]);

      spinner.text = 'Adding remote origin...';
      await git.addRemote('origin', gitAnswers.repo);
    }

    spinner.text = 'Staging changes...';
    await git.add('.');

    // Check if there are changes to commit
    const status = await git.status();
    if (status.files.length > 0) {
      spinner.text = 'Creating commit...';
      await git.commit(`v${pkg.version}: Release ${pkg.version}`);
    }

    spinner.text = 'Pushing to repository...';
    try {
      await git.push('origin', 'main');
    } catch (err) {
      // Try master branch if main fails
      try {
        await git.push('origin', 'master');
      } catch (e) {
        spinner.warn('Could not push to remote (you may need to set up branch)');
      }
    }

    spinner.succeed('Git repository updated');
  } catch (err) {
    spinner.fail(`Git setup failed: ${err.message}`);
    throw err;
  }
}

async function pushToGitHub(extensionPath, pkg) {
  const spinner = ora('Configuring GitHub...').start();

  try {
    const git = simpleGit(extensionPath);

    // Get repository info from git remote
    const remotes = await git.getRemotes(true);
    const originRemote = remotes.find(r => r.name === 'origin');

    if (!originRemote) {
      spinner.fail('No git remote found');
      throw new Error('Please set up git remote first');
    }

    spinner.text = 'Parsing GitHub repository...';

    // Extract owner and repo from URL
    const url = originRemote.refs.push;
    const match = url.match(/github\.com[:/]([^/]+)\/(.+?)(?:\.git)?$/);

    if (!match) {
      spinner.fail('Could not parse GitHub repository URL');
      throw new Error('Repository must be on GitHub');
    }

    const owner = match[1];
    const repo = match[2].replace('.git', '');

    // Ask for GitHub token
    spinner.stop();
    const tokenAnswers = await inquirer.prompt([
      {
        type: 'password',
        name: 'token',
        message: 'GitHub token (create at https://github.com/settings/tokens):',
        validate: (input) => input.length > 0 || 'Token required'
      }
    ]);

    spinner.start('Creating GitHub release...');

    // Create release via GitHub API
    const releaseUrl = `https://api.github.com/repos/${owner}/${repo}/releases`;
    const response = await fetch(releaseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `token ${tokenAnswers.token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify({
        tag_name: `v${pkg.version}`,
        name: `Release ${pkg.version}`,
        body: pkg.description || `Version ${pkg.version}`,
        draft: false,
        prerelease: false
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `GitHub API error: ${response.status}`);
    }

    spinner.succeed(`✓ Release published: ${owner}/${repo} v${pkg.version}`);
  } catch (err) {
    spinner.fail(`GitHub publishing failed: ${err.message}`);
    throw err;
  }
}


