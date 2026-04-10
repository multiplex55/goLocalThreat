@echo off
setlocal enabledelayedexpansion

set "ROOT=%~dp0"
set "FRONTEND_DIR=%ROOT%frontend"
set "DIST_DIR=%ROOT%dist"
set "GEN_DIR=%ROOT%frontend\wailsjs"

for /f %%i in ('git -C "%ROOT%" describe --tags --always --dirty 2^>nul') do set "VERSION=%%i"
if "%VERSION%"=="" set "VERSION=dev"
for /f %%i in ('git -C "%ROOT%" rev-parse --short HEAD 2^>nul') do set "COMMIT_SHA=%%i"
if "%COMMIT_SHA%"=="" set "COMMIT_SHA=unknown"
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format o"') do set "BUILD_TIME=%%i"

if "%~1"=="" goto :usage

if /I "%~1"=="frontend-install" goto :frontend_install
if /I "%~1"=="frontend-dev" goto :frontend_dev
if /I "%~1"=="frontend-build" goto :frontend_build
if /I "%~1"=="wails-generate" goto :wails_generate
if /I "%~1"=="dev" goto :dev
if /I "%~1"=="test" goto :test
if /I "%~1"=="build" goto :build
if /I "%~1"=="release" goto :release
if /I "%~1"=="clean" goto :clean

echo [build.bat] Unknown subcommand: %~1
exit /b 1

:frontend_install
echo [build.bat] frontend-install -> npm ci
pushd "%FRONTEND_DIR%"
call npm ci
set "ERR=%ERRORLEVEL%"
popd
exit /b %ERR%

:frontend_dev
echo [build.bat] frontend-dev -> npm run dev
pushd "%FRONTEND_DIR%"
call npm run dev
set "ERR=%ERRORLEVEL%"
popd
exit /b %ERR%

:frontend_build
echo [build.bat] frontend-build -> npm run build
pushd "%FRONTEND_DIR%"
call npm run build
set "ERR=%ERRORLEVEL%"
popd
exit /b %ERR%

:wails_generate
echo [build.bat] wails-generate -> wails generate module
pushd "%ROOT%"
call wails generate module
set "ERR=%ERRORLEVEL%"
popd
exit /b %ERR%

:dev
echo [build.bat] dev -> wails dev
pushd "%ROOT%"
call wails dev
set "ERR=%ERRORLEVEL%"
popd
exit /b %ERR%

:test
echo [build.bat] test -> go test ./... && npm test
pushd "%ROOT%"
call go test ./...
if errorlevel 1 (
  set "ERR=%ERRORLEVEL%"
  popd
  exit /b %ERR%
)
pushd "%FRONTEND_DIR%"
call npm test
set "ERR=%ERRORLEVEL%"
popd
popd
exit /b %ERR%

:build
if not exist "%DIST_DIR%" mkdir "%DIST_DIR%"
echo [build.bat] build -> wails build -nopackage -o goLocalThreat.exe ^& copy artifact to dist
pushd "%ROOT%"
call wails build -clean -nopackage -o "goLocalThreat.exe" -ldflags "-X main.version=%VERSION% -X main.commit=%COMMIT_SHA% -X main.date=%BUILD_TIME%"
if errorlevel 1 (
  set "ERR=%ERRORLEVEL%"
  popd
  exit /b %ERR%
)
if not exist "build\bin\goLocalThreat.exe" (
  echo [build.bat] expected build\bin\goLocalThreat.exe not found
  popd
  exit /b 1
)
copy /y "build\bin\goLocalThreat.exe" "%DIST_DIR%\goLocalThreat.exe" >nul
set "ERR=%ERRORLEVEL%"
popd
exit /b %ERR%

:release
if not exist "%DIST_DIR%" mkdir "%DIST_DIR%"
echo [build.bat] release -> wails build -nsis (version metadata embedded)
pushd "%ROOT%"
call wails build -clean -nsis -o "goLocalThreat.exe" -ldflags "-X main.version=%VERSION% -X main.commit=%COMMIT_SHA% -X main.date=%BUILD_TIME%"
if errorlevel 1 (
  set "ERR=%ERRORLEVEL%"
  popd
  exit /b %ERR%
)
if exist "build\bin\goLocalThreat.exe" (
  copy /y "build\bin\goLocalThreat.exe" "%DIST_DIR%\goLocalThreat.exe" >nul
  set "ERR=%ERRORLEVEL%"
) else (
  set "ERR=0"
)
popd
exit /b %ERR%

:clean
echo [build.bat] clean -> remove dist and generated frontend bindings
if exist "%DIST_DIR%" rmdir /s /q "%DIST_DIR%"
if exist "%GEN_DIR%" rmdir /s /q "%GEN_DIR%"
exit /b 0

:usage
echo Usage: build.bat ^<frontend-install^|frontend-dev^|frontend-build^|wails-generate^|dev^|test^|build^|release^|clean^>
exit /b 1
