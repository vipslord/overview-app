import React, { FC } from 'react';
import { PullRequest } from '../Header/types';
import { formatApprovers } from '../../utils';
import { TEXT_COLOR } from '../../utils/constants';

interface ApprovalsProps {
  pr: PullRequest;
}

const Approvals: FC<ApprovalsProps> = ({ pr }) => {
  if (!pr.approvers || pr.approvers.length === 0) return null;

  return (
    <div style={{ marginTop: 8 }}>
      <strong style={{ color: TEXT_COLOR.STATUS_OPEN }}>Approved</strong>
      {typeof pr.approvals === 'number' && <span style={{ marginLeft: 8, color: TEXT_COLOR.MUTED }}>
        ({pr.approvals > 3 ? '3+' : pr.approvals})
      </span>}
      <div style={{ marginTop: 6, color: TEXT_COLOR.BODY, fontSize: 13 }}>
        <strong style={{ fontWeight: 600 }}>Approved by:</strong> 
        {formatApprovers(pr.approvers)}
      </div>
    </div>
  );
};

export default Approvals;
