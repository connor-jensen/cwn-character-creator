---
name: deploy
description: Commit, push, and deploy to GitHub Pages
---

The user has invoked /deploy, which authorizes you to commit, push, and deploy to GitHub Pages. Perform all of the following steps without asking for confirmation:

1. **Commit** all pending changes on `main`:
   - Stage relevant changed files (skip .DS_Store, node_modules, etc.)
   - Write a descriptive commit message based on the changes
   - Push to `origin main`

2. **Build** the demo app:
   - Run `npm run build` in the `demo/` directory

3. **Deploy** to `gh-pages`:
   - Switch to the `gh-pages` branch
   - Remove all deployed files (index.html, assets/, audio/, vite.svg, and any other build artifacts) but keep the `demo/` directory
   - Copy **all** contents of `demo/dist/` to the repo root (this includes assets/, audio/, index.html, etc.)
   - Commit with message "Deploy to GitHub Pages"
   - Push to `origin gh-pages`
   - Switch back to `main`

You have full permission to run git commit, git push, and build commands for this invocation. Do not ask for confirmation on these steps — just execute them.

$ARGUMENTS
