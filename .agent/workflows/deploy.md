---
description: Build, commit, push to git, and deploy to Firebase Hosting
---

# Deploy Workflow

This workflow builds the app, commits and pushes changes to GitHub, and deploys to Firebase Hosting.

## Steps

1. Check for uncommitted changes:
// turbo
```
git status --short
```

2. If there are changes, stage all files:
```
git add .
```

3. Commit with a descriptive message (ask the user for the message, or use a sensible default):
```
git commit -m "<commit message>"
```

4. Push to GitHub:
```
git push origin main
```

5. Build and deploy to Firebase Hosting:
// turbo
```
npm run deploy
```

This runs `vite build && firebase deploy --only hosting` as defined in `package.json`.

6. Verify the deploy by checking the live URL:
// turbo
```
npx firebase hosting:channel:list 2>$null; Write-Output "Live site: https://ourspots-b536b.web.app"
```
