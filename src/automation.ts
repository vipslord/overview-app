import { asApp, asUser, route } from '@forge/api';
import Resolver from '@forge/resolver';
import { ISSUE_STATUS_CATEGORY, ISSUE_TARGET_KEYWORD } from './constants';

interface AutomationState {
  autoMovedToDone?: boolean;
  autoMovedToToDo?: boolean;
  manuallyMovedFromDone?: boolean;
}

interface JiraStatusInfo {
  currentStatus: string;
  currentCategory: string;
}

interface IssuePropertyResult {
  ok: boolean;
  value?: AutomationState | null;
  status?: number;
  text?: string;
}

interface TransitionResponse {
  success: boolean;
  moved?: boolean;
  already?: boolean;
  reason?: string;
  currentStatus?: string;
  currentCategory?: string;
  error?: string;
}

interface JiraTransition {
  id: string;
  name?: string;
  to?: {
    name?: string;
    statusCategory?: {
      key?: string;
    };
  };
}

interface ResolverPayload {
  issueKey?: string;
  targetName?: string;
  isAuto?: boolean;
  state?: AutomationState;
}

const AUTOMATION_PROP_KEY = 'overview-app.automationState';
const AUTO_MOVE_PROP_KEY = 'overview-app.autoMove';

// Format error text
const toErrorMessage = (error: unknown): string => {
  return error instanceof Error ? error.message : String(error);
};

// Normalize to lower
const normalizeLower = (value: string | undefined | null): string => {
  return String(value || '').toLowerCase();
};

// Resolve target category
const getDesiredCategoryKey = (targetName: string): string | null => {
  const targetLower = normalizeLower(targetName);

  if (targetLower.includes(ISSUE_TARGET_KEYWORD.DONE)) return ISSUE_STATUS_CATEGORY.DONE;

  if (
    targetLower.includes(ISSUE_TARGET_KEYWORD.TODO) ||
    targetLower.includes(ISSUE_TARGET_KEYWORD.TODO_COMPACT) ||
    targetLower.includes(ISSUE_TARGET_KEYWORD.NEW)
  ) {
    return ISSUE_STATUS_CATEGORY.NEW;
  }

  if (
    targetLower.includes(ISSUE_TARGET_KEYWORD.IN_PROGRESS) ||
    targetLower.includes(ISSUE_TARGET_KEYWORD.IN_PROGRESS_COMPACT) ||
    targetLower.includes(ISSUE_TARGET_KEYWORD.INDETERMINATE)
  ) {
    return ISSUE_STATUS_CATEGORY.INDETERMINATE;
  }

  return null;
};

// Skip repeated auto
const shouldSkipAutoDoneMove = ({ isAuto, targetName, automationState }: { isAuto: boolean; targetName: string; automationState: AutomationState }) => {
  if (!isAuto) return false;
  if (!normalizeLower(targetName).includes(ISSUE_TARGET_KEYWORD.DONE)) return false;

  return Boolean(automationState.autoMovedToDone || automationState.manuallyMovedFromDone);
};

// Check target reached
const isAlreadyAtTarget = ({
  targetName,
  desiredCategoryKey,
  currentStatus,
  currentCategory
}: {
  targetName: string;
  desiredCategoryKey: string | null;
  currentStatus: string;
  currentCategory: string;
}) => {
  const targetLower = normalizeLower(targetName);
  return (
    (desiredCategoryKey && currentCategory === desiredCategoryKey) ||
    (targetLower && currentStatus.includes(targetLower))
  );
};

// Find matching transition
const findMatchingTransition = (
  transitions: JiraTransition[] | undefined,
  targetName: string,
  desiredCategoryKey: string | null
): JiraTransition | undefined => {
  const targetLower = normalizeLower(targetName);

  return transitions?.find((transition) =>
    (desiredCategoryKey && transition?.to?.statusCategory?.key === desiredCategoryKey) ||
    normalizeLower(transition?.to?.name).includes(targetLower) ||
    normalizeLower(transition?.name).includes(targetLower)
  );
};

// Load issue status
const loadIssueStatus = async (issueKey: string): Promise<JiraStatusInfo> => {
  const issueRes = await asUser().requestJira(route`/rest/api/3/issue/${issueKey}?fields=status`, {
    method: 'GET',
    headers: { Accept: 'application/json' }
  });

  if (!issueRes.ok) {
    const text = await issueRes.text();
    console.error(`Failed to fetch issue ${issueKey}: ${issueRes.status} ${text}`);
    throw new Error(`Failed to fetch issue: ${issueRes.status}`);
  }

  const issueData = await issueRes.json() as {
    fields?: {
      status?: {
        name?: string;
        statusCategory?: { key?: string };
      };
    };
  };

  const currentStatus = normalizeLower(issueData.fields?.status?.name);
  const currentCategory = normalizeLower(issueData.fields?.status?.statusCategory?.key);

  return { currentStatus, currentCategory };
};

const getIssueProperty = async (issueKey: string, propKey: string): Promise<IssuePropertyResult> => {
  const propRes = await asApp().requestJira(route`/rest/api/3/issue/${issueKey}/properties/${propKey}`, {
    method: 'GET'
  });

  if (!propRes.ok) {
    return { ok: false };
  }

  const propData = await propRes.json() as { value?: AutomationState | null };
  return { ok: true, value: propData.value || null };
};

