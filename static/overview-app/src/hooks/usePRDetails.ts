import { useState, useEffect } from 'react';
import { view } from '@forge/bridge';
import { PRDetailsResponse } from '../components/Details/types';
import { invokeResolver, invokeResolverSafe } from '../utils/bridge';

interface RepositoryConfig {
  workspace: string;
  repository: string;
}

interface UsePRDetailsReturn {
  data: PRDetailsResponse | null;
  loading: boolean;
  error: string | null;
  issueKey: string;
  repoConfig: RepositoryConfig;
}

interface ConfigCheckResponse {
  configured?: boolean;
  error?: string;
}

interface RepoConfigResponse {
  success?: boolean;
  workspace?: string;
  repository?: string;
}

interface ViewContext {
  extension?: {
    issue?: {
      key?: string;
    };
  };
}

const getErrorMessage = (error: unknown): string => {
  return error instanceof Error ? error.message : String(error);
};

const getIssueKeyFromContext = async (): Promise<string> => {
  try {
    if (!view || !view.getContext) return '';
    const context = await view.getContext() as ViewContext;
    return context?.extension?.issue?.key || '';
  } catch {
    return '';
  }
};

export const usePRDetails = (): UsePRDetailsReturn => {
  const [data, setData] = useState<PRDetailsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [issueKey, setIssueKey] = useState<string>('');
  const [repoConfig, setRepoConfig] = useState<RepositoryConfig>({ workspace: '', repository: '' });

  useEffect(() => {
    const fetchPRDetails = async (): Promise<void> => {
      try {
        setLoading(true);
        setError(null);

        const configCheckResult = await invokeResolverSafe<ConfigCheckResponse>(
          'checkConfiguration',
          undefined,
          { configured: true },
          (error) => {
            console.warn('Failed to check configuration', error);
          }
        );

        if (!configCheckResult.configured) {
          setError(configCheckResult.error || 'Bitbucket configuration is incomplete');
          setLoading(false);
          return;
        }

        let repo: RepositoryConfig = { workspace: '', repository: '' };

        const configResult = await invokeResolverSafe<RepoConfigResponse>(
          'getRepositoryConfig',
          undefined,
          { success: false },
          (error) => {
            console.warn('Failed to fetch repo config, using defaults', error);
          }
        );

        if (configResult.success) {
          repo = {
            workspace: configResult.workspace || '',
            repository: configResult.repository || ''
          };
          setRepoConfig(repo);
        }

        const localKey = await getIssueKeyFromContext();

        setIssueKey(localKey);

        const result = await invokeResolver<PRDetailsResponse>('getPRWithCommits', {
          workspace: repo.workspace,
          repository: repo.repository,
          issueKey: localKey
        });

        if (result.error) setError(result.error);
        else setData(result);
      } catch (err: unknown) {
        setError(`Failed to load PR details: ${getErrorMessage(err)}`);
      } finally {
        setLoading(false);
      }
    };

    fetchPRDetails();
  }, []);

  return { data, loading, error, issueKey, repoConfig };
};
