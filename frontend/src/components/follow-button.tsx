'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { authHeader, readUser } from '@/lib/session';

/** Tombol ikuti/berhenti mengikuti pada profil peneliti. */
export function FollowButton({
  unicalId,
  initialCount,
}: {
  unicalId: string;
  initialCount: number;
}) {
  const [state, setState] = useState<{
    loggedIn: boolean;
    following: boolean;
    isSelf: boolean;
  }>({ loggedIn: false, following: false, isSelf: false });
  const [count, setCount] = useState(initialCount);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!readUser()) return;
    void apiFetch<{ data: { following: boolean; isSelf: boolean } }>(
      `/researchers/${unicalId}/follow-state`,
      { headers: authHeader() },
    )
      .then((res) =>
        setState({
          loggedIn: true,
          following: res.data.following,
          isSelf: res.data.isSelf,
        }),
      )
      .catch(() => setState((s) => ({ ...s, loggedIn: true })));
  }, [unicalId]);

  async function toggle() {
    setBusy(true);
    try {
      const res = await apiFetch<{ data: { following: boolean } }>(
        `/researchers/${unicalId}/follow`,
        {
          method: state.following ? 'DELETE' : 'POST',
          headers: authHeader(),
        },
      );
      setState((s) => ({ ...s, following: res.data.following }));
      setCount((c) => c + (res.data.following ? 1 : -1));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 flex items-center gap-3">
      {state.loggedIn && !state.isSelf ? (
        <button
          disabled={busy}
          onClick={() => void toggle()}
          className={
            state.following
              ? 'rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:border-red-300 hover:text-red-600 disabled:opacity-60'
              : 'rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60'
          }
        >
          {state.following ? 'Mengikuti ✓' : '+ Ikuti'}
        </button>
      ) : null}
      <span className="text-sm text-slate-500">{count} pengikut</span>
    </div>
  );
}
