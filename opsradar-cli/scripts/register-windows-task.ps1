# Register a Windows Scheduled Task to run the OpsRadar agent at startup.
# Prefer NSSM (install-windows-service.ps1) for unlimited crash restart.
# This task is a lighter fallback when NSSM is unavailable.
# Run elevated PowerShell from opsradar-cli:
#   .\scripts\register-windows-task.ps1

param(
  [string]$TaskName = "OpsRadarAgent",
  [string]$CliDir = "",
  [switch]$Uninstall
)

$ErrorActionPreference = "Stop"

if ($Uninstall) {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
  Write-Host "Removed task '$TaskName'."
  exit 0
}

if (-not $CliDir) {
  $CliDir = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}
$CliJs = Join-Path $CliDir "cli.js"
if (-not (Test-Path $CliJs)) {
  throw "cli.js not found in $CliDir"
}
if (-not (Test-Path (Join-Path $CliDir "config.yaml")) -and -not (Test-Path (Join-Path $CliDir "config.local.yaml"))) {
  Write-Warning "No config.yaml found. Copy config.example.yaml and set api_key / server_name before starting."
}

$Node = (Get-Command node -ErrorAction Stop).Source

$action = New-ScheduledTaskAction -Execute $Node -Argument "`"$CliJs`" --agent" -WorkingDirectory $CliDir
$trigger = New-ScheduledTaskTrigger -AtStartup
# RestartCount/Interval apply when the process exits with failure — not unlimited like NSSM.
# ExecutionTimeLimit Zero = run indefinitely (required for --agent).
$settings = New-ScheduledTaskSettingsSet `
  -RestartCount 999 `
  -RestartInterval (New-TimeSpan -Minutes 1) `
  -ExecutionTimeLimit ([TimeSpan]::Zero) `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal | Out-Null
Start-ScheduledTask -TaskName $TaskName

Write-Host "Task '$TaskName' registered and started (at-startup + restart on failure)."
Write-Host "Note: Prefer NSSM for stronger self-heal (AppExit Restart)."
Write-Host "Stop:  Stop-ScheduledTask -TaskName $TaskName"
Write-Host "Start: Start-ScheduledTask -TaskName $TaskName"
Write-Host "Remove: .\scripts\register-windows-task.ps1 -Uninstall"
