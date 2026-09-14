# Connecting this repository to the Wix site

Wix Git Integration works one way round: **Wix creates the GitHub repository**
and pushes an initial commit containing `wix.config.json`, `src/`, and the
CLI config. You cannot point Wix at an arbitrary pre-existing repo. The plan
is therefore: let Wix create its repo, then bring this code into it.

## 1. Enable Velo and Git Integration

1. Open the site in the Wix Editor → **Dev Mode** → **Turn on Dev Mode**.
2. In the Code panel click the **GitHub icon** → **Get Started**.
3. Authorize the Wix GitHub app for the `westongriffin` account.
4. Choose **Create a new repository**. Suggested name: `notary`. If a repo
   named `notary` already exists, Wix will ask for a different name; you can
   rename afterwards in GitHub settings.
5. Wix pushes an initial commit and marks the site as **Git-connected**. From
   this point the Editor's code panel is read-only; all code comes from `main`.

## 2. Bring this code into the Wix-created repo

From this directory:

```bash
git remote rename origin old-origin
git remote add origin https://github.com/westongriffin/<wix-created-repo>.git
git fetch origin
```

Rebase your work onto Wix's initial commit so `wix.config.json` and any
generated page files come from Wix:

```bash
git checkout -B main
git rebase origin/main
git checkout origin/main -- wix.config.json
git add -A
git commit -m "Add notary dashboard backend"
git push -u origin main
```

If the rebase pauses on `.gitignore`, `package.json`, `jsconfig.json`, or
`.eslintrc.json`, keep Wix's version of `wix.config.json` and this repo's
version of everything else, then `git rebase --continue`.

Wix listens to pushes on `main`. Each push is validated and deployed to the
Editor within a minute or two; the Editor's Git panel shows the sync state.

## 3. Local development

```bash
npm install
```

`postinstall` runs `wix sync-types`, which fills `.wix/types` with typings for
`$w` and the site's collections. Then:

```bash
npm run dev
```

`wix dev` opens a Local Editor that hot-reloads code from `src/`. Wix
generates `src/pages/<Page Name>.<pageId>.js` when you add pages in that
editor; commit those files.

## 4. Backend file conventions Wix relies on

| Path | Purpose |
| --- | --- |
| `src/backend/data.js` | Data hooks. Function names must be `<collectionId>_<hook>`. |
| `src/backend/*.web.js` | Web methods exported with `webMethod(Permissions.X, fn)`. |
| `src/backend/jobs.config` | Scheduled jobs. `functionLocation` is relative to `backend/`. |
| `src/public/*` | Modules importable from both backend and page code. |
| `src/pages/masterPage.js` | Runs on every page. |

## 5. Branch policy

Wix deploys `main` only. Use feature branches and PRs; nothing reaches the
site until merged. Enable branch protection on `main` in GitHub.
