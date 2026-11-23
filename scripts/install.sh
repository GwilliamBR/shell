#!/usr/bin/env bash
set -euo pipefail

UUID="pop-shell@system76.com"
REPO="${POP_SHELL_REPO:-GwilliamBR/shell}"
BRANCH="${POP_SHELL_BRANCH:-}"
SCRIPT_PATH="${BASH_SOURCE[0]:-}"
WORK_TMP_DIR=""

cleanup() {
    if [ -n "$WORK_TMP_DIR" ] && [ -d "$WORK_TMP_DIR" ]; then
        rm -rf "$WORK_TMP_DIR"
    fi
}
trap cleanup EXIT

if [[ ! "$REPO" =~ ^[A-Za-z0-9._-]+/[A-Za-z0-9._-]+$ ]]; then
    echo "Error: Invalid POP_SHELL_REPO value '$REPO'. Expected 'owner/repo'."
    exit 1
fi

if [ -n "$BRANCH" ] && { [[ "$BRANCH" == -* ]] || [[ ! "$BRANCH" =~ ^[A-Za-z0-9._/-]+$ ]]; }; then
    echo "Error: Invalid POP_SHELL_BRANCH value '$BRANCH'."
    exit 1
fi

is_pop_shell_repo() {
    local dir="$1"
    [ -f "$dir/metadata.json" ] && [ -f "$dir/package.json" ] && grep -q "\"uuid\":[[:space:]]*\"$UUID\"" "$dir/metadata.json"
}

# Resolve repository root when invoked as a script file or from inside a repo checkout
REPO_ROOT=""
if [ -n "$SCRIPT_PATH" ]; then
    SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
    if is_pop_shell_repo "$SCRIPT_DIR"; then
        REPO_ROOT="$SCRIPT_DIR"
    elif is_pop_shell_repo "$SCRIPT_DIR/.."; then
        REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
    fi
fi

if [ -z "$REPO_ROOT" ] && is_pop_shell_repo "$PWD"; then
    REPO_ROOT="$PWD"
fi

# Ensure not running as root
if [ "$(id -u)" -eq 0 ]; then
    echo "Error: Do not run this script as root or with sudo."
    echo "GNOME extensions must be installed into your user directory."
    exit 1
fi

prompt_user() {
    local question="$1"
    local default_yes="${2:-true}"
    local reply=""

    if [ -t 0 ]; then
        read -r -p "$question " reply || true
    elif [ -c /dev/tty ] && { exec 3</dev/tty; } 2>/dev/null; then
        read -r -p "$question " reply <&3 || true
        exec 3<&-
    else
        [ "$default_yes" = true ]
        return $?
    fi

    if [ "$default_yes" = true ]; then
        case "$reply" in
            [nN][oO]|[nN]) return 1 ;;
            *) return 0 ;;
        esac
    fi

    case "$reply" in
        [yY][eE][sS]|[yY]) return 0 ;;
        *) return 1 ;;
    esac
}

require_build_tools() {
    local missing=()
    for cmd in git node pnpm make zip glib-compile-schemas gnome-extensions; do
        if ! command -v "$cmd" >/dev/null 2>&1; then
            missing+=("$cmd")
        fi
    done

    if [ "${#missing[@]}" -gt 0 ]; then
        echo "Error: Building from source requires: ${missing[*]}"
        echo "Install the missing tools (see INSTALL.md) and try again."
        exit 1
    fi
}

build_pop_launcher_from_source() {
    if ! command -v git >/dev/null 2>&1; then
        echo "Error: git is required to build pop-launcher from source."
        return 1
    fi

    echo "Cloning and building pop-launcher from source..."
    WORK_TMP_DIR=$(mktemp -d)
    (
        cd "$WORK_TMP_DIR"
        git clone --depth 1 -- https://github.com/pop-os/launcher.git
        cd launcher
        just build-release
        just install
    )
    rm -rf "$WORK_TMP_DIR"
    WORK_TMP_DIR=""
    echo "pop-launcher installed to ~/.local/bin."
    echo "Please ensure ~/.local/bin is in your PATH."
}

check_pop_launcher() {
    if command -v pop-launcher >/dev/null 2>&1; then
        echo "Found pop-launcher: $(command -v pop-launcher)"
        return 0
    fi

    echo ""
    echo "Note: pop-launcher was not found in your PATH."
    echo "Pop Shell's Launcher (Super + /) requires pop-launcher to search apps, files, and math formulas."
    echo ""

    local distro=""
    local id_like=""
    if [ -f /etc/os-release ]; then
        # shellcheck disable=SC1091
        . /etc/os-release
        distro="${ID:-}"
        id_like="${ID_LIKE:-}"
    fi

    if [[ "$distro" =~ ^(arch|cachyos|manjaro|endeavouros)$ ]] || [[ "$id_like" =~ arch ]]; then
        echo "Arch Linux based system detected ($distro)."
        if prompt_user "Install pop-launcher now via pacman? [Y/n]" true; then
            echo "Running: sudo pacman -S --needed pop-launcher libqalculate"
            sudo pacman -S --needed pop-launcher libqalculate || {
                echo "Package installation failed or was skipped."
                echo "You can install it manually later. See INSTALL.md."
            }
        else
            echo "Skipped pop-launcher installation."
        fi
    elif [[ "$distro" =~ ^(pop)$ ]]; then
        echo "Pop!_OS detected. Please ensure pop-launcher is in your PATH."
    elif [[ "$distro" =~ ^(fedora|rhel|centos)$ ]] || [[ "$id_like" =~ fedora ]]; then
        echo "Fedora based system detected ($distro)."
        if command -v cargo >/dev/null 2>&1 && command -v just >/dev/null 2>&1; then
            if prompt_user "Build and install pop-launcher to ~/.local/bin now? [Y/n]" true; then
                build_pop_launcher_from_source
            else
                echo "Skipped pop-launcher installation."
            fi
        else
            echo "To enable the launcher on Fedora, please see INSTALL.md for instructions."
        fi
    elif [[ "$distro" =~ ^(ubuntu|debian|linuxmint)$ ]] || [[ "$id_like" =~ (ubuntu|debian) ]]; then
        echo "Debian / Ubuntu based system detected ($distro)."
        if command -v cargo >/dev/null 2>&1 && command -v just >/dev/null 2>&1; then
            if prompt_user "Build and install pop-launcher to ~/.local/bin now? [Y/n]" true; then
                build_pop_launcher_from_source
            else
                echo "Skipped pop-launcher installation."
            fi
        else
            echo "To enable the launcher on Ubuntu / Debian, please see INSTALL.md for instructions."
        fi
    else
        echo "See INSTALL.md for instructions on setting up pop-launcher for your distribution."
    fi
}

