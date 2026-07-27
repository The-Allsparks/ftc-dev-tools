@echo off
setlocal
cd /d "%~dp0\.."
echo Installing FTC Dev Tools dependencies for Windows (no Android Studio)...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-deps-windows.ps1" %*
set EXITCODE=%ERRORLEVEL%
echo.
if %EXITCODE% neq 0 (
  echo Installer failed with exit code %EXITCODE%.
  pause
  exit /b %EXITCODE%
)
echo Close and reopen your terminal / Cursor / VS Code, then run: ftc doctor
pause
exit /b 0
