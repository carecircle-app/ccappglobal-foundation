# CareCircle-ActingFillable-Strict.ps1
# Scope: ONLY src/app/admin/page.tsx (Kids Admin)
# Changes:
#  - Replace <select value={acting}>…</select> with fillable input + datalist
#  - Remember names (localStorage admin.nameBook.v1)
#  - Auto-fill first kid's Name when Acting changes
#  - Remove Derek/Ryan fallbacks (keep Owner)
#  - Report whether any <select value={acting}> remains (sanity check)

$ErrorActionPreference = 'Stop'
$root      = (Resolve-Path .).Path
$target    = Join-Path $root 'src\app\admin\page.tsx'
$backupDir = Join-Path $root 'vbank\backups\admin'
if (!(Test-Path $target)) { throw "File not found: $target" }
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
$stamp  = Get-Date -Format 'yyyyMMdd-HHmmss'
$backup = Join-Path $backupDir "page.$stamp.bak.tsx"
Copy-Item $target $backup -Force

$content = Get-Content $target -Raw

# Ensure constant
if ($content -notmatch "const\s+LSK_NAME_BOOK") {
  $content = $content -replace "(const\s+LSK_PLAN\s*=\s*'admin\.plan\.v1';\s*)",
    "`$1const LSK_NAME_BOOK = 'admin.nameBook.v1';`r`n"
}

# Ensure states
if ($content -notmatch "setNameBook") {
  $content = $content -replace "const\s*\[\s*acting,\s*setActing\s*\]\s*=\s*useState<\s*string\s*>\([^\)]*\);\s*",
    "$0`r`nconst [nameBook, setNameBook] = useState<string[]>([]);`r`nconst [actingName, setActingName] = useState<string>('');`r`n"
}

# Load nameBook once
if ($content -notmatch "admin\.nameBook\.v1") {
  $content = $content -replace "/\* -------- Task creation state -------- \*/",
"useEffect(() => { try { const rawNB = typeof window !== 'undefined' ? localStorage.getItem(LSK_NAME_BOOK) : null; if (rawNB) setNameBook(JSON.parse(rawNB)); } catch {} }, []);
/* -------- Task creation state -------- */"
}

# Helpers (suggestions + name->id)
if ($content -notmatch "const\s+actingOptions") {
  $content = $content -replace "const\s*\[\s*actingName[^\n]*\n",
"$0  // Suggestions for Acting input (API users + saved names; fallback to Owner)
  const actingOptions = useMemo(() => {
    const builtins = users.length ? users.map(u => u.name) : ['Owner'];
    return Array.from(new Set([...builtins, ...nameBook]));
  }, [users, nameBook]);

  const findUserIdByName = useCallback((label: string) => {
    const u = users.find(x => x.name.toLowerCase() === label.toLowerCase());
    if (u) return u.id;
    if (label.toLowerCase() === 'owner') return 'u-owner';
    return null;
  }, [users]);
"
}

# Replace first <select value={acting}>...</select> with input+datalist
$selectPattern = '(?s)<select[^>]*value=\{acting\}[^>]*>.*?<\/select>'
$actingInput = @'
<input
  className="rounded border px-2 py-1 text-sm"
  list="acting-users"
  value={actingName}
  onChange={(e) => {
    const val = e.target.value;
    setActingName(val);

    const id = findUserIdByName(val) ?? 'u-owner';
    setActing(id);

    const firstId = kids[0]?.id;
    if (firstId) { updateKid(firstId, { name: val }); }

    if (val && !nameBook.includes(val)) {
      const next = [...nameBook, val];
      setNameBook(next);
      try { localStorage.setItem(LSK_NAME_BOOK, JSON.stringify(next)); } catch {}
    }
  }}
  placeholder="Type or choose a name"
/>
<datalist id="acting-users">
  {actingOptions.map(n => <option key={n} value={n} />)}
</datalist>
'@
if ($content -match $selectPattern) {
  $content = [regex]::Replace($content, $selectPattern, $actingInput, 1)
}

# Remove Derek/Ryan fallback <option>s if they still exist
$content = $content -replace '<option\s+value=["'']u-child["'']>.*?</option>\s*', ''
$content = $content -replace '<option\s+value=["'']u-fam["'']>.*?</option>\s*', ''
# Trim any ['Owner','Derek','Ryan'] literals
$content = $content -replace '\[\s*''Owner''\s*,\s*''Derek''\s*,\s*''Ryan''\s*\]', "['Owner']"
$content = $content -replace '\[\s*"Owner"\s*,\s*"Derek"\s*,\s*"Ryan"\s*\]', '["Owner"]'

# Initialize actingName from current acting (once users load)
if ($content -notmatch 'setActingName\(u\.name\)') {
  $content = $content -replace 'useEffect\(\(\)\s*=>\s*\{\s*void loadAll\(\);\s*\},\s*\[acting,\s*loadAll\]\);\s*',
"$0
useEffect(() => {
  const u = users.find(x => x.id === acting);
  if (u && !actingName) setActingName(u.name);
}, [users, acting, actingName]);
"
}

Set-Content -Encoding UTF8 -Path $target -Value $content

# Sanity report
$after = Get-Content $target -Raw
$stillSelects = [regex]::Matches($after, 'value=\{acting\}')
if ($stillSelects.Count -gt 0) {
  Write-Host ("⚠️  Heads-up: {0} occurrence(s) of value={acting} still in src/app/admin/page.tsx (search & remove old <select> block)." -f $stillSelects.Count) -ForegroundColor Yellow
} else {
  Write-Host "✅ Acting is now a typeable input with memory; Derek/Ryan removed; first kid name auto-fills. Backup: $backup" -ForegroundColor Green
}
