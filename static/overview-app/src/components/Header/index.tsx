import React, { FC } from 'react';
import { PullRequest } from './types';
import { formatDate, getStatusColors, statusToLower, toDisplayStatus } from '../../utils';
import { BG_COLOR, BORDER_COLOR, TEXT_COLOR } from '../../utils/constants';

interface HeaderProps {
  pr: PullRequest;
}

const Header: FC<HeaderProps> = ({ pr }) => {
  const status = statusToLower(pr);
  const { bg, color } = getStatusColors(status);

  return (
    <div style={{ padding: '15px', marginBottom: '15px', border: `2px solid ${BORDER_COLOR.PRIMARY}`, borderRadius: '4px', backgroundColor: BG_COLOR.HEADER_PANEL }}>
      <h2 style={{ marginTop: 0, marginBottom: '10px', color: TEXT_COLOR.PRIMARY }}>
        <a href={pr.link} target="_blank" rel="noopener noreferrer" style={{ color: TEXT_COLOR.PRIMARY, textDecoration: 'none' }}>
          {pr.title}
        </a>
      </h2>
      <div style={{ marginBottom: '10px' }}><strong>Author:</strong> 
        {pr.author || 'Unknown'}
      </div>
      <div style={{ marginBottom: '10px' }}><strong>Created:</strong> 
        {formatDate(pr.created)}
      </div>
      <div style={{ marginBottom: '10px' }}>
        <strong>Status:</strong>{' '}
        <span style={{ padding: '4px 8px', borderRadius: '3px', backgroundColor: bg, color }}>
          {toDisplayStatus(status)}
        </span>
      </div>
      <div style={{ marginBottom: '10px' }}>
        <strong>Branch:</strong> {pr.sourceBranch} → {pr.destBranch}
      </div>
      <div style={{ marginBottom: '10px' }}>
        <strong>Bitbucket Link:</strong>{' '}
        <a href={pr.link} target="_blank" rel="noopener noreferrer" style={{ color: TEXT_COLOR.PRIMARY }}>
          Open in Bitbucket
        </a>
      </div>
    </div>
  );
};

export default Header;
