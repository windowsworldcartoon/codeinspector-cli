import fs from 'fs';
import path from 'path';
import ora from 'ora';

export default async function validate(options) {
  const extensionPath = options && options.length > 0 
    ? options[0]
    : process.cwd();

  const manifestPath = path.join(extensionPath, 'manifest.json');
  const spinner = ora('Validating extension...').start();

  if (!fs.existsSync(manifestPath)) {
    spinner.fail(`manifest.json not found in ${extensionPath}`);
    throw new Error(`manifest.json not found in ${extensionPath}`);
  }

  let manifest;
  try {
    spinner.text = 'Parsing manifest.json...';
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (err) {
    spinner.fail(`Invalid JSON in manifest.json: ${err.message}`);
    throw new Error(`Invalid JSON in manifest.json: ${err.message}`);
  }

  const errors = [];
  const warnings = [];

  spinner.text = 'Checking required fields...';

  // Validate required fields
  if (!manifest.id) errors.push('Missing required field: id');
  if (!manifest.name) errors.push('Missing required field: name');
  if (!manifest.version) errors.push('Missing required field: version');
  if (!manifest.main) errors.push('Missing required field: main');

  // Validate version format
  if (manifest.version && !isValidVersion(manifest.version)) {
    errors.push('Invalid version format (should be semantic: x.y.z)');
  }

  // Check if main file exists
  if (manifest.main) {
    const mainPath = path.join(extensionPath, manifest.main);
    if (!fs.existsSync(mainPath)) {
      warnings.push(`Main file not found: ${manifest.main}`);
    }
  }

  // Check for optional but recommended fields
  if (!manifest.description) warnings.push('Missing recommended field: description');
  if (!manifest.author) warnings.push('Missing recommended field: author');

  if (errors.length > 0) {
    spinner.fail('Validation failed');
    console.error('\nErrors:');
    errors.forEach(err => console.error(`  ✗ ${err}`));
    throw new Error('Manifest validation failed');
  }

  spinner.succeed('Manifest is valid');

  if (warnings.length > 0) {
    console.log('\nWarnings:');
    warnings.forEach(warn => console.log(`  ⚠ ${warn}`));
  }

  console.log('\nExtension Details:');
  console.log(`  ID: ${manifest.id}`);
  console.log(`  Name: ${manifest.name}`);
  console.log(`  Version: ${manifest.version}`);
  console.log(`  Main: ${manifest.main}`);
}

function isValidVersion(version) {
  return /^\d+\.\d+\.\d+/.test(version);
}
