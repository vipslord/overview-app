import React, { FC } from 'react';
import { BG_COLOR, BORDER_COLOR, TEXT_COLOR } from '../../../utils/constants';

interface RestoreNotificationProps {
  isRestoringFromDone: boolean;
  onRestoreToDone: () => Promise<void>;
}

const RestoreNotification: FC<RestoreNotificationProps> = ({ isRestoringFromDone, onRestoreToDone }) => {
  return (
    <div style={{ 
      marginBottom: '10px', 
      padding: '12px', 
      borderRadius: 4, 
      backgroundColor: BG_COLOR.STATUS_DEFAULT,
      borderLeft: `4px solid ${BORDER_COLOR.STATUS_DEFAULT}`,
      color: TEXT_COLOR.BODY,
      fontSize: 14 
    }}>
      <div style={{ marginBottom: 8 }}>
        This task was manually moved to another status.
      </div>
      <button
        onClick={onRestoreToDone}
        disabled={isRestoringFromDone}
        style={{
          padding: '6px 12px',
          backgroundColor: BG_COLOR.PRIMARY,
          color: TEXT_COLOR.INVERSE,
          border: BORDER_COLOR.NONE,
          borderRadius: 3,
          cursor: isRestoringFromDone ? 'not-allowed' : 'pointer',
          opacity: isRestoringFromDone ? 0.6 : 1
        }}
      >
        {isRestoringFromDone ? 'Restoring...' : 'Restore to Done'}
      </button>
    </div>
  );
};

export default RestoreNotification;