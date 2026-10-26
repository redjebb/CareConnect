import { useCallback, useEffect, useRef, useState } from 'react';
import { waitForPendingWrites } from 'firebase/firestore';
import { db } from '../services/firebase';

// Tracks writes that were accepted locally but are not yet confirmed by the
// server (offline queue). `markQueued` is called after an offline-grace commit.
export function usePendingSync(isOnline: boolean) {
  const [queuedCount, setQueuedCount] = useState(0);
  const watching = useRef(false);

  const watch = useCallback(() => {
    if (watching.current) return;
    watching.current = true;
    waitForPendingWrites(db)
      .then(() => setQueuedCount(0))
      .catch(() => undefined)
      .finally(() => {
        watching.current = false;
      });
  }, []);

  const markQueued = useCallback(() => {
    setQueuedCount(count => count + 1);
    watch();
  }, [watch]);

  useEffect(() => {
    if (isOnline && queuedCount > 0) watch();
  }, [isOnline, queuedCount, watch]);

  return { queuedCount, markQueued };
}
