param(
    [switch]$SkipBackendTests,
    [switch]$SkipFrontendBuild,
    [switch]$SkipE2E
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = $PSScriptRoot
$backendDir = Join-Path $repoRoot "backend_runtime"
$frontendDir = Join-Path $repoRoot "frontend"

function Assert-DirectoryExists {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,
        [Parameter(Mandatory = $true)]
        [string]$Label
    )

    if (-not (Test-Path $Path -PathType Container)) {
        throw "$Label tidak ditemukan: $Path"
    }
}

function Invoke-CheckedCommand {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Step,
        [Parameter(Mandatory = $true)]
        [string]$WorkingDirectory,
        [Parameter(Mandatory = $true)]
        [string]$FilePath,
        [Parameter(Mandatory = $true)]
        [string[]]$ArgumentList
    )

    Write-Host ""
    Write-Host "==> $Step" -ForegroundColor Cyan

    Push-Location $WorkingDirectory

    try {
        & $FilePath @ArgumentList

        if ($LASTEXITCODE -ne 0) {
            throw "$Step gagal dengan exit code $LASTEXITCODE."
        }
    }
    finally {
        Pop-Location
    }
}

Assert-DirectoryExists -Path $backendDir -Label "Folder backend_runtime"
Assert-DirectoryExists -Path $frontendDir -Label "Folder frontend"

Write-Host "Menjalankan verifikasi proyek dari $repoRoot" -ForegroundColor Yellow

if (-not $SkipBackendTests) {
    Invoke-CheckedCommand `
        -Step "Backend Laravel tests" `
        -WorkingDirectory $backendDir `
        -FilePath "php" `
        -ArgumentList @("artisan", "test")
}

if (-not $SkipFrontendBuild) {
    Invoke-CheckedCommand `
        -Step "Frontend React build" `
        -WorkingDirectory $frontendDir `
        -FilePath "npm.cmd" `
        -ArgumentList @("run", "build")
}

if (-not $SkipE2E) {
    Invoke-CheckedCommand `
        -Step "Frontend browser smoke test" `
        -WorkingDirectory $frontendDir `
        -FilePath "npm.cmd" `
        -ArgumentList @("run", "test:e2e")

    Get-ChildItem -Path (Join-Path $backendDir "database") -File -Filter "browser-tests-*.sqlite*" |
        Remove-Item -Force

    foreach ($artifactName in @("test-results", "playwright-report")) {
        $artifactPath = Join-Path $frontendDir $artifactName

        if (Test-Path $artifactPath) {
            Remove-Item -LiteralPath $artifactPath -Recurse -Force
        }
    }
}

Write-Host ""
Write-Host "Semua verifikasi yang dipilih selesai tanpa error." -ForegroundColor Green
