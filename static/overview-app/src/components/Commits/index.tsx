import React, { FC, useState } from 'react';
import { Commit } from './types';
import CommitDetails from './CommitsDetails/CommitDetails';
import CommitShowButton from './CommitsShowButton/CommitShowButton';
import { getVisibleCommits, INITIAL_VISIBLE_COMMITS } from '../../utils/commits';
import { TEXT_COLOR } from '../../utils/constants';

interface CommitsProps {
  commits: Commit[];
}

const Commits: FC<CommitsProps> = ({ commits }) => {
  const [visibleCount, setVisibleCount] = useState<number>(INITIAL_VISIBLE_COMMITS);

  if (!commits || commits.length === 0) return <div style={{ color: TEXT_COLOR.SUBTLE }}>
    No commits found
  </div>;

  return (
    <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
      {getVisibleCommits(commits, visibleCount).map((commit) => (
        <CommitDetails key={commit.hash} commit={commit} />
      ))}
      {commits.length > INITIAL_VISIBLE_COMMITS && (
        <CommitShowButton 
          commits={commits} 
          visibleCount={visibleCount} 
          initialVisible={INITIAL_VISIBLE_COMMITS}
          setVisibleCount={setVisibleCount} 
        />
      )}
    </div>
  );
};

export default Commits;
