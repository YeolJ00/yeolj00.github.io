# Save as: run-chroma.ps1
param(
  [string]$Dir = ".",
  [string]$Ffmpeg = "ffmpeg",
  [switch]$DryRun   # add -DryRun to preview commands without running
)

$filterGraph = '[1:v][0:v]scale2ref[bg][vid]; [vid]format=yuva444p,lumakey=0.10:0.06:0.10[cut]; [bg][cut]overlay=shortest=1,setsar=1,setdar=1[out]'

Get-ChildItem -Path $Dir -Filter *.mp4 -File |
  Where-Object { $_.BaseName -match '(_sora|_wan)$' } |
  ForEach-Object {
    $inPath  = $_.FullName
    $newBase = ($_.BaseName -replace '(_sora|_wan)$', '${1}_chroma')
    $outPath = Join-Path $_.DirectoryName ($newBase + '.mp4')

    $args = @(
      '-hide_banner','-y',
      '-i', $inPath,
      '-f','lavfi','-i','color=c=white',
      '-filter_complex', $filterGraph,
      '-map','[out]','-map','0:a?',
      '-c:v','libx264','-crf','18','-preset','veryfast',
      '-c:a','copy','-loglevel','error',
      $outPath
    )

    if ($DryRun) {
      Write-Host "& $Ffmpeg $($args -join ' ')"
    } else {
      & $Ffmpeg @args
    }
  }
