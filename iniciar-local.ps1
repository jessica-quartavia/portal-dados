param(
  [switch]$Wait
)

$ErrorActionPreference = "Stop"

$portalRoot = $PSScriptRoot
$workspaceRoot = Split-Path -Parent $portalRoot
$bunCommand = (Get-Command bun -ErrorAction Stop).Source
$logRoot = Join-Path $portalRoot ".local-logs"
New-Item -ItemType Directory -Path $logRoot -Force | Out-Null

$apps = @(
  @{ Name = "Portal Quarta Via"; Port = 4321; Workdir = $portalRoot; Args = @("run", "dev", "--host", "127.0.0.1", "--port", "4321") },
  @{ Name = "Qualidade dos Dados"; Port = 4173; Workdir = (Join-Path $workspaceRoot "dashboard-jornada-cliente"); Args = @("run", "server.ts") },
  @{ Name = "Dashboard Info Cliente"; Port = 5187; Workdir = (Join-Path $workspaceRoot "outputs\vw_info_cliente_dashboard"); Args = @("run", "server.mjs") },
  @{ Name = "Dashboard Info Leads"; Port = 5188; Workdir = (Join-Path $workspaceRoot "outputs\info_leads_dashboard"); Args = @("run", "server.mjs") },
  @{ Name = "Dashboard Comercial QV"; Port = 5190; Workdir = $portalRoot; Args = @("run", "scripts\serve-commercial-local.mjs") }
)

$started = foreach ($app in $apps) {
  $existing = Get-NetTCPConnection -LocalAddress "127.0.0.1" -LocalPort $app.Port -State Listen -ErrorAction SilentlyContinue
  if ($existing) {
    [PSCustomObject]@{ Name = $app.Name; Url = "http://127.0.0.1:$($app.Port)"; Status = "já estava rodando"; Pid = $existing.OwningProcess }
    continue
  }

  $startInfo = [System.Diagnostics.ProcessStartInfo]::new()
  $startInfo.FileName = $bunCommand
  $startInfo.WorkingDirectory = $app.Workdir
  $startInfo.UseShellExecute = $true
  $startInfo.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Hidden
  $startInfo.Arguments = ($app.Args -join " ")
  $process = [System.Diagnostics.Process]::Start($startInfo)
  [PSCustomObject]@{ Name = $app.Name; Url = "http://127.0.0.1:$($app.Port)"; Status = "iniciado"; Pid = $process.Id }
}

$started | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $logRoot "processos.json") -Encoding UTF8
Start-Sleep -Seconds 3
$started | Format-Table -AutoSize
Write-Host "`nPortal: http://127.0.0.1:4321"

if ($Wait) {
  Write-Host "Serviços locais ativos. Use Ctrl+C para encerrar."
  while ($true) {
    Start-Sleep -Seconds 10
  }
}
