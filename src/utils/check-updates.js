import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packagePath = path.join(__dirname, '..', '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

const NPM_REGISTRY = 'https://registry.npmjs.org';
const CACHE_DIR = path.join(process.env.HOME || process.env.USERPROFILE, '.codeinspector');
const CACHE_FILE = path.join(CACHE_DIR, 'update-check.json');
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export async function checkForUpdates() {
  try {
    // Check cache first
    const cached = getCachedUpdateInfo();
    if (cached) {
      return cached;
    }

    // Fetch from npm registry
    const updateInfo = await fetchLatestVersion();
    
    // Save to cache
    cacheUpdateInfo(updateInfo);
    
    return updateInfo;
  } catch (err) {
    // Silently fail - don't interrupt the user
    return null;
  }
}

export function displayUpdateNotification(updateInfo) {
  if (!updateInfo || !updateInfo.isOutdated) {
    return;
  }

  console.log(`\n${chalk.yellow('⚠')}  ${chalk.bold('New version available!')} ${chalk.gray(updateInfo.current)} → ${chalk.green(updateInfo.latest)}`);
  console.log(`${chalk.gray('   Run')} ${chalk.cyan('npm install -g @codeinspector/cli')} ${chalk.gray('to update\n')}`);
}

async function fetchLatestVersion() {
  try {
    const response = await axios.get(`${NPM_REGISTRY}/${pkg.name}`, {
      timeout: 5000,
      validateStatus: (status) => status >= 200 && status < 300
    });

    if (!response.data['dist-tags'] || !response.data['dist-tags'].latest) {
      throw new Error('Invalid response format from npm registry');
    }

    const latest = response.data['dist-tags'].latest;
    const current = pkg.version;
    const isOutdated = compareVersions(current, latest) < 0;

    return {
      current,
      latest,
      isOutdated,
      timestamp: Date.now(),
      status: 200,
      statusText: 'OK'
    };
  } catch (err) {
    // Handle specific HTTP errors
    if (err.response) {
      const status = err.response.status;
      const statusText = err.response.statusText;

      const errorInfo = {
        current: null,
        latest: null,
        isOutdated: null,
        timestamp: Date.now(),
        status,
        statusText,
        error: true
      };

      if (status === 404) {
        errorInfo.error = 'Package not found in npm registry';
        return errorInfo;
      } else if (status >= 500) {
        errorInfo.error = `npm registry error (${status} ${statusText})`;
        return errorInfo;
      } else if (status >= 400) {
        errorInfo.error = `npm registry request failed (${status} ${statusText})`;
        return errorInfo;
      }
    } else if (err.code === 'ECONNABORTED') {
      return {
        current: null,
        latest: null,
        isOutdated: null,
        timestamp: Date.now(),
        status: 0,
        statusText: 'Timeout',
        error: 'npm registry request timeout'
      };
    } else if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
      return {
        current: null,
        latest: null,
        isOutdated: null,
        timestamp: Date.now(),
        status: 0,
        statusText: 'Connection Error',
        error: 'Cannot connect to npm registry'
      };
    }

    // Unknown error
    return {
      current: null,
      latest: null,
      isOutdated: null,
      timestamp: Date.now(),
      status: 0,
      statusText: 'Unknown Error',
      error: err.message
    };
  }
}

function getCachedUpdateInfo() {
  try {
    if (!fs.existsSync(CACHE_FILE)) {
      return null;
    }

    const cached = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    const age = Date.now() - cached.timestamp;

    if (age > CACHE_TTL) {
      return null;
    }

    return cached;
  } catch (err) {
    return null;
  }
}

function cacheUpdateInfo(updateInfo) {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
    fs.writeFileSync(CACHE_FILE, JSON.stringify(updateInfo), 'utf8');
  } catch (err) {
    // Silently fail
  }
}

function compareVersions(v1, v2) {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;

    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }

  return 0;
}
