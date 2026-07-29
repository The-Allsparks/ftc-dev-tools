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

function Invoke-JavaVersionOutput {
  $prev = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    return @(& java -version 2>&1 | ForEach-Object { $_.ToString() })
  }
  finally {
    $ErrorActionPreference = $prev
  }
}

function Get-JavaMajorVersion {
  if (-not (Get-Command java -ErrorAction SilentlyContinue)) {
    return $null
  }
  $text = (Invoke-JavaVersionOutput) -join "`n"
  if ($text -match 'version "(\d+)') {
    return [int]$Matches[1]
  }
  if ($text -match 'version "1\.(\d+)') {
    return [int]$Matches[1]
  }
  return $null
}

function Write-JavaVersion {
  foreach ($line in Invoke-JavaVersionOutput) {
    Write-Host $line
  }
}

function Get-JavaMajorFromExe([string]$JavaExe) {
  if (-not (Test-Path -LiteralPath $JavaExe)) {
    return $null
  }
  $prev = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    $text = (& $JavaExe -version 2>&1 | ForEach-Object { $_.ToString() }) -join "`n"
  }
  finally {
    $ErrorActionPreference = $prev
  }
  if ($text -match 'version "(\d+)') {
    return [int]$Matches[1]
  }
  if ($text -match 'version "1\.(\d+)') {
    return [int]$Matches[1]
  }
  return $null
}

function Find-InstalledJdkHome([int]$Major) {
  $patterns = @(
    "C:\Program Files\Eclipse Adoptium\jdk-${Major}*",
    "C:\Program Files\Java\jdk-${Major}*",
    "C:\Program Files\Microsoft\jdk-${Major}*"
  )
  foreach ($pattern in $patterns) {
    $candidates = @(Get-Item $pattern -ErrorAction SilentlyContinue | Sort-Object FullName -Descending)
    foreach ($match in $candidates) {
      $javaExe = Join-Path $match.FullName "bin\java.exe"
      $detected = Get-JavaMajorFromExe $javaExe
      if ($null -ne $detected -and $detected -ge $Major) {
        return $match.FullName
      }
    }
  }
  if ($env:JAVA_HOME) {
    $javaExe = Join-Path $env:JAVA_HOME "bin\java.exe"
    $jhMajor = Get-JavaMajorFromExe $javaExe
    if ($null -ne $jhMajor -and $jhMajor -ge $Major) {
      return $env:JAVA_HOME
    }
  }
  return $null
}

function Use-JdkAtHome([string]$JavaHome) {
  Set-UserEnv "JAVA_HOME" $JavaHome
  $bin = Join-Path $JavaHome "bin"
  Add-UserPathEntry $bin
  $env:JAVA_HOME = $JavaHome
  $env:Path = "$bin;$env:Path"
  Write-Host "JAVA_HOME set to $JavaHome (prepended to PATH for this session)"
}

function Get-RequiredJdkMajor([object]$Manifest) {
  if ($null -ne $Manifest.recommendedJdkMajor) {
    return [int]$Manifest.recommendedJdkMajor
  }
  return 17
}

function Throw-JavaTooOldForSdk([int]$PathMajor, [int]$RequiredMajor) {
  $hint = "Install Eclipse Temurin ${RequiredMajor}: winget install --id EclipseAdoptium.Temurin.${RequiredMajor}.JDK"
  if ($PathMajor -gt 0) {
    throw "Java ${PathMajor} is on PATH, but Android sdkmanager requires JDK ${RequiredMajor} or higher. Older JDK builds (for example Java 11) cannot install platform-tools (adb). ${hint}. Or re-run this script without -SkipJdk to install JDK ${RequiredMajor} automatically."
  }
  throw "Java was not found on PATH. Android sdkmanager requires JDK ${RequiredMajor} or higher. ${hint}. Or re-run without -SkipJdk."
}

function Ensure-JavaForSdkTools {
  param([int]$RequiredMajor)

  $pathMajor = Get-JavaMajorVersion
  if ($null -ne $pathMajor -and $pathMajor -ge $RequiredMajor) {
    return
  }

  $javaHome = Find-InstalledJdkHome -Major $RequiredMajor
  if ($javaHome) {
    Write-Host "Selecting JDK ${RequiredMajor} at ${javaHome} (java on PATH is $(if ($null -ne $pathMajor) { $pathMajor } else { 'missing' }))."
    Use-JdkAtHome $javaHome
    $verify = Get-JavaMajorVersion
    if ($null -eq $verify -or $verify -lt $RequiredMajor) {
      Throw-JavaTooOldForSdk -PathMajor $(if ($null -ne $verify) { $verify } else { 0 }) -RequiredMajor $RequiredMajor
    }
    return
  }

  Throw-JavaTooOldForSdk -PathMajor $(if ($null -ne $pathMajor) { $pathMajor } else { 0 }) -RequiredMajor $RequiredMajor
}

