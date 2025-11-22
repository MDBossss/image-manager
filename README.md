# image-manager

This repository contains an Electron-based image manager desktop app.

## What this change adds

- A GitHub Actions workflow at `.github/workflows/release.yml` that will run when changes are pushed to the `master` branch. The workflow:
  - installs dependencies on a Windows runner,
  - builds a Windows installer using `electron-builder` (NSIS),
  - creates a GitHub Release and uploads the `dist/*` artifacts.

## How to push this project to GitHub and enable the automated build

1. Create a new GitHub repository (on github.com) and copy the remote URL (SSH or HTTPS).

2. From your project directory run:

```bash
git init
git add --all
git commit -m "Initial commit"
git branch -M master
git remote add origin <YOUR_GIT_REMOTE_URL>
git push -u origin master
```

Replace `<YOUR_GIT_REMOTE_URL>` with the URL from GitHub (for example `git@github.com:you/image-manager.git`).

3. On GitHub, open the repository's **Actions** page to verify that the workflow runs when you push to `master`. The workflow file will create a release and upload artifacts found in `dist/`.

## Notes and recommendations

- The workflow builds an unsigned Windows installer. If you want to sign your installer (recommended for Windows), add code-signing secrets to the repository (`WIN_CSC_LINK`, `WIN_CSC_KEY_PASSWORD`) and update the workflow environment to pass them to the build step. electron-builder uses those secrets to sign the artifact.

- The `package.json` already contains `electron` and `electron-builder`. The `build` section includes a Windows target (`nsis`). Ensure you have icons in `build/icon.ico` for a polished installer.

- If you prefer the workflow to only publish on tagged releases instead of every push to `master`, modify `.github/workflows/release.yml` `on:` section to use `release` or `push` for tags.

## Manually run the build locally (optional)

```bash
# run app in dev
npm start

# build windows installer (locally, requires wine on Linux or run on Windows)
npm run build -- --win nsis --x64
```

If you want help customizing the workflow (for example: only publish on tags, attach change notes, or sign the executable), tell me which option you want and I will update the workflow.
