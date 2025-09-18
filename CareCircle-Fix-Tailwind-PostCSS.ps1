# CareCircle-Fix-Tailwind-PostCSS.ps1
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

# 1) Ensure plugin is installed
npm i -D @tailwindcss/postcss autoprefixer | Out-Null

# 2) Locate postcss config (or create one)
$candidates = @('postcss.config.js','postcss.config.cjs','postcss.config.mjs') |
  ForEach-Object { Join-Path $root $_ }

$cfgPath = $null
foreach ($p in $candidates) {
  if (Test-Path $p) { $cfgPath = $p; break }
}
if (-not $cfgPath) { $cfgPath = (Join-Path $root 'postcss.config.js') }

# 3) Backup existing config if present
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
if (Test-Path $cfgPath) {
  Copy-Item $cfgPath "$cfgPath.$stamp.bak" -Force
}

# 4) If no config existed, write a fresh one (CJS)
if (-not (Test-Path $cfgPath)) {
  @"
/** @type {import('postcss-load-config').Config} */
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
};
"@ | Set-Content $cfgPath -Encoding UTF8
} else {
  # Patch common patterns:
  $c = Get-Content $cfgPath -Raw

  # array form: require('tailwindcss')
  $c = $c -replace "require\(['""]tailwindcss['""]\)", "require('@tailwindcss/postcss')"

  # array of strings: 'tailwindcss'
  $c = $c -replace "(['""])tailwindcss\1", "'@tailwindcss/postcss'"

  # object form: tailwindcss: { }
  $c = $c -replace "(\s)(tailwindcss)(\s*:\s*\{?)", "`$1'@tailwindcss/postcss'`$3"

  # ensure autoprefixer is present (safe if already there)
  if ($c -notmatch "autoprefixer") {
    # Try to append autoprefixer in object or array forms
    if ($c -match "plugins\s*:\s*\{") {
      $c = $c -replace "plugins\s*:\s*\{", "plugins: {`n    autoprefixer: {},"
    } elseif ($c -match "plugins\s*:\s*\[") {
      $c = $c -replace "plugins\s*:\s*\[", "plugins: [ require('autoprefixer'), "
    }
  }

  Set-Content $cfgPath $c -Encoding UTF8
}

# 5) Rebuild
npm run build
