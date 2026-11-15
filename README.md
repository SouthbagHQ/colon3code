# :3 Code

:3 Code is an "agent harness control surface" (＾• ω •＾). It lets you pet, poke, and direct every agent on your machine from a best-in-class mobile app ([iOS](https://apps.apple.com/us/app/colon3-code-remote-claude-more/id6787819824), [Android](https://play.google.com/store/apps/details?id=com.t3tools.colon3code)), [web app](https://app.t3.codes) and [Electron-based desktop app](https://t3.codes). Start a thread at your desk, then approve the next step from your phone.

Works with your subscriptions on Claude Code, Codex, Cursor, OpenCode, Grok Build, Google Antigravity, Kiro, Pi, Muse Code, fx, Southbag Code, and any [ACP](./docs/user/providers-acp.md) agent. If they're set up on your computer, :3 Code can control them.

## what you get

- **Your subscriptions.** :3 Code does not resell tokens. It drives the agents you are already signed in to.
- **Every agent in one place.** Change models in the middle of a thread. Let Claude hand a task to Codex.
- **Desktop, web, and phone.** One server, and every client shows the same threads. There are apps for iOS and Android.
- **Remote ready.** Run agents on any machine. Connect over your local network, Tailscale, or [T3 Connect](./docs/user/remote-access.md).
- **Git built in.** Each thread can work in its own worktree. Review the diff, then commit, push, and open a pull request with one button.
- **Fast.** Performance is a feature here. We measure it, and we treat a dropped frame as a bug.
- **Open.** MIT licensed. If you don't like something, fork it. =^.^=

## installation

### desktop app

Install the latest version of the desktop app from [GitHub Releases](https://github.com/SouthbagHQ/colon3code/releases), or from your favorite package registry:

| Platform       | Command                                                                   |
| -------------- | ------------------------------------------------------------------------- |
| macOS          | `brew install --cask colon3-code`                                         |
| Windows        | `winget install T3Tools.Colon3Code` or `scoop install extras/colon3code`  |
| Arch Linux     | `yay -S colon3code-bin` (nightly: `yay -S colon3code-nightly-bin`)        |
| Nix            | `nix profile add github:NixOS/nixpkgs/nixos-unstable#colon3code`          |
| Debian, Ubuntu | `.deb` from [Releases](https://github.com/SouthbagHQ/colon3code/releases) |

The AUR packaging is maintained in this repository under [`packaging/aur`](./packaging/aur).

### command line

This installs the `t3` command.

```bash
curl -fsSL https://t3.codes/install.sh | sh
```

On Windows, in PowerShell:

```powershell
irm https://t3.codes/install.ps1 | iex
```

Then run `t3` to start the server and open the local web app. `t3 service install` keeps it purring in the background, `t3 update` moves to a newer release, and `t3 --help` has the full reference.

Just want one little taste without installing? Run `npx t3@latest` instead.

### phone

Get the app from the [App Store](https://apps.apple.com/us/app/colon3-code-remote-claude-more/id6787819824) or [Google Play](https://play.google.com/store/apps/details?id=com.t3tools.colon3code). Then follow [remote access](./docs/user/remote-access.md) to connect it to your computer.

### sign in to an agent

:3 Code needs one agent that is installed and signed in. For example, install [Claude Code](https://claude.com/product/claude-code) and run `claude auth login`, or install [Codex CLI](https://developers.openai.com/codex/cli) and run `codex login`.

For Southbag Code, install [Southbag Code](https://github.com/SouthbagHQ/code) with `npm i -g @southbag/code`. When it is installed, it is the default provider for new threads.

[Provider setup](./docs/user/install.md#providers) has the steps for each agent. [Install :3 Code](./docs/user/install.md) covers nightly builds, AppImage, WSL, and NixOS.

## "wait, what are you selling me?"

Nothing! Not a thing. We built :3 Code because we wanted the best possible development experience with agents. We were inspired by existing solutions like the Codex desktop app, Conductor, Claude Desktop and Cursor Glass, but none met our bar.

We wanted something performant, remote-ready, and truly open. If we ever go the wrong direction, we want you to have everything you need to fork and build the editor that you want. No hard feelings, we'll purr you off. (˃ᆺ˂)

## some notes (｡•́︿•̀｡)

We are very very early in this project. Expect bugs. They're small and fuzzy, but they do bite.

We are (mostly) not accepting contributions yet. Small fixes may be considered. Big features will not be.

## documentation

- [Install and first run](./docs/user/install.md)
- [Remote access from a phone or another machine](./docs/user/remote-access.md)
- [Permission modes](./docs/user/permission-modes.md)
- [Source control](./docs/user/source-control.md)
- [Connect outside agents over MCP](./docs/user/outside-agents.md)
- [Run :3 Code as a background service](./docs/user/background-service.md)
- [FAQ](./docs/user/faq.md)

[All docs](./docs/README.md) has the full list.

## if you REALLY want to contribute still.... read this first (=^･ω･^=)

- Read [CONTRIBUTING.md](./CONTRIBUTING.md) before you report a bug or open a pull request.
- Put feature requests in [Ideas](https://github.com/SouthbagHQ/colon3code/discussions/categories/ideas).
- Build from source with the [development runbook](./docs/operations/development.md#first-checkout). The [architecture overview](./docs/internals/overview.md) explains how it works.

Need support? Come hang out in the [Discord](https://discord.gg/jn4EGJjrvv). ♡

## license

[MIT](./LICENSE)
