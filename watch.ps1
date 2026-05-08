[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
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

    # 6. preview.html 저장
    [System.IO.File]::WriteAllText("$root\preview.html", $template, $enc)
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] preview.html 재생성 완료"
}

# ── 초기 빌드 ─────────────────────────────────────────────────
Write-Host "초기 빌드 중..."
Build-Preview

# ── FileSystemWatcher 설정 ────────────────────────────────────
# Changed + Renamed + Created 모두 감지 (VS Code는 rename 방식으로 저장)
$watcher = New-Object System.IO.FileSystemWatcher($root)
$watcher.IncludeSubdirectories = $true
$watcher.Filter = "*.*"
$watcher.NotifyFilter = (
    [System.IO.NotifyFilters]::LastWrite -bor
    [System.IO.NotifyFilters]::FileName
)
$watcher.EnableRaisingEvents = $true

Write-Host "감시 중 — .html/.css/.js 저장 시 자동 재빌드 (Ctrl+C로 종료)"
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

    # preview.html 자체가 변경되면 무시 (무한루프 방지)
    if ($name -eq 'preview.html') { continue }

    # 디바운스: 300ms 이내 중복 이벤트 무시
    $now = [DateTime]::Now
    if (($now - $lastBuild).TotalMilliseconds -lt 300) { continue }
    $lastBuild = $now

    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] 변경 감지: $name"

    # VS Code rename 저장이 완전히 끝날 때까지 대기
    Start-Sleep -Milliseconds 150
    Build-Preview
}
