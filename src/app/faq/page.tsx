import Link from "next/link";
import FaqAccordion from "@/components/FaqAccordion";

export const metadata = {
  title: "CareCircle — Friendly FAQ",
  description: "Collapsible FAQ with kid-simple steps and grown-up technical notes.",
};

export default function FaqPage() {
  const items = [
    {
      id: "quick-start",
      question: "Quick Start (like I’m five)",
      answer: (
        <>
          <ol>
            <li>Pick who you are (the helper at home).</li>
            <li>Add your kids (their names).</li>
            <li>Tap <b>Make a Task</b> (like “Clean room”).</li>
            <li>Choose kids and press <b>Save</b>. That’s it!</li>
          </ol>
          <p>
            <b>do it now:</b>{" "}
            <Link href="/admin#chores">Open Admin → Chores</Link>
          </p>
          <p><b>grown-up notes:</b></p>
          <ul>
            <li>The “Acting user” sets the header <code>x-user-id</code> for API calls.</li>
            <li>Kids you add here are <b>local only</b> (saved in your browser), not sent to the server until you make tasks or enforce actions.</li>
          </ul>
        </>
      ),
      defaultOpen: true,
    },
    {
      id: "acting-user",
      question: "Acting User",
      answer: (
        <>
          <p>Pick who is using the app right now (Mom, Dad, etc.). Then press <b>Refresh</b> if needed.</p>
          <p><b>do it now:</b> <Link href="/admin">Open Admin</Link></p>
          <p><b>grown-up notes:</b></p>
          <ul>
            <li>Dropdown shows server users when available; otherwise you’ll see Owner/Child/Family placeholders.</li>
            <li>The acting user’s role matters for permissions (see Parental Enforce &amp; ACK).</li>
            <li>Header sent: <code>x-user-id: &lt;actingUserId&gt;</code>.</li>
          </ul>
        </>
      ),
    },
    {
      id: "plans-limits",
      question: "Plans & Limits",
      answer: (
        <>
          <ul>
            <li><b>Free:</b> 1 kid per task</li>
            <li><b>Lite:</b> 2 kids per task</li>
            <li><b>Elite:</b> as many kids as you want</li>
          </ul>
          <p><b>do it now:</b> <Link href="/admin#plan">Change Plan</Link></p>
          <p><b>grown-up notes:</b> Client enforces max assignees per task using: <code>free=1</code>, <code>lite=2</code>, <code>elite=999</code>.</p>
        </>
      ),
    },
    {
      id: "kids-list",
      question: "Kids List",
      answer: (
        <>
          <ol>
            <li>Press <b>Add child</b> (up to 5).</li>
            <li>Type their name.</li>
            <li>(Optional) Type their device <b>IP</b> and <b>Port</b> and add <b>phone</b> numbers (up to 5).</li>
            <li>Choose <b>Automatic</b> or <b>Manual</b> for “Auto” actions later.</li>
          </ol>
          <p><b>do it now:</b> <Link href="/admin#kids">Manage Kids</Link></p>
          <p><b>grown-up notes (validation &amp; storage):</b></p>
          <ul>
            <li>Stored locally under keys: <code>admin.localKids.v2</code>, <code>admin.ownerLabel.v1</code>, <code>admin.plan.v1</code>.</li>
            <li><b>IP</b> must look like <code>192.168.1.42</code> (IPv4 only).</li>
            <li><b>Port</b> must be <code>1–65535</code>.</li>
            <li><b>Phones</b> must be digits/spaces and these: <code>()+- .</code>, length <code>5–20</code>.</li>
            <li>You can map each local kid to a real <b>API Child</b> user.</li>
          </ul>
        </>
      ),
    },
    {
      id: "make-a-task",
      question: "Make a Task",
      answer: (
        <>
          <ol>
            <li>Pick which kids (buttons light up).</li>
            <li>Choose a template (or type your own title).</li>
            <li>Choose <b>one-time</b>, <b>daily</b>, or <b>weekly</b>.</li>
            <li>Turn on <b>Ack required</b> and <b>Photo proof</b> if you want.</li>
            <li>Want auto help if it’s late? Turn on <b>Auto enforce</b> and pick an <b>Auto action</b> (like “Lock screen”).</li>
            <li>Press <b>Save</b>.</li>
          </ol>
          <p><b>do it now:</b> <Link href="/admin#chores">Create Tasks</Link></p>
          <p><b>grown-up notes (options &amp; scheduling):</b></p>
          <ul>
            <li>Templates included: Clean room, Wash dishes, Take out trash, Homework, Laundry, Feed pets, Read 20 minutes, Practice instrument.</li>
            <li><b>One-time due</b> = now + N minutes; <b>Daily</b> = next chosen time; <b>Weekly</b> = next chosen day/time (0=Sun..6=Sat).</li>
            <li>Flags: <code>ackRequired</code>, <code>photoProof</code>, <code>repeat: 'none'|'daily'|'weekly'</code>, <code>autoEnforce</code>, <code>autoAction</code>.</li>
            <li>Auto actions: Loud alert, Lock screen, Pause network, Restart device, Shutdown device, Restart app.</li>
            <li>After Save, we fetch <code>/api/tasks</code> again and reset the form.</li>
          </ul>
        </>
      ),
    },
    {
      id: "parental-enforce",
      question: "Parental Enforce",
      answer: (
        <>
          <p><i>like i’m five:</i> Need a nudge? On each kid card, press a button like <b>Loud alert</b> or <b>Lock screen</b>. Big actions (Restart/Shutdown) will <b>ask first</b>.</p>
          <p><b>do it now:</b> <Link href="/admin#network">Parental Enforce</Link></p>
          <p><b>grown-up notes (guardrails):</b></p>
          <ul>
            <li>Only <b>Owner/Family</b> can enforce (kids/minors cannot).</li>
            <li>Destructive actions (Restart/Shutdown) prompt <code>confirm()</code>.</li>
            <li>Rate-limited (cooldown a few seconds) per target/action.</li>
            <li>Sends POST to <code>/api/parental/enforce</code> with <code>{`{ targetUserId, action, reason }`}</code>.</li>
            <li>Actual device control needs backend + device app/MDM integration (see Future-Ready).</li>
          </ul>
        </>
      ),
    },
    {
      id: "tasks-table",
      question: "Tasks Table",
      answer: (
        <>
          <p>See all tasks. You can press <b>Ack</b> when complete.</p>
          <p><b>do it now:</b> <Link href="/admin#tasks">See Tasks</Link></p>
          <p><b>grown-up notes:</b></p>
          <ul>
            <li>Columns show: Title, Assignee, Due, Minor stage, Ack by, Photo proof key (file name).</li>
            <li>ACK endpoint: <code>POST /api/tasks/:id/ack</code>.</li>
            <li>Depending on your build, children may be restricted from ACK (Owner/Family can confirm). Adjust policy server-side as needed.</li>
          </ul>
        </>
      ),
    },
    {
      id: "deep-links",
      question: "Deep-Link Features (stubs)",
      answer: (
        <>
          <p>These open the right spot in Admin so families already know where things will live:</p>
          <ul>
            <li><Link href="/admin#calendar">Calendar</Link> — events &amp; shared schedules</li>
            <li><Link href="/admin#chat">Family Chat</Link> — safe messaging</li>
            <li><Link href="/admin#geofencing">Geofencing</Link> — home/school places, arrive/leave alerts</li>
            <li><Link href="/admin#notifications">Notifications</Link> — push/text settings</li>
            <li><Link href="/admin#video">Video Check-ins</Link> — quick hello video</li>
            <li><Link href="/admin#shopping">Shopping &amp; Receipts</Link> — lists, receipt vault</li>
            <li><Link href="/admin#parking">Park-my-car</Link> — save/find your spot</li>
            <li><Link href="/admin#home-school">Home &amp; School Alerts</Link> — bells &amp; homework nudges</li>
            <li><Link href="/admin#sos">SOS &amp; Fall Alerts</Link> — emergency contacts</li>
            <li><Link href="/admin#vitals">Vital Signs</Link> — BP, HR, O₂, temp, weight</li>
            <li><Link href="/admin#diabetes">Diabetes Logs</Link> — sugar, insulin, food</li>
            <li><Link href="/admin#medicine">Medicine &amp; MAR</Link> — reminders &amp; records</li>
          </ul>
          <p><i>note:</i> these are visible and linkable today; wire them up as each module lands in the backend.</p>
        </>
      ),
    },
    {
      id: "troubleshooting",
      question: "Troubleshooting",
      answer: (
        <>
          <ul>
            <li><b>nothing shows in “Acting user”</b> — Press <b>Refresh</b>. If still empty, the app uses placeholders; check your API is reachable.</li>
            <li><b>“Create failed” or “Load failed”</b> — Confirm your API base (see Tech Setup). Make sure the acting user exists server-side and has permission.</li>
            <li><b>can’t enforce actions</b> — You must be Owner or Family. Some actions require device-side helpers (see Future-Ready).</li>
            <li><b>kids or phones disappeared</b> — Local only: stored in your browser. If you cleared site data, add them again.</li>
          </ul>
        </>
      ),
    },
    {
      id: "privacy-safety",
      question: "Privacy & Safety",
      answer: (
        <>
          <ul>
            <li><b>Local first:</b> Names, IPs, ports, phones are stored locally in your browser and not sent to the server by this screen.</li>
            <li><b>Gentle guardrails:</b> Confirmations for big actions; short cool-down to prevent accidental repeats.</li>
            <li><b>Clear roles:</b> Only adults can enforce (and in some builds, only adults can ACK).</li>
            <li><b>Photo proof:</b> Encourages effort and accountability; you can turn it off any time.</li>
          </ul>
        </>
      ),
    },
    {
      id: "tech-setup",
      question: "For Grown-Ups: Tech Setup",
      answer: (
        <>
          <h4 className="mt-2 font-semibold">API Base URL</h4>
          <ul>
            <li>Uses <code>process.env.NEXT_PUBLIC_API_URL</code> or defaults to <code>http://127.0.0.1:4000</code>.</li>
            <li>Shown in the footer as “Connected to API at …”.</li>
            <li>Trailing slashes are sanitized.</li>
          </ul>
          <h4 className="mt-3 font-semibold">Endpoints used</h4>
          <ul>
            <li><code>GET /api/users</code> — build the acting user list &amp; roles</li>
            <li><code>GET /api/tasks</code> — load tasks table</li>
            <li><code>POST /api/tasks</code> — create tasks (<code>title, due, assignedTo, forMinor, ackRequired, photoProof, repeat, autoEnforce, autoAction</code>)</li>
            <li><code>POST /api/tasks/:id/ack</code> — mark acknowledged</li>
            <li><code>POST /api/parental/enforce</code> — parental actions (<code>targetUserId, action, reason</code>)</li>
          </ul>
          <h4 className="mt-3 font-semibold">Validation rules</h4>
          <ul>
            <li>IPv4: <code>A.B.C.D</code> (0–255 each)</li>
            <li>Port: <code>1–65535</code></li>
            <li>Phones: digits/spaces and <code>()+- .</code> only, length <code>5–20</code></li>
          </ul>
          <h4 className="mt-3 font-semibold">Plan gating (client)</h4>
          <p><code>free=1</code>, <code>lite=2</code>, <code>elite=999</code> assignees per task.</p>
          <h4 className="mt-3 font-semibold">Scheduling helpers</h4>
          <ul>
            <li>One-time: now + N minutes</li>
            <li>Daily: next “HH:MM”</li>
            <li>Weekly: next DOW at “HH:MM”</li>
          </ul>
          <h4 className="mt-3 font-semibold">Local storage keys</h4>
          <ul>
            <li>Kids: <code>admin.localKids.v2</code></li>
            <li>Owner label: <code>admin.ownerLabel.v1</code></li>
            <li>Plan: <code>admin.plan.v1</code></li>
          </ul>
          <h4 className="mt-3 font-semibold">Network behavior</h4>
          <p>Fetch has a timeout and errors show in a red banner + alert; a <b>Refresh</b> button is provided.</p>
        </>
      ),
    },
    {
      id: "future-ready",
      question: "Future-Ready (what’s coming)",
      answer: (
        <>
          <ul>
            <li><b>Device control integration:</b> Pair with a device agent / MDM or home router API. Keep the same <code>/api/parental/enforce</code> contract.</li>
            <li><b>Geofencing on phones:</b> Mobile app (or PWA) + server-side geofences; push alerts on enter/leave.</li>
            <li><b>Media &amp; storage:</b> Photo proof upload + secure object storage.</li>
            <li><b>Notification fan-out:</b> Push + SMS (Twilio) with per-kid quiet hours.</li>
            <li><b>Role policy:</b> Option to allow kids self-ACK (with adult auto-verify).</li>
            <li><b>Accessibility/i18n:</b> keyboard-first, ARIA, multi-language.</li>
            <li><b>Observability:</b> server logs + client breadcrumbs.</li>
            <li><b>Rate-limits:</b> server-side throttles to match client cooldown.</li>
          </ul>
        </>
      ),
    },
    {
      id: "kid-words",
      question: "Words that Help Kids",
      answer: (
        <>
          <p>short, kind, clear:</p>
          <p>“Clean your room for <b>10 minutes</b>. Take a <b>photo</b> when done.”</p>
          <p>“Great job! I see your photo. <b>Thank you.</b>”</p>
          <p>“Next time, we’ll try again at <b>8:00</b>. You can do it.”</p>
          <hr />
          <p><b>Need a specific area?</b></p>
          <p>
            <Link href="/admin">Open Admin Home</Link> •{" "}
            <Link href="/admin#kids">Kids</Link> •{" "}
            <Link href="/admin#chores">Chores / Create Tasks</Link> •{" "}
            <Link href="/admin#network">Parental Enforce</Link> •{" "}
            <Link href="/admin#tasks">Tasks Table</Link> •{" "}
            <Link href="/admin#calendar">Calendar</Link> •{" "}
            <Link href="/admin#chat">Chat</Link> •{" "}
            <Link href="/admin#geofencing">Geofencing</Link> •{" "}
            <Link href="/admin#notifications">Notifications</Link> •{" "}
            <Link href="/admin#video">Video</Link> •{" "}
            <Link href="/admin#shopping">Shopping</Link> •{" "}
            <Link href="/admin#parking">Parking</Link> •{" "}
            <Link href="/admin#home-school">Home/School</Link> •{" "}
            <Link href="/admin#sos">SOS</Link> •{" "}
            <Link href="/admin#vitals">Vitals</Link> •{" "}
            <Link href="/admin#diabetes">Diabetes</Link> •{" "}
            <Link href="/admin#medicine">Medicine/MAR</Link>
          </p>
        </>
      ),
    },
  ];

  const jump = [
    ["quick-start", "Quick Start"],
    ["acting-user", "Acting User"],
    ["plans-limits", "Plans & Limits"],
    ["kids-list", "Kids List"],
    ["make-a-task", "Make a Task"],
    ["parental-enforce", "Parental Enforce"],
    ["tasks-table", "Tasks Table"],
    ["deep-links", "Deep-Link Features (stubs)"],
    ["troubleshooting", "Troubleshooting"],
    ["privacy-safety", "Privacy & Safety"],
    ["tech-setup", "For Grown-Ups: Tech Setup"],
    ["future-ready", "Future-Ready (what’s coming)"],
    ["kid-words", "Words that Help Kids"],
  ] as const;

  return (
    <main className="px-4 py-10">
      <h1 className="mb-4 text-center text-3xl font-semibold">CareCircle Admin — Friendly FAQ</h1>

      {/* Jump to */}
      <nav className="mx-auto mb-6 flex max-w-3xl flex-wrap items-center justify-center gap-2 text-sm text-slate-600">
        <span className="font-medium">Jump to:</span>
        {jump.map(([id, label], i) => (
          <span key={id} className="flex items-center gap-2">
            <Link className="underline hover:no-underline" href={`/faq#${id}`}>{label}</Link>
            {i < jump.length - 1 && <span>•</span>}
          </span>
        ))}
      </nav>

      <FaqAccordion items={items} />

      <p className="mx-auto mt-8 max-w-2xl text-center text-xs text-slate-500">
        Tip: Use links like <code>/faq#make-a-task</code> to open a specific question.
      </p>
    </main>
  );
}