function Try-UseInstalledJdk {
  param([int]$RequiredMajor)

  $javaHome = Find-InstalledJdkHome -Major $RequiredMajor
  if (-not $javaHome) {
    return $false
  }
  Use-JdkAtHome $javaHome
  $verify = Get-JavaMajorVersion
  if ($null -ne $verify -and $verify -ge $RequiredMajor) {
    return $true
  }
  return $false
}

function Install-Jdk {
  param([int]$RequiredMajor)

  Write-Step "Installing JDK ${RequiredMajor} (Eclipse Temurin via winget)"
  $pathMajor = Get-JavaMajorVersion
  if ($null -ne $pathMajor) {
    Write-Host "java on PATH (major version ${pathMajor}):"
    Write-JavaVersion
  }

  if ($null -ne $pathMajor -and $pathMajor -ge $RequiredMajor) {
    Write-Host "JDK ${RequiredMajor}+ already on PATH; skipping JDK install. Use -SkipJdk next time if intentional."
    $existingHome = Find-InstalledJdkHome -Major $RequiredMajor
    if ($existingHome) {
      Use-JdkAtHome $existingHome
    }
    return
  }

  if ($null -ne $pathMajor -and $pathMajor -lt $RequiredMajor) {
    Write-Host "Java ${pathMajor} is below ${RequiredMajor} (required for Android sdkmanager). Looking for JDK ${RequiredMajor} on disk…"
    if (Try-UseInstalledJdk -RequiredMajor $RequiredMajor) {
      Write-Host "JDK ${RequiredMajor} is installed but was not first on PATH; JAVA_HOME and user PATH updated."
      return
    }
    Write-Host "Installing JDK ${RequiredMajor} via winget…"
  }

  Assert-Command winget
  & winget install --id "EclipseAdoptium.Temurin.${RequiredMajor}.JDK" --accept-package-agreements --accept-source-agreements --disable-interactivity
  if ($LASTEXITCODE -ne 0) {
    $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")
    if (Try-UseInstalledJdk -RequiredMajor $RequiredMajor) {
      Write-Host "winget exited with code $LASTEXITCODE (often already installed); using JDK at `$env:JAVA_HOME."
      return
    }
    throw "winget failed to install Eclipse Temurin JDK ${RequiredMajor} (exit $LASTEXITCODE) and JDK ${RequiredMajor} was not found under Program Files. Install a JDK manually, then re-run with -SkipJdk only if java -version reports ${RequiredMajor}+."
  }

  $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")

  if (Try-UseInstalledJdk -RequiredMajor $RequiredMajor) {
    return
  }
  Write-Warning "JDK install finished, but JAVA_HOME could not be auto-detected. Set JAVA_HOME to JDK ${RequiredMajor} manually, then re-run."

  Ensure-JavaForSdkTools -RequiredMajor $RequiredMajor
}

function Get-FileSha256([string]$Path) {
  return (Get-FileHash -Algorithm SHA256 -Path $Path).Hash.ToLowerInvariant()
}

# Invoke-WebRequest is often much slower on large binaries; curl.exe ships with Windows 10+.
function Save-FileFromUrl {
  param(
    [Parameter(Mandatory = $true)][string]$Url,
    [Parameter(Mandatory = $true)][string]$OutFile
  )

  $parent = Split-Path -Parent $OutFile
  if ($parent -and -not (Test-Path $parent)) {
    New-Item -ItemType Directory -Force -Path $parent | Out-Null
  }

  if (Get-Command curl.exe -ErrorAction SilentlyContinue) {
    Write-Host "Downloading (curl.exe): $Url"
    & curl.exe -fSL --retry 5 --retry-all-errors --connect-timeout 30 -o "$OutFile" "$Url"
    if ($LASTEXITCODE -ne 0) {
      throw "curl.exe failed downloading $Url (exit code $LASTEXITCODE)"
    }
    return
  }

  Write-Host "Downloading (Invoke-WebRequest): $Url"
  Invoke-WebRequest -Uri $Url -OutFile $OutFile -UseBasicParsing
}

function Expand-ZipArchive {
  param(
    [Parameter(Mandatory = $true)][string]$ZipPath,
    [Parameter(Mandatory = $true)][string]$DestDir
  )

  if (Get-Command tar.exe -ErrorAction SilentlyContinue) {
    New-Item -ItemType Directory -Force -Path $DestDir | Out-Null
    & tar.exe -xf $ZipPath -C $DestDir
    if ($LASTEXITCODE -ne 0) {
      throw "tar.exe failed extracting $ZipPath (exit code $LASTEXITCODE)"
    }
    return
  }

  Expand-Archive -Path $ZipPath -DestinationPath $DestDir -Force
}

