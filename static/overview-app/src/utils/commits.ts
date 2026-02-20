export const INITIAL_VISIBLE_COMMITS = 5;

export const getVisibleCommits = <T>(items: T[], visibleCount: number): T[] => {
  return items.slice(0, visibleCount);
};

export const getShortCommitHash = (hash: string): string => {
  return hash.substring(0, 7);
};

export const getNextVisibleCount = (current: number, total: number, step: number): number => {
  return current < total ? Math.min(total, current + step) : step;
};

export const getToggleLabel = (current: number, total: number): string => {
  return current < total ? 'Show more' : 'Show less';
};