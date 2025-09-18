# CareCircle-RemoveDerekRyan.ps1
# Goal: Remove the fallback Acting-user options for Derek/Ryan; keep Owner only.
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

# 1) Remove fallback <option> entries for Derek and Ryan under the Acting user <select>
#    Matches lines like: <option value="u-child">Derek (Child)</option>
#                        <option value="u-fam">Ryan (Family)</option>
$content = $content -replace '<option\s+value=["'']u-child["'']>.*?</option>\s*', ''
$content = $content -replace '<option\s+value=["'']u-fam["'']>.*?</option>\s*', ''

# 2) If any hardcoded suggestion arrays exist (from prior attempts), trim them to Owner only
#    Examples to normalize: ['Owner','Derek','Ryan']  -> ['Owner']
#                           ["Owner","Derek","Ryan"] -> ["Owner"]
$content = $content -replace '\[\s*''Owner''\s*,\s*''Derek''\s*,\s*''Ryan''\s*\]', "['Owner']"
$content = $content -replace '\[\s*"Owner"\s*,\s*"Derek"\s*,\s*"Ryan"\s*\]', '["Owner"]'

# 3) Save back
Set-Content -Encoding UTF8 -Path $target -Value $content

Write-Host "✅ Removed Derek/Ryan fallback options (kept Owner). Backup: $backup" -ForegroundColor Green