function Invoke-SdkManager {
  param(
    [Parameter(Mandatory = $true)][string]$SdkManager,
    [Parameter(Mandatory = $true)][string]$SdkRoot,
    [Parameter(Mandatory = $true)][int]$RequiredJdkMajor,
    [Parameter(Mandatory = $true)][string[]]$Arguments,
    [string]$StandardInput
  )

  $prev = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    if ($StandardInput) {
      $lines = $StandardInput | & $SdkManager --sdk_root=$SdkRoot @Arguments 2>&1 | ForEach-Object { $_.ToString() }
    } else {
      $lines = & $SdkManager --sdk_root=$SdkRoot @Arguments 2>&1 | ForEach-Object { $_.ToString() }
    }
  }
  finally {
    $ErrorActionPreference = $prev
  }
  $lines | ForEach-Object { Write-Host $_ }
  $combined = $lines -join "`n"
  if ($LASTEXITCODE -ne 0) {
    if ($combined -match "Java version (\d+) or higher is required") {
      $requiredFromTool = [int]$Matches[1]
      Throw-JavaTooOldForSdk -PathMajor $(Get-JavaMajorVersion) -RequiredMajor $requiredFromTool
    }
    return $false
  }
  return $true
}

function Install-AndroidSdk {
  param(
    [object]$Manifest,
    [int]$RequiredJdkMajor
  )

  Ensure-JavaForSdkTools -RequiredMajor $RequiredJdkMajor

  Write-Step "Installing Android SDK command-line tools into $SdkRoot"
  $pkg = $Manifest.packages.windows
  $tempRoot = Join-Path $env:TEMP ("ftc-android-sdk-" + [guid]::NewGuid().ToString("N"))
  New-Item -ItemType Directory -Force -Path $tempRoot | Out-Null
  $zipPath = Join-Path $tempRoot $pkg.file

  try {
    Save-FileFromUrl -Url $pkg.url -OutFile $zipPath

    $actual = Get-FileSha256 $zipPath
    $expected = [string]$pkg.sha256
    if ($actual -ne $expected.ToLowerInvariant()) {
      throw "Checksum mismatch for $($pkg.file). Expected $expected, got $actual"
    }

    Expand-ZipArchive -ZipPath $zipPath -DestDir $tempRoot

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
    $null = Invoke-SdkManager -SdkManager $sdkmanager -SdkRoot $SdkRoot -RequiredJdkMajor $RequiredJdkMajor -StandardInput $licenses -Arguments @("--licenses")

    Write-Step "Installing SDK packages"
    $packages = @($Manifest.sdkPackages)
    $ok = Invoke-SdkManager -SdkManager $sdkmanager -SdkRoot $SdkRoot -RequiredJdkMajor $RequiredJdkMajor -Arguments (@("--install") + $packages)
    if (-not $ok) {
      Write-Warning "Full package set failed. Installing platform-tools only…"
      $ok = Invoke-SdkManager -SdkManager $sdkmanager -SdkRoot $SdkRoot -RequiredJdkMajor $RequiredJdkMajor -Arguments @("--install", "platform-tools")
      if (-not $ok) {
        throw "sdkmanager failed to install platform-tools. Ensure JDK ${RequiredJdkMajor}+ is active (java -version)."
      }
    }

    $adb = Join-Path $SdkRoot "platform-tools\adb.exe"
    if (-not (Test-Path $adb)) {
      $activeMajor = Get-JavaMajorVersion
      if ($null -ne $activeMajor -and $activeMajor -lt $RequiredJdkMajor) {
        Throw-JavaTooOldForSdk -PathMajor $activeMajor -RequiredMajor $RequiredJdkMajor
      }
      throw "adb.exe was not installed under platform-tools. sdkmanager may have failed; run java -version and confirm JDK ${RequiredJdkMajor}+."
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
$requiredJdkMajor = Get-RequiredJdkMajor $manifest

if (-not $SkipJdk) {
  Install-Jdk -RequiredMajor $requiredJdkMajor
} else {
  Write-Step "Skipping JDK (-SkipJdk)"
  if (-not $SkipSdk) {
    Ensure-JavaForSdkTools -RequiredMajor $requiredJdkMajor
  }
}

if (-not $SkipSdk) {
  Install-AndroidSdk -Manifest $manifest -RequiredJdkMajor $requiredJdkMajor
} else {
  Write-Step "Skipping Android SDK (-SkipSdk)"
}

Write-Step "Done"
Write-Host "Close and reopen your terminal (and Cursor/VS Code) so PATH / JAVA_HOME / ANDROID_HOME refresh."
Write-Host "Then run:"
Write-Host "  ftc doctor"
Write-Host ""
Write-Host "SDK root: $SdkRoot"
