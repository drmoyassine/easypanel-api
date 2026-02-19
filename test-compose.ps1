$log = "compose-results.json"
$base = "https://deploy.frontbase.dev/api/v1/projects/hello-world/services/compose"
$svcUrl = "$base/test-compose"
$h = @{
    "Authorization" = "Bearer Q9hT6wlFTDVAPoC1dTMO6XggJltqV70JU5WY4Pg87CozscC0510a2NBk0IEgKXoV"
    "Content-Type"  = "application/json"
}
$results = [System.Collections.Generic.List[object]]::new()

function Req($label, $method, $uri, $body = $null) {
    $params = @{ Uri = $uri; Method = $method; Headers = $h; SkipHttpErrorCheck = $true; TimeoutSec = 30 }
    if ($null -ne $body) { $params.Body = ($body | ConvertTo-Json -Compress -Depth 10) }
    try {
        $r = Invoke-WebRequest @params
        $results.Add([pscustomobject]@{ label = $label; status = $r.StatusCode; body = $r.Content })
        return $r
    }
    catch {
        $results.Add([pscustomobject]@{ label = $label; status = "ERR"; body = $_.Exception.Message })
    }
}

# ── 0. CLEANUP: destroy test-compose if it exists from a previous run ──
Req "cleanup-destroy" DELETE $svcUrl | Out-Null
Start-Sleep -Seconds 2

# ── 1. CREATE ──────────────────────────────────────────────────────────
Req "create" POST "$base" @{
    projectName = "hello-world"
    serviceName = "test-compose"
}
Start-Sleep -Seconds 2

# ── 2. INSPECT ────────────────────────────────────────────────────────
Req "inspect" GET $svcUrl

# ── 3. SOURCE: inline (composeFile field — high risk) ─────────────────
$yaml = "version: '3.8'\nservices:\n  web:\n    image: nginx:alpine\n    ports:\n      - '80'"
Req "source-inline" PUT "$svcUrl/source/inline" @{ composeFile = $yaml }

# ── 4. SOURCE: git ────────────────────────────────────────────────────
Req "source-git" PUT "$svcUrl/source/git" @{
    repo = "https://github.com/docker/awesome-compose.git"
    ref  = "master"
    path = "/"
}

# ── 5. ENV ────────────────────────────────────────────────────────────
Req "env-update" PUT "$svcUrl/env" @{ env = "TEST_VAR=hello`nANOTHER=world" }

# ── 6. DEPLOY ─────────────────────────────────────────────────────────
Req "deploy" POST "$svcUrl/deploy"
Start-Sleep -Seconds 3

# ── 7. STOP ───────────────────────────────────────────────────────────
Req "stop" POST "$svcUrl/stop"

# ── 8. START ──────────────────────────────────────────────────────────
Req "start" POST "$svcUrl/start"

# ── 9. DESTROY (cleanup) ──────────────────────────────────────────────
Req "destroy" DELETE $svcUrl

# ── Save results ──────────────────────────────────────────────────────
$results | ConvertTo-Json -Depth 10 | Set-Content $log -Encoding UTF8
Write-Host "Done. Results in $log"
