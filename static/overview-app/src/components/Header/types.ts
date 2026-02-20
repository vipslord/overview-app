import { Approver } from '../../utils/types';

export interface PullRequest {
  id?: number;
  title: string;
  status?: string;
  state?: string;
  link: string;
  author?: string;
  created: string;
  sourceBranch: string;
  destBranch: string;
  approved?: boolean;
  approvals?: number;
  approvers?: Approver[];
}
