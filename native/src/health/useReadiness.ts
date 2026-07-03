// Hook: today's recovery snapshot + readiness. Fetches from the health provider on mount (mock on
// web/dev, live on device) and computes readiness. Used by any screen that wants the recovery thread.
import { useEffect, useState } from 'react';
import { getHealthSnapshot } from './provider';
import { computeReadiness, type HealthSnapshot, type Readiness } from './readiness';

export function useReadiness() {
  const [snapshot, setSnapshot] = useState<HealthSnapshot | null>(null);
  const [readiness, setReadiness] = useState<Readiness | null>(null);

  useEffect(() => {
    let alive = true;
    getHealthSnapshot().then((s) => {
      if (!alive) return;
      setSnapshot(s);
      setReadiness(computeReadiness(s));
    });
    return () => {
      alive = false;
    };
  }, []);

  return { snapshot, readiness, loading: readiness === null };
}
