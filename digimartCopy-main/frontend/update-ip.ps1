# PowerShell script to update all hardcoded IP addresses to current network IP
# Run this from: E:\copy\EntraDigimart-test\frontend

$oldIP = "http://192.168.8.124:5000"
$newIP = "http://192.168.56.83:5000"

Write-Host "Updating all IP addresses from $oldIP to $newIP..." -ForegroundColor Yellow

$files = Get-ChildItem -Path . -Include *.js,*.jsx,*.ts,*.tsx -Recurse

$count = 0
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    if ($content -match [regex]::Escape($oldIP)) {
        $newContent = $content -replace [regex]::Escape($oldIP), $newIP
        Set-Content -Path $file.FullName -Value $newContent -NoNewline
        Write-Host "Updated: $($file.FullName)" -ForegroundColor Green
        $count++
    }
}

Write-Host ""
Write-Host "Updated $count files successfully!" -ForegroundColor Green
Write-Host "All URLs now point to: $newIP" -ForegroundColor Cyan
