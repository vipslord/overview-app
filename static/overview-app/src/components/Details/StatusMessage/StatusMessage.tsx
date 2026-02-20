import React, { FC } from 'react';
import { TransitionMessage } from '../types';
import { BG_COLOR, TEXT_COLOR } from '../../../utils/constants';

interface StatusMessageProps {
  message: TransitionMessage | null;
}

const StatusMessage: FC<StatusMessageProps> = ({ message }) => {
  if (!message) return null;

  return (
    <div style={{ 
      marginBottom: '10px', 
      padding: '8px 12px', 
      borderRadius: 4, 
      backgroundColor: message.type === 'success' ? BG_COLOR.STATUS_OPEN : BG_COLOR.STATUS_MESSAGE_ERROR,
      color: message.type === 'success' ? TEXT_COLOR.STATUS_OPEN : TEXT_COLOR.ERROR,
      fontSize: 14 
    }}>
      {message.text}
    </div>
  );
};

export default StatusMessage;
