import React, { FC } from 'react';
import { Commit } from '../types';
import { getShortCommitHash } from '../../../utils/commits';
import { formatDate } from '../../../utils';
import { BG_COLOR, BORDER_COLOR, TEXT_COLOR } from '../../../utils/constants';

interface CommitDetailsProps {
  commit: Commit;
}

const CommitDetails: FC<CommitDetailsProps> = ({ commit }) => {
  return (
    <a 
      href={commit.link} 
      target="_blank" 
      rel="noopener noreferrer" 
      style={{ 
        display: 'block', 
        padding: '12px', 
        marginBottom: '10px', 
        border: `1px solid ${BORDER_COLOR.NEUTRAL}`,
        borderRadius: '4px', 
        backgroundColor: BG_COLOR.CARD,
        textDecoration: 'none', 
        color: 'inherit' 
      }}
    >
      <div style={{ marginBottom: '6px' }}>
        <strong style={{ color: TEXT_COLOR.PRIMARY }}>{getShortCommitHash(commit.hash)}</strong> - <span style={{ color: TEXT_COLOR.BODY }}>
          {commit.message}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px', color: TEXT_COLOR.MUTED }}>
        <div><strong>Author:</strong> {commit.author}</div>
        <div><strong>Date:</strong> {formatDate(commit.date)}</div>
      </div>
    </a>
  );
};

export default CommitDetails;
