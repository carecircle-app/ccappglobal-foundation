'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

type PlanKey = 'free' | 'lite' | 'elite';
type LocalKid = { id: string; name: string; apiUserId?: string };
type Presence = Record<string, { online: boolean; lastSeenAt: number | null }>;

type Props = {
  kids?: LocalKid[];
  plan?: PlanKey;
  presence?: Presence;
  activeKidId?: string | null;
  onRefresh?: () => void;
  autoSelectActive?: boolean;                // optional
  setActiveKidId?: (id: string | null) => void; // optional
};

const PLAN_CAPS: Record<PlanKey, number> = { free: 5, lite: 10, elite: 15 };

export default function AdminLiveCheck(props: Props) {
  const demoKids: LocalKid[] = useMemo(
    () => props.kids ?? [{ id: 'demo-k1', name: 'Kid 1' }, { id: 'demo-k2', name: 'Kid 2' }],
    [props.kids]
  );

  const plan: PlanKey = props.plan ?? 'elite';
  const presence = props.presence ?? {};
  const [selectedKidId, setSelectedKidId] = useState<string | null>(props.activeKidId ?? demoKids[0]?.id ?? null);

  useEffect(() => {
    if (props.activeKidId) setSelectedKidId(props.activeKidId);
  }, [props.activeKidId]);

  // map to API id for presence lookups
  const selectedApiId = useMemo(
    () =>
      (props.kids?.find(k => k.id === selectedKidId)?.apiUserId) ??
      selectedKidId ?? null,
    [props.kids, selectedKidId]
  );

  const kidOnline = selectedApiId ? (presence[selectedApiId]?.online ?? false) : false;

  // 60s timer
  const DURATION_MS = 60_000;
  const [isRunning, setIsRunning] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [pings, setPings] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const rafRef = useRef<number | null>(null);
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    if (!isRunning) return;
    const tick = () => {
      setNow(Date.now());
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [isRunning]);

  const remainingMs = useMemo(() => (!isRunning || !startedAt ? 0 : Math.max(0, DURATION_MS - (now - startedAt))), [isRunning, startedAt, now]);
  const progressPct = useMemo(() => (!isRunning || !startedAt ? 0 : Math.round((Math.min(DURATION_MS, Math.max(0, now - startedAt)) / DURATION_MS) * 100)), [isRunning, startedAt, now]);

  const cap = PLAN_CAPS[plan];

  function start() {
    if (!selectedKidId) return;
    setIsRunning(true);
    setStartedAt(Date.now());
    setPings(0);
    setNotes(n => `${n}\n▶ Started for ${labelForKid(selectedKidId)} — ${new Date().toLocaleTimeString()}`);
  }
  function stop() {
    setIsRunning(false);
    setNotes(n => `${n}\n■ Stopped early — ${new Date().toLocaleTimeString()}`);
  }
  function pingKid() {
    if (!isRunning) return;
    setPings(x => x + 1);
    setNotes(n => `${n}\n• Ping sent to ${labelForKid(selectedKidId!)} (${new Date().toLocaleTimeString()})`);
  }
  function labelForKid(id: string) {
    return demoKids.find(k => k.id === id)?.name ?? `Kid ${id.slice(-4)}`;
  }

  useEffect(() => {
    if (!isRunning || !startedAt) return;
    if (Date.now() - startedAt >= DURATION_MS) {
      setIsRunning(false);
      setNotes(n => `${n}\n✓ Finished (60s) — ${new Date().toLocaleTimeString()}`);
    }
  }, [now, isRunning, startedAt]);

  return (
    <div className="rounded-xl border border-slate-200 p-3 sm:p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm">
          <span>Kid</span>
          <select
            className="rounded-xl border px-2 py-1"
            value={selectedKidId ?? ''}
            onChange={(e) => {
              const v = e.target.value || null;
              setSelectedKidId(v);
              props.setActiveKidId?.(v);
            }}
          >
            {demoKids.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
          </select>
        </label>

        <div className="text-xs text-slate-600">Plan cap: <b>{cap}</b> checks/day</div>
        <div className="ml-auto flex items-center gap-2 text-xs">
          <span className={`inline-block h-2.5 w-2.5 rounded-full ${kidOnline ? 'bg-emerald-500' : 'bg-gray-300'}`} />
          {kidOnline ? 'Online' : 'Offline'}
        </div>
      </div>

      <div className="grid gap-2">
        <div className="h-2 w-full rounded bg-slate-100 overflow-hidden">
          <div className="h-full bg-blue-500 transition-[width]" style={{ width: `${isRunning ? progressPct : 0}%` }} />
        </div>
        <div className="flex items-center justify-between text-xs text-slate-600">
          <span>{isRunning ? `Time left: ${Math.ceil(remainingMs / 1000)}s` : 'Idle'}</span>
          <span>Pings: <b>{pings}</b></span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {!isRunning ? (
          <button className="rounded-xl border px-3 py-1.5 text-sm bg-blue-50" onClick={start} disabled={!selectedKidId}>
            Start 1:00 Check
          </button>
        ) : (
          <button className="rounded-xl border px-3 py-1.5 text-sm bg-amber-50" onClick={stop}>
            Stop
          </button>
        )}
        <button className="rounded-xl border px-3 py-1.5 text-sm" onClick={pingKid} disabled={!isRunning}>
          Ping now
        </button>
        {props.onRefresh && (
          <button className="rounded-xl border px-3 py-1.5 text-sm" onClick={props.onRefresh}>
            Refresh data
          </button>
        )}
      </div>

      <div className="text-xs text-slate-500 whitespace-pre-wrap border rounded-lg p-2 bg-slate-50/50">
        <div className="font-medium text-slate-700 mb-1">Test log</div>
        {notes || 'No activity yet.'}
      </div>

      <div className="text-[11px] text-slate-500">
        This is a <b>frontend-only test widget</b>. No API calls are made.
      </div>
    </div>
  );
}
