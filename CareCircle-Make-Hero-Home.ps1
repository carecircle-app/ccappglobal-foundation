# CareCircle-Make-Hero-Home.ps1
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$home    = Join-Path $root 'src/app/page.tsx'
$company = Join-Path $root 'src/app/company/page.tsx'

if (-not (Test-Path $home))    { throw "Missing: $home" }
if (-not (Test-Path $company)) { throw "Missing: $company (where the landing likely lives)" }

# Backup both
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$bak   = Join-Path $root "vbank\backups\$stamp"
New-Item -ItemType Directory -Force -Path $bak | Out-Null
Copy-Item $home "$bak\page.tsx.bak" -Force
Copy-Item $company "$bak\company.page.tsx.bak" -Force

# Copy company landing over home
$companySrc = Get-Content $company -Raw

# If company metadata title says "Company — CareCircle", make it a proper home title
$companySrc = [regex]::Replace($companySrc, 'title\s*:\s*"Company\s*[—-]?\s*CareCircle"\s*,?', 'title: "CareCircle — Coordinate care with confidence",')

# Also patch any { Container } named import to default import
$companySrc = [regex]::Replace($companySrc,
  '(?m)^\s*import\s*\{\s*Container\s*\}\s*from\s*(["''])@/components/container\1\s*;',
  'import Container from "@/components/container";'
)

# Write to home page
Set-Content $home $companySrc -Encoding UTF8

# Sanity: ensure only one default export in the home page
$c = Get-Content $home -Raw
$first = $true
$fixed = [regex]::Replace($c, 'export\s+default', {
  if ($script:first) { $script:first = $false; $args[0].Value } else { 'export ' }
})
Set-Content $home $fixed -Encoding UTF8

# Build and quick report of routes
npm run build
