import * as dotenv from 'dotenv';

interface AppConfig {
  bitbucket: {
    username?: string;
    appPassword?: string;
  };
  repository: {
    workspace?: string;
    repositorySlug?: string;
  };
}

// Load env values
dotenv.config({ path: '.env.local', override: false });

export const config: AppConfig = {
  bitbucket: {
    username: process.env.BITBUCKET_USERNAME,
    appPassword: process.env.BITBUCKET_APP_PASSWORD
  },
  repository: {
    workspace: process.env.BITBUCKET_WORKSPACE,
    repositorySlug: process.env.BITBUCKET_REPO_SLUG
  }
};

// Validate credentials
export const validateBitbucketCredentials = (): true => {
  if (!config.bitbucket.username || !config.bitbucket.appPassword) {
    throw new Error('Set BITBUCKET_USERNAME and BITBUCKET_APP_PASSWORD in Forge environment variables (or .env.local for local dev)');
  }
  return true;
};

export const isConfigured = (): boolean => {
  return Boolean(
    config.bitbucket.username &&
    config.bitbucket.appPassword &&
    config.repository.workspace &&
    config.repository.repositorySlug
  );
};