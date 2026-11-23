# Pop Shell

Pop Shell is a keyboard-driven layer for GNOME Shell which allows for quick and sensible navigation and management of windows. The core feature of Pop Shell is advanced tiling window management paired with GNOME Shell.

[![](./screenshot.webp)](./screenshot.webp)

## Table of Contents

- [The Proposal](#the-proposal): Upstreaming tiling concepts into GNOME
- [The Problem](#the-problem): Why tiling helps in GNOME
- [Installation](#installation): Installing on GNOME Shell 48+
- [Shared Features](#shared-features): Behaviors shared between floating and auto-tiling modes
- [Floating Mode](#floating-mode): Behaviors specific to floating mode
- [Tiling Mode](#tiling-mode): Behaviors specific to auto-tiling mode
- [Developers](#developers): Building, testing, debugging, and CI

## The Proposal

Pop Shell explores bringing dynamic keyboard-driven tiling and window navigation directly to GNOME Shell on top of Mutter, without requiring users to maintain a separate compositor or desktop environment.

## The Problem

### Displays are large, and windows are many

Default GNOME window management focuses on manual stacking and half-screen snapping. Once more than two windows are open on a display, positioning and resizing them by hand becomes repetitive.

### Displays are ultra-wide

Maximizing single windows on 1440p, 4K, or ultra-wide monitors spreads controls across distant screen corners. Automatic tree tiling divides display space proportionally so windows stay readable and reachable.

### Keeping the GNOME desktop experience

Instead of replacing GNOME Shell with a standalone tiling window manager, Pop Shell preserves GNOME Overview, panel integration, notifications, and system settings while adding optional auto-tiling and stacking.

## Installation

This fork targets **GNOME Shell 48 to 51** (`metadata.json`). See the [INSTALL guide](INSTALL.md) for full distribution instructions and troubleshooting.

### Quick Install

Run the installer script as your normal user (never with `sudo`):

```bash
curl -fsSL https://raw.githubusercontent.com/GwilliamBR/shell/main/scripts/install.sh | bash
```

The installer checks for `pop-launcher`, installs the extension, enables `pop-shell@system76.com`, and offers to apply Pop Shell's recommended GNOME keyboard shortcuts via `scripts/configure.sh` when run from a local repository clone.

### Install From Source

Requirements: GNOME Shell 48+, `git`, `make`, `zip`, `glib-compile-schemas`, Node.js, `pnpm`, and `pop-launcher`.

```bash
git clone https://github.com/GwilliamBR/shell.git
cd shell
pnpm install
make install
gnome-extensions enable pop-shell@system76.com
```

To apply the optional recommended GNOME keyboard shortcut overrides later, run:

```bash
make configure
```

To uninstall the extension cleanly:

```bash
make uninstall
```

Note: On Wayland sessions, log out and log back in after installing or updating so GNOME Shell loads the updated extension. See [INSTALL.md](INSTALL.md) for `pop-launcher` setup and distro package details.

## Shared Features

Features shared between floating and auto-tiling modes.

### Directional Keys

Pop Shell uses directional keys referred to below as `<Direction>`:

- `Left` or `h`
- `Down` or `j`
- `Up` or `k`
- `Right` or `l`

### Optional GNOME Shortcut Overrides (`make configure`)

If you confirm `scripts/configure.sh` (or run `make configure`), Pop Shell updates GNOME shortcuts to avoid conflicts:

- `Super` + `q`: Close window
- `Super` + `m`: Maximize the focused window
- `Super` + `,`: Minimize the focused window
- `Super` + `Esc`: Lock screen
- `Super` + `f`: Files
- `Super` + `e`: Email
- `Super` + `b`: Web Browser
- `Super` + `t`: Terminal

### Window Management Mode

Activated with `Super` + `Return`.

- `<Direction>`: Moves the grid overlay (floating mode) or moves the focused window within the tiling tree and across monitors (auto-tiling mode).
- `Shift` + `<Direction>`: Resizes the grid overlay (floating mode) or resizes the focused window (auto-tiling mode).
- `Ctrl` + `<Direction>`: Selects a swap target window; press `Return` to swap positions.
- `o`: Toggles horizontal vs. vertical split orientation in auto-tiling mode.
- `s`: Toggles a tabbed stacking container in auto-tiling mode.
- `Return`: Applies requested changes.
- `Esc`: Cancels pending changes.

### Window Focus Switching

Pressing `Super` + `<Direction>` moves focus toward the nearest window in that direction based on edge-center distance.

### Launcher

Pop Shell includes a keyboard-driven search and command launcher powered by [pop-launcher](https://github.com/pop-os/launcher).

Press `Super + /` to open the launcher at the center of the active screen. Press `Esc` to dismiss it.

### Key Capabilities

- Application Launching: Quickly search and launch desktop applications.
- Window Switching: Search open windows and switch focus directly to them, even if they reside on a different workspace.
- Calculations and Commands: Perform instant math calculations, open recent files, or run terminal commands.
- Plugin Modes: Type `?` in the search bar to inspect all available plugin triggers (such as calculator, files, and commands).
- GNOME System Integration: Follows the GNOME desktop color scheme (dark and light modes) and matches your chosen system accent color.

### Inner and Outer Gaps & Window Title Bars

Configure inner/outer gaps, active focus hint color and border radius, title bar visibility, smart gaps, and snap-to-grid from the Pop Shell top bar indicator menu or extension preferences.

## Floating Mode

Default mode when auto-tiling is off. Displays split into a configurable grid of columns and rows, with optional **Snap to Grid** mouse move/resize snapping and keyboard-driven placement in Window Management Mode.

## Tiling Mode

When enabled, windows are arranged in a binary tree (`Fork`, window leaf, or tabbed `Stack` container).

- `Super` + `y`: Toggle auto-tiling globally
- `Super` + `o`: Toggle split orientation (`horizontal` / `vertical`)
- `Super` + `g`: Toggle floating for the focused window
- `Super` + `s`: Toggle stacking container on the focused window

### Customizing the Floating Window List

Add window exceptions in `$XDG_CONFIG_HOME/pop-shell/config.json`:

```json
{
    "float": [
        {
            "class": "Gnome-control-center",
            "title": "Optional Window Title"
        }
    ]
}
```

Or use the **Floating Window Exceptions** picker from the Pop Shell panel menu.

## Developers

The extension is written in strict TypeScript (`"strict": true`, `"noImplicitAny": true`, target `ES2022`) targeting `@girs/gnome-shell` declarations.

### Development Dependencies

- Node.js 24 LTS (or compatible modern LTS)
- `pnpm` (`packageManager: pnpm@11.17.0`)
- `glib-compile-schemas` and `zip` for packaging

### Common Commands

```bash
pnpm install        # Install Node dependencies
make build          # Compile extension, dialogs, and format dist/*.js
make lint           # Run ESLint across src/ and tests/
make format-check   # Check TypeScript formatting with Prettier
make type-check     # Run tsc --noEmit across main and helper projects
make test           # Run Vitest unit, integration, GNOME 51 compat, and fuzz tests
make test-fuzz      # Run property-based fuzz tests (fast-check) directly
make pack           # Build dist/ and package pop-shell@system76.com.zip
make clean          # Remove compiled dist/ and packaging artifacts
pnpm run log        # Follow gnome-shell journal logs filtered for pop-shell
```

### Nested Wayland Debugging

Test changes safely in an isolated nested Wayland GNOME Shell session with full extension logging:

```bash
./scripts/debug.sh
```

On GNOME Shell 49+, `scripts/debug.sh` launches `dbus-run-session gnome-shell --devkit --wayland` (using `--nested --wayland` on GNOME 48).

### Continuous Integration & Releases

GitHub Actions workflows under `.github/workflows/` run `ci.yml` (ESLint, Prettier, TypeScript checks, Vitest/fast-check tests, EGO `gi://Gdk` isolation check, and zip packaging), `codeql.yml` (CodeQL SAST), and `release.yml` (tagged GitHub Releases).

## License

Licensed under the GNU General Public License, Version 3.0 ([LICENSE](LICENSE) or https://www.gnu.org/licenses/gpl-3.0.en.html).

### Contribution

Any contribution intentionally submitted for inclusion in the work by you shall be licensed under the GNU GPLv3.
