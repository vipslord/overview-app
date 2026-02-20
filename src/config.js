import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '../.env.local');
dotenv.config({ path: envPath, override: false });

export const config = {
  bitbucket: {
    username: process.env.BITBUCKET_USERNAME,
    appPassword: process.env.BITBUCKET_APP_PASSWORD,
  },
  repository: {
    workspace: process.env.BITBUCKET_WORKSPACE,
    repositorySlug: process.env.BITBUCKET_REPO_SLUG,
  },
};

 // Config check
export const validateBitbucketCredentials = () => {
  if (!config.bitbucket.username || !config.bitbucket.appPassword) {
    throw new Error(
      'Pls set BITBUCKET_USERNAME and BITBUCKET_APP_PASSWORD in .env.local'
    );
  }
  return true;
};

export const isConfigured = () => {
  return !!(
    config.bitbucket.username && 
    config.bitbucket.appPassword &&
    config.repository.workspace &&
    config.repository.repositorySlug
  );
};
