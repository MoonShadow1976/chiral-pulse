# publish-github.ps1 — create the GitHub repo, push the code, tag the
# release, add the dsh-plugin topic, and open a GitHub Release.
#
# Prerequisites:
#   - a GitHub Personal Access Token with `repo` scope (classic) — or a
#     fine-grained token with Contents:Read/Write + Metadata:Read
#   - the token supplied via $env:GITHUB_TOKEN or a file (recommended):
#       $env:GITHUB_TOKEN = (Get-Content "$env:TEMP\gh-token.txt" -Raw).Trim()
#   - run from the plugin checkout:
#       powershell -ExecutionPolicy Bypass -File scripts\publish-github.ps1
#
# The token is used only for API calls and one git push; the git remote is
# rewritten to the token-less URL afterwards, so nothing secret persists in
# .git/config.

param(
  [Parameter(Mandatory = $true)]
  [string]$Owner = 'MoonShadow1976',
  [string]$Repo = 'chiral-pulse',
  [string]$Description = 'CHIRAL PULSE — a Death Stranding skin + BB vital-signs heartbeat monitor for the DeepSeek Harness web UI. dsh-plugin.',
  [string]$Version = '0.1.0'
)

$ErrorActionPreference = 'Stop'

$token = $env:GITHUB_TOKEN
if ([string]::IsNullOrEmpty($token)) {
  $tokenFile = Join-Path $env:TEMP 'gh-token.txt'
  if (Test-Path $tokenFile) {
    $token = (Get-Content $tokenFile -Raw).Trim()
  }
}
if ([string]::IsNullOrEmpty($token)) {
  throw 'GITHUB_TOKEN is not set and no temp token file was found. Create one: Set-Content -Path "$env:TEMP\gh-token.txt" -Value "<TOKEN>" -NoNewline'
}

$headers = @{
  Authorization = "Bearer $token"
  Accept        = 'application/vnd.github+json'
  'X-GitHub-Api-Version' = '2022-11-28'
}

function Invoke-GhApi {
  param([string]$Method, [string]$Path, [object]$Body = $null)
  $params = @{ Method = $Method; Uri = "https://api.github.com$Path"; Headers = $headers }
  if ($null -ne $Body) { $params.Body = ($Body | ConvertTo-Json -Depth 8) }
  $params.ContentType = 'application/json'
  try {
    return Invoke-RestMethod @params
  } catch {
    $detail = $_.ErrorDetails.Message
    if ($detail) { Write-Host "API $Method $Path failed: $detail" }
    throw
  }
}

Write-Host "==> checking repo $Owner/$Repo"
$existing = $null
try { $existing = Invoke-GhApi GET "/repos/$Owner/$Repo" } catch { $existing = $null }
if ($null -eq $existing) {
  Write-Host '==> creating repository'
  Invoke-GhApi POST '/user/repos' @{
    name        = $Repo
    description = $Description
    homepage    = "https://github.com/topics/dsh-plugin"
    private     = $false
    has_issues  = $true
    has_wiki    = $false
  } | Out-Null
} else {
  Write-Host '==> repository already exists, skipping creation'
}

$remoteUrl = "https://github.com/$Owner/$Repo.git"

# Push without persisting the token: one-shot extraheader, then rewrite the
# remote to the plain URL.
Write-Host '==> pushing'
$cred = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("x-access-token:$token"))
git remote remove origin 2>$null
git remote add origin $remoteUrl
git -c http.extraheader="Authorization: Basic $cred" push -u origin master
git remote set-url origin $remoteUrl

Write-Host "==> tagging v$Version"
git tag -f "v$Version"
git -c http.extraheader="Authorization: Basic $cred" push origin "v$Version" --force

Write-Host '==> adding dsh-plugin topic'
try {
  Invoke-GhApi PUT "/repos/$Owner/$Repo/topics" @{ names = @('dsh-plugin', 'deepseek-harness', 'death-stranding', 'ui-plugin') } | Out-Null
} catch {
  Write-Host 'topic update failed (token may lack metadata write) — add it manually: https://github.com/'$Owner'/'$Repo'/settings/topics'
}

Write-Host '==> creating release'
try {
  Invoke-GhApi POST "/repos/$Owner/$Repo/releases" @{
    tag_name         = "v$Version"
    name             = "CHIRAL PULSE v$Version"
    body             = 'Death Stranding skin + BB vital-signs heartbeat monitor for DeepSeek Harness web UI. Install: `dsh plugin --profile web @dsh-plugins/chiral-pulse`.'
    draft            = $false
    prerelease       = $false
    generate_release_notes = $true
  } | Out-Null
} catch {
  Write-Host 'release creation failed (token may lack contents write) — create it manually.'
}

Write-Host "==> done: https://github.com/$Owner/$Repo"
