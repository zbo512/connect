chcp 65001 | Out-Null
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding  = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$enc  = [System.Text.Encoding]::UTF8

function Build-Preview {
    $template = [System.IO.File]::ReadAllText("$root\index.html", $enc)

    # 1. base.css → <style> 인라인
    $css = [System.IO.File]::ReadAllText("$root\base.css", $enc)
    $template = $template.Replace(
        '<link rel="stylesheet" href="base.css">',
        "<style>`n$css`n</style>"
    )

    # 2. 두 번째 onboarding include (s-terms 마커) 먼저 제거
    #    순서가 중요: 아래 일괄 치환이 substring도 교체하기 때문
    $template = $template.Replace(
        "<!--#include screens/onboarding.html --> <!-- s-terms -->",
        ""
    )

    # 3. <!--#include screens/xxx.html --> → 실제 파일 내용으로 교체
    $screens = @('onboarding','builder','customer','claim','notify','errors','workspace','magazine')
    foreach ($name in $screens) {
        $content = [System.IO.File]::ReadAllText("$root\screens\$name.html", $enc)
        $template = $template.Replace(
            "<!--#include screens/$name.html -->",
            $content
        )
    }

    # 4. main.js → <script> 인라인
    $js = [System.IO.File]::ReadAllText("$root\main.js", $enc)
    $template = $template.Replace(
        '<script src="main.js"></script>',
        "<script>`n$js`n</script>"
    )

    # 5. ?mobile 모드 스크립트 삽입
    $mobileScript = @'
<script>
if (location.search.includes('mobile')) {
  const s = document.createElement('style');
  s.textContent = `
    body { background:#fff; padding:0; display:block; }
    .shell { width:100%; }
    .shell-label { display:none; }
    .phone { background:none; border-radius:0; padding:0; box-shadow:none; }
    .screen-wrap { border-radius:0; height:100dvh; }
    .status { display:none; }
    .flowmap { display:none !important; }
  `;
  document.head.appendChild(s);
}
</script>
</body>
'@
    $template = $template.Replace('</body>', $mobileScript)

    # 6. preview.html 저장 (index.html은 소스 템플릿이므로 덮어쓰지 않음)
    #    Netlify는 _redirects 파일로 / → /preview.html 리다이렉트 처리
    [System.IO.File]::WriteAllText("$root\preview.html", $template, $enc)
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] preview.html rebuilt"
}

# -- Initial build
Write-Host "Building..."
Build-Preview

# -- FileSystemWatcher setup
# Detects Changed + Renamed + Created (VS Code saves via rename)
$watcher = New-Object System.IO.FileSystemWatcher($root)
$watcher.IncludeSubdirectories = $true
$watcher.Filter = "*.*"
$watcher.NotifyFilter = (
    [System.IO.NotifyFilters]::LastWrite -bor
    [System.IO.NotifyFilters]::FileName
)
$watcher.EnableRaisingEvents = $true

Write-Host "Watching -- auto-rebuild on .html/.css/.js save (Ctrl+C to stop)"
Write-Host ""

$lastBuild = [DateTime]::MinValue

while ($true) {
    $changed = $watcher.WaitForChanged(
        [System.IO.WatcherChangeTypes]::Changed -bor
        [System.IO.WatcherChangeTypes]::Created -bor
        [System.IO.WatcherChangeTypes]::Renamed,
        500
    )
    if ($changed.TimedOut) { continue }

    $name = if ($changed.Name) { $changed.Name } else { $changed.OldName }
    $ext = [System.IO.Path]::GetExtension($name).ToLower()
    if ($ext -notin @('.html', '.css', '.js')) { continue }

    # Skip build output to prevent infinite loop
    if ($name -eq 'preview.html') { continue }

    # Debounce: ignore duplicate events within 300ms
    $now = [DateTime]::Now
    if (($now - $lastBuild).TotalMilliseconds -lt 300) { continue }
    $lastBuild = $now

    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Changed: $name"

    # Wait for VS Code rename-save to complete
    Start-Sleep -Milliseconds 150
    Build-Preview
}
