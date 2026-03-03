$files = Get-ChildItem -Path app,components -Recurse -Filter *.tsx -File
foreach ($file in $files) {
    try {
        $text = [System.IO.File]::ReadAllText($file.FullName)
        [System.IO.File]::WriteAllText($file.FullName, $text, (New-Object System.Text.UTF8Encoding $false))
        Write-Host "Fixed $($file.Name)"
    } catch {
        Write-Host "Error on $($file.Name): $_"
    }
}
