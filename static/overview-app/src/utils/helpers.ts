import { StatusColors } from './types';
import { PullRequest } from '../components/Header/types';
import { Approver } from './types';
import { BG_COLOR, ISSUE_STATUS, ISSUE_TARGET, ISSUE_TARGET_KEYWORD, PR_STATUS, TEXT_COLOR } from './constants';

type Status =
  | typeof PR_STATUS.OPEN
  | typeof PR_STATUS.MERGED
  | typeof PR_STATUS.DRAFT
  | typeof PR_STATUS.DECLINED
  | typeof PR_STATUS.CLOSED;

const STATUS_COLORS: Record<Status, StatusColors> = {
  [PR_STATUS.OPEN]: { bg: BG_COLOR.STATUS_OPEN, color: TEXT_COLOR.STATUS_OPEN },
  [PR_STATUS.MERGED]: { bg: BG_COLOR.STATUS_MERGED, color: TEXT_COLOR.STATUS_MERGED },
  [PR_STATUS.DRAFT]: { bg: BG_COLOR.STATUS_DRAFT, color: TEXT_COLOR.STATUS_DRAFT },
  [PR_STATUS.DECLINED]: { bg: BG_COLOR.STATUS_MESSAGE_ERROR, color: TEXT_COLOR.ERROR },
  [PR_STATUS.CLOSED]: { bg: BG_COLOR.STATUS_MESSAGE_ERROR, color: TEXT_COLOR.ERROR }
};

const DEFAULT_STATUS: StatusColors = {
  bg: BG_COLOR.STATUS_DEFAULT,
  color: TEXT_COLOR.STATUS_DEFAULT
};

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit'
});

export const normalizeStatus = (value: string | null | undefined): string => {
  return String(value || '').toLowerCase().trim();
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return DATE_TIME_FORMATTER.format(date);
};

// Resolve status colors
export const getStatusColors = (status?: string): StatusColors => {
  return STATUS_COLORS[status as Status] ?? DEFAULT_STATUS;
};

// Format approver names
export const formatApprovers = (approvers: Approver[] | undefined): string => {
  if (!approvers || approvers.length === 0) return '';
  return approvers.slice(0, 3).map(a => a.name).join(', ');
};

export const statusToLower = (pr: PullRequest): string => {
  return normalizeStatus(pr.status || String(pr.state || ''));
};

export const toDisplayStatus = (status: string): string => {
  if (!status) return '';
  return status.charAt(0).toUpperCase() + status.slice(1);
};

// Map target category
export const getTargetCategory = (target: string | null | undefined): string | null => {
  const normalized = normalizeStatus(target);

  if (normalized.includes(ISSUE_TARGET_KEYWORD.DONE)) {
    return ISSUE_STATUS.DONE;
  }

  if (
    normalized.includes(ISSUE_TARGET_KEYWORD.TODO) ||
    normalized.includes(ISSUE_TARGET_KEYWORD.TODO_COMPACT) ||
    normalized.includes(ISSUE_TARGET_KEYWORD.NEW)
  ) {
    return ISSUE_STATUS.NEW;
  }

  if (
    normalized.includes(ISSUE_TARGET_KEYWORD.IN_PROGRESS) ||
    normalized.includes(ISSUE_TARGET_KEYWORD.IN_PROGRESS_COMPACT) ||
    normalized.includes(ISSUE_TARGET_KEYWORD.INDETERMINATE) ||
    normalized.includes('in review')
  ) {
    return ISSUE_STATUS.INDETERMINATE;
  }

  return null;
};

// Suggest issue target
export const getSuggestedTarget = (pr: PullRequest, currentIssueStatus?: string | null): string | null => {
  const s = statusToLower(pr);
  const isApproved = Boolean(pr.approvals && pr.approvals > 0);
  const isMerged = s === PR_STATUS.MERGED;
  const isOpen = s === PR_STATUS.OPEN;
  const isDraft = s === PR_STATUS.DRAFT;
  const isDeclinedOrClosed = s === PR_STATUS.DECLINED || s === PR_STATUS.CLOSED;
  const issueCategory = normalizeStatus(currentIssueStatus);
  
  if (isMerged) return issueCategory === ISSUE_STATUS.DONE ? null : ISSUE_TARGET.DONE;
  if (isDeclinedOrClosed) return issueCategory === ISSUE_STATUS.NEW ? null : ISSUE_TARGET.TODO;
  if (isOpen) return issueCategory === ISSUE_STATUS.INDETERMINATE ? null : ISSUE_TARGET.IN_PROGRESS;
  if (isDraft && isApproved) return issueCategory === ISSUE_STATUS.INDETERMINATE ? null : ISSUE_TARGET.IN_PROGRESS;
  return null;
};

// Compare statuses
export const compareStatuses = (status1: string | null, status2: string | null): boolean => {
  return normalizeStatus(status1) === normalizeStatus(status2);
};
