@echo off
cd /d "%~dp0"
git push origin main
echo Done. Check GitHub Actions for green CI.
