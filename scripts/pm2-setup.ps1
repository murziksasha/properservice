# ProperService: install/start with pm2 + Windows autostart (no Docker).
# Builds only if .next is missing (via start-prod.ps1 -PrepareOnly).
$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $Root

$AppName = "properservice"
$TaskName = "ProperService-pm2"

function Test-HasCommand {
  param([string]$Name)
  return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Read-AppPort {
  $port = 3000
  $envFile = Join-Path $Root ".env"
  if (Test-Path $envFile) {
    foreach ($line in Get-Content $envFile -ErrorAction SilentlyContinue) {
      if ($line -match "^\s*PORT\s*=\s*(\d+)") {
        $port = [int]$Matches[1]
        break
      }
    }
  }
  if ($env:PORT -match "^\d+$") {
    $port = [int]$env:PORT
  }
  return $port
}

function Update-SessionPath {
  $machine = [Environment]::GetEnvironmentVariable("Path", "Machine")
  $user = [Environment]::GetEnvironmentVariable("Path", "User")
  $env:Path = "$machine;$user"
}

if (-not (Test-HasCommand "node")) {
  Write-Error "Required command not found: node. Install Node.js LTS and ensure it is in PATH."
  exit 1
}
if (-not (Test-HasCommand "npm")) {
  Write-Error "Required command not found: npm. Install Node.js LTS and ensure it is in PATH."
  exit 1
}

Write-Host "==> Prepare (deps + build-if-needed)..."
$prepareScript = Join-Path $PSScriptRoot "start-prod.ps1"
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $prepareScript -PrepareOnly
if ($LASTEXITCODE -ne 0) {
  Write-Error "Prepare failed (exit $LASTEXITCODE)"
  exit $LASTEXITCODE
}

if (-not (Test-HasCommand "pm2")) {
  Write-Host "==> Installing pm2 globally..."
  npm install -g pm2
  if ($LASTEXITCODE -ne 0) {
    Write-Error "npm install -g pm2 failed (exit $LASTEXITCODE)"
    exit $LASTEXITCODE
  }
  Update-SessionPath
}

if (-not (Test-HasCommand "pm2")) {
  Write-Error "pm2 still not in PATH after install. Close this terminal, open a new one, and re-run: npm run pm2:setup"
  exit 1
}

Write-Host "==> Starting app with pm2..."
# First run: process does not exist yet. pm2.ps1 turns "not found" into a
# terminating PowerShell error when ErrorActionPreference is Stop - so delete
# via cmd and ignore exit code.
cmd.exe /c "pm2 delete $AppName >nul 2>&1" | Out-Null

$eco = Join-Path $Root "ecosystem.config.cjs"
if (-not (Test-Path $eco)) {
  Write-Error "Missing $eco"
  exit 1
}

pm2 start $eco
if ($LASTEXITCODE -ne 0) {
  Write-Error "pm2 start failed (exit $LASTEXITCODE). Try: pm2 start ecosystem.config.cjs"
  exit $LASTEXITCODE
}

pm2 save
if ($LASTEXITCODE -ne 0) {
  Write-Warning "pm2 save failed (exit $LASTEXITCODE) - autostart may not restore processes"
}

function Register-SchtasksAutostart {
  $pm2Cmd = (Get-Command pm2).Source
  $execute = "cmd.exe"
  $argument = "/c `"$pm2Cmd`" resurrect"

  $action = New-ScheduledTaskAction -Execute $execute -Argument $argument -WorkingDirectory $Root
  $trigger = New-ScheduledTaskTrigger -AtLogOn
  $settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -ExecutionTimeLimit ([TimeSpan]::Zero)

  $principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited

  Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Principal $principal `
    -Force | Out-Null

  Write-Host "Scheduled task '$TaskName' registered (At logon -> pm2 resurrect)."
}

function Install-Pm2WindowsStartup {
  if (-not (Test-HasCommand "pm2-windows-startup")) {
    Write-Host "==> Installing pm2-windows-startup..."
    npm install -g pm2-windows-startup
    if ($LASTEXITCODE -ne 0) {
      return $false
    }
    Update-SessionPath
  }
  if (-not (Test-HasCommand "pm2-windows-startup")) {
    return $false
  }
  pm2-windows-startup install
  if ($LASTEXITCODE -ne 0) {
    return $false
  }
  Write-Host "pm2-windows-startup install OK."
  return $true
}

Write-Host "==> Configuring Windows autostart..."
$autostartOk = $false
try {
  $autostartOk = Install-Pm2WindowsStartup
}
catch {
  Write-Warning "pm2-windows-startup failed: $_"
  $autostartOk = $false
}

if (-not $autostartOk) {
  Write-Host "Falling back to Task Scheduler..."
  try {
    Register-SchtasksAutostart
    $autostartOk = $true
  }
  catch {
    Write-Warning "Could not register scheduled task: $_. Register manually: pm2 resurrect at logon."
  }
}

$port = Read-AppPort
Write-Host ""
Write-Host "==== ProperService pm2 setup complete ===="
pm2 status
Write-Host ""
Write-Host "Health:  http://localhost:$port/api/health"
Write-Host "Site:    http://localhost:$port"
Write-Host "Admin:   http://localhost:$port/admin"
Write-Host ""
Write-Host "Commands:"
Write-Host "  npm run pm2:logs      # tail logs"
Write-Host "  npm run pm2:restart   # after code changes + npm run build"
Write-Host "  npm run pm2:stop      # stop process"
Write-Host ""
Write-Host "After git pull / code changes:"
Write-Host "  npm install"
Write-Host "  npm run build"
Write-Host "  npm run pm2:restart"
Write-Host ""
if ($autostartOk) {
  Write-Host "Autostart: configured (logon/startup)."
}
else {
  Write-Host "Autostart: NOT configured - run this script again or create a task for 'pm2 resurrect'."
}
Write-Host "LAN: allow inbound TCP $port in Windows Firewall if needed."
