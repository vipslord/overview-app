import React, { FC } from "react";
import {
  compareStatuses,
  getTargetCategory,
  normalizeStatus,
} from "../../utils/helpers";
import { BG_COLOR, BORDER_COLOR, TEXT_COLOR } from "../../utils/constants";

interface TransitionButtonProps {
  suggestedTarget: string | null;
  currentIssueStatus: string | null;
  transitionLoading: boolean;
  handleMove: () => Promise<void> | void;
}

const TransitionButton: FC<TransitionButtonProps> = ({
  suggestedTarget,
  currentIssueStatus,
  transitionLoading,
  handleMove,
}) => {
  const targetCategory = getTargetCategory(suggestedTarget);
  const alreadyInTargetCategory =
    targetCategory &&
    normalizeStatus(currentIssueStatus) === normalizeStatus(targetCategory);

  if (
    !suggestedTarget ||
    compareStatuses(currentIssueStatus, suggestedTarget) ||
    alreadyInTargetCategory
  )
    return null;

  return (
    <div style={{ marginBottom: "10px" }}>
      <button
        onClick={handleMove}
        disabled={transitionLoading}
        style={{
          padding: "8px 12px",
          backgroundColor: BG_COLOR.PRIMARY,
          color: TEXT_COLOR.INVERSE,
          border: BORDER_COLOR.NONE,
          borderRadius: "4px",
          cursor: transitionLoading ? "not-allowed" : "pointer",
          opacity: transitionLoading ? 0.6 : 1,
          fontSize: "14px",
          fontWeight: 600,
        }}
      >
        {transitionLoading ? "Moving..." : `Move to ${suggestedTarget}`}
      </button>
    </div>
  );
};

export default TransitionButton;
