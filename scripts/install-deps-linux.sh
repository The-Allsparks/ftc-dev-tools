#!/usr/bin/env bash
# Install JDK + Android SDK command-line tools (no Android Studio) for FTC Dev Tools.
# Usage:
#   bash scripts/install-deps-linux.sh
#   SKIP_JDK=1 bash scripts/install-deps-linux.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
MANIFEST_PATH="${SCRIPT_DIR}/android-cmdline-tools.json"
SDK_ROOT="${ANDROID_HOME:-${HOME}/Android/Sdk}"
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

install_jdk() {
  step "Installing JDK 17"
  if command -v java >/dev/null 2>&1; then
    java -version || true
    echo "java already present; skipping JDK install."
    return
  fi

  if command -v apt-get >/dev/null 2>&1; then
    sudo apt-get update
    sudo apt-get install -y openjdk-17-jdk
  elif command -v dnf >/dev/null 2>&1; then
    sudo dnf install -y java-17-openjdk-devel
  elif command -v pacman >/dev/null 2>&1; then
    sudo pacman -Sy --noconfirm jdk17-openjdk
  else
    echo "Unsupported package manager. Install JDK 17 manually, then re-run with SKIP_JDK=1." >&2
    exit 1
  fi
}

install_sdk() {
  step "Installing Android SDK command-line tools into ${SDK_ROOT}"
  need_cmd curl
  need_cmd python3
  need_cmd unzip
  need_cmd sha256sum

  url="$(json_get "packages.linux.url")"
  file="$(json_get "packages.linux.file")"
  expected="$(json_get "packages.linux.sha256")"

  tmp="$(mktemp -d)"
  trap 'rm -rf "${tmp}"' EXIT
  zip_path="${tmp}/${file}"

  echo "Downloading ${url}"
  curl -fSL --retry 5 --retry-all-errors --connect-timeout 30 "${url}" -o "${zip_path}"
  actual="$(sha256sum "${zip_path}" | awk '{print $1}')"
  if [[ "${actual}" != "${expected}" ]]; then
    echo "Checksum mismatch. Expected ${expected}, got ${actual}" >&2
    exit 1
  fi

  unzip -q "${zip_path}" -d "${tmp}"
  mkdir -p "${SDK_ROOT}/cmdline-tools"
  rm -rf "${SDK_ROOT}/cmdline-tools/latest"
  mv "${tmp}/cmdline-tools" "${SDK_ROOT}/cmdline-tools/latest"

  if [[ -d "${SDK_ROOT}/cmdline-tools/latest/cmdline-tools/bin" ]]; then
    mv "${SDK_ROOT}/cmdline-tools/latest/cmdline-tools/"* "${SDK_ROOT}/cmdline-tools/latest/"
    rmdir "${SDK_ROOT}/cmdline-tools/latest/cmdline-tools" || true
  fi

  PROFILE="${HOME}/.bashrc"
  if [[ -n "${ZSH_VERSION:-}" || -f "${HOME}/.zshrc" ]]; then
    PROFILE="${HOME}/.zshrc"
  fi
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
  echo "If USB devices show 'no permissions', ask a mentor to help add udev rules."
}

echo "FTC Dev Tools dependency installer (Linux)"
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
