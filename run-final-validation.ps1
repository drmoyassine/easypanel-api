$log = "final-validation.json"
$results = [System.Collections.Generic.List[object]]::new()

$base = "https://deploy.frontbase.dev/api/v1/projects/hello-world/services/app"
$h = @{
    "Authorization" = "Bearer Q9hT6wlFTDVAPoC1dTMO6XggJltqV70JU5WY4Pg87CozscC0510a2NBk0IEgKXoV"
    "Content-Type"  = "application/json"
}

function Req($label, $method, $uri, $body = $null) {
    $params = @{ Uri = $uri; Method = $method; Headers = $h; SkipHttpErrorCheck = $true }
    if ($body -ne $null) { $params.Body = ($body | ConvertTo-Json -Compress -Depth 10) }
    $r = Invoke-WebRequest @params
    $results.Add([pscustomobject]@{ label = $label; status = $r.StatusCode; body = $r.Content })
    return $r
}

function GetJson($uri) {
    return (Invoke-RestMethod -Uri $uri -Headers $h -Method GET)
}

# ── CLEANUP from probe: delete any leftover ports / mounts ───────
$ports = GetJson "$base/ports"
for ($i = $ports.Count - 1; $i -ge 0; $i--) {
    if ($ports[$i].published -in @(9091, 9093, 9094, 9095, 9096)) {
        Req "cleanup-port-$($ports[$i].published)" DELETE "$base/ports" @{index = $i } | Out-Null
    }
}
$mounts = GetJson "$base/mounts"
for ($i = $mounts.Count - 1; $i -ge 0; $i--) {
    if ($mounts[$i].name -in @("tv", "test-vol", "test-vol-debug", "test-vol-manual")) {
        Req "cleanup-mount-$($mounts[$i].name)" DELETE "$base/mounts" @{index = $i } | Out-Null
    }
}
$domains = GetJson "$base/domains"
$domains | Where-Object { $_.host -in @("api-test.com", "api-test-debug.com", "api-test-manual.com") } | ForEach-Object {
    Req "cleanup-domain-$($_.host)" DELETE "$base/domains" @{domainId = $_.id } | Out-Null
}

# ── DOMAINS ───────────────────────────────────────────────────────
Req "domain-list-initial"   GET    "$base/domains"
Req "domain-create"         POST   "$base/domains" @{host = "api-test.com"; port = 80; path = "/" }
$domainId = ((GetJson "$base/domains") | Where-Object { $_.host -eq "api-test.com" }).id
Req "domain-update"       PUT    "$base/domains" @{domainId = $domainId; https = $false }
Req "domain-delete"       DELETE "$base/domains" @{domainId = $domainId }
Req "domain-list-final"   GET    "$base/domains"

# ── PORTS ─────────────────────────────────────────────────────────
Req "port-list-initial"   GET    "$base/ports"
Req "port-create"         POST   "$base/ports" @{published = 9096; target = 80; protocol = "tcp" }
$portIdx = 0; $pts = GetJson "$base/ports"
for ($i = 0; $i -lt $pts.Count; $i++) { if ($pts[$i].published -eq 9096) { $portIdx = $i; break } }
Req "port-update"         PUT    "$base/ports" @{index = $portIdx; published = 9097; target = 80; protocol = "tcp" }
$portIdx = 0; $pts2 = GetJson "$base/ports"
for ($i = 0; $i -lt $pts2.Count; $i++) { if ($pts2[$i].published -eq 9097) { $portIdx = $i; break } }
Req "port-delete"         DELETE "$base/ports" @{index = $portIdx }
Req "port-list-final"     GET    "$base/ports"

# ── MOUNTS ────────────────────────────────────────────────────────
Req "mount-list-initial"  GET    "$base/mounts"
Req "mount-create"        POST   "$base/mounts" @{type = "volume"; name = "test-vol"; mountPath = "/data" }
$mntIdx = 0; $ms = GetJson "$base/mounts"
for ($i = 0; $i -lt $ms.Count; $i++) { if ($ms[$i].name -eq "test-vol") { $mntIdx = $i; break } }
Req "mount-update"        PUT    "$base/mounts" @{index = $mntIdx; type = "volume"; name = "test-vol"; mountPath = "/data-v2" }
$mntIdx = 0; $ms2 = GetJson "$base/mounts"
for ($i = 0; $i -lt $ms2.Count; $i++) { if ($ms2[$i].name -eq "test-vol") { $mntIdx = $i; break } }
Req "mount-delete"        DELETE "$base/mounts" @{index = $mntIdx }
Req "mount-list-final"    GET    "$base/mounts"

$results | ConvertTo-Json -Depth 10 | Set-Content $log -Encoding UTF8

