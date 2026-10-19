# Crea el ZIP para subir a la Chrome Web Store con los archivos de la
# extensión: deja fuera docs/, este script y los archivos de Git. Las rutas
# van con "/" (la Store no acepta "\").
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem

$source = $PSScriptRoot
$version = (Get-Content (Join-Path $source "manifest.json") -Raw | ConvertFrom-Json).version
$destination = Join-Path (Split-Path $source -Parent) "fullpage-saver-$version.zip"
if (Test-Path $destination) { Remove-Item $destination -Confirm:$false }

$excluded = '^(docs[\\/]|\.git|build-zip\.ps1$)'
$zip = [System.IO.Compression.ZipFile]::Open($destination, "Create")
try {
  Get-ChildItem $source -Recurse -File | Sort-Object FullName | ForEach-Object {
    $relative = $_.FullName.Substring($source.Length + 1)
    if ($relative -notmatch $excluded) {
      [void][System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $relative.Replace("\", "/"), "Optimal")
    }
  }
} finally {
  $zip.Dispose()
}
Write-Output "Creado: $destination"
