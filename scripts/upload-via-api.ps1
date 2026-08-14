# upload-via-api.ps1 — push every git-tracked file through the GitHub
# Contents API (Bearer auth, no git protocol). Fallback for environments
# where the git smart-HTTP transport is blocked.
param(
  [string]$Owner = 'MoonShadow1976',
  [string]$Repo = 'chiral-pulse',
  [string]$Message = 'chiral-pulse: source snapshot'
)
$ErrorActionPreference = 'Stop'
$token = $env:GITHUB_TOKEN
if ([string]::IsNullOrEmpty($token)) {
  $tokenFile = Join-Path $env:TEMP 'gh-token.txt'
  if (Test-Path $tokenFile) { $token = (Get-Content $tokenFile -Raw).Trim() }
}
if ([string]::IsNullOrEmpty($token)) { throw 'GITHUB_TOKEN missing' }

$headers = @{
  Authorization = "Bearer $token"
  Accept = 'application/vnd.github+json'
  'X-GitHub-Api-Version' = '2022-11-28'
}
$files = (& git ls-files) | Where-Object { $_ -ne '' }
foreach ($f in $files) {
  $bytes = [IO.File]::ReadAllBytes((Join-Path (Get-Location) $f))
  $body = @{ message = $Message; content = [Convert]::ToBase64String($bytes) } | ConvertTo-Json
  $uri = "https://api.github.com/repos/$Owner/$Repo/contents/$f"
  try {
    Invoke-RestMethod -Method Put -Uri $uri -Headers $headers -Body $body | Out-Null
    Write-Host "uploaded: $f"
  } catch {
    Write-Host "FAILED: $f -> $($_.ErrorDetails.Message)"
  }
}
Write-Host 'done'
