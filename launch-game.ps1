$ErrorActionPreference = "Stop"

$projectDir = "C:\Users\vivek\Documents\codex projects\car game"
$url = "http://127.0.0.1:4173"
$port = 4173
$hostName = "127.0.0.1"
$timeoutSeconds = 10

function Show-FailureAndExit {
  param(
    [string]$Message
  )

  Write-Error $Message
  Read-Host "Press Enter to close"
  exit 1
}

function Test-GamePort {
  $client = $null
  try {
    $client = [System.Net.Sockets.TcpClient]::new()
    $connect = $client.ConnectAsync($hostName, $port)
    $connected = $connect.Wait(300)
    return $connected -and $client.Connected
  } catch {
    return $false
  } finally {
    if ($client) {
      $client.Dispose()
    }
  }
}

if (-not (Test-Path -LiteralPath $projectDir)) {
  Show-FailureAndExit "Project directory not found: $projectDir"
}

$npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
if (-not $npmCommand) {
  $npmCommand = Get-Command npm -ErrorAction SilentlyContinue
}

if (-not $npmCommand) {
  Show-FailureAndExit "npm was not found on PATH. Install Node.js or fix PATH before launching Arc Drive."
}

$serverReady = Test-GamePort

if (-not $serverReady) {
  $escapedProjectDir = $projectDir.Replace("'", "''")
  $serverCommand = "Set-Location -LiteralPath '$escapedProjectDir'; npm run dev"

  try {
    Start-Process -FilePath "powershell.exe" -WorkingDirectory $projectDir -ArgumentList @(
      "-NoExit",
      "-Command",
      $serverCommand
    ) | Out-Null
  } catch {
    Show-FailureAndExit "Failed to start the Arc Drive server window. $($_.Exception.Message)"
  }

  $deadline = (Get-Date).AddSeconds($timeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    Start-Sleep -Milliseconds 250
    if (Test-GamePort) {
      $serverReady = $true
      break
    }
  }
}

if (-not $serverReady) {
  Write-Warning "Arc Drive did not respond on $url within $timeoutSeconds seconds. Opening the browser anyway."
}

Start-Process $url
