# Install OpsRadar CLI agent as a Windows service via NSSM.
# Prerequisites: Node.js 18+, NSSM, admin PowerShell.
# Usage:
#   .\scripts\install-windows-service.ps1 -NssmPath "C:\tools\nssm\win64\nssm.exe"
#   .\scripts\install-windows-service.ps1 -NssmPath "...\nssm.exe" -Uninstall

param(
  [Parameter(Mandatory = $true)]
  [string]$NssmPath,
  [string]$ServiceName = "OpsRadarAgent",
  [string]$NodePath = "",
  [string]$CliDir = "",
  [switch]$Uninstall
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $NssmPath)) {
  throw "NSSM not found at $NssmPath"
}

if (-not $CliDir) {
  $CliDir = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}
$CliJs = Join-Path $CliDir "cli.js"

if ($Uninstall) {
  & $NssmPath stop $ServiceName 2>$null
  & $NssmPath remove $ServiceName confirm 2>$null
  Write-Host "Removed service $ServiceName."
  exit 0
}

if (-not (Test-Path $CliJs)) {
  throw "cli.js not found in $CliDir"
}
if (-not (Test-Path (Join-Path $CliDir "config.yaml")) -and -not (Test-Path (Join-Path $CliDir "config.local.yaml"))) {
  Write-Warning "No config.yaml found. Copy config.example.yaml and set api_key / server_name before starting."
}

if (-not $NodePath) {
  $cmd = Get-Command node -ErrorAction SilentlyContinue
  if (-not $cmd) { throw "node.exe not on PATH; pass -NodePath" }
  $NodePath = $cmd.Source
}

Write-Host "Installing $ServiceName"
Write-Host "  Node: $NodePath"
Write-Host "  Dir:  $CliDir"

& $NssmPath stop $ServiceName 2>$null
& $NssmPath remove $ServiceName confirm 2>$null

# Application = node.exe; AppParameters = "cli.js" --agent (correct NSSM split)
& $NssmPath install $ServiceName $NodePath
& $NssmPath set $ServiceName AppParameters "`"$CliJs`" --agent"
& $NssmPath set $ServiceName AppDirectory $CliDir
& $NssmPath set $ServiceName Start SERVICE_AUTO_START
& $NssmPath set $ServiceName AppStdout (Join-Path $CliDir "agent-stdout.log")
& $NssmPath set $ServiceName AppStderr (Join-Path $CliDir "agent-stderr.log")
& $NssmPath set $ServiceName AppRotateFiles 1
& $NssmPath set $ServiceName AppRotateBytes 1048576
# Self-heal: restart on any non-zero / unexpected exit; throttle rapid loops
& $NssmPath set $ServiceName AppExit Default Restart
& $NssmPath set $ServiceName AppRestartDelay 5000

& $NssmPath start $ServiceName
Write-Host "Service $ServiceName started (auto-restart on exit, 5s delay)."
Write-Host "Stop:    nssm stop $ServiceName"
Write-Host "Restart: nssm restart $ServiceName"
Write-Host "Remove:  .\scripts\install-windows-service.ps1 -NssmPath `"$NssmPath`" -Uninstall"
