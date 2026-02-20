import { fetch } from '@forge/api';
import Resolver from '@forge/resolver';
import { config, validateBitbucketCredentials } from './config';
import { BITBUCKET_PR_STATE, PR_STATUS, type PullRequestStatus } from './constants';

interface BitbucketUser {
  display_name?: string;
  nickname?: string;
  username?: string;
  account_id?: string;
}

interface BitbucketParticipant {
  approved?: boolean;
  user?: BitbucketUser;
}

interface BitbucketPullRequest {
  id: number;
  title: string;
  state?: string;
  draft?: boolean;
  author?: {
    display_name?: string;
  };
  created_on?: string;
  source?: { branch?: { name?: string } };
  destination?: { branch?: { name?: string } };
  links?: { html?: { href?: string } };
  participants?: BitbucketParticipant[];
}

interface BitbucketCommit {
  hash?: string;
  message?: string;
  author?: {
    user?: { display_name?: string };
    raw?: string;
  };
  date?: string;
  links?: { html?: { href?: string } };
}

interface BitbucketListResponse<T> {
  values?: T[];
  next?: string;
}

interface Approver {
  name: string;
  accountId: string | null;
}

interface CommitInfo {
  hash: string;
  message: string;
  author: string;
  date: string;
  link: string;
}

interface ResolverPayload {
  workspace?: string;
  repository?: string;
  issueKey?: string;
}

const PR_STATES_QUERY = 'state=OPEN&state=MERGED&state=DECLINED&state=CLOSED&pagelen=50';
type ForgeRequestInit = NonNullable<Parameters<typeof fetch>[1]>;

// Format error text
const toErrorMessage = (error: unknown): string => {
  return error instanceof Error ? error.message : String(error);
};

