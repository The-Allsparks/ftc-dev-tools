#Requires -Version 5.1
<#
.SYNOPSIS
  Install JDK + Android SDK command-line tools (no Android Studio) for FTC Dev Tools.

.DESCRIPTION
  Installs:
  - Eclipse Temurin JDK 17 (via winget when available)
  - Google Android SDK Command-Line Tools
  - platform-tools (adb), Android 34 platform, and build-tools

  Does NOT install Android Studio, change Control Hub settings, or configure Wi-Fi.

.PARAMETER SdkRoot
  Android SDK root. Default: %LOCALAPPDATA%\Android\Sdk

.PARAMETER SkipJdk
  Skip JDK installation.

.PARAMETER SkipSdk
  Skip Android SDK / platform-tools installation.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\scripts\install-deps-windows.ps1
#>
[CmdletBinding()]
param(
  [string]$SdkRoot = $(Join-Path $env:LOCALAPPDATA "Android\Sdk"),
  [switch]$SkipJdk,
  [switch]$SkipSdk
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Step([string]$Message) {
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Assert-Command([string]$Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command not found: $Name"
  }
}

function Get-RepoRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

function Get-Manifest {
  $path = Join-Path $PSScriptRoot "android-cmdline-tools.json"
  return Get-Content -Raw -Path $path | ConvertFrom-Json
}

function Set-UserEnv([string]$Name, [string]$Value) {
  [Environment]::SetEnvironmentVariable($Name, $Value, "User")
  Set-Item -Path "Env:$Name" -Value $Value
}

function Add-UserPathEntry([string]$Entry) {
  $current = [Environment]::GetEnvironmentVariable("Path", "User")
  if (-not $current) { $current = "" }
  $parts = $current -split ";" | Where-Object { $_ -and $_.Trim() -ne "" }
  if ($parts -contains $Entry) {
    return
  }
  $updated = (@($parts) + $Entry) -join ";"
  [Environment]::SetEnvironmentVariable("Path", $updated, "User")
  if ($env:Path -notlike "*$Entry*") {
    $env:Path = "$Entry;$env:Path"
  }
}

function Install-Jdk {
  Write-Step "Installing JDK 17 (Eclipse Temurin via winget)"
  if (Get-Command java -ErrorAction SilentlyContinue) {
    Write-Host "java already on PATH:"
    & java -version 2>&1 | ForEach-Object { Write-Host $_ }
    Write-Host "Skipping JDK install. Use -SkipJdk intentionally next time if this is fine."
    return
  }

  Assert-Command winget
  & winget install --id EclipseAdoptium.Temurin.17.JDK --accept-package-agreements --accept-source-agreements --disable-interactivity
  if ($LASTEXITCODE -ne 0) {
    throw "winget failed to install Eclipse Temurin JDK 17. Install a JDK manually, then re-run with -SkipJdk."
  }

  # Refresh PATH for this session from Machine+User
  $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")

  $candidateHomes = @(
    "C:\Program Files\Eclipse Adoptium\jdk-17*",
    "C:\Program Files\Java\jdk-17*",
    "C:\Program Files\Microsoft\jdk-17*"
  )
  $javaHome = $null
  foreach ($pattern in $candidateHomes) {
    $match = Get-Item $pattern -ErrorAction SilentlyContinue | Sort-Object FullName -Descending | Select-Object -First 1
    if ($match) {
      $javaHome = $match.FullName
      break
    }
  }
  if ($javaHome) {
    Set-UserEnv "JAVA_HOME" $javaHome
    Add-UserPathEntry (Join-Path $javaHome "bin")
    Write-Host "JAVA_HOME set to $javaHome"
  } else {
    Write-Warning "JDK installed, but JAVA_HOME could not be auto-detected. Set JAVA_HOME manually after reopening the terminal."
  }
}

function Get-FileSha256([string]$Path) {
  return (Get-FileHash -Algorithm SHA256 -Path $Path).Hash.ToLowerInvariant()
}

function Install-AndroidSdk {
  param([object]$Manifest)

  Write-Step "Installing Android SDK command-line tools into $SdkRoot"
  $pkg = $Manifest.packages.windows
  $tempRoot = Join-Path $env:TEMP ("ftc-android-sdk-" + [guid]::NewGuid().ToString("N"))
  New-Item -ItemType Directory -Force -Path $tempRoot | Out-Null
  $zipPath = Join-Path $tempRoot $pkg.file

  try {
    Write-Host "Downloading $($pkg.url)"
    Invoke-WebRequest -Uri $pkg.url -OutFile $zipPath -UseBasicParsing

    $actual = Get-FileSha256 $zipPath
    $expected = [string]$pkg.sha256
    if ($actual -ne $expected.ToLowerInvariant()) {
      throw "Checksum mismatch for $($pkg.file). Expected $expected, got $actual"
    }

    Expand-Archive -Path $zipPath -DestinationPath $tempRoot -Force

    $cmdlineSrc = Join-Path $tempRoot "cmdline-tools"
    if (-not (Test-Path $cmdlineSrc)) {
      throw "Downloaded archive did not contain cmdline-tools/"
    }

    $destLatest = Join-Path $SdkRoot "cmdline-tools\latest"
    if (Test-Path $destLatest) {
      Remove-Item -Recurse -Force $destLatest
    }
    New-Item -ItemType Directory -Force -Path (Split-Path $destLatest -Parent) | Out-Null
    Move-Item -Path $cmdlineSrc -Destination $destLatest

    # Google expects: SdkRoot/cmdline-tools/latest/{bin,lib,...}
    # Some zips unpack as cmdline-tools/{bin,lib}. The move above puts that at latest/. Good.
    # If zip had cmdline-tools/cmdline-tools nesting, normalize:
    $nested = Join-Path $destLatest "cmdline-tools"
    if (Test-Path (Join-Path $nested "bin")) {
      Get-ChildItem $nested | ForEach-Object {
        Move-Item $_.FullName -Destination $destLatest -Force
      }
      Remove-Item $nested -Recurse -Force -ErrorAction SilentlyContinue
    }

    Set-UserEnv "ANDROID_HOME" $SdkRoot
    Set-UserEnv "ANDROID_SDK_ROOT" $SdkRoot
    Add-UserPathEntry (Join-Path $SdkRoot "platform-tools")
    Add-UserPathEntry (Join-Path $SdkRoot "cmdline-tools\latest\bin")

    $sdkmanager = Join-Path $SdkRoot "cmdline-tools\latest\bin\sdkmanager.bat"
    if (-not (Test-Path $sdkmanager)) {
      throw "sdkmanager.bat not found at $sdkmanager"
    }

    Write-Step "Accepting Android SDK licenses"
    $licenses = "y`n" * 50
    $licenses | & $sdkmanager --sdk_root=$SdkRoot --licenses | Out-Host

    Write-Step "Installing SDK packages"
    $packages = @($Manifest.sdkPackages)
    & $sdkmanager --sdk_root=$SdkRoot --install @packages
    if ($LASTEXITCODE -ne 0) {
      Write-Warning "Full package set failed. Installing platform-tools only…"
      & $sdkmanager --sdk_root=$SdkRoot --install "platform-tools"
      if ($LASTEXITCODE -ne 0) {
        throw "sdkmanager failed to install platform-tools"
      }
    }

    $adb = Join-Path $SdkRoot "platform-tools\adb.exe"
    if (-not (Test-Path $adb)) {
      throw "adb.exe was not installed under platform-tools"
    }
    Write-Host "adb installed: $adb"
    & $adb version
  }
  finally {
    Remove-Item -Recurse -Force $tempRoot -ErrorAction SilentlyContinue
  }
}

Write-Host "FTC Dev Tools dependency installer (Windows)"
Write-Host "Repo: $(Get-RepoRoot)"
Write-Host "This installs JDK + Android command-line SDK components."
Write-Host "Android Studio is NOT required and will NOT be installed."

$manifest = Get-Manifest

if (-not $SkipJdk) {
  Install-Jdk
} else {
  Write-Step "Skipping JDK (-SkipJdk)"
}

if (-not $SkipSdk) {
  Install-AndroidSdk -Manifest $manifest
} else {
  Write-Step "Skipping Android SDK (-SkipSdk)"
}

Write-Step "Done"
Write-Host "Close and reopen your terminal (and Cursor/VS Code) so PATH / JAVA_HOME / ANDROID_HOME refresh."
Write-Host "Then run:"
Write-Host "  ftc doctor"
Write-Host ""
Write-Host "SDK root: $SdkRoot"
