import { useEffect, useState } from 'react';
import { statusToLower } from '../utils';
import { PullRequest } from '../components/Header/types';
import { TransitionMessage } from '../components/Details/types';
import { invokeResolver, invokeResolverSafe } from '../utils/bridge';
import { AUTOMATION_MESSAGE, ISSUE_STATUS, ISSUE_TARGET, PR_STATUS } from '../utils/constants';

interface Props {
  issueKey?: string;
  pr?: PullRequest;
  suggestedTarget: string | null;
  currentIssueStatus: string | null;
  setCurrentIssueStatus: (status: string) => void;
}

interface AutomationState {
  autoMovedToDone?: boolean;
  autoMovedToToDo?: boolean;
  manuallyMovedFromDone?: boolean;
}

interface ResolverResponse {
  success?: boolean;
  moved?: boolean;
  error?: string;
}

const buildSuccessMessage = (text: string): TransitionMessage => ({
  type: 'success',
  text
});

const buildErrorMessage = (error: unknown): TransitionMessage => ({
  type: 'error',
  text: error instanceof Error ? error.message : String(error)
});

export const useIssueAutomation = ({
  issueKey,
  pr,
  suggestedTarget,
  currentIssueStatus,
  setCurrentIssueStatus
}: Props) => {
  const [automationState, setAutomationState] = useState<AutomationState>({});
  const [transitionLoading, setTransitionLoading] = useState(false);
  const [transitionMessage, setTransitionMessage] = useState<TransitionMessage | null>(null);
  const [manuallyRemovedFromDone, setManuallyRemovedFromDone] = useState(false);
  const [restoringFromDone, setRestoringFromDone] = useState(false);

  const saveState = async (state: AutomationState) => {
    if (!issueKey) return;

    const result = await invokeResolverSafe<ResolverResponse>(
      'saveAutomationState',
      { issueKey, state },
      { success: false }
    );

    if (result.success) {
      setAutomationState(state);
    }
  };

  useEffect(() => {
    if (!issueKey || !pr) return;

    const loadAutomationState = async () => {
      const res = await invokeResolverSafe<{ success?: boolean; state?: AutomationState }>(
        'getAutomationState',
        { issueKey },
        { success: false, state: {} }
      );

      if (res.success) {
        setAutomationState(res.state || {});
      }
    };

    loadAutomationState();
  }, [issueKey, pr]);

  useEffect(() => {
    if (
      !issueKey ||
      !automationState?.autoMovedToDone ||
      !currentIssueStatus
    ) return;

    const isCurrentlyDone = currentIssueStatus.toLowerCase() === ISSUE_STATUS.DONE;

    if (!isCurrentlyDone && !automationState.manuallyMovedFromDone) {
      const markManualMove = async () => {
        const newState: AutomationState = {
          ...automationState,
          manuallyMovedFromDone: true
        };

        await saveState(newState);
        setManuallyRemovedFromDone(true);
      };

      markManualMove();
    }

    if (!isCurrentlyDone) {
      setManuallyRemovedFromDone(true);
    }
  }, [issueKey, currentIssueStatus, automationState]);

  useEffect(() => {
    if (!issueKey || !pr || !suggestedTarget) return;

    const autoTransition = async () => {
      const prStatus = statusToLower(pr);
      const isMerged = prStatus === PR_STATUS.MERGED;
      const isDeclinedOrClosed =
        prStatus === PR_STATUS.DECLINED || prStatus === PR_STATUS.CLOSED;

      if (!isMerged && !isDeclinedOrClosed) return;

      if (isMerged && automationState.manuallyMovedFromDone) return;

      if (isMerged && automationState.autoMovedToDone) return;
      if (isDeclinedOrClosed && automationState.autoMovedToToDo) return;

      setTransitionLoading(true);

      try {
        const res = await invokeResolver<ResolverResponse>('transitionIssue', {
          issueKey,
          targetName: suggestedTarget,
          isAuto: true
        });
        const moved = res?.moved !== undefined ? res.moved : res?.success;

        if (res?.success && moved) {
          const newState: AutomationState = isMerged
            ? { autoMovedToDone: true }
            : { autoMovedToToDo: true };

          await saveState(newState);

          setTransitionMessage(buildSuccessMessage(`Issue automatically moved to ${suggestedTarget}`));

          setCurrentIssueStatus(suggestedTarget.toLowerCase());
          setManuallyRemovedFromDone(false);
        }
      } catch (err) {
        console.warn('Auto transition failed:', err);
      } finally {
        setTransitionLoading(false);
      }
    };

    autoTransition();
  }, [issueKey, pr, suggestedTarget, automationState]);

  const handleMoveToDone = async () => {
    if (!issueKey || !suggestedTarget) return;

    setTransitionLoading(true);
    setTransitionMessage(null);

    try {
      const res = await invokeResolver<ResolverResponse>('transitionIssue', {
        issueKey,
        targetName: suggestedTarget
      });

      if (res?.success) {
        setTransitionMessage(buildSuccessMessage(`Issue ${issueKey} moved to ${suggestedTarget}`));

        setCurrentIssueStatus(suggestedTarget.toLowerCase());
      }
    } catch (err) {
      setTransitionMessage(buildErrorMessage(err));
    } finally {
      setTransitionLoading(false);
    }
  };

  const handleRestoreToDone = async () => {
    if (!issueKey) return;

    setRestoringFromDone(true);
    setTransitionMessage(null);

    try {
      const res = await invokeResolver<ResolverResponse>('transitionIssue', {
        issueKey,
        targetName: ISSUE_TARGET.DONE
      });

      if (res?.success) {
        const newState: AutomationState = {
          ...automationState,
          manuallyMovedFromDone: false
        };

        await saveState(newState);
        setCurrentIssueStatus(ISSUE_STATUS.DONE);
        setManuallyRemovedFromDone(false);

        setTransitionMessage(buildSuccessMessage(AUTOMATION_MESSAGE.RESTORED_DONE));
      }
    } catch (err) {
      setTransitionMessage(buildErrorMessage(err));
    } finally {
      setRestoringFromDone(false);
    }
  };

  return {
    transitionLoading,
    transitionMessage,
    manuallyRemovedFromDone,
    restoringFromDone,
    handleMoveToDone,
    handleRestoreToDone
  };
};