install_from_git_source() {
    require_build_tools

    WORK_TMP_DIR=$(mktemp -d)
    local clone_dir="$WORK_TMP_DIR/shell"
    local repo_url="https://github.com/${REPO}.git"

    if [ -n "$BRANCH" ]; then
        echo "Cloning ${REPO} (branch: ${BRANCH})..."
        git clone --depth 1 --branch "$BRANCH" -- "$repo_url" "$clone_dir"
    else
        echo "Cloning ${REPO}..."
        git clone --depth 1 -- "$repo_url" "$clone_dir"
    fi

    echo "Building and installing from source..."
    (cd "$clone_dir" && pnpm install && make install)
    REPO_ROOT="$clone_dir"
}

try_install_release() {
    echo "Checking latest GitHub release for ${REPO}..."
    local api_response http_status api_body release_url=""
    api_response=$(curl -sS -w '\n%{http_code}' "https://api.github.com/repos/${REPO}/releases/latest" || true)
    http_status=$(printf '%s\n' "$api_response" | tail -n 1)
    api_body=$(printf '%s\n' "$api_response" | sed '$d')

    if [ "$http_status" != "200" ]; then
        echo "No published GitHub release package found for ${REPO} (HTTP ${http_status:-error})."
        return 1
    fi

    release_url=$(printf '%s\n' "$api_body" \
        | grep -E '"browser_download_url":[[:space:]]*"https://[^"]*\.zip"' \
        | sed -E 's/.*"([^"]+)".*/\1/' \
        | head -n 1 || true)

    if [ -z "$release_url" ] || [[ ! "$release_url" =~ ^https://github\.com/ ]]; then
        echo "Latest GitHub release for ${REPO} does not contain a zip asset."
        return 1
    fi

    WORK_TMP_DIR=$(mktemp -d)
    local zip_path="$WORK_TMP_DIR/$UUID.zip"

    echo "Downloading from $release_url..."
    curl -fsSL "$release_url" -o "$zip_path"

    echo "Installing extension..."
    gnome-extensions install --force "$zip_path"
    rm -rf "$WORK_TMP_DIR"
    WORK_TMP_DIR=""
    return 0
}

install_extension() {
    if [ -n "$REPO_ROOT" ]; then
        echo "Installing from local source at $REPO_ROOT..."
        if [ -f "$REPO_ROOT/$UUID.zip" ] && ! command -v make >/dev/null 2>&1; then
            gnome-extensions install --force "$REPO_ROOT/$UUID.zip"
        else
            require_build_tools
            (cd "$REPO_ROOT" && pnpm install && make install)
        fi
        return 0
    fi

    if [ -n "$BRANCH" ]; then
        echo "Installing requested branch '${BRANCH}' from source..."
        install_from_git_source
        return 0
    fi

    if ! try_install_release; then
        echo "Falling back to building from source..."
        install_from_git_source
    fi
}

configure_shortcuts() {
    if [ -n "$REPO_ROOT" ] && [ -f "$REPO_ROOT/scripts/configure.sh" ]; then
        echo ""
        if prompt_user "Apply Pop Shell recommended GNOME keyboard shortcuts now? [y/N]" false; then
            (
                cd "$REPO_ROOT"
                if [ -t 0 ]; then
                    sh "$REPO_ROOT/scripts/configure.sh"
                elif [ -c /dev/tty ] && { exec 3</dev/tty; } 2>/dev/null; then
                    sh "$REPO_ROOT/scripts/configure.sh" <&3
                    exec 3<&-
                else
                    sh "$REPO_ROOT/scripts/configure.sh"
                fi
            )
        else
            echo "Skipped keyboard shortcut configuration. You can run 'make configure' later."
        fi
    fi
}

main() {
    echo "=== Pop Shell Installer ==="
    echo ""

    check_pop_launcher

    echo ""
    install_extension

    echo "Enabling $UUID..."
    gnome-extensions enable "$UUID" 2>/dev/null || true

    configure_shortcuts

    echo ""
    echo "=== Installation Finished ==="
    echo "If you are on Wayland, log out and log back in to activate the extension."
}

main "$@"
