# ProperService: install/start with pm2 + reliable Windows autostart (no Docker).
# Builds only if .next is missing (via start-prod.ps1 -PrepareOnly).
$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $Root

$AppName = "properservice"
$TaskName = "ProperService-pm2"
$AutostartPs1 = Join-Path $PSScriptRoot "pm2-autostart.ps1"

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
  $env:Path = "C:\Program Files\nodejs;$env:APPDATA\npm;" + $machine + ";" + $user
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
$eco = Join-Path $Root "ecosystem.config.cjs"
if (-not (Test-Path $eco)) {
  Write-Error "Missing $eco"
  exit 1
}

# First run: process may not exist. Avoid terminating errors from pm2.ps1.
Write-Host "    [1/4] pm2 delete $AppName (ignore if missing)..."
cmd.exe /c "pm2 delete $AppName >nul 2>&1" | Out-Null

# If an old daemon is wedged, a plain "pm2 start" can hang forever on Windows.
Write-Host "    [2/4] ensuring pm2 daemon is up (pm2 ping)..."
$pingOk = $false
try {
  $pingOut = cmd.exe /c "pm2 ping" 2>&1 | Out-String
  if ($pingOut -match "pong|PM2") { $pingOk = $true }
  Write-Host "    pm2 ping: $($pingOut.Trim())"
}
catch {
  Write-Host "    pm2 ping threw: $_"
}

if (-not $pingOk) {
  Write-Host "    daemon not responding - pm2 kill + retry..."
  cmd.exe /c "pm2 kill >nul 2>&1" | Out-Null
  Start-Sleep -Seconds 2
}

Write-Host "    [3/4] pm2 start ecosystem.config.cjs ..."
Write-Host "    (first time can take 15-60s; if stuck >2 min press Ctrl+C and see docs below)"
# Use cmd so npm/powershell do not wait on node child stdio oddly
cmd.exe /c "pm2 start `"$eco`""
if ($LASTEXITCODE -ne 0) {
  Write-Error "pm2 start failed (exit $LASTEXITCODE). Try manually: pm2 kill && pm2 start ecosystem.config.cjs"
  exit $LASTEXITCODE
}

Write-Host "    [4/4] pm2 save ..."
cmd.exe /c "pm2 save"
if ($LASTEXITCODE -ne 0) {
  Write-Warning "pm2 save failed (exit $LASTEXITCODE) - autostart may not restore processes"
}
else {
  $dump = Join-Path $env:USERPROFILE ".pm2\dump.pm2"
  if (Test-Path $dump) {
    Write-Host "pm2 dump saved: $dump"
  }
  else {
    Write-Warning "pm2 save ran but dump not found at $dump"
  }
}

Write-Host "    pm2 status:"
cmd.exe /c "pm2 status"

function Register-SchtasksAutostart {
  if (-not (Test-Path $AutostartPs1)) {
    throw "Missing autostart script: $AutostartPs1"
  }

  $psExe = Join-Path $env:SystemRoot "System32\WindowsPowerShell\v1.0\powershell.exe"
  if (-not (Test-Path $psExe)) {
    $psExe = "powershell.exe"
  }

  # Full paths only - Task Scheduler has a minimal PATH at logon.
  $arg = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$AutostartPs1`""
  $action = New-ScheduledTaskAction -Execute $psExe -Argument $arg -WorkingDirectory $Root

  # At logon + 30s delay (node/profile ready)
  $triggerLogon = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
  $triggerLogon.Delay = "PT30S"

  $settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -ExecutionTimeLimit ([TimeSpan]::Zero) `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 1)

  # Prefer DOMAIN\user or COMPUTER\user form
  $userId = if ($env:USERDOMAIN) { "$env:USERDOMAIN\$env:USERNAME" } else { $env:USERNAME }
  $principal = New-ScheduledTaskPrincipal -UserId $userId -LogonType Interactive -RunLevel Highest

  Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Trigger $triggerLogon `
    -Settings $settings `
    -Principal $principal `
    -Force | Out-Null

  Write-Host "Scheduled task '$TaskName' registered."
  Write-Host "  User:    $userId"
  Write-Host "  Trigger: At logon + 30s"
  Write-Host "  Action:  $psExe $arg"
  Write-Host "  Log:     $(Join-Path $Root 'logs\pm2-autostart.log')"
}

function Register-StartupFolderShortcut {
  # Extra safety net if Task Scheduler is disabled/blocked
  try {
    $startup = [Environment]::GetFolderPath("Startup")
    $cmdPath = Join-Path $startup "ProperService-pm2.cmd"
    $lines = @(
      "@echo off"
      "rem ProperService pm2 autostart (Startup folder)"
      "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$AutostartPs1`""
    )
    Set-Content -Path $cmdPath -Value $lines -Encoding ASCII
    Write-Host "Startup folder launcher: $cmdPath"
    return $true
  }
  catch {
    Write-Warning "Could not write Startup folder launcher: $_"
    return $false
  }
}

function Test-AutostartNow {
  Write-Host "==> Dry-run autostart script (same as after reboot)..."
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $AutostartPs1
  $code = $LASTEXITCODE
  if ($code -ne 0) {
    Write-Warning "Autostart dry-run exited $code - see logs\pm2-autostart.log"
    return $false
  }
  return $true
}

Write-Host "==> Configuring Windows autostart (Task Scheduler - primary)..."
$autostartOk = $false
try {
  Register-SchtasksAutostart
  $autostartOk = $true
}
catch {
  Write-Warning "Task Scheduler registration failed: $_"
  Write-Warning "Try running PowerShell as Administrator, then: npm run pm2:setup"
}

Write-Host "==> Configuring Startup folder fallback..."
Register-StartupFolderShortcut | Out-Null

# Optional legacy helper (often unreliable alone; do not skip schtasks if this "works")
try {
  if (-not (Test-HasCommand "pm2-windows-startup")) {
    npm install -g pm2-windows-startup 2>$null | Out-Null
    Update-SessionPath
  }
  if (Test-HasCommand "pm2-windows-startup") {
    cmd.exe /c "pm2-windows-startup install" | Out-Null
  }
}
catch { }

if ($autostartOk) {
  Test-AutostartNow | Out-Null
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
  Write-Host "Autostart: Task '$TaskName' at logon (+ Startup folder fallback)."
  Write-Host "IMPORTANT: after reboot you must LOG IN as user '$env:USERNAME' (same account as setup)."
  Write-Host "If site is down after reboot, open: $(Join-Path $Root 'logs\pm2-autostart.log')"
}
else {
  Write-Host "Autostart: Task Scheduler FAILED - run setup as Admin or create task manually."
  Write-Host "Manual: taskschd.msc -> run at logon:"
  Write-Host "  powershell -NoProfile -ExecutionPolicy Bypass -File `"$AutostartPs1`""
}
Write-Host "LAN: allow inbound TCP $port in Windows Firewall if needed."

# Verify task exists
$task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($task) {
  Write-Host "Task state: $($task.State)"
}
else {
  Write-Warning "Task '$TaskName' not found after registration."
}
