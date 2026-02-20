const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const dotenv = require('dotenv');

const rootDir = process.cwd();
const envFilePath = path.join(rootDir, '.env.local');

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');

const envFlagIndex = args.findIndex(arg => arg === '-e' || arg === '--environment');
const environment = envFlagIndex >= 0 ? args[envFlagIndex + 1] : undefined;

const variableConfig = [
  { key: 'BITBUCKET_USERNAME', encrypted: true },
  { key: 'BITBUCKET_APP_PASSWORD', encrypted: true },
  { key: 'BITBUCKET_WORKSPACE', encrypted: false },
  { key: 'BITBUCKET_REPO_SLUG', encrypted: false }
];

const buildForgeArgs = ({ key, value, encrypted }) => {
  const forgeArgs = ['variables', 'set'];

  if (encrypted) {
    forgeArgs.push('--encrypt');
  }

  if (environment) {
    forgeArgs.push('--environment', environment);
  }

  forgeArgs.push(key, value);
  return forgeArgs;
};

const maskValue = (value) => {
  if (!value) return '<empty>';
  if (value.length <= 4) return '****';
  return `${value.slice(0, 2)}***${value.slice(-2)}`;
};

const runForgeVariablesSet = ({ key, value, encrypted }) => {
  const forgeArgs = buildForgeArgs({ key, value, encrypted });
  const masked = encrypted ? maskValue(value) : value;

  if (isDryRun) {
    return 0;
  }

  const result = spawnSync('forge', forgeArgs, {
    stdio: 'inherit',
    shell: true,
    cwd: rootDir
  });

  return result.status ?? 1;
};

const main = () => {
  if (!fs.existsSync(envFilePath)) {
    console.error(`Missing .env.local file at: ${envFilePath}`);
    process.exit(1);
  }

  const parsed = dotenv.parse(fs.readFileSync(envFilePath, 'utf8'));

  const missing = variableConfig
    .map(item => item.key)
    .filter(key => !parsed[key]);

  if (missing.length > 0) {
    console.error(`Missing required keys in .env.local: ${missing.join(', ')}`);
    process.exit(1);
  }

  for (const item of variableConfig) {
    const exitCode = runForgeVariablesSet({
      key: item.key,
      value: parsed[item.key],
      encrypted: item.encrypted
    });

    if (exitCode !== 0) {
      console.error(`Failed to set ${item.key}`);
      process.exit(exitCode);
    }
  }

};

main();