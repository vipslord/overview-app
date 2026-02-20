export const PR_STATUS = {
  OPEN: 'open',
  MERGED: 'merged',
  DRAFT: 'draft',
  DECLINED: 'declined',
  CLOSED: 'closed'
} as const;

export const BITBUCKET_PR_STATE = {
  OPEN: 'OPEN',
  MERGED: 'MERGED',
  DECLINED: 'DECLINED'
} as const;

export const ISSUE_STATUS_CATEGORY = {
  NEW: 'new',
  DONE: 'done',
  INDETERMINATE: 'indeterminate'
} as const;

export const ISSUE_TARGET_KEYWORD = {
  DONE: 'done',
  TODO: 'to do',
  TODO_COMPACT: 'todo',
  NEW: 'new',
  IN_PROGRESS: 'in progress',
  IN_PROGRESS_COMPACT: 'inprogress',
  INDETERMINATE: 'indeterminate'
} as const;

export type PullRequestStatus = typeof PR_STATUS[keyof typeof PR_STATUS];