const setIssueProperty = async (issueKey: string, propKey: string, value: unknown): Promise<IssuePropertyResult> => {
  const propRes = await asApp().requestJira(route`/rest/api/3/issue/${issueKey}/properties/${propKey}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(value)
  });

  if (!propRes.ok) {
    const text = await propRes.text();
    return { ok: false, status: propRes.status, text };
  }

  return { ok: true };
};

// Execute transition flow
const transitionIssue = async (issueKey: string, targetName: string, isAuto = false): Promise<TransitionResponse> => {
  try {
    const { currentStatus, currentCategory } = await loadIssueStatus(issueKey);

    if (isAuto && normalizeLower(targetName).includes(ISSUE_TARGET_KEYWORD.DONE)) {
      try {
        const existing = await getIssueProperty(issueKey, AUTOMATION_PROP_KEY);

        if (existing.ok) {
          const state = existing.value || {};

          if (shouldSkipAutoDoneMove({ isAuto, targetName, automationState: state })) {
            return {
              success: true,
              moved: false,
              already: true,
              reason: 'auto-move disabled after first run or manual change'
            };
          }
        }
      } catch (error) {
        console.warn('Failed to read automationState for auto transition', toErrorMessage(error));
      }
    }

    const desiredCategoryKey = getDesiredCategoryKey(targetName);

    if (isAlreadyAtTarget({ targetName, desiredCategoryKey, currentStatus, currentCategory })) {
      return { success: true, moved: false, already: true, currentStatus, currentCategory };
    }

    const transitionsRes = await asUser().requestJira(route`/rest/api/3/issue/${issueKey}/transitions`, {
      method: 'GET',
      headers: { Accept: 'application/json' }
    });

    if (!transitionsRes.ok) {
      return { success: false, error: `Failed to fetch transitions: ${transitionsRes.status}` };
    }

    const transitionsData = await transitionsRes.json() as { transitions?: JiraTransition[] };
    const found = findMatchingTransition(transitionsData.transitions, targetName, desiredCategoryKey);

    if (!found) {
      return { success: false, error: `No "${targetName}" transition available for this issue` };
    }

    const transitionRes = await asUser().requestJira(route`/rest/api/3/issue/${issueKey}/transitions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ transition: { id: found.id } })
    });

    if (!transitionRes.ok) {
      return { success: false, error: `Transition failed: ${transitionRes.status}` };
    }

    try {
      const result = await setIssueProperty(issueKey, AUTO_MOVE_PROP_KEY, {
        target: targetName,
        timestamp: Date.now(),
        isAuto
      });

      if (!result.ok) {
        console.warn('Failed to write autoMove property', result.status, result.text);
      }
    } catch (error) {
      console.warn('Failed to write autoMove property', toErrorMessage(error));
    }

    if (isAuto && normalizeLower(targetName).includes(ISSUE_TARGET_KEYWORD.DONE)) {
      try {
        const existing = await getIssueProperty(issueKey, AUTOMATION_PROP_KEY);
        const currentState = existing.ok ? existing.value || {} : {};
        const newState: AutomationState = { ...currentState, autoMovedToDone: true };
        await setIssueProperty(issueKey, AUTOMATION_PROP_KEY, newState);
      } catch (error) {
        console.warn('Failed to persist automationState for auto transition', toErrorMessage(error));
      }
    }

    return { success: true, moved: true };
  } catch (error) {
    const message = toErrorMessage(error);
    console.error(`Error in transitionIssue: ${message}`);
    return { success: false, error: message };
  }
};

// Register automation resolvers
export const registerAutomationResolvers = (resolver: Resolver): void => {
  // Issue transition resolver
  resolver.define('transitionIssue', async ({ payload }) => {
    const typedPayload = (payload || {}) as ResolverPayload;
    const issueKey = typedPayload.issueKey;
    const targetName = typedPayload.targetName;
    const isAuto = Boolean(typedPayload.isAuto);

    if (!issueKey || !targetName) {
      return { success: false, error: 'issueKey and targetName are required' };
    }

    return transitionIssue(issueKey, targetName, isAuto);
  });

  // Issue status resolver
  resolver.define('getIssueStatus', async ({ payload }) => {
    const typedPayload = (payload || {}) as ResolverPayload;
    const issueKey = typedPayload.issueKey;

    if (!issueKey) {
      return { success: false, error: 'issueKey is required' };
    }

    try {
      const { currentCategory } = await loadIssueStatus(issueKey);
      return { success: true, currentStatus: currentCategory };
    } catch (error) {
      return { success: false, error: toErrorMessage(error) };
    }
  });

  // Automation state resolver
  resolver.define('getAutomationState', async ({ payload }) => {
    const typedPayload = (payload || {}) as ResolverPayload;
    const issueKey = typedPayload.issueKey;

    if (!issueKey) {
      return { success: false, error: 'issueKey is required', state: null };
    }

    try {
      const existing = await getIssueProperty(issueKey, AUTOMATION_PROP_KEY);

      if (!existing.ok) {
        return { success: true, state: null };
      }

      return { success: true, state: existing.value || null };
    } catch (error) {
      return { success: false, error: toErrorMessage(error), state: null };
    }
  });

  resolver.define('saveAutomationState', async ({ payload }) => {
    const typedPayload = (payload || {}) as ResolverPayload;
    const issueKey = typedPayload.issueKey;
    const state = typedPayload.state;

    if (!issueKey || !state) {
      return { success: false, error: 'issueKey and state are required' };
    }

    try {
      const result = await setIssueProperty(issueKey, AUTOMATION_PROP_KEY, state);

      if (!result.ok) {
        return { success: false, error: `Failed to save automation state: ${result.status} ${result.text}` };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: toErrorMessage(error) };
    }
  });
};