import { StatusColors } from './types';
import { PullRequest } from '../components/Header/types';
import { Approver } from './types';
import { BG_COLOR, ISSUE_TARGET, PR_STATUS, TEXT_COLOR } from './constants';

type Status =
  | typeof PR_STATUS.OPEN
  | typeof PR_STATUS.MERGED
  | typeof PR_STATUS.DRAFT;

const STATUS_COLORS: Record<Status, StatusColors> = {
  [PR_STATUS.OPEN]: { bg: BG_COLOR.STATUS_OPEN, color: TEXT_COLOR.STATUS_OPEN },
  [PR_STATUS.MERGED]: { bg: BG_COLOR.STATUS_MERGED, color: TEXT_COLOR.STATUS_MERGED },
  [PR_STATUS.DRAFT]: { bg: BG_COLOR.STATUS_DRAFT, color: TEXT_COLOR.STATUS_DRAFT }
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

export const getStatusColors = (status?: string): StatusColors => {
  const normalized = normalizeStatus(status);
  return STATUS_COLORS[normalized as Status] ?? DEFAULT_STATUS;
};

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

export const getSuggestedTarget = (pr: PullRequest): string | null => {
  const s = statusToLower(pr);
  const isApproved = Boolean(pr.approvals && pr.approvals > 0);
  const isMerged = s === PR_STATUS.MERGED;
  const isDeclinedOrClosed = s === PR_STATUS.DECLINED || s === PR_STATUS.CLOSED;
  
  if (isMerged) return ISSUE_TARGET.DONE;
  if (isDeclinedOrClosed) return ISSUE_TARGET.TODO;
  if ((s === PR_STATUS.OPEN || s === PR_STATUS.DRAFT) && isApproved) return ISSUE_TARGET.IN_PROGRESS;
  return null;
};

export const compareStatuses = (status1: string | null, status2: string | null): boolean => {
  return normalizeStatus(status1) === normalizeStatus(status2);
};
