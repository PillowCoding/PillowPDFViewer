$rootPath = (Get-Item .).FullName
$projectName = "ng2-pdfjs-viewer"
$projectVersion = "1.0.0"
$projectPath = Join-Path -Path $rootPath -ChildPath "projects\$projectName"
$distPath = Join-Path -Path $rootPath -ChildPath "dist\$projectName"

# Debugging paths, should something go wrong.
Write-Output "Root: $rootPath."
Write-Output "Project name: $projectName."
Write-Output "Project version: $projectVersion."
Write-Output "Project path: $projectPath."
Write-Output "Dist path: $distPath."
Start-Sleep 2

# Actual logic.
try
{
    Set-Location $projectPath
    ng build
    Set-Location $distPath
    npm pack
    Copy-Item ".\$projectName-$projectVersion.tgz" "$rootPath" -Force
}
catch
{
    $message = $_
    Write-Warning "Pack failed: $message"
    Read-Host -Prompt "Press any key to continue"
    Exit
}

Write-Output "Packing has finished."
Start-Sleep 10
Exit