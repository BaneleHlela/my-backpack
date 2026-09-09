import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import api from '../../lib/api';

export function bucketError(error: unknown): string {
  const e = error as {
    response?: { data?: { message?: string } };
    message?: string;
  };
  return (
    e.response?.data?.message ??
    e.message ??
    'Could not load buckets. Please try again.'
  );
}

// Read state is keyed by profile, URL and parameters. Late responses cannot leak across profiles.
export function useBucketResource<T>(
  url: string | null,
  params: Record<string, unknown> = {}
) {
  const profileId = useSelector(
    (s: { auth: { activeProfile: { _id: string } | null } }) =>
      s.auth.activeProfile?._id
  );
  const serialized = JSON.stringify(params);
  const key = JSON.stringify([profileId, url, serialized]);
  const [version, refresh] = useState(0);
  const request = useRef(0);
  const [result, setResult] = useState<{
    key: string;
    data?: T;
    error?: string;
  }>({ key: '' });
  useEffect(() => {
    const current = ++request.current;
    if (!url || !profileId) return;
    setResult({ key });
    void api
      .get(url, { params: JSON.parse(serialized) })
      .then((res) => {
        if (current === request.current)
          setResult({ key, data: res.data.data as T });
      })
      .catch((error: unknown) => {
        if (current === request.current)
          setResult({ key, error: bucketError(error) });
      });
    return () => {
      request.current++;
    };
  }, [key, version, url, profileId, serialized]);
  const reload = useCallback(() => refresh((n) => n + 1), []);
  const data = result.key === key ? result.data : undefined;
  const error = result.key === key ? result.error : undefined;
  return { data, error, loading: !!url && !data && !error, reload, profileId };
}
