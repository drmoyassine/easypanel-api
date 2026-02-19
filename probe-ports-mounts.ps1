$log = "probe-output.json"
$results = [System.Collections.Generic.List[object]]::new()

$base = "https://deploy.frontbase.dev/api/v1/projects/hello-world/services/app"
$h = @{
    "Authorization" = "Bearer Q9hT6wlFTDVAPoC1dTMO6XggJltqV70JU5WY4Pg87CozscC0510a2NBk0IEgKXoV"
    "Content-Type"  = "application/json"
}

function Probe($label, $method, $uri, $body = $null) {
    $params = @{ Uri = $uri; Method = $method; Headers = $h; SkipHttpErrorCheck = $true }
    if ($body) { $params.Body = $body | ConvertTo-Json -Compress -Depth 10 }
    $r = Invoke-WebRequest @params
    $results.Add([pscustomobject]@{
            label  = $label
            status = $r.StatusCode
            body   = $r.Content
        })
}

# ── What does createPort's schema actually expect? ──────────────
Probe "port - no values key"   POST "$base/ports" @{ published = 9091; target = 80; protocol = "tcp" }
Probe "port - values as array" POST "$base/ports" @{ values = @(@{ published = 9091; target = 80; protocol = "tcp" }) }
Probe "port - values as obj"   POST "$base/ports" @{ values = @{ published = 9091; target = 80; protocol = "tcp" } }
Probe "port - values obj+id"   POST "$base/ports" @{ values = @{ id = "abc123"; published = 9091; target = 80; protocol = "tcp" } }

# ── What does createMount expect? ──────────────────────────────
Probe "mount - no values key"   POST "$base/mounts" @{ type = "volume"; name = "tv"; mountPath = "/data" }
Probe "mount - values as array" POST "$base/mounts" @{ values = @(@{ type = "volume"; name = "tv"; mountPath = "/data" }) }
Probe "mount - values as obj"   POST "$base/mounts" @{ values = @{ type = "volume"; name = "tv"; mountPath = "/data" } }

# ── Write results to file and dump ─────────────────────────────
$results | ConvertTo-Json -Depth 10 | Set-Content $log -Encoding UTF8
Write-Host "=== PROBE RESULTS ==="
$results | ForEach-Object {
    Write-Host "[$($_.label)] => $($_.status)"
    Write-Host "  $($_.body)"
    Write-Host ""
}
