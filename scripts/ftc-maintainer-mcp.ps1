# Launch maintainer MCP with GitHub token from env or `gh auth token`.
$ErrorActionPreference = "Stop"

if (-not $env:GITHUB_TOKEN -and -not $env:GH_TOKEN) {
  $gh = Get-Command gh -ErrorAction SilentlyContinue
  if ($gh) {
    $token = (& gh auth token 2>$null)
    if ($token) {
      $env:GITHUB_TOKEN = $token.Trim()
    }
  }
}

if (-not $env:GITHUB_REPO) {
  $env:GITHUB_REPO = "The-Allsparks/ftc-dev-tools"
}

$root = Split-Path -Parent $PSScriptRoot
$env:MAINTAINER_REPO_ROOT = $root

$pkg = Join-Path $root "packages/maintainer-mcp"
$bin = Join-Path $pkg "dist/bin.js"
$srcMarker = Join-Path $pkg "src/server.ts"

function Test-MaintainerMcpStale {
  if (-not (Test-Path $bin)) { return $true }
  if (-not (Test-Path $srcMarker)) { return $false }
  return (Get-Item $srcMarker).LastWriteTimeUtc -gt (Get-Item $bin).LastWriteTimeUtc
}

if (Test-MaintainerMcpStale) {
  [Console]::Error.WriteLine("ftc-maintainer-mcp: dist stale or missing; rebuilding...")
  Push-Location $root
  try {
    & npm run build --workspace @ftc-dev-tools/maintainer-mcp
    if ($LASTEXITCODE -ne 0) {
      throw "Maintainer MCP build failed with exit code $LASTEXITCODE"
    }
  } finally {
    Pop-Location
  }
}

if (-not (Test-Path $bin)) {
  Write-Error "Maintainer MCP not built. Run: npm run build --workspace @ftc-dev-tools/maintainer-mcp"
}

[Console]::Error.WriteLine("ftc-maintainer-mcp: starting $(Get-Date -Format o)")

& node $bin @args
