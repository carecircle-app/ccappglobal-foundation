// app/admin/page.tsx
'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { rememberPeople, removePerson } from '@/utils/peopleMemory';

// Safe import of the Live Check widget
import AdminLiveCheck from '@/components/AdminLiveCheck';

/* -------------------------------------------------------
   Environment & tiny helpers
-------------------------------------------------------- */
const API_BASE = ((process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:4011') as string).replace(/\/$/, '');
const cls = (...a: Array<string | false | null | undefined>) => a.filter(Boolean).join(' ');
const toId = (s: string) => s.trim().toLowerCase().replace(/\s+/g, '-');

async function fetchJSON<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  if (!res.ok) {
    const msg = await res.text().catch(() => '');
    throw new Error(msg || `HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

const PresenceDot = ({ online }: { online?: boolean }) => (
  <span
    aria-label={online ? 'online' : 'offline'}
    title={online ? 'Online' : 'Offline'}
    className={cls(
      'inline-block h-2.5 w-2.5 rounded-full align-middle',
      online
        ? 'bg-emerald-500 shadow-[0_0_0_2px_rgba(16,185,129,.25)]'
        : 'bg-gray-300'
    )}
  />
);


/* -------------------------------------------------------
   Types
-------------------------------------------------------- */
type Role = 'Owner' | 'Family' | 'Child' | 'Minor';
type User = { id: string; name: string; role: Role };

type RepeatRule = {
  kind: 'none' | 'daily' | 'weekly';
  daysOfWeek?: number[];
  timeHHMM?: string;
  alertOffsetsMin: number[];
};
type Task = {
  id: string;
  title: string;
  assignedTo?: string; // standardized; backend may also return other shapes
  assigneeId?: string; // tolerate
  assignee?: { id?: string; name?: string };
  userId?: string;
  childId?: string;
  kidId?: string;
  due?: number;
  completed?: boolean;
  proofKey?: string;
  forMinor?: boolean;
  ackRequired?: boolean;
  photoProof?: boolean;
  ackBy?: string;
  ackAt?: number;
  __minorStage?: 0 | 1 | 2 | 3 | 4;
  repeat?: 'none' | 'daily' | 'weekly';
  repeatRule?: RepeatRule;
  autoEnforce?: boolean;
  autoAction?:
    | 'screen_lock'
    | 'network_pause'
    | 'device_restart'
    | 'device_shutdown'
    | 'app_restart'
    | 'play_loud_alert';
  enforcedAt?: number;
  enforceChannel?: 'ws' | 'lan' | 'router';
  lastEnforceError?: string;
  pausedByParent?: boolean;
  holdUntil?: number | null;
};

type PlanKey = 'free' | 'lite' | 'elite';
const PLAN_LIMITS: Record<PlanKey, number> = { free: 1, lite: 2, elite: 5 };

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

type KidStatus = 'not_started' | 'in_progress' | 'almost_done' | 'done' | 'skipped';

/* -------------------------------------------------------
   Local storage keys
-------------------------------------------------------- */
const LSK_KIDS = 'admin.localKids.v2';
const LSK_OWNER = 'admin.ownerLabel.v1';
const LSK_PLAN = 'admin.plan.v1';
const LSK_TASK_NOTES = 'admin.taskNotes.v1';
const LSK_OWNER_NOTES = 'admin.ownerNotes.v1';
const LSK_LOCAL_PHONE_TASKS = 'admin.localPhoneTasks.v1';
const LSK_NAME_BOOK = 'admin.nameBook.v1';
const LSK_TASK_TEMPLATES = 'shared.taskTemplates.v1';

/* -------------------------------------------------------
   UI constants
-------------------------------------------------------- */
const DEFAULT_TEMPLATES = [
  'Homework',
  'Read 20 min',
  'Practice (music)',
  'Practice (sport)',
  'Clean room',
  'Feed pet',
  'Walk the dog',
  'Brush teeth',
  'Put toys away',
  'Set the table',
  'Unload dishwasher',
] as const;

const ACTIONS: ReadonlyArray<{ v: ActionV; label: string }> = [
  { v: 'play_loud_alert', label: 'Loud alert' },
  { v: 'screen_lock', label: 'Lock screen' },
  { v: 'network_pause', label: 'Pause network' },
  { v: 'device_restart', label: 'Restart device' },
  { v: 'device_shutdown', label: 'Shutdown device' },
  { v: 'app_restart', label: 'Restart app' },
];

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/* -------------------------------------------------------
   Small date helpers
-------------------------------------------------------- */
const toLocalDT = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const defaultPlus15 = () => {
  const t = new Date();
  t.setMinutes(t.getMinutes() + 15);
  return toLocalDT(t);
};
function parseTimeHHMM(s: string) {
  const m = s.match(/^(\d{1,2}):(\d{2})$/);
  const h = Math.min(23, Math.max(0, parseInt(m?.[1] ?? '16', 10)));
  const mm = Math.min(59, Math.max(0, parseInt(m?.[2] ?? '0', 10)));
  return { h, m: mm };
}
function nextOccurrenceFromNow(timeHHMM: string, daysOfWeek?: number[]): number {
  const now = new Date();
  const { h, m } = parseTimeHHMM(timeHHMM);
  if (!daysOfWeek || daysOfWeek.length === 0) {
    const d = new Date();
    d.setHours(h, m, 0, 0);
    if (d.getTime() <= now.getTime()) d.setDate(d.getDate() + 1);
    return d.getTime();
  }
  for (let i = 0; i < 14; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    if (daysOfWeek.includes(d.getDay())) {
      d.setHours(h, m, 0, 0);
      if (d.getTime() > now.getTime()) return d.getTime();
    }
  }
  const d = new Date();
  d.setDate(d.getDate() + 7);
  d.setHours(h, m, 0, 0);
  return d.getTime();
}
const fmtTime = (hhmm?: string) => {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};
const recurrenceText = (t: Task) => {
  const r = t.repeatRule;
  if (r?.kind === 'daily') return `Daily • ${fmtTime(r.timeHHMM)}`;
  if (r?.kind === 'weekly') {
    const days = (r.daysOfWeek || []).map((i) => DOW[i]).join('/');
    return `Weekly • ${days}${r.timeHHMM ? ` ${fmtTime(r.timeHHMM)}` : ''}`;
  }
  if (t.repeat === 'daily') return 'Daily';
  if (t.repeat === 'weekly') return 'Weekly';
  return 'One-time';
};
const dotClass = (t: Task) => {
  const now = Date.now();
  if (t.completed) return 'bg-slate-400';
  if (t.due && now > t.due && !t.enforcedAt) return 'bg-red-500';
  if (t.enforcedAt) return 'bg-emerald-500';
  if (t.holdUntil && t.holdUntil > now) return 'bg-sky-500';
  if (t.ackRequired && !t.ackAt) return 'bg-amber-500';
  return 'bg-gray-300';
};

/* -------------------------------------------------------
   Assignee normalization (accept many shapes)
-------------------------------------------------------- */
function readAssigneeId(t: any): string | null {
  return t.assignedTo ?? t.assigneeId ?? t.assignee?.id ?? t.kidId ?? t.childId ?? t.userId ?? null;
}
function readAssigneeName(
  t: any,
  kids: Array<{ apiUserId?: string; name?: string }>,
  users: Array<{ id: string; name?: string; role?: string }>
): string {
  const direct = t.assigneeName ?? t.assignee?.name ?? t.kidName ?? t.childName ?? t.user?.name ?? null;
  if (direct) return String(direct);

  const id = readAssigneeId(t);
  if (!id) return 'Unassigned';

  const kid = kids.find((k) => k.apiUserId === id);
  if (kid?.name?.trim()) return kid.name.trim();

  const u = users.find((u) => u.id === id);
  if (u?.name?.trim()) return u.name.trim();

  return `Kid ${id}`;
}
function kidsByApiId<T extends { apiUserId?: string }>(kids: T[]) {
  const m: Record<string, T> = {};
  for (const k of kids) if (k.apiUserId) m[k.apiUserId] = k;
  return m;
}

/* =======================================================
   Page
======================================================= */
export default function AdminPage() {
  /* acting user header */
  const [actingUser, setActingUser] = useState<string>('owner');
  const headers = useMemo(() => ({ 'x-user-id': actingUser }), [actingUser]);

  /* server state */
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const childUsers = users.filter((u) => u.role === 'Child' || u.role === 'Minor');

  const [presence, setPresence] = useState<Record<string, { online: boolean; lastSeenAt: number | null }>>({});
  const [ownerLabel, setOwnerLabel] = useState<string>('');
  const [plan, setPlan] = useState<PlanKey>('elite');
  const maxKids = PLAN_LIMITS[plan];

  /* local kids + ui prefs */
  const [kids, setKids] = useState<LocalKid[]>([]);
  const [activeKidId, setActiveKidId] = useState<string | null>(null);
  const [autoSelectActive, setAutoSelectActive] = useState<boolean>(true);

  /* notes */
  const [taskNotes, setTaskNotes] = useState<Record<string, { status: KidStatus; comment?: string }>>({});
  const [ownerNotes, setOwnerNotes] = useState<Record<string, { preset?: string; comment?: string }>>({});
  const [phoneTasks, setPhoneTasks] = useState<Record<string, Array<{ id: string; title: string; due?: number }>>>({});

  /* acting name & book */
  const [actingName, setActingName] = useState<string>('');
  const [nameBook, setNameBook] = useState<string[]>([]);
  const [actingNameDirty, setActingNameDirty] = useState(false);
  const [isSavingActingName, setIsSavingActingName] = useState(false);
  const [actingNameSavedAt, setActingNameSavedAt] = useState<number | null>(null);

  /* refresh state */
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshedAt, setRefreshedAt] = useState<number | null>(null);
  const [isReloading, setIsReloading] = useState(false);

  /* templates */
  const [mruTemplates, setMruTemplates] = useState<string[]>([]);
  const templateOptions = useMemo(() => {
    const merged = [...mruTemplates, ...DEFAULT_TEMPLATES];
    const seen = new Set<string>();
    const uniq: string[] = [];
    merged.forEach((t) => {
      const k = t.trim();
      if (!k) return;
      if (seen.has(k.toLowerCase())) return;
      seen.add(k.toLowerCase());
      uniq.push(k);
    });
    return uniq.slice(0, 12);
  }, [mruTemplates]);

  /* recurrence */
  const [recurrence, setRecurrence] = useState<'none' | 'daily' | 'weekly'>('none');
  const [dueAtLocal, setDueAtLocal] = useState<string>(defaultPlus15());
  const [dailyTime, setDailyTime] = useState<string>('17:00');
  const [weeklyTime, setWeeklyTime] = useState<string>('17:00');
  const [weeklyDays, setWeeklyDays] = useState<boolean[]>([false, true, false, true, false, true, false]); // Mon/Wed/Fri

  const ALERT_OFFSETS = [-15, -5];
  const [ackRequired, setAckRequired] = useState<boolean>(true);
  const [photoProof, setPhotoProof] = useState<boolean>(true);
  const [autoAction, setAutoAction] = useState<ActionV>('screen_lock');
  const [autoEnforce, setAutoEnforce] = useState<boolean>(true);
  const [busy, setBusy] = useState<boolean>(false);
  const [justSavedAt, setJustSavedAt] = useState<number | null>(null);

  const [err, setErr] = useState<string>('');
  const [recentManual, setRecentManual] = useState<Record<string, { action: ActionV; at: number }>>({});

  /* kid bottom sheet */
  const [kidSheet, setKidSheet] = useState<{ kidId: string } | null>(null);

  /* ---------- Load LS at mount ---------- */
  useEffect(() => {
    try {
      const rk = localStorage.getItem(LSK_KIDS);
      if (rk) setKids(JSON.parse(rk) as LocalKid[]);
      const ro = localStorage.getItem(LSK_OWNER);
      if (ro) setOwnerLabel(ro);
      const rp = localStorage.getItem(LSK_PLAN) as PlanKey | null;
      if (rp) setPlan(rp);
      const rn = localStorage.getItem(LSK_TASK_NOTES);
      if (rn) setTaskNotes(JSON.parse(rn));
      const ron = localStorage.getItem(LSK_OWNER_NOTES);
      if (ron) setOwnerNotes(JSON.parse(ron));
      const rph = localStorage.getItem(LSK_LOCAL_PHONE_TASKS);
      if (rph) setPhoneTasks(JSON.parse(rph));
      const rnb = localStorage.getItem(LSK_NAME_BOOK);
      if (rnb) setNameBook(JSON.parse(rnb));
      const rtpl = localStorage.getItem(LSK_TASK_TEMPLATES);
      if (rtpl) setMruTemplates(JSON.parse(rtpl));
    } catch {}
  }, []);

  /* Seed first kid & active id */
  useEffect(() => {
    if (kids.length === 0) {
      const id = `k-${Math.random().toString(36).slice(2, 8)}`;
      const seed: LocalKid = { id, name: 'Kid 1', phones: [], autoEnforce: true, autoAction: 'screen_lock' };
      try {
        localStorage.setItem(LSK_KIDS, JSON.stringify([seed]));
      } catch {}
      setKids([seed]);
      setActiveKidId(id);
    } else if (!activeKidId) {
      setActiveKidId(kids[0].id);
    }
  }, [kids, activeKidId]);

  /* persist helpers */
  const persistKids = useCallback((next: LocalKid[]) => {
    setKids(next);
    try {
      localStorage.setItem(LSK_KIDS, JSON.stringify(next));
    } catch {}
  }, []);
  const persistOwner = useCallback((label: string) => {
    setOwnerLabel(label);
    try {
      localStorage.setItem(LSK_OWNER, label);
    } catch {}
  }, []);
  const persistPlan = useCallback((p: PlanKey) => {
    setPlan(p);
    try {
      localStorage.setItem(LSK_PLAN, p);
    } catch {}
  }, []);
  const persistTaskNotes = useCallback((next: typeof taskNotes) => {
    setTaskNotes(next);
    try {
      localStorage.setItem(LSK_TASK_NOTES, JSON.stringify(next));
    } catch {}
  }, []);
  const persistOwnerNotes = useCallback((next: typeof ownerNotes) => {
    setOwnerNotes(next);
    try {
      localStorage.setItem(LSK_OWNER_NOTES, JSON.stringify(next));
    } catch {}
  }, []);
  const persistPhoneTasks = useCallback((next: typeof phoneTasks) => {
    setPhoneTasks(next);
    try {
      localStorage.setItem(LSK_LOCAL_PHONE_TASKS, JSON.stringify(next));
    } catch {}
  }, []);
  const persistTemplates = useCallback((list: string[]) => {
    setMruTemplates(list);
    try {
      localStorage.setItem(LSK_TASK_TEMPLATES, JSON.stringify(list));
    } catch {}
  }, []);

  /* Remember kid names so the “peopleMemory” stays coherent */
  useEffect(() => {
    const mem = kids
      .map((k) => (k.name || '').trim())
      .filter(Boolean)
      .map((label) => ({ id: toId(label), label, kind: 'kid' as const }));
    if (mem.length) rememberPeople(mem);
  }, [kids.map((k) => k.name).join('|')]);

  /* Unified loader */
  const loadAbortRef = useRef<AbortController | null>(null);
  const loadAll = useCallback(async () => {
    setErr('');
    setIsRefreshing(true);
    try {
      loadAbortRef.current?.abort();
    } catch {}
    const ctl = new AbortController();
    loadAbortRef.current = ctl;
    try {
      const [u, t] = await Promise.all([
        fetch(`${API_BASE}/api/users`, { headers, signal: ctl.signal }).then((r) => {
          if (!r.ok) throw new Error(`Users ${r.status}`);
          return r.json() as Promise<User[]>;
        }),
        fetch(`${API_BASE}/api/tasks`, { headers, signal: ctl.signal }).then((r) => {
          if (!r.ok) throw new Error(`Tasks ${r.status}`);
          return r.json() as Promise<Task[]>;
        }),
      ]);
      if (!ctl.signal.aborted) {
        setUsers(u);
        setTasks(t);
        setRefreshedAt(Date.now());
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') setErr((e as Error).message || 'Load failed');
    } finally {
      if (!loadAbortRef.current?.signal.aborted) {
        setIsRefreshing(false);
        setTimeout(() => setRefreshedAt(null), 1500);
      }
    }
  }, [headers]);
  useEffect(() => {
    void loadAll();
    return () => {
      try {
        loadAbortRef.current?.abort();
      } catch {}
    };
  }, [actingUser, loadAll]);

  /* Presence poll */
  useEffect(() => {
    const ids = Array.from(new Set(childUsers.map((u) => u.id)));
    let stopped = false;
    const tick = async () => {
      if (!ids.length) {
        if (!stopped) setTimeout(tick, 5000);
        return;
      }
      try {
        await Promise.all(
          ids.map(async (id) => {
            const r = await fetchJSON<{ userId: string; online: boolean; lastSeenAt: number | null; now: number }>(
              `${API_BASE}/api/device/presence?userId=${encodeURIComponent(id)}`
            );
            setPresence((p) => ({ ...p, [id]: { online: r.online, lastSeenAt: r.lastSeenAt } }));
          })
        );
      } catch {}
      if (!stopped) setTimeout(tick, 5000);
    };
    tick();
    return () => {
      stopped = true;
    };
  }, [childUsers.map((u) => u.id).join(',')]);

  /* Plan sync */
  useEffect(() => {
    (async () => {
      try {
        const res = await fetchJSON<{ plan: PlanKey }>(`${API_BASE}/api/plan`, { headers });
        if (res?.plan && (['free', 'lite', 'elite'] as PlanKey[]).includes(res.plan)) {
          setPlan(res.plan);
          try {
            localStorage.setItem(LSK_PLAN, res.plan);
          } catch {}
        }
      } catch {}
    })();
  }, [headers]);

  /* If active kid lacks mapping, auto map to first Child */
  useEffect(() => {
    if (!activeKidId || childUsers.length === 0) return;
    const kid = kids.find((k) => k.id === activeKidId);
    if (!kid) return;
    if (!kid.apiUserId) {
      const firstChild = childUsers[0]?.id;
      if (firstChild) {
        const next = kids.map((k) => (k.id === activeKidId ? { ...k, apiUserId: firstChild } : k));
        try {
          localStorage.setItem(LSK_KIDS, JSON.stringify(next));
        } catch {}
        setKids(next);
      }
    }
  }, [activeKidId, childUsers.map((u) => u.id).join('|')]);

  useEffect(() => {
    if (recurrence === 'none') setDueAtLocal(defaultPlus15());
  }, [recurrence]);

  /* Reset create form */
  const [preset, setPreset] = useState<string>('');
  const [useCustom, setUseCustom] = useState<boolean>(false);
  const [title, setTitle] = useState<string>('Clean room');

  const resetForm = useCallback(() => {
    setPreset('');
    setUseCustom(false);
    setTitle('Clean room');
    setRecurrence('none');
    setDueAtLocal(defaultPlus15());
    setDailyTime('17:00');
    setWeeklyTime('17:00');
    setWeeklyDays([false, true, false, true, false, true, false]);
    setAckRequired(true);
    setPhotoProof(true);
    setAutoAction('screen_lock');
    setAutoEnforce(true);
    setBusy(false);
    setJustSavedAt(null);
  }, []);

  /* API actions */
  async function enforceTask(id: string) {
    await fetchJSON(`${API_BASE}/api/tasks/${id}/enforce`, { method: 'POST', headers });
  }
  async function clearEnforcement(id: string) {
    await fetchJSON(`${API_BASE}/api/tasks/${id}/clear-enforcement`, { method: 'POST', headers });
  }
  const ackTask = useCallback(
    async (id: string) => {
      try {
        await fetchJSON(`${API_BASE}/api/tasks/${id}/ack`, { method: 'POST', headers });
        await loadAll();
      } catch (e: any) {
        alert(`ACK failed: ${e?.message || e}`);
      }
    },
    [headers, loadAll]
  );
  const holdTask = useCallback(
    async (id: string, minutes: number) => {
      try {
        await fetchJSON(`${API_BASE}/api/tasks/${id}/hold`, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ minutes }),
        });
        await loadAll();
      } catch (e: any) {
        alert(`Hold failed: ${e?.message || e}`);
      }
    },
    [headers, loadAll]
  );
  const resumeTask = useCallback(
    async (id: string) => {
      try {
        await fetchJSON(`${API_BASE}/api/tasks/${id}/resume`, { method: 'POST', headers });
        await loadAll();
      } catch (e: any) {
        alert(`Resume failed: ${e?.message || e}`);
      }
    },
    [headers, loadAll]
  );
  const enforceGlobal = useCallback(
    async (apiUserId: string, action: ActionV, reason: string) => {
      try {
        await fetchJSON(`${API_BASE}/api/parental/enforce`, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetUserId: apiUserId, action, reason }),
        });
        setRecentManual((m) => ({ ...m, [apiUserId]: { action, at: Date.now() } }));
        setTimeout(() => {
          setRecentManual((m) => {
            const cur = m[apiUserId];
            if (!cur) return m;
            if (Date.now() - cur.at > 2000) {
              const { [apiUserId]: _, ...rest } = m;
              return rest;
            }
            return m;
          });
        }, 2200);
      } catch (e: any) {
        alert(`Enforce failed: ${e?.message || e}`);
      }
    },
    [headers]
  );

  const cancelTask = useCallback(
    async (id: string) => {
      if (!confirm('Cancel this task now?')) return;
      try {
        await fetchJSON(`${API_BASE}/api/tasks/${id}/cancel`, { method: 'POST', headers });
        await loadAll();
      } catch (e) {
        alert((e as Error).message || 'Cancel failed');
      }
    },
    [headers, loadAll]
  );
  const deleteTask = useCallback(
    async (id: string) => {
      if (!confirm('Delete this completed task?')) return;
      try {
        await fetchJSON(`${API_BASE}/api/tasks/${id}`, { method: 'DELETE', headers });
        await loadAll();
      } catch {
        try {
          await fetchJSON(`${API_BASE}/api/tasks/${id}/cancel`, { method: 'POST', headers });
          await loadAll();
        } catch (e) {
          alert((e as Error).message || 'Delete failed');
        }
      }
    },
    [headers, loadAll]
  );

  /* helpers */
  const assigneeIdForKid = (k: LocalKid) => k.apiUserId || childUsers[0]?.id || '';
  const labelForUser = (u: User) =>
    u.role === 'Owner' ? 'Owner' : u.role === 'Child' ? 'Child' : u.role === 'Minor' ? 'Minor' : u.role;

  const displayAssignee = (t: Task) => readAssigneeName(t, kids, users);

  const kidOrderByApiId = useMemo(() => {
    const map = new Map<string, number>();
    kids.forEach((k, i) => {
      if (k.apiUserId) map.set(k.apiUserId, i);
    });
    return map;
  }, [kids]);

  const groupedSortedTasks = useMemo(() => {
    const list = tasks.slice();
    return list.sort((a, b) => {
      const aId = readAssigneeId(a) || '';
      const bId = readAssigneeId(b) || '';
      const ga = kidOrderByApiId.has(aId) ? kidOrderByApiId.get(aId)! : 9999;
      const gb = kidOrderByApiId.has(bId) ? kidOrderByApiId.get(bId)! : 9999;
      if (ga !== gb) return ga - gb;
      const da = a.due ?? 0;
      const db = b.due ?? 0;
      if (da !== db) return da - db;
      return (a.title || '').localeCompare(b.title || '');
    });
  }, [tasks, kidOrderByApiId]);

  /* Create minor tasks */
  const createMinorTasks = useCallback(async () => {
    if (!activeKidId) {
      alert('Select an Active Kid first.');
      return;
    }
    if (!useCustom && preset) setTitle(preset);
    if (!title.trim()) {
      alert('Title is required.');
      return;
    }
    const apiChildren = users.filter((u) => u.role === 'Child' || u.role === 'Minor');
    if (apiChildren.length === 0) {
      alert("No API 'Child' users found.");
      return;
    }
    const kid = kids.find((k) => k.id === activeKidId);
    const apiUserId = (kid?.apiUserId || apiChildren[0]?.id) ?? '';
    if (!apiUserId) {
      alert('Could not map Active Kid to an API Child.');
      return;
    }

    let repeatRule: RepeatRule;
    let due: number;
    if (recurrence === 'none') {
      const picked = new Date(dueAtLocal);
      due = picked.getTime();
      if (!due || Number.isNaN(due)) {
        alert('Please pick a valid due date & time.');
        return;
      }
      repeatRule = { kind: 'none', alertOffsetsMin: ALERT_OFFSETS };
    } else if (recurrence === 'daily') {
      repeatRule = { kind: 'daily', timeHHMM: dailyTime, alertOffsetsMin: ALERT_OFFSETS };
      due = nextOccurrenceFromNow(dailyTime);
    } else {
      const days: number[] = weeklyDays.map((on, idx) => (on ? idx : -1)).filter((x) => x >= 0);
      if (days.length === 0) {
        alert('Pick at least one day for Weekly.');
        return;
      }
      repeatRule = { kind: 'weekly', daysOfWeek: days, timeHHMM: weeklyTime, alertOffsetsMin: ALERT_OFFSETS };
      due = nextOccurrenceFromNow(weeklyTime, days);
    }

    setBusy(true);
    setErr('');
    try {
      await fetchJSON(`${API_BASE}/api/tasks`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          due,
          assignedTo: apiUserId,
          forMinor: true,
          ackRequired,
          photoProof,
          repeat: recurrence,
          repeatRule,
          autoEnforce: kid?.autoEnforce ?? autoEnforce,
          autoAction: (kid?.autoAction as Task['autoAction']) ?? autoAction,
        }),
      });

      const t = title.trim();
      if (t) {
        const next = [t, ...mruTemplates.filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, 10);
        persistTemplates(next);
      }
      setJustSavedAt(Date.now());
      setTimeout(() => setJustSavedAt(null), 1500);
      await loadAll();
      resetForm();
    } catch (e) {
      setErr((e as Error).message || 'Create failed');
      alert(`Create failed: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }, [
    activeKidId,
    users,
    kids,
    preset,
    useCustom,
    title,
    recurrence,
    dueAtLocal,
    dailyTime,
    weeklyTime,
    weeklyDays.join(''),
    ackRequired,
    photoProof,
    autoEnforce,
    autoAction,
    headers,
    loadAll,
    resetForm,
    mruTemplates,
    persistTemplates,
  ]);

  /* -------------------- UI -------------------- */
  return (
    <div className="min-h-dvh space-y-6 p-4 md:p-6">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-xl md:text-2xl font-semibold">Kids Admin</h1>
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs text-slate-600">Household</span>
            <input
              className="rounded-xl border px-2 py-1 text-sm"
              placeholder="e.g. Mom / Dad"
              value={ownerLabel}
              onChange={(e) => persistOwner(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className={cls(
              'rounded-xl px-3 py-1.5 text-sm border',
              isRefreshing ? 'bg-slate-100 text-slate-500' : refreshedAt ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-blue-50'
            )}
            disabled={isRefreshing}
            onClick={() => void loadAll()}
            title="Refresh data from server"
          >
            {isRefreshing ? 'Refreshing…' : refreshedAt ? 'Refreshed ✓' : 'Refresh Data'}
          </button>
          <button
            className={cls('rounded-xl px-3 py-1.5 text-sm border', isReloading ? 'bg-slate-100 text-slate-500' : 'border-slate-300')}
            disabled={isReloading}
            onClick={() => {
              setIsReloading(true);
              setTimeout(() => window.location.reload(), 150);
            }}
            title="Reload page"
          >
            {isReloading ? 'Reloading…' : 'Reload'}
          </button>
        </div>
      </header>

      {/* Acting row */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-600">Acting</span>
        <select
          className="rounded-xl border px-2 py-1 text-sm"
          value={actingUser}
          onChange={(e) => {
            const id = e.target.value;
            setActingUser(id);
            const sel = users.find((u) => u.id === id);
            const label = sel ? labelForUser(sel) : '';
            if (label) {
              setActingName(label);
              setActingNameDirty(true);
            }
          }}
        >
          {users.length === 0 && (
            <option value="" disabled>
              Add a kid below to begin
            </option>
          )}
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {labelForUser(u)}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-2 text-sm">
          <span>Acting name</span>
          <input
            className="rounded-xl border px-2 py-1 text-sm"
            list="name-book"
            value={actingName}
            onChange={(e) => {
              setActingName(e.target.value);
              setActingNameDirty(true);
              const tgt = activeKidId || kids[0]?.id;
              if (tgt) {
                const next = kids.map((k) => (k.id === tgt ? { ...k, name: e.target.value } : k));
                persistKids(next);
                setActiveKidId(tgt);
              }
            }}
            placeholder="type a name"
          />
          <datalist id="name-book">{nameBook.map((n) => <option key={n} value={n} />)}</datalist>
          <button
            className={cls(
              'rounded-xl px-3 py-1.5 border text-sm',
              isSavingActingName
                ? 'bg-slate-100 text-slate-500'
                : actingNameSavedAt
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                : actingNameDirty
                ? 'bg-blue-50'
                : 'bg-white'
            )}
            disabled={!actingNameDirty || isSavingActingName}
            onClick={() => {
              setIsSavingActingName(true);
              const label = actingName.trim();
              if (label && !nameBook.includes(label)) {
                const next = [label, ...nameBook].slice(0, 12);
                setNameBook(next);
                try {
                  localStorage.setItem(LSK_NAME_BOOK, JSON.stringify(next));
                } catch {}
              }
              setTimeout(() => {
                setIsSavingActingName(false);
                setActingNameDirty(false);
                setActingNameSavedAt(Date.now());
                setTimeout(() => setActingNameSavedAt(null), 1500);
              }, 300);
            }}
          >
            {isSavingActingName ? 'Saving…' : actingNameSavedAt ? 'Saved ✓' : 'Save'}
          </button>
        </label>
      </div>

      {err && <div className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}

     {/* Plan */}
<section className="card rounded-2xl border border-slate-200 bg-white shadow-soft p-4 sm:p-6">
  <div className="flex flex-wrap items-center gap-3">
    <h2 className="text-lg font-semibold">Plan</h2>

    <select
      className="rounded-xl border px-2 py-1 text-sm"
      value={plan}
      onChange={(e) => setPlan(e.target.value as PlanKey)}
    >
      <option value="free">Free (1 child)</option>
      <option value="lite">Lite (2 children)</option>
      <option value="elite">Elite (up to 5 children)</option>
    </select>

    <span className="text-xs text-slate-500">Selection uses one Active Kid</span>

    <label className="ml-auto flex items-center gap-2 text-xs">
      <input
        type="checkbox"
        checked={autoSelectActive}
        onChange={(e) => setAutoSelectActive(e.target.checked)}
      />
      Auto-select active kid
    </label>
  </div>
</section>

      {/* Live 1:00 Quick Check */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-soft">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Live 1:00 Quick Check</h2>
        </div>
        <div className="text-xs text-slate-500 mt-1">
          Uses current plan caps (Free = 5/day, Lite = 10/day, Elite = 15/day)
        </div>
        <div className="mt-4">
          <AdminLiveCheck
            kids={kids}
            plan={plan}
            presence={presence}
            activeKidId={activeKidId}
            onRefresh={() => void loadAll()}
            autoSelectActive={autoSelectActive}
            setActiveKidId={setActiveKidId}
          />
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-slate-500">Selection uses one Active Kid</span>
          <label className="ml-auto flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={autoSelectActive}
              onChange={(e) => setAutoSelectActive(e.target.checked)}
            />
            Auto-select active kid
          </label>
        </div>
      </section>

      {/* Kids */}
      <section className="card rounded-2xl border border-slate-200 bg-white shadow-soft p-4 sm:p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Kids (local, max {maxKids})</h2>
          <button
            className="rounded-xl border px-3 py-1.5 text-sm"
            onClick={() => {
              if (kids.length >= maxKids) {
                alert(`Your plan allows ${maxKids} kid${maxKids === 1 ? '' : 's'}.`);
                return;
              }
              const id = `k-${Math.random().toString(36).slice(2, 8)}`;
              const next: LocalKid[] = [
                ...kids,
                { id, name: `Kid ${kids.length + 1}`, phones: [], autoEnforce: true, autoAction: 'screen_lock' },
              ];
              persistKids(next);
              setActiveKidId(id);
            }}
            disabled={kids.length >= maxKids}
          >
            New child
          </button>
        </div>

        {/* chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {kids.map((k) => {
            const mappedId = assigneeIdForKid(k);
            const isOnline = mappedId && presence[mappedId]?.online;
            return (
              <button
                key={k.id}
                className={cls(
                  'shrink-0 rounded-full border px-3 py-1 text-sm flex items-center gap-2 transition bg-white hover:shadow'
                )}
                onClick={() => setKidSheet({ kidId: k.id })}
                title={isOnline ? 'Online' : 'Offline'}
              >
                <PresenceDot online={!!isOnline} /> <span className="truncate max-w-[16ch]">{k.name || '(unnamed)'}</span>
              </button>
            );
          })}
        </div>

        <div className="grid gap-3">
          {kids.length === 0 && <div className="text-sm text-slate-500">No kids yet. Tap “New child”.</div>}
          {kids.map((k) => {
            const isActive = activeKidId === k.id;
            const apiUserId = assigneeIdForKid(k);
            const isOnline = apiUserId && presence[apiUserId]?.online;
            const phoneValue = (k.phones && k.phones[0]) || '';

            return (
              <div key={k.id} className={cls('grid gap-3 rounded-2xl border p-3 sm:p-4', isActive && 'ring-2 ring-blue-400/60')}>
                <div className="grid items-end gap-2 sm:grid-cols-2 lg:grid-cols-6">
                  <label className="grid gap-1 min-w-0">
                    <span className="text-sm text-slate-600">Name</span>
                    <input
                      className="rounded-xl border px-2 py-1 w-full"
                      value={k.name || ''}
                      onChange={(e) => persistKids(kids.map((x) => (x.id === k.id ? { ...x, name: e.target.value } : x)))}
                    />
                  </label>

                  <label className="grid gap-1 min-w-0">
                    <span className="text-sm text-slate-600">Map to API Child</span>
                    <select
                      className="rounded-xl border px-2 py-1 w-full"
                      value={k.apiUserId || ''}
                      onChange={(e) =>
                        persistKids(kids.map((x) => (x.id === k.id ? { ...x, apiUserId: e.target.value || undefined } : x)))
                      }
                    >
                      <option value="">(auto choose first Child)</option>
                      {childUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name || labelForUser(u)} ({u.id})
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-1 min-w-0">
                    <span className="text-sm text-slate-600">Device IP</span>
                    <input
                      className="rounded-xl border px-2 py-1 w-full"
                      placeholder="192.168.1.42"
                      value={k.ip || ''}
                      onChange={(e) => persistKids(kids.map((x) => (x.id === k.id ? { ...x, ip: e.target.value } : x)))}
                    />
                  </label>

                  <label className="grid gap-1 min-w-0">
                    <span className="text-sm text-slate-600">Port</span>
                    <input
                      type="number"
                      className="rounded-xl border px-2 py-1 w-full"
                      placeholder="8088"
                      value={k.port ?? ''}
                      onChange={(e) =>
                        persistKids(
                          kids.map((x) => (x.id === k.id ? { ...x, port: e.target.value ? parseInt(e.target.value, 10) : undefined } : x))
                        )
                      }
                    />
                  </label>

                  <label className="grid gap-1 min-w-0">
                    <span className="text-sm text-slate-600">Auto/Manual</span>
                    <select
                      className="rounded-xl border px-2 py-1 w-full"
                      value={k.autoEnforce ? 'auto' : 'manual'}
                      onChange={(e) => persistKids(kids.map((x) => (x.id === k.id ? { ...x, autoEnforce: e.target.value === 'auto' } : x)))}
                    >
                      <option value="auto">Automatic</option>
                      <option value="manual">Manual only</option>
                    </select>
                  </label>

                  <label className="grid gap-1 min-w-0">
                    <span className="text-sm text-slate-600">Auto Action</span>
                    <select
                      className="rounded-xl border px-2 py-1 w-full"
                      value={k.autoAction || 'screen_lock'}
                      onChange={(e) =>
                        persistKids(kids.map((x) => (x.id === k.id ? { ...x, autoAction: e.target.value as ActionV } : x)))
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

                {/* Phone (single) */}
                <div className="grid gap-2">
                  <div className="text-sm text-slate-600">Phone number</div>
                  <div className="flex items-center gap-2">
                    <input
                      className="rounded-xl border px-2 py-1 w-full max-w-xs"
                      placeholder="+1 555…"
                      value={phoneValue}
                      onChange={(e) => persistKids(kids.map((x) => (x.id === k.id ? { ...x, phones: [e.target.value] } : x)))}
                    />
                    {phoneValue ? (
                      <button
                        className="rounded-xl border px-2 py-1 text-sm"
                        onClick={() => persistKids(kids.map((x) => (x.id === k.id ? { ...x, phones: [] } : x)))}
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                  {!phoneValue && <div className="text-xs text-slate-500">No phone added.</div>}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    className={cls(
                      'rounded-xl px-3 py-1.5 border',
                      isActive ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white hover:bg-emerald-50'
                    )}
                    onClick={() => setActiveKidId(k.id)}
                    title={isActive ? 'Active' : 'Set as active'}
                  >
                    {isActive ? 'Active' : 'Set Active'}
                  </button>
                  <button
                    className="rounded-xl border px-3 py-1.5"
                    onClick={() => {
                      const victim = kids.find((x) => x.id === k.id);
                      if (victim?.name?.trim()) {
                        try {
                          removePerson(toId(victim.name));
                        } catch {}
                      }
                      const next = kids.filter((x) => x.id !== k.id);
                      persistKids(next);
                      if (activeKidId === k.id) setActiveKidId(next[0]?.id ?? null);
                    }}
                  >
                    Delete child
                  </button>
                  <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
                    <PresenceDot online={!!isOnline} /> {isOnline ? 'Online' : 'Offline'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-xs text-slate-500">
          (Names, IPs, ports, phones are stored <b>locally</b>. Parental actions use the mapped API Child.)
        </div>
      </section>

      {/* Create tasks */}
      <section className="card rounded-2xl border border-slate-200 bg-white shadow-soft p-4 sm:p-6 space-y-4">
        <h2 className="text-lg font-semibold">Create Minor Tasks</h2>
        <div className="text-xs text-slate-500">Uses the one Active Kid</div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* selection preview */}
          <div className="rounded-2xl border border-slate-200 p-3 sm:p-4">
            <div className="text-xs text-slate-600 mb-2">Selected</div>
            <div className="flex flex-wrap gap-2">
              {activeKidId ? (
                (() => {
                  const kid = kids.find((k) => k.id === activeKidId)!;
                  const mappedId = assigneeIdForKid(kid);
                  const isOnline = mappedId && presence[mappedId]?.online;
                  return (
                    <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm border bg-blue-600 text-white border-blue-600">
                      <PresenceDot online={!!isOnline} />{' '}
                      <span className="truncate max-w-[18ch]">{kid.name || '(unnamed)'}</span>
                      <button className="ml-1 -mr-1 rounded-full px-1 hover:bg-white/20" aria-label="remove" onClick={() => setActiveKidId(null)}>
                        ×
                      </button>
                    </span>
                  );
                })()
              ) : (
                <span className="text-xs text-slate-500">No active kid selected.</span>
              )}
            </div>
          </div>

          {/* fields */}
          <div className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-sm text-slate-600">Template (preset)</span>
                <select
                  className="rounded-xl border px-2 py-1"
                  value={useCustom ? '__custom__' : preset}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === '__custom__') {
                      setUseCustom(true);
                      if (!title.trim()) setTitle('');
                      setPreset('');
                    } else {
                      setUseCustom(false);
                      setPreset(v);
                      if (v) setTitle(v);
                    }
                  }}
                >
                  <option value="">— Select a task —</option>
                  {templateOptions.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                  <option value="__custom__">Custom…</option>
                </select>
              </label>

              <label className="grid gap-1">
                <span className="text-sm text-slate-600">Title</span>
                <input
                  className="rounded-xl border px-2 py-1"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setUseCustom(true);
                  }}
                  placeholder="Type custom title"
                />
              </label>
            </div>

            {/* Recurrence + times */}
            <div className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="grid gap-1">
                  <span className="text-sm text-slate-600">Recurrence</span>
                  <select className="rounded-xl border px-2 py-1" value={recurrence} onChange={(e) => setRecurrence(e.target.value as any)}>
                    <option value="none">One-time</option>
                    <option value="daily">Daily (pre-alerts −15/−5)</option>
                    <option value="weekly">Weekly (pick days + time)</option>
                  </select>
                </label>

                {recurrence === 'none' && (
                  <label className="grid gap-1">
                    <span className="text-sm text-slate-600">Due date &amp; time</span>
                    <input
                      type="datetime-local"
                      className="rounded-xl border px-2 py-1"
                      value={dueAtLocal}
                      onChange={(e) => setDueAtLocal(e.target.value)}
                    />
                  </label>
                )}

                {recurrence === 'daily' && (
                  <label className="grid gap-1">
                    <span className="text-sm text-slate-600">Time each day</span>
                    <input type="time" className="rounded-xl border px-2 py-1" value={dailyTime} onChange={(e) => setDailyTime(e.target.value)} />
                  </label>
                )}

                {recurrence === 'weekly' && (
                  <label className="grid gap-1">
                    <span className="text-sm text-slate-600">Time on selected days</span>
                    <input type="time" className="rounded-xl border px-2 py-1" value={weeklyTime} onChange={(e) => setWeeklyTime(e.target.value)} />
                  </label>
                )}
              </div>

              {recurrence === 'weekly' && (
                <div className="flex flex-wrap gap-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
                    <label
                      key={d}
                      className={cls(
                        'inline-flex items-center gap-2 rounded-full border px-2 py-1 text-sm cursor-pointer',
                        weeklyDays[i] ? 'bg-blue-50 border-blue-300' : 'bg-white'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={weeklyDays[i]}
                        onChange={(e) => setWeeklyDays(weeklyDays.map((v, idx) => (idx === i ? e.target.checked : v)))}
                      />
                      {d}
                    </label>
                  ))}
                </div>
              )}

              <div className="text-xs text-slate-500">
                Pre-alerts will fire at <b>−15 min</b> and <b>−5 min</b>. If there’s no ACK by due time, enforcement will run based on your
                Auto/Manual setting.
              </div>
            </div>

            {/* flags */}
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={ackRequired} onChange={(e) => setAckRequired(e.target.checked)} /> Ack required
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={photoProof} onChange={(e) => setPhotoProof(e.target.checked)} /> Photo proof
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={autoEnforce} onChange={(e) => setAutoEnforce(e.target.checked)} /> Auto enforce on overdue
              </label>
              <label className="flex items-center gap-2 text-sm">
                <span>Auto action</span>
                <select className="rounded-xl border px-2 py-1" value={autoAction} onChange={(e) => setAutoAction(e.target.value as ActionV)}>
                  {ACTIONS.map((a) => (
                    <option key={a.v} value={a.v}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                className={cls(
                  'rounded-xl px-3 py-1.5 border',
                  busy ? 'bg-slate-100 text-slate-500' : justSavedAt ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-blue-50'
                )}
                onClick={() => void createMinorTasks()}
                disabled={busy || !activeKidId || !title.trim()}
              >
                {busy ? 'Saving…' : justSavedAt ? 'Saved ✓' : 'Save'}
              </button>
              <button className="rounded-xl border px-3 py-1.5" onClick={resetForm} disabled={busy}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Parental enforce */}
      <section className="card rounded-2xl border border-slate-200 bg-white shadow-soft p-4 sm:p-6 space-y-3">
        <h2 className="text-lg font-semibold">Parental Enforce</h2>
        <div className="grid gap-3">
          {kids.length === 0 && <div className="text-sm text-slate-500">Add kids above and map them to API Child users.</div>}
          {kids.map((k) => {
            const apiUserId = assigneeIdForKid(k);
            const isOnline = apiUserId && presence[apiUserId]?.online;
            const recent = recentManual[apiUserId || ''];
            return (
              <div key={k.id} className="grid gap-2 rounded-2xl border p-3 sm:p-4">
                <div className="font-medium flex items-center gap-2 min-w-0">
                  <PresenceDot online={!!isOnline} />
                  <span className="truncate">{k.name || '(unnamed)'}</span>
                  <span className="text-xs text-slate-500 truncate">
                    • IP: {k.ip || '-'}:{k.port ?? '-'} • Phone: {(k.phones || []).filter(Boolean)[0] || '-'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {ACTIONS.map((a) => (
                    <button
                      key={a.v}
                      className={cls(
                        'rounded-xl border px-2 py-1 text-sm',
                        recent && recent.action === a.v && Date.now() - recent.at < 2000 && 'bg-emerald-100 border-emerald-300'
                      )}
                      disabled={!apiUserId}
                      onClick={() => void enforceGlobal(apiUserId, a.v, 'Admin')}
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

      {/* Tasks */}
      <section className="card rounded-2xl border border-slate-200 bg-white shadow-soft p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Tasks</h2>
          <button className="rounded-xl border px-3 py-1.5" onClick={() => void loadAll()}>
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
              {(() => {
                const kidsMap = kidsByApiId(kids);
                let lastGroupKey: string | null = null;

                return groupedSortedTasks.map((t, idx) => {
                  const assigneeId = readAssigneeId(t) || '';
                  const assigneeName = displayAssignee(t);

                  const groupLabel = assigneeId
                    ? kidsMap[assigneeId]?.name || users.find((u) => u.id === assigneeId)?.name || `Kid ${assigneeId}`
                    : 'Unassigned';
                  const groupKey = assigneeId || 'unassigned';

                  const overdue = !!(t.due && Date.now() > t.due && !t.completed && !t.enforcedAt);
                  const paused = !!(t.pausedByParent || (t.holdUntil && t.holdUntil > Date.now()));

                  const headerRow =
                    groupKey !== lastGroupKey ? (
                      <tr key={`g-${idx}`}>
                        <td colSpan={7} className="pt-4 pb-2 text-xs font-semibold text-slate-600">
                          {groupLabel}
                        </td>
                      </tr>
                    ) : null;
                  lastGroupKey = groupKey;

                  return (
                    <React.Fragment key={t.id}>
                      {headerRow}
                      <tr className="border-b align-top">
                        <td className="py-2 pr-4">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`h-2 w-2 rounded-full ${dotClass(t)}`} />
                            <span className="truncate max-w-[18ch] sm:max-w-none" title={t.title}>
                              {t.title}
                            </span>
                            <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-700 whitespace-nowrap">
                              {recurrenceText(t)}
                            </span>
                          </div>
                          {paused && <span className="ml-2 rounded bg-sky-100 px-1.5 py-0.5 text-[10px] text-sky-800">Paused</span>}
                          {overdue && <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-[10px] text-red-700">Overdue</span>}
                          {t.enforcedAt && (
                            <span
                              className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] text-emerald-700"
                              title={t.enforceChannel ? `via ${t.enforceChannel}` : ''}
                            >
                              Enforced
                            </span>
                          )}
                          {t.completed && <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-700">Done</span>}
                        </td>
                        <td className="py-2 pr-4">{assigneeName}</td>
                        <td className="py-2 pr-4">{t.due ? new Date(t.due).toLocaleString() : '-'}</td>
                        <td className="py-2 pr-4">{t.forMinor ? `stage ${t.__minorStage ?? 0}` : '-'}</td>
                        <td className="py-2 pr-4">{t.ackBy || '-'}</td>
                        <td className="py-2 pr-4">{t.proofKey ? t.proofKey.split('/').slice(-1)[0] : '—'}</td>
                        <td className="py-2">
                          <div className="flex flex-wrap gap-2">
                            <button className="rounded-xl border px-2 py-1" onClick={() => void ackTask(t.id)} title="Acknowledge">
                              Ack
                            </button>

                            {!paused ? (
                              <>
                                <button className="rounded-xl border px-2 py-1" onClick={() => void holdTask(t.id, 15)}>
                                  Hold 15m
                                </button>
                                <button className="rounded-xl border px-2 py-1" onClick={() => void holdTask(t.id, 30)}>
                                  Hold 30m
                                </button>
                                <button className="rounded-xl border px-2 py-1" onClick={() => void holdTask(t.id, 60)}>
                                  Hold 1h
                                </button>
                                <span className="inline-flex items-center gap-1">
                                  <input
                                    type="number"
                                    min={1}
                                    placeholder="mins"
                                    className="w-16 rounded-xl border px-2 py-1 text-sm"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        const v = parseInt((e.target as HTMLInputElement).value || '0', 10);
                                        if (v > 0) holdTask(t.id, v);
                                      }
                                    }}
                                  />
                                  <span className="text-xs text-slate-500">custom</span>
                                </span>
                              </>
                            ) : (
                              <button className="rounded-xl border px-2 py-1 bg-sky-50" onClick={() => void resumeTask(t.id)}>
                                Resume
                              </button>
                            )}

                            {overdue && (
                              <button
                                className="rounded-xl border px-2 py-1 bg-amber-50"
                                onClick={async () => {
                                  try {
                                    await enforceTask(t.id);
                                    await loadAll();
                                  } catch (e: any) {
                                    alert(`Enforce failed: ${e?.message || e}`);
                                  }
                                }}
                                title={t.due ? `Overdue — ${new Date(t.due).toLocaleString()}` : 'Overdue'}
                              >
                                Enforce now
                              </button>
                            )}

                            {t.enforcedAt && (
                              <button
                                className="rounded-xl border px-2 py-1"
                                onClick={async () => {
                                  try {
                                    await clearEnforcement(t.id);
                                    await loadAll();
                                  } catch (e: any) {
                                    alert(`Clear failed: ${e?.message || e}`);
                                  }
                                }}
                                title={t.enforceChannel ? `via ${t.enforceChannel}` : undefined}
                              >
                                Clear enforcement
                              </button>
                            )}

                            {!t.completed && (
                              <button className="rounded-xl border px-2 py-1" onClick={() => void cancelTask(t.id)}>
                                Cancel
                              </button>
                            )}
                            {t.completed && (
                              <button className="rounded-xl border px-2 py-1" onClick={() => void deleteTask(t.id)}>
                                Delete
                              </button>
                            )}
                          </div>
                          {t.holdUntil && t.holdUntil > Date.now() && (
                            <div className="mt-1 text-[11px] text-slate-600">On hold until {new Date(t.holdUntil).toLocaleString()}</div>
                          )}
                          {t.lastEnforceError && <div className="mt-1 text-[11px] text-red-600">Last error: {t.lastEnforceError}</div>}
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                });
              })()}
              {groupedSortedTasks.length === 0 && (
                <tr>
                  <td className="py-4 text-slate-500" colSpan={7}>
                    No tasks
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Phone Preview (mobile-friendly – tightened spacing & wrapping) */}
      <section className="card rounded-2xl border border-slate-200 bg-white shadow-soft p-4 sm:p-6 space-y-3">
        <h2 className="text-lg font-semibold">Phone Preview</h2>
        <div className="text-xs text-slate-500">Local-only preview (no backend writes). Choose an active kid above.</div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Kid phone side */}
          <div className="rounded-2xl border border-slate-200 p-3 sm:p-4">
            <div className="font-medium mb-2">Kid Phone</div>
            {!activeKidId && <div className="text-sm text-slate-500">Select an active kid to preview.</div>}
            {!!activeKidId &&
              (() => {
                const kid = kids.find((k) => k.id === activeKidId)!;
                const apiUserId = assigneeIdForKid(kid);
                const assigned = tasks.filter((t) => apiUserId && readAssigneeId(t) === apiUserId);
                const mt = phoneTasks[activeKidId] || [];
                const manualInputId = `kid-manual-title-${activeKidId}`;
                return (
                  <div className="grid gap-3 mt-2">
                    <div className="grid gap-2">
                      <label className="grid gap-1">
                        <span className="text-sm text-slate-600">Add Manual Task (local)</span>
                        <div className="flex gap-2">
                          <input
                            id={manualInputId}
                            className="rounded-xl border px-2 py-1 flex-1"
                            placeholder="e.g. Stretch for 5 minutes"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const el = e.currentTarget as HTMLInputElement;
                                const val = el.value.trim();
                                if (!val) return;
                                const entry = { id: `local-${Date.now()}`, title: val };
                                const next = { ...phoneTasks, [activeKidId!]: [...(phoneTasks[activeKidId!] || []), entry] };
                                try {
                                  localStorage.setItem(LSK_LOCAL_PHONE_TASKS, JSON.stringify(next));
                                } catch {}
                                setPhoneTasks(next);
                                el.value = '';
                              }
                            }}
                          />
                          <button
                            className="rounded-xl border px-3 py-1"
                            onClick={() => {
                              const el = document.getElementById(manualInputId) as HTMLInputElement | null;
                              const val = el?.value?.trim();
                              if (!val) return;
                              const entry = { id: `local-${Date.now()}`, title: val };
                              const next = { ...phoneTasks, [activeKidId!]: [...mt, entry] };
                              try {
                                localStorage.setItem(LSK_LOCAL_PHONE_TASKS, JSON.stringify(next));
                              } catch {}
                              setPhoneTasks(next);
                              if (el) el.value = '';
                            }}
                          >
                            Add
                          </button>
                        </div>
                      </label>

                      {mt.length > 0 && (
                        <div className="grid gap-1">
                          <div className="text-xs text-slate-600">Local tasks</div>
                          {mt.map((m) => (
                            <div key={m.id} className="flex items-center justify-between rounded-xl border px-2 py-1">
                              <span className="text-sm break-words pr-2">{m.title}</span>
                              <button
                                className="rounded-xl border px-2 py-0.5 text-xs"
                                onClick={() => {
                                  const next = { ...phoneTasks, [activeKidId!]: mt.filter((x) => x.id !== m.id) };
                                  try {
                                    localStorage.setItem(LSK_LOCAL_PHONE_TASKS, JSON.stringify(next));
                                  } catch {}
                                  setPhoneTasks(next);
                                }}
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="grid gap-2">
                      <div className="text-sm text-slate-600">Assigned Tasks (API)</div>
                      {assigned.length === 0 && <div className="text-xs text-slate-500">No assigned tasks.</div>}
                      {assigned.map((t) => {
                        const note = taskNotes[t.id] || { status: 'not_started' as KidStatus, comment: '' };
                        return (
                          <div key={t.id} className="grid gap-2 rounded-xl border p-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-sm font-medium truncate">{t.title}</div>
                              <div className="text-xs text-slate-500 whitespace-nowrap">{t.due ? new Date(t.due).toLocaleString() : '-'}</div>
                            </div>
                            <div className="grid gap-2 sm:flex sm:items-center sm:gap-3">
                              <label className="flex items-center gap-2 text-sm">
                                <span>Status</span>
                                <select
                                  className="rounded-xl border px-2 py-1"
                                  value={note.status}
                                  onChange={(e) => {
                                    const next = { ...taskNotes, [t.id]: { ...note, status: e.target.value as KidStatus } };
                                    persistTaskNotes(next);
                                  }}
                                >
                                  <option value="not_started">Not started</option>
                                  <option value="in_progress">In progress</option>
                                  <option value="almost_done">Almost done</option>
                                  <option value="done">Done</option>
                                  <option value="skipped">Skipped</option>
                                </select>
                              </label>
                              <button className="rounded-xl border px-2 py-1 text-sm" onClick={() => void ackTask(t.id)}>
                                Acknowledge
                              </button>
                            </div>
                            <label className="grid gap-1">
                              <span className="text-sm">Comment</span>
                              <textarea
                                className="rounded-xl border px-2 py-1"
                                rows={2}
                                placeholder="I'm feeling sick…"
                                value={note.comment || ''}
                                onChange={(e) => {
                                  const next = { ...taskNotes, [t.id]: { ...note, comment: e.target.value } };
                                  persistTaskNotes(next);
                                }}
                              />
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
          </div>

          {/* Owner preview */}
          <div className="rounded-2xl border border-slate-200 p-3 sm:p-4">
            <div className="font-medium mb-2">Owner Preview</div>
            {!activeKidId && <div className="text-sm text-slate-500">Select an active kid to preview.</div>}
            {!!activeKidId &&
              (() => {
                const kid = kids.find((k) => k.id === activeKidId)!;
                const apiUserId = assigneeIdForKid(kid);
                const assigned = tasks.filter((t) => apiUserId && readAssigneeId(t) === apiUserId);
                return (
                  <div className="grid gap-2">
                    {assigned.map((t) => {
                      const note = ownerNotes[t.id] || { preset: '', comment: '' };
                      return (
                        <div key={t.id} className="grid gap-2 rounded-xl border p-2">
                          <div className="text-sm font-medium truncate">{t.title}</div>
                          <div className="grid gap-2 sm:flex sm:items-center sm:gap-3">
                            <label className="flex items-center gap-2 text-sm">
                              <span>Quick comment</span>
                              <select
                                className="rounded-xl border px-2 py-1"
                                value={note.preset || ''}
                                onChange={(e) => {
                                  const next = { ...ownerNotes, [t.id]: { ...note, preset: e.target.value } };
                                  try {
                                    localStorage.setItem(LSK_OWNER_NOTES, JSON.stringify(next));
                                  } catch {}
                                  setOwnerNotes(next);
                                }}
                              >
                                <option value="">(none)</option>
                                <option value="good_job">Good job!</option>
                                <option value="please_finish">Please finish soon</option>
                                <option value="almost_there">Almost there—keep going</option>
                                <option value="need_help">Need help?</option>
                              </select>
                            </label>
                          </div>
                          <label className="grid gap-1">
                            <span className="text-sm">Message</span>
                            <textarea
                              className="rounded-xl border px-2 py-1"
                              rows={2}
                              placeholder="Proud of you for sticking with it!"
                              value={note.comment || ''}
                              onChange={(e) => {
                                const next = { ...ownerNotes, [t.id]: { ...note, comment: e.target.value } };
                                try {
                                  localStorage.setItem(LSK_OWNER_NOTES, JSON.stringify(next));
                                } catch {}
                                setOwnerNotes(next);
                              }}
                            />
                          </label>
                          <div className="text-xs text-slate-500">Saved locally (no server endpoint yet).</div>
                        </div>
                      );
                    })}
                    {assigned.length === 0 && <div className="text-xs text-slate-500">No assigned tasks to comment on.</div>}
                  </div>
                );
              })()}
          </div>
        </div>
      </section>

      <footer className="text-xs text-slate-500">
        Connected to API at <b>{API_BASE}</b> as <b>{actingUser}</b>
      </footer>

      {/* Bottom Sheet */}
      {kidSheet &&
        (() => {
          const kid = kids.find((k) => k.id === kidSheet.kidId);
          const apiUserId = kid ? assigneeIdForKid(kid) : '';
          const presenceOK = apiUserId && presence[apiUserId]?.online;
          const kidTasks = tasks.filter((t) => apiUserId && readAssigneeId(t) === apiUserId);

          return (
            <div className="fixed inset-0 z-50">
              <div className="absolute inset-0 bg-black/30" onClick={() => setKidSheet(null)} />
              <div className="absolute inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl bg-white shadow-xl">
                <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-slate-300" />
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={cls('h-2.5 w-2.5 rounded-full', presenceOK ? 'bg-emerald-500' : 'bg-gray-300')} />
                    <div className="font-semibold truncate">{kid?.name || 'Kid'}</div>
                  </div>
                  <button className="rounded-xl border px-2 py-1" onClick={() => setKidSheet(null)}>
                    Close
                  </button>
                </div>

                <div className="space-y-2 overflow-y-auto px-4 pb-4">
                  {kidTasks.map((t) => (
                    <div key={t.id} className="flex items-center justify-between rounded-xl border px-3 py-2 gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={cls('h-2 w-2 rounded-full', dotClass(t))} />
                          <span className="truncate max-w-[18ch]" title={t.title}>
                            {t.title}
                          </span>
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px]">{recurrenceText(t)}</span>
                        </div>
                        <div className="text-xs text-slate-500 whitespace-nowrap">{t.due ? new Date(t.due).toLocaleString() : '—'}</div>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button className="rounded-md border px-2 py-1 text-xs" onClick={() => ackTask(t.id)}>
                          Ack
                        </button>
                        <button className="rounded-md border px-2 py-1 text-xs" onClick={() => holdTask(t.id, 15)}>
                          Hold
                        </button>
                        <button className="rounded-md border px-2 py-1 text-xs" onClick={() => cancelTask(t.id)}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ))}
                  {kidTasks.length === 0 && <div className="pb-6 text-center text-sm text-slate-500">No tasks yet</div>}
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
}
