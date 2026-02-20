export const PR_STATUS = {
  OPEN: 'open',
  MERGED: 'merged',
  DRAFT: 'draft',
  DECLINED: 'declined',
  CLOSED: 'closed'
} as const;

export const ISSUE_STATUS = {
  NEW: 'new',
  DONE: 'done',
  INDETERMINATE: 'indeterminate'
} as const;

export const ISSUE_TARGET = {
  DONE: 'Done',
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress'
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

export const AUTOMATION_MESSAGE = {
  RESTORED_DONE: 'Issue restored to Done'
} as const;

export enum BG_COLOR {
  STATUS_DEFAULT = '#FFF7D6',
  STATUS_OPEN = '#DFFCF0',
  STATUS_MERGED = '#E8F4FF',
  STATUS_DRAFT = '#F3F0FF',
  STATUS_MESSAGE_ERROR = '#FFECEB',
  HEADER_PANEL = '#F5F5F5',
  COMMITS_PANEL = '#F9F9F9',
  CARD = '#FFFFFF',
  PRIMARY = '#0052CC',
  TRANSPARENT = 'transparent'
}

export enum TEXT_COLOR {
  STATUS_DEFAULT = '#805E00',
  STATUS_OPEN = '#216E4E',
  STATUS_MERGED = '#0747A6',
  STATUS_DRAFT = '#403294',
  ERROR = '#AE2A19',
  PRIMARY = '#0052CC',
  MUTED = '#666',
  SUBTLE = '#999',
  BODY = '#333',
  INVERSE = '#FFFFFF'
}

export enum BORDER_COLOR {
  PRIMARY = '#0052CC',
  NEUTRAL = '#DDD',
  NEUTRAL_ALT = '#CCC',
  STATUS_DEFAULT = '#805E00',
  NONE = 'none'
}