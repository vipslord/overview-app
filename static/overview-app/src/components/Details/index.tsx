import React, { FC, useMemo } from 'react';
import Header from '../Header';
import Approvals from '../Approvals';
import TransitionButton from '../TransitionButton';
import Commits from '../Commits';
import RestoreNotification from './RestoreNotification/RestoreNotification';
import StatusMessage from './StatusMessage/StatusMessage';
import { usePRDetails } from '../../hooks/usePRDetails';
import { useIssueStatus } from '../../hooks/useIssueStatus';
import { useIssueAutomation } from '../../hooks/useIssueAutomation';
import { getSuggestedTarget, statusToLower } from '../../utils';
import { AUTOMATION_MESSAGE, BG_COLOR, ISSUE_STATUS, PR_STATUS, TEXT_COLOR } from '../../utils/constants';

const Details: FC = () => {
  const { data, loading, error, issueKey } = usePRDetails();
  const { currentIssueStatus, setCurrentIssueStatus } = useIssueStatus(issueKey);

  const suggestedTarget = useMemo(() => {
    if (!data?.pr) return null;
    return getSuggestedTarget(data.pr);
  }, [data?.pr]);

  const {
    transitionLoading,
    transitionMessage,
    manuallyRemovedFromDone,
    restoringFromDone,
    handleMoveToDone,
    handleRestoreToDone
  } = useIssueAutomation({
    issueKey,
    pr: data?.pr,
    suggestedTarget,
    currentIssueStatus,
    setCurrentIssueStatus
  });

  if (loading) return <div style={{ padding: 10 }}>Loading PR details...</div>;

  if (!data?.pr) {
    return <div style={{ padding: 10, color: TEXT_COLOR.SUBTLE }}>No PR data available</div>;
  }

  const { pr, commits, commitCount } = data;
  const isMerged = statusToLower(pr) === PR_STATUS.MERGED;
  const isIssueDone = (currentIssueStatus || '').toLowerCase() === ISSUE_STATUS.DONE;
  const showRestoreNotification =
    manuallyRemovedFromDone &&
    isMerged &&
    !isIssueDone &&
    transitionMessage?.text !== AUTOMATION_MESSAGE.RESTORED_DONE;

  return (
    <div style={{ padding: 10 }}>
      <Header pr={pr} />
      <Approvals pr={pr} />

      {showRestoreNotification && (
        <RestoreNotification
          isRestoringFromDone={restoringFromDone}
          onRestoreToDone={handleRestoreToDone}
        />
      )}

      <StatusMessage message={transitionMessage} />

      {!manuallyRemovedFromDone && (
        <TransitionButton
          suggestedTarget={suggestedTarget}
          currentIssueStatus={currentIssueStatus}
          transitionLoading={transitionLoading}
          handleMove={handleMoveToDone}
        />
      )}

      <div style={{ padding: '15px', backgroundColor: BG_COLOR.COMMITS_PANEL, borderRadius: 4 }}>
        <h3 style={{ marginTop: 0, marginBottom: 15 }}>
          Commits ({commitCount})
        </h3>
        <Commits commits={commits} />
      </div>
    </div>
  );
};

export default Details;
