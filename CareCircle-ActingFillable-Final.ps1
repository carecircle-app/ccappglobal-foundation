# CareCircle-ActingFillable-Final.ps1
# Single-task patch: make "Acting user" fillable (input + datalist) with local memory and kid-name mirror.
$ErrorActionPreference = 'Stop'

$root      = (Resolve-Path .).Path
$target    = Join-Path $root 'src\app\admin\page.tsx'
$backupDir = Join-Path $root 'vbank\backups\admin'
if (!(Test-Path $target)) { throw "File not found: $target" }
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backup = Join-Path $backupDir "page.$stamp.bak.tsx"
Copy-Item $target $backup -Force

$content = Get-Content $target -Raw

# 0) Ensure the constants area includes LSK_NAME_BOOK
if ($content -notmatch 'const\s+LSK_NAME_BOOK\s*=\s*["'']admin\.nameBook\.v1["''];') {
  if ($content -match 'const\s+LSK_PLAN\s*=\s*["'']admin\.plan\.v1["''];') {
    $content = $content -replace '(const\s+LSK_PLAN\s*=\s*["'']admin\.plan\.v1["''];)',
      "`$1`r`nconst LSK_NAME_BOOK = 'admin.nameBook.v1';"
  } elseif ($content -match 'const\s+LSK_OWNER\s*=\s*["'']admin\.ownerLabel\.v1["''];') {
    $content = $content -replace '(const\s+LSK_OWNER\s*=\s*["'']admin\.ownerLabel\.v1["''];)',
      "`$1`r`nconst LSK_NAME_BOOK = 'admin.nameBook.v1';"
  } else {
    # Fallback: insert after the first block of LSK_ constants
    $content = $content -replace '(\/\* ---------------------------- Constants ---------------------------- \*\/)',
      "const LSK_NAME_BOOK = 'admin.nameBook.v1';`r`n`r`n$1"
  }
}

# 1) Ensure states for actingName + nameBook
if ($content -notmatch 'useState<\s*string\s*\>\(\s*''?""?\s*\)\s*;\s*\Z') { } # noop to avoid PS parsing issue
if ($content -notmatch 'setActingName') {
  if ($content -match 'const\s*\[\s*phoneTasks[^\n]+\n') {
    $content = $content -replace 'const\s*\[\s*phoneTasks[^\n]+\n',
      "$0const [nameBook, setNameBook] = useState<string[]>([]);`r`nconst [actingName, setActingName] = useState<string>('');`r`n"
  } elseif ($content -match 'const\s*\[\s*kids[^\n]+\n') {
    $content = $content -replace 'const\s*\[\s*kids[^\n]+\n',
      "$0const [nameBook, setNameBook] = useState<string[]>([]);`r`nconst [actingName, setActingName] = useState<string>('');`r`n"
  } else {
    # Fallback: insert right after acting state
    $content = $content -replace 'const\s*\[\s*acting,\s*setActing\s*\]\s*=\s*useState<\s*string\s*>\([^\)]+\);\s*',
      "$0`r`nconst [nameBook, setNameBook] = useState<string[]>([]);`r`nconst [actingName, setActingName] = useState<string>('');`r`n"
  }
}

# 2) Ensure we load nameBook from localStorage once
if ($content -notmatch 'admin\.nameBook\.v1') {
  $content = $content -replace '/\* -------- Task creation state -------- \*/',
"useEffect(() => { try { const rawNB = typeof window !== 'undefined' ? localStorage.getItem(LSK_NAME_BOOK) : null; if (rawNB) setNameBook(JSON.parse(rawNB)); } catch {} }, []);

/* -------- Task creation state -------- */"
}

# 3) Add helpers: actingOptions + findUserIdByName (only if missing)
if ($content -notmatch 'const\s+actingOptions') {
  $content = $content -replace 'const\s*\[\s*actingName[^\n]+\n',
    "$0" + @"
  // Suggestions for Acting input (API users + saved names; fallback to 3 built-ins)
  const actingOptions = useMemo(() => {
    const builtins = users.length ? users.map(u => u.name) : ['Owner','Derek','Ryan'];
    return Array.from(new Set([...builtins, ...nameBook]));
  }, [users, nameBook]);

  // Map typed label -> user id (fallback to Owner)
  const findUserIdByName = useCallback((label: string) => {
    const u = users.find(x => x.name.toLowerCase() === label.toLowerCase());
    if (u) return u.id;
    if (label.toLowerCase() === 'owner') return 'u-owner';
    if (label.toLowerCase() === 'derek') return 'u-child';
    if (label.toLowerCase() === 'ryan')  return 'u-fam';
    return null;
  }, [users]);
"@
}

# 4) Replace ONLY the <select ... value={acting} ...>...</select> with input + datalist (first occurrence)
$selectPattern = '(?s)<select[^>]*value=\{acting\}[^>]*>.*?<\/select>'
$actingInput = @'
<input
  className="rounded border px-2 py-1 text-sm"
  list="acting-users"
  value={actingName}
  onChange={(e) => {
    const val = e.target.value;
    setActingName(val);

    const u = users.find(x => x.name.toLowerCase() === val.toLowerCase());
    const id =
      u?.id ??
      (val.toLowerCase() === 'owner' ? 'u-owner'
        : val.toLowerCase() === 'derek' ? 'u-child'
        : val.toLowerCase() === 'ryan'  ? 'u-fam'
        : 'u-owner');
    setActing(id);

    const tgt = activeKidId || (kids[0]?.id);
    if (tgt) { updateKid(tgt, { name: val }); setActiveKidId(tgt); }

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
} else {
  Write-Host "Warning: Could not find <select ... value={acting}>. No UI replacement applied." -ForegroundColor Yellow
}

# 5) Optional: initialize actingName from current acting once
if ($content -notmatch 'setActingName\(u\.name\)') {
  $content = $content -replace 'useEffect\(\(\)\s*=>\s*\{\s*void loadAll\(\);\s*\},\s*\[acting,\s*loadAll\]\);\s*',
"$0
useEffect(() => {
  const u = users.find(x => x.id === acting);
  if (u && !actingName) setActingName(u.name);
}, [users, acting, actingName]);
"
}

# 6) Write result
Set-Content -Encoding UTF8 -Path $target -Value $content
Write-Host "✅ Acting user is now a fillable input with memory. Backup: $backup" -ForegroundColor Green