// Call Bitbucket API
const bitbucketFetch = async <TResponse>(path: string, options: ForgeRequestInit = {}): Promise<TResponse> => {
  validateBitbucketCredentials();

  const { username, appPassword } = config.bitbucket;
  const auth = Buffer.from(`${username}:${appPassword}`).toString('base64');
  const rawHeaders = options.headers;
  const normalizedHeaders: Record<string, string> = (
    rawHeaders && typeof rawHeaders === 'object' && !Array.isArray(rawHeaders)
      ? rawHeaders
      : {}
  ) as Record<string, string>;

  const res = await fetch(`https://api.bitbucket.org/2.0${path}`, {
    ...options,
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
      ...normalizedHeaders
    }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Bitbucket API Error ${res.status}: ${text}`);
  }

  return res.json() as Promise<TResponse>;
};

const stripApiBase = (url?: string): string => {
  return String(url || '').replace('https://api.bitbucket.org/2.0', '');
};

// Check missing config
const getMissingConfigurationFields = (): string[] => {
  const missingFields: string[] = [];

  if (!config.bitbucket.username) missingFields.push('BITBUCKET_USERNAME');
  if (!config.bitbucket.appPassword) missingFields.push('BITBUCKET_APP_PASSWORD');
  if (!config.repository.workspace) missingFields.push('BITBUCKET_WORKSPACE');
  if (!config.repository.repositorySlug) missingFields.push('BITBUCKET_REPO_SLUG');

  return missingFields;
};

// Find PR branch
const findPrByIssueKey = async (workspace: string, repository: string, issueKey: string) => {
  let url: string | null = `/repositories/${workspace}/${repository}/pullrequests?${PR_STATES_QUERY}`;
  let targetPR: BitbucketPullRequest | null = null;
  const allBranches: string[] = [];

  while (url && !targetPR) {
    const data: BitbucketListResponse<BitbucketPullRequest> = await bitbucketFetch<BitbucketListResponse<BitbucketPullRequest>>(stripApiBase(url));

    targetPR = (data.values || []).find((pr) => {
      const branch = pr.source?.branch?.name || '';
      allBranches.push(branch);
      return branch.includes(issueKey);
    }) || null;

    if (!targetPR) {
      url = data.next ? stripApiBase(data.next) : null;
    }
  }

  return { targetPR, allBranches };
};

const mapCommits = (commitsData: BitbucketListResponse<BitbucketCommit>): CommitInfo[] => {
  return (commitsData.values || []).map((commit) => ({
    hash: commit.hash || '',
    message: commit.message || '',
    author:
      commit.author?.user?.display_name ||
      commit.author?.raw?.split('<')[0] ||
      'Unknown',
    date: commit.date || '',
    link: commit.links?.html?.href || ''
  }));
};

// Load PR commits
const loadPrCommits = async (workspace: string, repository: string, prId: number): Promise<CommitInfo[]> => {
  const commitsData = await bitbucketFetch<BitbucketListResponse<BitbucketCommit>>(
    `/repositories/${workspace}/${repository}/pullrequests/${prId}/commits?pagelen=100`
  );
  return mapCommits(commitsData);
};

// Load PR approvals
const loadPrApprovals = async (workspace: string, repository: string, prId: number) => {
  let approved = false;
  let approvals = 0;
  let approvers: Approver[] = [];

  try {
    const prDetails = await bitbucketFetch<BitbucketPullRequest>(`/repositories/${workspace}/${repository}/pullrequests/${prId}`);
    const approvedParticipants = (prDetails.participants || []).filter((participant) => participant.approved === true);
    approvals = approvedParticipants.length;
    approved = approvals > 0;
    approvers = approvedParticipants.map((participant) => ({
      name: participant.user?.display_name || participant.user?.nickname || participant.user?.username || 'Unknown',
      accountId: participant.user?.account_id || null
    }));
  } catch (error) {
    console.warn('Failed to fetch PR details for approvals', toErrorMessage(error));
  }

  return { approved, approvals, approvers };
};

const normalisePrStatus = (rawState?: string, isDraft?: boolean): PullRequestStatus => {
  const upper = String(rawState || '').toUpperCase();

  switch (upper) {
    case BITBUCKET_PR_STATE.MERGED:
      return PR_STATUS.MERGED;
    case BITBUCKET_PR_STATE.OPEN:
      return isDraft === true ? PR_STATUS.DRAFT : PR_STATUS.OPEN;
    case BITBUCKET_PR_STATE.DECLINED:
      return PR_STATUS.DECLINED;
    default:
      return PR_STATUS.CLOSED;
  }
};

export const registerBitbucketResolvers = (resolver: Resolver): void => {
  resolver.define('checkConfiguration', async () => {
    const missingFields = getMissingConfigurationFields();

    if (missingFields.length > 0) {
      return {
        success: false,
        configured: false,
        error: `Missing configuration in Forge environment variables: ${missingFields.join(', ')}`
      };
    }

    return { success: true, configured: true };
  });

  resolver.define('getRepositoryConfig', async () => {
    try {
      return {
        success: true,
        workspace: config.repository.workspace,
        repository: config.repository.repositorySlug
      };
    } catch (error) {
      return { success: false, error: toErrorMessage(error) };
    }
  });

  resolver.define('getPRWithCommits', async ({ payload }) => {
    const typedPayload = (payload || {}) as ResolverPayload;
    const workspace = typedPayload.workspace || config.repository.workspace;
    const repository = typedPayload.repository || config.repository.repositorySlug;
    const issueKey = typedPayload.issueKey || '';

    if (!workspace || !repository || !issueKey) {
      throw new Error('workspace, repository and issueKey are required');
    }

    const { targetPR, allBranches } = await findPrByIssueKey(workspace, repository, issueKey);

    if (!targetPR) {
      return { error: `No PR found for ${issueKey}. Checked branches: ${allBranches.join(', ')}` };
    }

    const commits = await loadPrCommits(workspace, repository, targetPR.id);
    const { approved, approvals, approvers } = await loadPrApprovals(workspace, repository, targetPR.id);
    const normalisedStatus = normalisePrStatus(targetPR.state, targetPR.draft);

    return {
      pr: {
        id: targetPR.id,
        title: targetPR.title,
        approved,
        approvals,
        approvers,
        author: targetPR.author?.display_name,
        created: targetPR.created_on,
        state: targetPR.state,
        status: normalisedStatus,
        link: targetPR.links?.html?.href,
        sourceBranch: targetPR.source?.branch?.name,
        destBranch: targetPR.destination?.branch?.name
      },
      commits,
      commitCount: commits.length
    };
  });
};