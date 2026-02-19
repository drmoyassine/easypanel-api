$log = "app-audit-results.json"
$base = "https://deploy.frontbase.dev/api/v1/projects/hello-world/services/app"
$svc = "$base/test-app-audit"
$h = @{
    "Authorization" = "Bearer Q9hT6wlFTDVAPoC1dTMO6XggJltqV70JU5WY4Pg87CozscC0510a2NBk0IEgKXoV"
    "Content-Type"  = "application/json"
}
$results = [System.Collections.Generic.List[object]]::new()

function Req($label, $method, $uri, $body = $null, $timeout = 30) {
    $params = @{ Uri = $uri; Method = $method; Headers = $h; SkipHttpErrorCheck = $true; TimeoutSec = $timeout }
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

# ── CLEANUP (in case of previous leftover) ──
Req "cleanup" DELETE $svc | Out-Null; Start-Sleep -s 2

# ── 1. CREATE ────────────────────────────────────────────────────────
Req "create" POST "$base" @{ projectName = "hello-world"; serviceName = "test-app-audit" }
Start-Sleep -s 2

# ── 2. INSPECT ──────────────────────────────────────────────────────
Req "inspect" GET $svc

# ── 3. SOURCE: image (simplest — pre-built image) ───────────────────
Req "source-image" PUT "$svc/source/image" @{ image = "nginx:alpine" }

# ── 4. SOURCE: dockerfile (inline) ──────────────────────────────────
$df = "FROM nginx:alpine`nEXPOSE 80"
Req "source-dockerfile" PUT "$svc/source/dockerfile" @{ dockerfile = $df }

# ── 5. SOURCE: git ───────────────────────────────────────────────────
Req "source-git" PUT "$svc/source/git" @{
    repo = "https://github.com/drmoyassine/easypanel-api.git"
    ref  = "master"
    path = "/"
}

# ── 6. SOURCE: github ───────────────────────────────────────────────
Req "source-github" PUT "$svc/source/github" @{
    owner      = "drmoyassine"
    repo       = "easypanel-api"
    ref        = "master"
    path       = "/"
    autoDeploy = $false
}

# ── 7. BUILD config ──────────────────────────────────────────────────
Req "build-update" PUT "$svc/build" @{ type = "dockerfile" }

# ── 8. DEPLOY CONFIG ─────────────────────────────────────────────────
Req "deploy-config" PUT "$svc/deploy-config" @{ replicas = 1; zeroDowntime = $true }

# ── 9. ENV ───────────────────────────────────────────────────────────
Req "env-update" PUT "$svc/env" @{ env = "APP_ENV=staging`nDEBUG=false" }

# ── 10. RESOURCES ────────────────────────────────────────────────────
Req "resources-update" PUT "$svc/resources" @{ memoryLimit = 256; cpuLimit = 0.5 }

# ── 11. Source back to image for a deployable state ──────────────────
Req "source-image-2" PUT "$svc/source/image" @{ image = "nginx:alpine" }

# ── 12. DEPLOY (using image so it's fast) ────────────────────────────
Write-Host "[deploy] Triggering deploy (nginx:alpine - should be fast)..."
Req "deploy" POST "$svc/deploy" $null 90

# ── 13. STOP ─────────────────────────────────────────────────────────
Start-Sleep -s 3
Req "stop" POST "$svc/stop"

# ── 14. START ────────────────────────────────────────────────────────
Start-Sleep -s 2
Req "start" POST "$svc/start"

# ── 15. RESTART ──────────────────────────────────────────────────────
Start-Sleep -s 2
Req "restart" POST "$svc/restart"

# ── 16. DESTROY ──────────────────────────────────────────────────────
Start-Sleep -s 2
Req "destroy" DELETE $svc

# ── Save ─────────────────────────────────────────────────────────────
$results | ConvertTo-Json -Depth 10 | Set-Content $log -Encoding UTF8
Write-Host "`nDone. Results in $log"
