﻿'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';

/**
 * CareCircle Admin (ESLint-friendly)
 * - Local Kids roster (max 5) with name/IP/port/phones; mapped to API Child users
 * - Plan gating: Free(1) / Lite(2) / Elite(∞)
 * - Task templates, recurrence (none/daily/weekly), ack/photo-proof, per-kid auto-enforce hints
 * - Parental enforce actions (signal to backend)
 * - Tasks table with ACK
 *
 * API base: process.env.NEXT_PUBLIC_API_URL || http://127.0.0.1:4000
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000';

/* ----------------------------- Helpers ----------------------------- */
async function fetchJSON<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}
function cls(...a: Array<string | false | undefined>) {
  return a.filter(Boolean).join(' ');
}
function parseTimeHHMM(s: string) {
  const m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return { h: 8, m: 0 };
  return {
    h: Math.min(23, Math.max(0, parseInt(m[1], 10))),
    m: Math.min(59, Math.max(0, parseInt(m[2], 10))),
  };
}
function nextAtDaily(hour: number, minute: number) {
  const now = new Date();
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  if (d.getTime() <= now.getTime()) d.setDate(d.getDate() + 1);
  return d.getTime();
}
function nextAtWeekly(dow: number, hour: number, minute: number) {
  // 0=Sun..6=Sat
  const now = new Date();
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  const delta = (dow - d.getDay() + 7) % 7;
  if (delta === 0 && d.getTime() <= now.getTime()) d.setDate(d.getDate() + 7);
  else d.setDate(d.getDate() + delta);
  return d.getTime();
}

/* ----------------------------- Types ----------------------------- */
type Role = 'Owner' | 'Family' | 'Child' | 'Minor' | 'Caregiver' | 'Relative';

type User = {
  id: string;
  name: string;
  role: Role;
};

type Task = {
  id: string;
  title: string;
  circleId: string;
  assignedTo?: string;
  due?: number;
  completed?: boolean;
  proofKey?: string;
  forMinor?: boolean;
  ackRequired?: boolean;
  photoProof?: boolean;
  ackAt?: number;
  ackBy?: string;
  __minorStage?: 0 | 1 | 2 | 3 | 4;
  repeat?: 'none' | 'daily' | 'weekly';
  autoEnforce?: boolean;
  autoAction?:
    | 'screen_lock'
    | 'network_pause'
    | 'device_restart'
    | 'device_shutdown'
    | 'app_restart'
    | 'play_loud_alert';
};

type PlanKey = 'free' | 'lite' | 'elite';
const PLAN_LIMITS: Record<PlanKey, number> = { free: 1, lite: 2, elite: 999 };

type ActionV =
  | 'play_loud_alert'
  | 'screen_lock'
  | 'network_pause'
  | 'device_restart'
  | 'device_shutdown'
  | 'app_restart';

type LocalKid = {
  id: string;
  name: string;
  apiUserId?: string;
  ip?: string;
  port?: number;
  phones?: string[];
  notes?: string;
  autoEnforce?: boolean;
  autoAction?: ActionV;
};

/* ------------------------ Local Storage Keys ------------------------ */
const LSK_KIDS = 'admin.localKids.v2';
const LSK_OWNER = 'admin.ownerLabel.v1';
const LSK_PLAN = 'admin.plan.v1';

/* ---------------------------- Constants ---------------------------- */
const TEMPLATES = [
  'Clean room',
  'Wash dishes',
  'Take out trash',
  'Homework',
  'Laundry',
  'Feed pets',
  'Read 20 minutes',
  'Practice instrument',
] as const;

const ACTIONS: ReadonlyArray<{ v: ActionV; label: string }> = [
  { v: 'play_loud_alert', label: 'Loud alert' },
  { v: 'screen_lock', label: 'Lock screen' },
  { v: 'network_pause', label: 'Pause network' },
  { v: 'device_restart', label: 'Restart device' },
  { v: 'device_shutdown', label: 'Shutdown device' },
  { v: 'app_restart', label: 'Restart app' },
];

