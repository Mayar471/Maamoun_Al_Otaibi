# GitHub preparation

This folder contains the complete working project, including installed dependencies and local CMS data. Git excludes local credentials, data, generated builds, caches, and dependency folders.

## Existing repository

The `origin` remote is already configured:
https://github.com/Mayar471/Maamoun_Al_Otaibi.git

Changes are staged on the local `cms-dashboard` branch. Review and commit them in PowerShell:

```powershell
Set-Location D:\CodexProjects\Maamoun_Al_Otaibi
git diff --cached --stat
git diff --cached
# Set your own Git author identity if it is not configured:
git config user.name "Your Name"
git config user.email "YOUR_GITHUB_EMAIL"
git commit -m "Add content management dashboard with uploads, language and themes"
git push -u origin cms-dashboard
```

Open a pull request from `cms-dashboard` to `main` after pushing.

## A different GitHub repository

Create an empty repository in GitHub first, then replace the remote URL before pushing:

```powershell
git remote set-url origin https://github.com/YOUR_ACCOUNT/YOUR_REPOSITORY.git
git push -u origin cms-dashboard
```

## Run locally

```powershell
npm.cmd run dev:node -- --port 3000
```

Visit http://localhost:3000/admin. Local credentials are in `.dev.vars`; this file must remain ignored. The `.cms-data` folder holds SQLite data and uploaded images and must remain ignored. These local files need separate private storage/backup for deployment; GitHub holds the application source. See CMS.md for deployment.

For a fresh clone, run `npm.cmd ci`, create `.dev.vars` using `.dev.vars.example`, and configure new secrets. Never upload this entire folder as a ZIP to a public repository: use Git, which applies `.gitignore`.
