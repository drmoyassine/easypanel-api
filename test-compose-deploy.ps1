$log = "compose-deploy-results.json"
$base = "https://deploy.frontbase.dev/api/v1/projects/hello-world/services/compose"
$h = @{
    "Authorization" = "Bearer Q9hT6wlFTDVAPoC1dTMO6XggJltqV70JU5WY4Pg87CozscC0510a2NBk0IEgKXoV"
    "Content-Type"  = "application/json"
}
$results = [System.Collections.Generic.List[object]]::new()

function Req($label, $method, $uri, $body = $null) {
    $params = @{ Uri = $uri; Method = $method; Headers = $h; SkipHttpErrorCheck = $true; TimeoutSec = 60 }
    if ($null -ne $body) { $params.Body = ($body | ConvertTo-Json -Compress -Depth 10) }
    try {
        $r = Invoke-WebRequest @params
        $results.Add([pscustomobject]@{ label = $label; status = $r.StatusCode; body = $r.Content })
        Write-Host "[$label] $($r.StatusCode)"
        return $r
    }
    catch {
        $results.Add([pscustomobject]@{ label = $label; status = "ERR"; body = $_.Exception.Message })
        Write-Host "[$label] ERR: $($_.Exception.Message)"
    }
}

# ══════════════════════════════════════════════════════════
# TEST A: Git source deploy (drmoyassine/frontbase-dbsync)
# ══════════════════════════════════════════════════════════
Write-Host "`n=== TEST A: Git source deploy ==="
$svcA = "$base/test-git-deploy"

# Cleanup
Req "A-cleanup" DELETE $svcA | Out-Null; Start-Sleep -s 2

# 1. Create
Req "A-create" POST "$base" @{ projectName = "hello-world"; serviceName = "test-git-deploy" }
Start-Sleep -s 2

# 2. Set git source
Req "A-source-git" PUT "$svcA/source/git" @{
    repo        = "https://github.com/drmoyassine/frontbase-dbsync.git"
    ref         = "main"
    rootPath    = "/"
    composeFile = "docker-compose.yml"
}

# 3. Deploy (may take a while — git clone + docker build)
Write-Host "[A-deploy] Triggering deploy (git clone + docker build - may take 2-5 min)..."
Req "A-deploy" POST "$svcA/deploy"

# 4. Cleanup
Start-Sleep -s 3
Req "A-destroy" DELETE $svcA | Out-Null

# ══════════════════════════════════════════════════════════
# TEST B: Inline content deploy (pre-built nginx image — guaranteed pull)
# ══════════════════════════════════════════════════════════
Write-Host "`n=== TEST B: Inline content (nginx:alpine) deploy ==="
$svcB = "$base/test-inline-deploy"

# Inline compose using ONLY pre-built public images (no build step)
$inlineYaml = @"
services:
  web:
    image: nginx:alpine
    restart: unless-stopped
"@

# Cleanup
Req "B-cleanup" DELETE $svcB | Out-Null; Start-Sleep -s 2

# 1. Create
Req "B-create" POST "$base" @{ projectName = "hello-world"; serviceName = "test-inline-deploy" }
Start-Sleep -s 2

# 2. Set inline source
Req "B-source-inline" PUT "$svcB/source/inline" @{ content = $inlineYaml }

# 3. Deploy (docker pull + run — fast)
Write-Host "[B-deploy] Triggering deploy (docker pull nginx:alpine)..."
Req "B-deploy" POST "$svcB/deploy"

# 4. Cleanup
Start-Sleep -s 3
Req "B-destroy" DELETE $svcB | Out-Null

# Save
$results | ConvertTo-Json -Depth 10 | Set-Content $log -Encoding UTF8
Write-Host "`nDone. Results in $log"
