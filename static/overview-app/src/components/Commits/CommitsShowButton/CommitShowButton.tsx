import React from 'react';
import { Commit } from '../types';
import { getNextVisibleCount, getToggleLabel } from '../../../utils/commits';
import { BG_COLOR, BORDER_COLOR } from '../../../utils/constants';

interface CommitShowButtonProps {
  commits: Commit[];
  visibleCount: number;
  initialVisible: number;
  setVisibleCount: (updater: (prev: number) => number) => void;
}

const CommitShowButton: React.FC<CommitShowButtonProps> = ({ commits, visibleCount, initialVisible, setVisibleCount }) => {
  return (
    <div style={{ textAlign: 'center', marginTop: 8 }}>
      <button
        onClick={() => setVisibleCount(v => getNextVisibleCount(v, commits.length, initialVisible))}
        style={{ padding: '8px 12px', background: BG_COLOR.TRANSPARENT, border: `1px solid ${BORDER_COLOR.NEUTRAL_ALT}`, borderRadius: 4, cursor: 'pointer' }}
      >
        {getToggleLabel(visibleCount, commits.length)}
      </button>
    </div>
  );
};

export default CommitShowButton;