/* ============================ Component ============================ */
export default function AdminPage() {
  /* -------- Acting User (header auth) -------- */
  const [acting, setActing] = useState<string>('u-owner');
  const headers = useMemo(() => ({ 'x-user-id': acting }), [acting]);

  /* -------- API data -------- */
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const childUsers = users.filter((u) => u.role === 'Child' || u.role === 'Minor');

  /* -------- Owner/household label -------- */
  const [ownerLabel, setOwnerLabel] = useState<string>('');

  /* -------- Plan gating -------- */
  const [plan, setPlan] = useState<PlanKey>('elite');
  const maxKids = PLAN_LIMITS[plan];

  /* -------- Local kids (browser only) -------- */
  const [kids, setKids] = useState<LocalKid[]>([]);
  useEffect(() => {
    try {
      const rawKids = typeof window !== 'undefined' ? localStorage.getItem(LSK_KIDS) : null;
      if (rawKids) setKids(JSON.parse(rawKids) as LocalKid[]);
      const rawOwner = typeof window !== 'undefined' ? localStorage.getItem(LSK_OWNER) : null;
      if (rawOwner) setOwnerLabel(rawOwner);
      const rawPlan = (typeof window !== 'undefined'
        ? (localStorage.getItem(LSK_PLAN) as PlanKey | null)
        : null) as PlanKey | null;
      if (rawPlan) setPlan(rawPlan);
    } catch {
      /* ignore */
    }
  }, []);
  const persistKids = useCallback((next: LocalKid[]) => {
    setKids(next);
    try {
      if (typeof window !== 'undefined') localStorage.setItem(LSK_KIDS, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);
  const persistOwner = useCallback((label: string) => {
    setOwnerLabel(label);
    try {
      if (typeof window !== 'undefined') localStorage.setItem(LSK_OWNER, label);
    } catch {
      /* ignore */
    }
  }, []);
  const persistPlan = useCallback((p: PlanKey) => {
    setPlan(p);
    try {
      if (typeof window !== 'undefined') localStorage.setItem(LSK_PLAN, p);
    } catch {
      /* ignore */
    }
  }, []);

  /* -------- Task creation state -------- */
  const [template, setTemplate] = useState<string>('');
  const [title, setTitle] = useState<string>('Clean room');
  const [recurrence, setRecurrence] = useState<'none' | 'daily' | 'weekly'>('none');
  const [dueMins, setDueMins] = useState<number>(15);
  const [weeklyDOW, setWeeklyDOW] = useState<number>(1);
  const [timeHHMM, setTimeHHMM] = useState<string>('08:00');
  const [ackRequired, setAckRequired] = useState<boolean>(true);
  const [photoProof, setPhotoProof] = useState<boolean>(true);
  const [selectedKidIds, setSelectedKidIds] = useState<string[]>([]);
  const [autoAction, setAutoAction] = useState<ActionV>('screen_lock');
  const [autoEnforce, setAutoEnforce] = useState<boolean>(true);
  const [busy, setBusy] = useState<boolean>(false);
  const [err, setErr] = useState<string>('');

  const resetForm = useCallback(() => {
    setTemplate('');
    setTitle('Clean room');
    setRecurrence('none');
    setDueMins(15);
    setWeeklyDOW(1);
    setTimeHHMM('08:00');
    setAckRequired(true);
    setPhotoProof(true);
    setSelectedKidIds([]);
    setAutoAction('screen_lock');
    setAutoEnforce(true);
  }, []);

  const toggleKid = useCallback(
    (id: string) => {
      setSelectedKidIds((prev) => {
        if (prev.includes(id)) return prev.filter((x) => x !== id);
        if (prev.length >= maxKids) {
          // eslint-disable-next-line no-alert
          alert(
            `Your plan (${plan}) allows up to ${
              maxKids === 999 ? 'unlimited' : maxKids
            } child${maxKids > 1 ? 'ren' : ''}.`,
          );
          return prev;
        }
        return [...prev, id];
      });
    },
    [maxKids, plan],
  );

  /* -------- Load API data -------- */
  const loadAll = useCallback(async () => {
    setErr('');
    try {
      const [u, t] = await Promise.all([
        fetchJSON<User[]>(`${API_BASE}/api/users`, { headers }),
        fetchJSON<Task[]>(`${API_BASE}/api/tasks`, { headers }),
      ]);
      setUsers(u);
      setTasks(t);
    } catch (e) {
      setErr((e as Error).message || 'Load failed');
    }
  }, [headers]);

  useEffect(() => {
    void loadAll();
  }, [acting, loadAll]);

  /* -------- Create minor tasks (one per selected kid) -------- */
  const createMinorTasks = useCallback(async () => {
    if (!title.trim()) {
      // eslint-disable-next-line no-alert
      alert('Title is required.');
      return;
    }
    if (selectedKidIds.length === 0) {
      // eslint-disable-next-line no-alert
      alert('Select at least one child.');
      return;
    }
    const apiChildren = users.filter((u) => u.role === 'Child' || u.role === 'Minor');
    if (apiChildren.length === 0) {
      // eslint-disable-next-line no-alert
      alert("No API 'Child' users found. Add at least one child user to the circle first.");
      return;
    }

    setBusy(true);
    setErr('');
    try {
      const defaultChildId = apiChildren[0]?.id;
      const { h, m } = parseTimeHHMM(timeHHMM);
      const requests: Array<Promise<unknown>> = [];

      for (const localId of selectedKidIds) {
        const kid = kids.find((k) => k.id === localId);
        const apiUserId = kid?.apiUserId || defaultChildId;
        if (!apiUserId) continue;

        let due: number;
        if (recurrence === 'none') due = Date.now() + Math.max(1, dueMins) * 60_000;
        else if (recurrence === 'daily') due = nextAtDaily(h, m);
        else due = nextAtWeekly(weeklyDOW, h, m);

        requests.push(
          fetchJSON(`${API_BASE}/api/tasks`, {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title,
              due,
              assignedTo: apiUserId,
              forMinor: true,
              ackRequired,
              photoProof,
              repeat: recurrence,
              autoEnforce: kid?.autoEnforce ?? autoEnforce,
              autoAction: (kid?.autoAction as Task['autoAction']) ?? autoAction,
            }),
          }),
        );
      }
      await Promise.all(requests);
      // eslint-disable-next-line no-alert
      alert(`Created ${selectedKidIds.length} task(s) ✅`);
      await loadAll();
      resetForm();
    } catch (e) {
      setErr((e as Error).message || 'Create failed');
      // eslint-disable-next-line no-alert
      alert(`Create failed: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }, [
    ackRequired,
    autoAction,
    autoEnforce,
    dueMins,
    headers,
    kids,
    loadAll,
    recurrence,
    resetForm,
    selectedKidIds,
    timeHHMM,
    title,
    users,
    weeklyDOW,
  ]);

  /* -------- Task ACK -------- */
  const ackTask = useCallback(
    async (id: string) => {
      setErr('');
      try {
        await fetchJSON(`${API_BASE}/api/tasks/${id}/ack`, { method: 'POST', headers });
        await loadAll();
      } catch (e) {
        setErr((e as Error).message || 'ACK failed');
        // eslint-disable-next-line no-alert
        alert(`ACK failed: ${(e as Error).message}`);
      }
    },
    [headers, loadAll],
  );

  /* -------- Parental enforce -------- */
  const enforce = useCallback(
    async (apiUserId: string, action: ActionV, reason: string) => {
      setErr('');
      try {
        await fetchJSON(`${API_BASE}/api/parental/enforce`, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetUserId: apiUserId, action, reason }),
        });
        // eslint-disable-next-line no-alert
        alert(`Enforce sent: ${action} ✅`);
      } catch (e) {
        setErr((e as Error).message || 'Enforce failed');
        // eslint-disable-next-line no-alert
        alert(`Enforce failed: ${(e as Error).message}`);
      }
    },
    [headers],
  );

  /* -------- Local kids helpers -------- */
  const addKid = useCallback(() => {
    if (kids.length >= 5) {
      // eslint-disable-next-line no-alert
      alert('You can keep up to 5 local kids.');
      return;
    }
    const id = `k-${Math.random().toString(36).slice(2, 8)}`;
    const next: LocalKid[] = [...kids, { id, name: 'New child', phones: [] }];
    persistKids(next);
  }, [kids, persistKids]);

  const removeKid = useCallback(
    (id: string) => {
      const next = kids.filter((k) => k.id !== id);
      persistKids(next);
      setSelectedKidIds((prev) => prev.filter((x) => x !== id));
    },
    [kids, persistKids],
  );

  const updateKid = useCallback(
    (id: string, patch: Partial<LocalKid>) => {
      persistKids(kids.map((k) => (k.id === id ? { ...k, ...patch } : k)));
    },
    [kids, persistKids],
  );

  const updateKidPhone = useCallback(
    (id: string, idx: number, value: string) => {
      const kid = kids.find((k) => k.id === id);
      const phones = (kid?.phones || []).slice();
      phones[idx] = value;
      updateKid(id, { phones });
    },
    [kids, updateKid],
  );

  const addKidPhone = useCallback(
    (id: string) => {
      const kid = kids.find((k) => k.id === id);
      const phones = (kid?.phones || []).slice();
      if (phones.length >= 5) return;
      phones.push('');
      updateKid(id, { phones });
    },
    [kids, updateKid],
  );

  const removeKidPhone = useCallback(
    (id: string, idx: number) => {
      const kid = kids.find((k) => k.id === id);
      const phones = (kid?.phones || []).slice();
      phones.splice(idx, 1);
      updateKid(id, { phones });
    },
    [kids, updateKid],
  );

  return (
    <div className="min-h-dvh space-y-8 p-6">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">Admin</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Household / Owner</span>
            <input
              className="rounded border px-2 py-1"
              placeholder="e.g. Mom & Dad"
              value={ownerLabel}
              onChange={(e) => persistOwner(e.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-600">Acting user</span>
          <select
            className="rounded border px-2 py-1"
            value={acting}
            onChange={(e) => setActing(e.target.value)}
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.role})
              </option>
            ))}
            {users.length === 0 && (
              <>
                <option value="u-owner">Owner (Owner)</option>
                <option value="u-child">Derek (Child)</option>
                <option value="u-fam">Ryan (Family)</option>
              </>
            )}
          </select>
          <button className="ml-2 rounded border px-3 py-1" onClick={() => void loadAll()}>
            Refresh
          </button>
        </div>
      </header>

      {err && (
        <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {err}
        </div>
      )}

      {/* Plan gating */}
      <section className="grid gap-2 rounded border p-4">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">Plan</span>
          <select
            className="rounded border px-2 py-1"
            value={plan}
            onChange={(e) => persistPlan(e.target.value as PlanKey)}
          >
            <option value="free">Free (1 child)</option>
            <option value="lite">Lite (2 children)</option>
            <option value="elite">Elite (unlimited)</option>
          </select>
          <span className="text-xs text-gray-500">
            Max assignees per task: {maxKids === 999 ? 'unlimited' : maxKids}
          </span>
        </div>
      </section>

      {/* Local Kids */}
      <section className="grid gap-3 rounded border p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Kids (local, max 5)</h2>
          <button className="rounded border px-3 py-1" onClick={addKid} disabled={kids.length >= 5}>
            Add child
          </button>
        </div>
        <div className="grid gap-3">
          {kids.length === 0 && (
            <div className="text-sm text-gray-500">No kids yet. Click “Add child”.</div>
          )}
          {kids.map((k) => (
            <div key={k.id} className="grid gap-3 rounded border p-3">
              <div className="grid items-end gap-2 md:grid-cols-6">
                <label className="grid gap-1">
                  <span className="text-sm text-gray-600">Name</span>
                  <input
                    className="rounded border px-2 py-1"
                    value={k.name || ''}
                    onChange={(e) => updateKid(k.id, { name: e.target.value })}
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-sm text-gray-600">Map to API Child</span>
                  <select
                    className="rounded border px-2 py-1"
                    value={k.apiUserId || ''}
                    onChange={(e) => updateKid(k.id, { apiUserId: e.target.value || undefined })}
                  >
                    <option value="">(auto choose first Child)</option>
                    {childUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.id})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1">
                  <span className="text-sm text-gray-600">Device IP</span>
                  <input
                    className="rounded border px-2 py-1"
                    placeholder="192.168.1.42"
                    value={k.ip || ''}
                    onChange={(e) => updateKid(k.id, { ip: e.target.value })}
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-sm text-gray-600">Port</span>
                  <input
                    type="number"
                    className="rounded border px-2 py-1"
                    placeholder="8088"
                    value={k.port ?? ''}
                    onChange={(e) =>
                      updateKid(k.id, {
                        port: e.target.value ? parseInt(e.target.value, 10) : undefined,
                      })
                    }
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-sm text-gray-600">Auto/Manual</span>
                  <select
                    className="rounded border px-2 py-1"
                    value={k.autoEnforce ? 'auto' : 'manual'}
                    onChange={(e) => updateKid(k.id, { autoEnforce: e.target.value === 'auto' })}
                  >
                    <option value="auto">Automatic</option>
                    <option value="manual">Manual only</option>
                  </select>
                </label>
                <label className="grid gap-1">
                  <span className="text-sm text-gray-600">Auto Action</span>
                  <select
                    className="rounded border px-2 py-1"
                    value={k.autoAction || 'screen_lock'}
                    onChange={(e) =>
                      updateKid(k.id, { autoAction: e.target.value as ActionV })
                    }
                  >
                    {ACTIONS.map((a) => (
                      <option key={a.v} value={a.v}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {/* phones */}
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">Phone numbers (up to 5)</div>
                  <button
                    className="rounded border px-2 py-1 text-sm"
                    onClick={() => addKidPhone(k.id)}
                    disabled={(k.phones || []).length >= 5}
                  >
                    Add phone
                  </button>
                </div>
                {(k.phones || []).map((p, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      className="rounded border px-2 py-1"
                      placeholder="+1 555…"
                      value={p}
                      onChange={(e) => updateKidPhone(k.id, i, e.target.value)}
                    />
                    <button
                      className="rounded border px-2 py-1 text-sm"
                      onClick={() => removeKidPhone(k.id, i)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                {(k.phones || []).length === 0 && (
                  <div className="text-xs text-gray-500">No phones added.</div>
                )}
              </div>

              <div className="flex gap-2">
                <button className="rounded border px-3 py-1" onClick={() => removeKid(k.id)}>
                  Delete child
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="text-xs text-gray-500">
          (Names, IPs, ports, phones are stored <b>locally</b> in your browser. They’re not sent to
          the server. Parental actions use the mapped API Child.)
        </div>
      </section>

      {/* Create tasks */}
      <section className="grid gap-3 rounded border p-4">
        <h2 className="font-medium">Create Minor Tasks</h2>

        {/* Select assignees */}
        <div className="grid gap-2">
          <div className="text-sm text-gray-600">
            Select up to {maxKids === 999 ? '∞' : maxKids} children
          </div>
          <div className="flex flex-wrap gap-2">
            {kids.map((k) => {
              const on = selectedKidIds.includes(k.id);
              return (
                <button
                  key={k.id}
                  type="button"
                  onClick={() => toggleKid(k.id)}
                  className={cls('rounded border px-3 py-1', on && 'bg-black text-white')}
                >
                  {k.name || '(unnamed)'}
                </button>
              );
            })}
            {kids.length === 0 && (
              <span className="text-xs text-gray-500">Add kids above to assign tasks.</span>
            )}
          </div>
          <div className="text-xs text-gray-500">
            Selected: {selectedKidIds.length}/{maxKids === 999 ? '∞' : maxKids}
          </div>
        </div>

        {/* Task details */}
        <div className="grid gap-3 md:grid-cols-3">
          <label className="grid gap-1">
            <span className="text-sm text-gray-600">Template</span>
            <select
              className="rounded border px-2 py-1"
              value={template}
              onChange={(e) => {
                setTemplate(e.target.value);
                if (e.target.value) setTitle(e.target.value);
              }}
            >
              <option value="">(none)</option>
              {TEMPLATES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-sm text-gray-600">Title</span>
            <input
              className="rounded border px-2 py-1"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm text-gray-600">Recurrence</span>
            <select
              className="rounded border px-2 py-1"
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value as 'none' | 'daily' | 'weekly')}
            >
              <option value="none">One-time (minutes from now)</option>
              <option value="daily">Daily (at time)</option>
              <option value="weekly">Weekly (day &amp; time)</option>
            </select>
          </label>

          {recurrence === 'none' && (
            <label className="grid gap-1">
              <span className="text-sm text-gray-600">Due (minutes from now)</span>
              <input
                type="number"
                min={1}
                className="rounded border px-2 py-1"
                value={dueMins}
                onChange={(e) => setDueMins(parseInt(e.target.value || '0', 10))}
              />
            </label>
          )}
          {(recurrence === 'daily' || recurrence === 'weekly') && (
            <label className="grid gap-1">
              <span className="text-sm text-gray-600">Time</span>
              <input
                type="time"
                className="rounded border px-2 py-1"
                value={timeHHMM}
                onChange={(e) => setTimeHHMM(e.target.value)}
              />
            </label>
          )}
          {recurrence === 'weekly' && (
            <label className="grid gap-1">
              <span className="text-sm text-gray-600">Day of week</span>
              <select
                className="rounded border px-2 py-1"
                value={weeklyDOW}
                onChange={(e) => setWeeklyDOW(parseInt(e.target.value, 10))}
              >
                <option value={0}>Sunday</option>
                <option value={1}>Monday</option>
                <option value={2}>Tuesday</option>
                <option value={3}>Wednesday</option>
                <option value={4}>Thursday</option>
                <option value={5}>Friday</option>
                <option value={6}>Saturday</option>
              </select>
            </label>
          )}
        </div>

        {/* options */}
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={ackRequired}
              onChange={(e) => setAckRequired(e.target.checked)}
            />{' '}
            Ack required
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={photoProof}
              onChange={(e) => setPhotoProof(e.target.checked)}
            />{' '}
            Photo proof
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={autoEnforce}
              onChange={(e) => setAutoEnforce(e.target.checked)}
            />{' '}
            Auto enforce on overdue
          </label>
          <label className="flex items-center gap-2 text-sm">
            <span>Auto action</span>
            <select
              className="rounded border px-2 py-1"
              value={autoAction}
              onChange={(e) => setAutoAction(e.target.value as ActionV)}
            >
              {ACTIONS.map((a) => (
                <option key={a.v} value={a.v}>
                  {a.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Save / Cancel */}
        <div className="flex gap-2">
          <button
            className="rounded border px-3 py-1"
            onClick={() => void createMinorTasks()}
            disabled={busy || selectedKidIds.length === 0}
          >
            Save
          </button>
          <button className="rounded border px-3 py-1" onClick={resetForm} disabled={busy}>
            Cancel
          </button>
        </div>
      </section>

      {/* Parental Enforce */}
      <section className="grid gap-2 rounded border p-4">
        <h2 className="font-medium">Parental Enforce</h2>
        <div className="grid gap-3">
          {kids.length === 0 && (
            <div className="text-sm text-gray-500">Add kids above and map them to API Child users.</div>
          )}
          {kids.map((k) => {
            const apiUserId = k.apiUserId || childUsers[0]?.id || '';
            return (
              <div key={k.id} className="grid gap-2 rounded border p-3">
                <div className="font-medium">
                  {k.name || '(unnamed)'}{' '}
                  <span className="text-xs text-gray-500">
                    IP: {k.ip || '-'}:{k.port ?? '-'} • Phones:{' '}
                    {(k.phones || []).filter(Boolean).join(', ') || '-'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {ACTIONS.map((a) => (
                    <button
                      key={a.v}
                      className="rounded border px-2 py-1"
                      disabled={!apiUserId}
                      onClick={() => void enforce(apiUserId, a.v, 'Admin')}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Tasks table */}
      <section className="grid gap-2 rounded border p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Tasks</h2>
          <button className="rounded border px-3 py-1" onClick={() => void loadAll()}>
            Refresh
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 pr-4">Title</th>
                <th className="py-2 pr-4">Assignee</th>
                <th className="py-2 pr-4">Due</th>
                <th className="py-2 pr-4">Minor</th>
                <th className="py-2 pr-4">Ack</th>
                <th className="py-2 pr-4">Proof</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.id} className="border-b">
                  <td className="py-2 pr-4">{t.title}</td>
                  <td className="py-2 pr-4">{t.assignedTo || '-'}</td>
                  <td className="py-2 pr-4">{t.due ? new Date(t.due).toLocaleString() : '-'}</td>
                  <td className="py-2 pr-4">{t.forMinor ? `stage ${t.__minorStage ?? 0}` : '-'}</td>
                  <td className="py-2 pr-4">{t.ackBy || '-'}</td>
                  <td className="py-2 pr-4">{t.proofKey ? t.proofKey.split('/').slice(-1)[0] : '-'}</td>
                  <td className="py-2">
                    <button className="mr-2 rounded border px-2 py-1" onClick={() => void ackTask(t.id)}>
                      Ack
                    </button>
                  </td>
                </tr>
              ))}
              {tasks.length === 0 && (
                <tr>
                  <td className="py-4 text-gray-500" colSpan={7}>
                    No tasks
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="text-xs text-gray-500">
        Connected to API at {API_BASE} as <b>{acting}</b>
      </footer>
    </div>
  );
}
