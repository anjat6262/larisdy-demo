$ErrorActionPreference = "Stop"

Set-Location (Join-Path $PSScriptRoot "..")

$runId = [guid]::NewGuid().ToString("N")
$databasePath = Join-Path (Get-Location) "database/browser-tests-$runId.sqlite"
$envFilePath = Join-Path (Get-Location) ".env.playwright"
$databaseArtifacts = @($databasePath, "$databasePath-shm", "$databasePath-wal")

Get-ChildItem -Path (Join-Path (Get-Location) "database") -File -Filter "browser-tests-*.sqlite*" |
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddHours(-1) } |
    Remove-Item -Force

try {
    New-Item -ItemType File $databasePath | Out-Null

    $normalizedDatabasePath = $databasePath -replace "\\", "/"
    $envFileContent = Get-Content $envFilePath -Raw
    $updatedEnvFileContent = [System.Text.RegularExpressions.Regex]::Replace(
        $envFileContent,
        "(?m)^DB_DATABASE=.*$",
        "DB_DATABASE=$normalizedDatabasePath"
    )

    if ($updatedEnvFileContent -ne $envFileContent) {
        Set-Content -Path $envFilePath -Value $updatedEnvFileContent -NoNewline
    }

    php artisan migrate:fresh --seed --env=playwright

    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }

    php artisan storage:link --env=playwright

    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }

    php artisan serve --host=127.0.0.1 --port=8001 --env=playwright
    exit $LASTEXITCODE
}
finally {
    foreach ($artifact in $databaseArtifacts) {
        if (Test-Path $artifact -PathType Leaf) {
            Remove-Item -LiteralPath $artifact -Force
        }
    }
}
