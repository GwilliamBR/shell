# Installation Guide

This guide covers installing Pop Shell (`GwilliamBR/shell` fork, UUID `pop-shell@system76.com`) for your user account, including `pop-launcher` setup for GNOME Shell 48, 49, 50, and 51 (51.1).

## 1. Requirements

| Dependency | Purpose |
|---|---|
| GNOME Shell 48, 49, 50, or 51 | Supported targets declared in `metadata.json` |
| `git`, `make`, `zip`, `glib-compile-schemas` | Building and packaging from source |
| Node.js and `pnpm` | Compiling TypeScript and running checks |
| `curl`, `gnome-extensions` | Release download and extension installation |
| `pop-launcher` | Required backend for the `Super + /` launcher |

System packages for build tools:

- Fedora: `sudo dnf install git make zip glib2-devel nodejs`
- Debian / Ubuntu: `sudo apt install git make zip libglib2.0-bin nodejs`
- Arch Linux: `sudo pacman -S git make zip glib2 nodejs`

Enable or install `pnpm` if not already available:

```bash
corepack enable
```

Or install `pnpm` directly via its standalone installer (`https://pnpm.io/installation`).

## 2. Install `pop-launcher`

The updated launcher communicates with `pop-launcher` over async JSON IPC. If `pop-launcher` is missing, pressing `Super + /` shows a notification and the launcher will not return results.

- **Arch Linux / derivatives**: `sudo pacman -S pop-launcher libqalculate` (or AUR `pop-launcher` if needed on your mirror).
- **Pop!_OS**: Preinstalled.
- **Fedora / Debian / Ubuntu**: Install Rust (`cargo`) and `just`, then build from upstream:

```bash
git clone --depth 1 https://github.com/pop-os/launcher.git
cd launcher
just build-release
just install
```

By default `just install` places `pop-launcher` in `~/.local/bin` and plugins (including the `pop_shell` window plugin) in `~/.local/share/pop-launcher/plugins`. Ensure `~/.local/bin` is in your desktop session `PATH` (log out and back in once if you just added it).

Verify installation:

```bash
which pop-launcher
```

For calculator expressions in the launcher, also install `libqalculate` (Fedora/Arch) or `qalc` (Debian/Ubuntu).

## 3. Install Pop Shell

### Option A: Quick Installer Script

Run as your normal user (do not use `sudo`):

```bash
curl -fsSL https://raw.githubusercontent.com/GwilliamBR/shell/main/scripts/install.sh | bash
```

What `scripts/install.sh` does:

1. Checks whether `pop-launcher` is present (and offers distro package or Cargo/Just source setup when available).
2. Builds and installs from your local clone (if run inside a cloned repo), or downloads the latest release `.zip` from `GwilliamBR/shell` and runs `gnome-extensions install --force`.
3. Enables `pop-shell@system76.com`.
4. If run from a cloned repo with `scripts/configure.sh`, optionally asks `[y/N]` to apply recommended GNOME keyboard shortcuts.

### Option B: Build From Source

```bash
git clone https://github.com/GwilliamBR/shell.git
cd shell
pnpm install
make lint
make type-check
make test
make install
```

`make install` compiles schemas and TypeScript into `dist/`, packages `pop-shell@system76.com.zip`, and installs it into `~/.local/share/gnome-shell/extensions/pop-shell@system76.com`.

Packaging systems (for distro packages) can install into `DESTDIR`:

```bash
make install DESTDIR=/path/to/staging
```

## 4. Activate the Extension

GNOME Shell detects newly installed extensions after starting a fresh session:

- **Wayland**: Log out and log back in.
- **X11**: Press `Alt+F2`, enter `r`, and press `Enter`.

Then enable Pop Shell:

```bash
gnome-extensions enable pop-shell@system76.com
```

Optional: apply recommended GNOME keyboard shortcut overrides at any time (creates `.confirm_shortcut_change` on first run):

```bash
make configure
```

## 5. Use the Launcher (`Super + /`)

| Shortcut | Action |
|---|---|
| `Up` / `Down` or `Ctrl+K` / `Ctrl+J` / `Ctrl+P` / `Ctrl+N` | Move selection |
| `Shift+Tab` | Move selection up |
| `Enter` | Activate selected result |
| `Ctrl + 1` to `Ctrl + 9` | Activate numbered result |
| `Tab` | Complete selected entry |
| `Ctrl + Q` | Quit selected app or window |
| `Ctrl + C` / `Ctrl + Insert` | Copy selected result |
| Right click | Show context actions |
| `Esc` or GNOME Overview | Close launcher |

Type `?` to list active `pop-launcher` plugin prefixes, including:

| Prefix | Mode |
|---|---|
| Text | Applications and open windows |
| `=` (e.g. `=2+2`) | Calculator |
| `:` or `t:` | Execute command (or in terminal) |
| `/` or `~` | Filesystem navigation |
| `find ` | File search |

## 6. Verify & Debug

```bash
gnome-extensions info pop-shell@system76.com
pnpm run log
busctl --user list | grep -i PopShell
```

To run a local build inside an isolated nested Wayland GNOME Shell session with debug logging:

```bash
./scripts/debug.sh
```

## 7. Update or Remove

Update from source:

```bash
git pull
pnpm install
make install
```

Then log out and back in on Wayland.

Remove Pop Shell:

```bash
make uninstall
```

If you applied shortcut overrides via `make configure`, open GNOME Settings > Keyboard > Keyboard Shortcuts > View and Customize Shortcuts and reset shortcuts if desired.

## Troubleshooting

- **Launcher shortcut (`Super + /`) shows a notice about `pop-launcher`**: Install `pop-launcher` and ensure `~/.local/bin` is in your graphical session `PATH`, then log out and back in.
- **Launcher opens but open windows are missing**: Verify `com.System76.PopShell` appears on your session bus (`busctl --user list | grep PopShell`) and confirm the `pop_shell` plugin is installed alongside `pop-launcher`.
- **GNOME 51 desktop errors**: Check logs with `pnpm run log` or test with `./scripts/debug.sh` to capture runtime stack traces.
