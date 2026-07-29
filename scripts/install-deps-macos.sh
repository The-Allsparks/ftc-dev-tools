#!/usr/bin/env bash
# Install JDK + Android SDK command-line tools (no Android Studio) for FTC Dev Tools.
# Usage:
#   bash scripts/install-deps-macos.sh
#   SKIP_JDK=1 bash scripts/install-deps-macos.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
MANIFEST_PATH="${SCRIPT_DIR}/android-cmdline-tools.json"
SDK_ROOT="${ANDROID_HOME:-${HOME}/Library/Android/sdk}"
SKIP_JDK="${SKIP_JDK:-0}"
SKIP_SDK="${SKIP_SDK:-0}"

step() { printf '\n==> %s\n' "$*"; }

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Required command not found: $1" >&2
    exit 1
  }
}

json_get() {
  # Very small JSON helper without requiring jq.
  python3 - "$MANIFEST_PATH" "$1" <<'PY'
import json, sys
manifest = json.load(open(sys.argv[1], encoding="utf-8"))
path = sys.argv[2].split(".")
cur = manifest
for part in path:
    cur = cur[part]
if isinstance(cur, list):
    print("\n".join(cur))
else:
    print(cur)
PY
}

arch="$(uname -m)"
if [[ "${arch}" == "arm64" ]]; then
  PKG_KEY="mac_arm64"
else
  PKG_KEY="mac_x64"
fi

install_jdk() {
  step "Installing JDK 17"
  if command -v java >/dev/null 2>&1; then
    java -version || true
    echo "java already present; skipping JDK install."
    return
  fi
  if command -v brew >/dev/null 2>&1; then
    brew install --cask temurin@17 || brew install temurin@17
  else
    echo "Homebrew not found. Install Temurin 17 from https://adoptium.net/ and re-run with SKIP_JDK=1." >&2
    exit 1
  fi
  if /usr/libexec/java_home -v 17 >/dev/null 2>&1; then
    JAVA_HOME_VALUE="$(/usr/libexec/java_home -v 17)"
    echo "export JAVA_HOME=\"${JAVA_HOME_VALUE}\"" >> "${HOME}/.zprofile"
    echo "export PATH=\"\$JAVA_HOME/bin:\$PATH\"" >> "${HOME}/.zprofile"
    export JAVA_HOME="${JAVA_HOME_VALUE}"
    export PATH="${JAVA_HOME}/bin:${PATH}"
    echo "Added JAVA_HOME to ~/.zprofile"
  fi
}

install_sdk() {
  step "Installing Android SDK command-line tools into ${SDK_ROOT}"
  need_cmd curl
  need_cmd python3
  need_cmd unzip
  need_cmd shasum

  url="$(json_get "packages.${PKG_KEY}.url")"
  file="$(json_get "packages.${PKG_KEY}.file")"
  expected="$(json_get "packages.${PKG_KEY}.sha256")"

  tmp="$(mktemp -d)"
  trap 'rm -rf "${tmp}"' EXIT
  zip_path="${tmp}/${file}"

  echo "Downloading ${url}"
  curl -fSL --retry 5 --retry-all-errors --connect-timeout 30 "${url}" -o "${zip_path}"
  actual="$(shasum -a 256 "${zip_path}" | awk '{print $1}')"
  if [[ "${actual}" != "${expected}" ]]; then
    echo "Checksum mismatch. Expected ${expected}, got ${actual}" >&2
    exit 1
  fi

  unzip -q "${zip_path}" -d "${tmp}"
  mkdir -p "${SDK_ROOT}/cmdline-tools"
  rm -rf "${SDK_ROOT}/cmdline-tools/latest"
  mv "${tmp}/cmdline-tools" "${SDK_ROOT}/cmdline-tools/latest"

  # Normalize accidental nesting
  if [[ -d "${SDK_ROOT}/cmdline-tools/latest/cmdline-tools/bin" ]]; then
    mv "${SDK_ROOT}/cmdline-tools/latest/cmdline-tools/"* "${SDK_ROOT}/cmdline-tools/latest/"
    rmdir "${SDK_ROOT}/cmdline-tools/latest/cmdline-tools" || true
  fi

  PROFILE="${HOME}/.zprofile"
  {
    echo "export ANDROID_HOME=\"${SDK_ROOT}\""
    echo "export ANDROID_SDK_ROOT=\"${SDK_ROOT}\""
    echo "export PATH=\"\$ANDROID_HOME/platform-tools:\$ANDROID_HOME/cmdline-tools/latest/bin:\$PATH\""
  } >> "${PROFILE}"
  export ANDROID_HOME="${SDK_ROOT}"
  export ANDROID_SDK_ROOT="${SDK_ROOT}"
  export PATH="${SDK_ROOT}/platform-tools:${SDK_ROOT}/cmdline-tools/latest/bin:${PATH}"

  SDKMANAGER="${SDK_ROOT}/cmdline-tools/latest/bin/sdkmanager"
  chmod +x "${SDKMANAGER}" || true

  step "Accepting Android SDK licenses"
  yes | "${SDKMANAGER}" --sdk_root="${SDK_ROOT}" --licenses >/dev/null || true

  step "Installing SDK packages"
  mapfile -t packages < <(json_get "sdkPackages")
  if ! "${SDKMANAGER}" --sdk_root="${SDK_ROOT}" --install "${packages[@]}"; then
    echo "Full package set failed; installing platform-tools only…"
    "${SDKMANAGER}" --sdk_root="${SDK_ROOT}" --install "platform-tools"
  fi

  "${SDK_ROOT}/platform-tools/adb" version
  echo "Appended ANDROID_HOME exports to ${PROFILE}"
}

echo "FTC Dev Tools dependency installer (macOS)"
echo "Repo: ${REPO_ROOT}"
echo "Android Studio is NOT required and will NOT be installed."

if [[ "${SKIP_JDK}" != "1" ]]; then
  install_jdk
else
  step "Skipping JDK (SKIP_JDK=1)"
fi

if [[ "${SKIP_SDK}" != "1" ]]; then
  install_sdk
else
  step "Skipping Android SDK (SKIP_SDK=1)"
fi

step "Done"
echo "Open a new terminal (and reload Cursor/VS Code), then run: ftc doctor"
echo "SDK root: ${SDK_ROOT}"
