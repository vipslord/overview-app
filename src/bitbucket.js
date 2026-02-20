import { fetch } from '@forge/api';
import { config, validateBitbucketCredentials } from './config.js';
import { BITBUCKET_PR_STATE, PR_STATUS } from './constants.js';

const bitbucketFetch = async (path, options = {}) => {
  validateBitbucketCredentials();

  const { username, appPassword } = config.bitbucket;
  const auth = Buffer.from(`${username}:${appPassword}`).toString('base64');

  const res = await fetch(`https://api.bitbucket.org/2.0${path}`, {
    ...options,
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Bitbucket API Error ${res.status}: ${text}`);
  }

  return res.json();
};

const PR_STATES_QUERY = 'state=OPEN&state=MERGED&state=DECLINED&state=CLOSED&pagelen=50';

const toErrorMessage = (error) => {
  return error instanceof Error ? error.message : String(error);
};

const stripApiBase = (url) => {
  return (url || '').replace('https://api.bitbucket.org/2.0', '');
};

const getMissingConfigurationFields = () => {
  const missingFields = [];

  if (!config.bitbucket.username) missingFields.push('BITBUCKET_USERNAME');
  if (!config.bitbucket.appPassword) missingFields.push('BITBUCKET_APP_PASSWORD');
  if (!config.repository.workspace) missingFields.push('BITBUCKET_WORKSPACE');
  if (!config.repository.repositorySlug) missingFields.push('BITBUCKET_REPO_SLUG');

  return missingFields;
};

const findPrByIssueKey = async (workspace, repository, issueKey) => {
  let url = `/repositories/${workspace}/${repository}/pullrequests?${PR_STATES_QUERY}`;
  let targetPR = null;
  const allBranches = [];

  while (url && !targetPR) {
    const data = await bitbucketFetch(stripApiBase(url));

    targetPR = (data.values || []).find(pr => {
      const branch = pr.source?.branch?.name || '';
      allBranches.push(branch);
      return branch.includes(issueKey);
    });

    if (!targetPR) {
      url = data.next ? stripApiBase(data.next) : null;
    }
  }

  return { targetPR, allBranches };
};

const mapCommits = (commitsData) => {
  return (commitsData.values || []).map(commit => ({
    hash: commit.hash,
    message: commit.message,
    author:
      commit.author?.user?.display_name ||
      commit.author?.raw?.split('<')[0] ||
      'Unknown',
    date: commit.date,
    link: commit.links?.html?.href
  }));
};

const loadPrCommits = async (workspace, repository, prId) => {
  const commitsData = await bitbucketFetch(
    `/repositories/${workspace}/${repository}/pullrequests/${prId}/commits?pagelen=100`
  );
  return mapCommits(commitsData);
};

const loadPrApprovals = async (workspace, repository, prId) => {
  let approved = false;
  let approvals = 0;
  let approvers = [];

  try {
    const prDetails = await bitbucketFetch(`/repositories/${workspace}/${repository}/pullrequests/${prId}`);
    const approvedParticipants = (prDetails.participants || []).filter(p => p.approved === true);
    approvals = approvedParticipants.length;
    approved = approvals > 0;
    approvers = approvedParticipants.map(p => ({
      name: p.user?.display_name || p.user?.nickname || p.user?.username || 'Unknown',
      accountId: p.user?.account_id || null
    }));
  } catch (e) {
    console.warn('Failed to fetch PR details for approvals', toErrorMessage(e));
  }

  return { approved, approvals, approvers };
};

const normalisePrStatus = (rawState, isDraft) => {
  const upper = (rawState || '').toUpperCase();

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

export const registerBitbucketResolvers = (resolver) => {
  // Check config resolver
  resolver.define('checkConfiguration', async () => {
    const missingFields = getMissingConfigurationFields();

    if (missingFields.length > 0) {
      return {
        success: false,
        configured: false,
        error: `Missing configuration in .env.local: ${missingFields.join(', ')}`
      };
    }

    return { success: true, configured: true };
  });

  // Repo config resolver
  resolver.define('getRepositoryConfig', async () => {
    try {
      return {
        success: true,
        workspace: config.repository.workspace,
        repository: config.repository.repositorySlug
      };
    } catch (e) {
      return { success: false, error: toErrorMessage(e) };
    }
  });

  // PR details resolver
  resolver.define('getPRWithCommits', async ({ payload }) => {
    const {
      workspace = config.repository.workspace,
      repository = config.repository.repositorySlug,
      issueKey = ''
    } = payload || {};

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
