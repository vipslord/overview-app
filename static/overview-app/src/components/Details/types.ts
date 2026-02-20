import { PullRequest } from '../Header/types';
import { Commit } from '../Commits/types';

export interface PRDetailsResponse {
  pr: PullRequest;
  commits: Commit[];
  commitCount: number;
  error?: string;
}

export interface TransitionMessage {
  type: 'success' | 'error';
  text: string;
}
