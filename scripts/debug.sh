#!/usr/bin/env bash
set -euo pipefail

UUID="pop-shell@system76.com"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATA_DIR="${XDG_DATA_HOME:-${HOME}/.local/share}"
EXT_DIR="${DATA_DIR}/gnome-shell/extensions/${UUID}"

echo "Building Pop Shell..."
(cd "${REPO_ROOT}" && make dist)

echo "Installing to ${EXT_DIR}..."
rm -rf "${EXT_DIR}"
mkdir -p "${EXT_DIR}"
cp -rv "${REPO_ROOT}/dist/"* "${EXT_DIR}/"
rm -f "${EXT_DIR}/.built"

export G_MESSAGES_DEBUG=all
export SHELL_DEBUG=all

VERSION=$(gnome-shell --version | awk '{print int($3)}')
echo "Launching nested GNOME Shell (Version ${VERSION}) for debugging..."

if [ "${VERSION}" -ge 49 ]; then
    dbus-run-session gnome-shell --devkit --wayland
else
    dbus-run-session gnome-shell --nested --wayland
fi
