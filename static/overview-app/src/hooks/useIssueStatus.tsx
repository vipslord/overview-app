import { useEffect, useState } from 'react';
import { invokeResolverSafe } from '../utils/bridge';

interface IssueStatusResponse {
  success?: boolean;
  currentStatus?: string;
}

export const useIssueStatus = (issueKey?: string) => {
  const [currentIssueStatus, setCurrentIssueStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!issueKey) return;

    let cancelled = false;

    const fetchStatus = async () => {
      const res = await invokeResolverSafe<IssueStatusResponse>(
        'getIssueStatus',
        { issueKey },
        { success: false }
      );

      if (!cancelled && res.success && res.currentStatus) {
        setCurrentIssueStatus(res.currentStatus);
      }
    };

    // Initial load
    fetchStatus();

    const intervalId = setInterval(fetchStatus, 5000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [issueKey]);

  return { currentIssueStatus, setCurrentIssueStatus };
};
