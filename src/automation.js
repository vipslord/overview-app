import { asUser, asApp, route } from '@forge/api';
import { ISSUE_STATUS_CATEGORY, ISSUE_TARGET_KEYWORD } from './constants.js';

const AUTOMATION_PROP_KEY = 'overview-app.automationState';
const AUTO_MOVE_PROP_KEY = 'overview-app.autoMove';

const normalizeLower = (value) => {
  return String(value || '').toLowerCase();
};

const getDesiredCategoryKey = (targetName) => {
  const targetLower = normalizeLower(targetName);

  if (targetLower.includes(ISSUE_TARGET_KEYWORD.DONE)) return ISSUE_STATUS_CATEGORY.DONE;

  if (
    targetLower.includes(ISSUE_TARGET_KEYWORD.IN_PROGRESS) ||
    targetLower.includes(ISSUE_TARGET_KEYWORD.IN_PROGRESS_COMPACT) ||
    targetLower.includes(ISSUE_TARGET_KEYWORD.INDETERMINATE)
  ) {
    return ISSUE_STATUS_CATEGORY.INDETERMINATE;
  }

  return null;
};

const shouldSkipAutoDoneMove = ({ isAuto, targetName, automationState }) => {
  if (!isAuto) return false;
  if (!normalizeLower(targetName).includes(ISSUE_TARGET_KEYWORD.DONE)) return false;

  return Boolean(automationState.autoMovedToDone || automationState.manuallyMovedFromDone);
};

const isAlreadyAtTarget = ({ targetName, desiredCategoryKey, currentStatus, currentCategory }) => {
  const targetLower = normalizeLower(targetName);
  return (
    (desiredCategoryKey && currentCategory === desiredCategoryKey) ||
    (targetLower && currentStatus.includes(targetLower))
  );
};

const findMatchingTransition = (transitions, targetName, desiredCategoryKey) => {
  const targetLower = normalizeLower(targetName);

  return transitions?.find(t =>
    (desiredCategoryKey && t?.to?.statusCategory?.key === desiredCategoryKey) ||
    normalizeLower(t?.to?.name).includes(targetLower) ||
    normalizeLower(t?.name).includes(targetLower)
  );
};

const loadIssueStatus = async (issueKey) => {
  const issueRes = await asUser().requestJira(route`/rest/api/3/issue/${issueKey}?fields=status`, {
    method: 'GET',
    headers: { Accept: 'application/json' }
  });

  if (!issueRes.ok) {
    const text = await issueRes.text();
    console.error(`Failed to fetch issue ${issueKey}: ${issueRes.status} ${text}`);
    throw new Error(`Failed to fetch issue: ${issueRes.status}`);
  }

  const issueData = await issueRes.json();
  const currentStatus = normalizeLower(issueData.fields?.status?.name);
  const currentCategory = normalizeLower(issueData.fields?.status?.statusCategory?.key);

  return { currentStatus, currentCategory };
};

// Read a Jira issue property
const getIssueProperty = async (issueKey, propKey) => {
  const propRes = await asApp().requestJira(route`/rest/api/3/issue/${issueKey}/properties/${propKey}`, {
    method: 'GET'
  });

  if (!propRes.ok) {
    return { ok: false };
  }

  const propData = await propRes.json();
  return { ok: true, value: propData.value || null };
};

// Write a Jira issue property
const setIssueProperty = async (issueKey, propKey, value) => {
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

const transitionIssue = async (issueKey, targetName, isAuto = false) => {
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
      } catch (e) {
        console.warn('Failed to read automationState for auto transition', e.message || e);
      }
    }

    const desiredCategoryKey = getDesiredCategoryKey(targetName);

    if (isAlreadyAtTarget({ targetName, desiredCategoryKey, currentStatus, currentCategory })) {
      return { success: true, moved: false, already: true, currentStatus, currentCategory };
    }

    const transitionsRes = await asUser().requestJira(route`/rest/api/3/issue/${issueKey}/transitions`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!transitionsRes.ok) {
      return { success: false, error: `Failed to fetch transitions: ${transitionsRes.status}` };
    }

    const transitionsData = await transitionsRes.json();

    const found = findMatchingTransition(transitionsData.transitions, targetName, desiredCategoryKey);

    if (!found) {
      return { success: false, error: `No "${targetName}" transition available for this issue` };
    }

    const transitionRes = await asUser().requestJira(route`/rest/api/3/issue/${issueKey}/transitions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ transition: { id: found.id } })
    });

    if (!transitionRes.ok) {
      return { success: false, error: `Transition failed: ${transitionRes.status}` };
    }

    try {
      const res = await setIssueProperty(issueKey, AUTO_MOVE_PROP_KEY, {
        target: targetName,
        timestamp: Date.now(),
        isAuto
      });
      if (!res.ok) {
        console.warn('Failed to write autoMove property', res.status, res.text);
      }
    } catch (e) {
      console.warn('Failed to write autoMove property', e.message || e);
    }

    if (isAuto && normalizeLower(targetName).includes(ISSUE_TARGET_KEYWORD.DONE)) {
      try {
        const existing = await getIssueProperty(issueKey, AUTOMATION_PROP_KEY);
        const currentState = existing.ok ? existing.value || {} : {};
        const newState = { ...currentState, autoMovedToDone: true };
        await setIssueProperty(issueKey, AUTOMATION_PROP_KEY, newState);
      } catch (e) {
        console.warn('Failed to persist automationState for auto transition', e.message || e);
      }
    }

    return { success: true, moved: true };
  } catch (error) {
    console.error(`Error in transitionIssue: ${error.message}`);
    return { success: false, error: error.message };
  }
};

// Register automation resolvers
export const registerAutomationResolvers = (resolver) => {
  resolver.define('transitionIssue', async ({ payload }) => {
    const { issueKey, targetName, isAuto } = payload || {};

    if (!issueKey || !targetName) {
      return { success: false, error: 'issueKey and targetName are required' };
    }

    try {
      return await transitionIssue(issueKey, targetName, Boolean(isAuto));
    } catch (e) {
      return { success: false, error: e.message || String(e) };
    }
  });

  // Get issue status resolver
  resolver.define('getIssueStatus', async ({ payload }) => {
    const { issueKey } = payload || {};

    if (!issueKey) {
      return { success: false, error: 'issueKey is required' };
    }

    try {
      const { currentCategory } = await loadIssueStatus(issueKey);
      return { success: true, currentStatus: currentCategory };
    } catch (e) {
      return { success: false, error: e.message || String(e) };
    }
  });

  // Load automation state resolver
  resolver.define('getAutomationState', async ({ payload }) => {
    const { issueKey } = payload || {};

    if (!issueKey) {
      return { success: false, error: 'issueKey is required', state: null };
    }

    try {
      const existing = await getIssueProperty(issueKey, AUTOMATION_PROP_KEY);

      if (!existing.ok) {
        return { success: true, state: null };
      }

      return { success: true, state: existing.value || null };
    } catch (e) {
      return { success: false, error: e.message || String(e), state: null };
    }
  });

  // Save automation state resolver
  resolver.define('saveAutomationState', async ({ payload }) => {
    const { issueKey, state } = payload || {};

    if (!issueKey || !state) {
      return { success: false, error: 'issueKey and state are required' };
    }

    try {
      const res = await setIssueProperty(issueKey, AUTOMATION_PROP_KEY, state);

      if (!res.ok) {
        return { success: false, error: `Failed to save automation state: ${res.status} ${res.text}` };
      }

      return { success: true };
    } catch (e) {
      return { success: false, error: e.message || String(e) };
    }
  });
};
