# Register Windows logon autostart for ProperService (Task Scheduler + Startup folder).
# Run on the HOST laptop. Prefer: right-click PowerShell -> Run as administrator.
# Usage:  npm run pm2:register-autostart
#     or: powershell -ExecutionPolicy Bypass -File .\scripts\register-autostart.ps1
$ErrorActionPreference = "Continue"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$TaskName = "ProperService-pm2"
$AutostartPs1 = Join-Path $PSScriptRoot "pm2-autostart.ps1"

if (-not (Test-Path $AutostartPs1)) {
  Write-Error "Missing $AutostartPs1"
  exit 1
}

$psExe = Join-Path $env:SystemRoot "System32\WindowsPowerShell\v1.0\powershell.exe"
if (-not (Test-Path $psExe)) { $psExe = "powershell.exe" }

$arg = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$AutostartPs1`""
$userId = if ($env:USERDOMAIN) { "$env:USERDOMAIN\$env:USERNAME" } else { $env:USERNAME }

Write-Host "Root:     $Root"
Write-Host "Script:   $AutostartPs1"
Write-Host "User:     $userId"
Write-Host "PS:       $psExe"
Write-Host ""

# Remove old task if any
try {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
}
catch { }
cmd.exe /c "schtasks /Delete /TN `"$TaskName`" /F >nul 2>&1" | Out-Null

$registered = $false
$errors = @()

# --- Method A: simple Register-ScheduledTask (current user, no Highest) ---
try {
  Write-Host "[A] Register-ScheduledTask (Limited)..."
  $action = New-ScheduledTaskAction -Execute $psExe -Argument $arg -WorkingDirectory $Root
  $trigger = New-ScheduledTaskTrigger -AtLogOn
  try { $trigger.Delay = "PT30S" } catch { }

  $settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -ExecutionTimeLimit ([TimeSpan]::Zero)

  Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Description "ProperService pm2 autostart (logon)" `
    -Force | Out-Null

  $registered = $true
  Write-Host "[A] OK"
}
catch {
  $errors += "A: $($_.Exception.Message)"
  Write-Host "[A] FAILED: $($_.Exception.Message)"
}

# --- Method B: with explicit user, Limited ---
if (-not $registered) {
  try {
    Write-Host "[B] Register-ScheduledTask (UserId=$userId, Limited)..."
    $action = New-ScheduledTaskAction -Execute $psExe -Argument $arg -WorkingDirectory $Root
    $trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
    try { $trigger.Delay = "PT30S" } catch { }
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
    $principal = New-ScheduledTaskPrincipal -UserId $userId -LogonType Interactive -RunLevel Limited

    Register-ScheduledTask `
      -TaskName $TaskName `
      -Action $action `
      -Trigger $trigger `
      -Settings $settings `
      -Principal $principal `
      -Force | Out-Null

    $registered = $true
    Write-Host "[B] OK"
  }
  catch {
    $errors += "B: $($_.Exception.Message)"
    Write-Host "[B] FAILED: $($_.Exception.Message)"
  }
}

# --- Method C: schtasks.exe (classic, often works when cmdlets fail) ---
if (-not $registered) {
  Write-Host "[C] schtasks.exe /Create ONLOGON..."
  # /TR must be one string; quote powershell + args carefully
  $tr = "$psExe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$AutostartPs1`""
  $out = cmd.exe /c "schtasks /Create /TN `"$TaskName`" /TR `"$tr`" /SC ONLOGON /RL LIMITED /F 2>&1" | Out-String
  Write-Host $out.Trim()
  if ($LASTEXITCODE -eq 0) {
    $registered = $true
    Write-Host "[C] OK"
  }
  else {
    $errors += "C: $out"
    Write-Host "[C] FAILED exit=$LASTEXITCODE"
  }
}

# --- Always: Startup folder (works without Task Scheduler privileges) ---
$startupOk = $false
try {
  $startup = [Environment]::GetFolderPath("Startup")
  if (-not $startup) { throw "Startup folder path empty" }
  $cmdPath = Join-Path $startup "ProperService-pm2.cmd"
  @(
    "@echo off"
    "rem ProperService pm2 autostart"
    "cd /d `"$Root`""
    "`"$psExe`" -NoProfile -ExecutionPolicy Bypass -File `"$AutostartPs1`""
  ) | Set-Content -Path $cmdPath -Encoding ASCII
  if (Test-Path $cmdPath) {
    $startupOk = $true
    Write-Host "Startup folder OK: $cmdPath"
  }
}
catch {
  Write-Warning "Startup folder failed: $($_.Exception.Message)"
}

# Verify task
$task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
Write-Host ""
if ($task) {
  Write-Host "SUCCESS: Task '$TaskName' state=$($task.State)"
  Write-Host "After reboot: log in as $userId, wait ~1 min, open http://localhost:3000/api/health"
  Write-Host "Log file: $(Join-Path $Root 'logs\pm2-autostart.log')"
  exit 0
}

if ($startupOk) {
  Write-Host "Task Scheduler still missing, but Startup folder launcher is installed."
  Write-Host "After reboot + login, Windows Startup will run pm2-autostart.ps1."
  Write-Host "Path: $cmdPath"
  if ($errors.Count -gt 0) {
    Write-Host "Task errors:"
    $errors | ForEach-Object { Write-Host "  $_" }
  }
  exit 0
}

Write-Host "FAILED to register autostart."
Write-Host "Errors:"
$errors | ForEach-Object { Write-Host "  $_" }
Write-Host ""
Write-Host "Manual GUI:"
Write-Host "  1. Win+R -> taskschd.msc"
Write-Host "  2. Create Task -> Trigger: At logon"
Write-Host "  3. Action: Start program"
Write-Host "     Program: $psExe"
Write-Host "     Arguments: $arg"
Write-Host "     Start in: $Root"
exit 1
