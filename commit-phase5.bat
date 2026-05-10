@echo off
REM Phase 5 commit + push script
REM Run this from the job-globe.com root in PowerShell or CMD

echo Removing stale git lock files...
del /f .git\HEAD.lock 2>nul
del /f .git\index.lock 2>nul

echo Staging all Phase 5 changes...
git add -A

echo Committing Phase 5...
git commit -m "feat: Phase 5 complete — alerts, applications, observability, launch QA"

echo Pushing to origin main...
git push origin main

echo Done! Check GitHub: https://github.com/vishalgwu/job-globe.com
