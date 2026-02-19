$ErrorActionPreference = "Stop"
$base = "https://deploy.frontbase.dev/api/v1/projects/hello-world/services/app"
$h = @{ "Authorization" = "Bearer Q9hT6wlFTDVAPoC1dTMO6XggJltqV70JU5WY4Pg87CozscC0510a2NBk0IEgKXoV"; "Content-Type" = "application/json" }

function Test-Step ($name, $scriptBlock) {
    Write-Host "🔹 $name..." -NoNewline
    try {
        & $scriptBlock
        Write-Host " ✅ OK" -ForegroundColor Green
    }
    catch {
        Write-Host " ❌ FAILED" -ForegroundColor Red
        Write-Host "   Error: $_"
        exit 1
    }
}

Write-Host "=== Starting Resource Validation Suite ==="

# ─────────────────────────────────────────────────────────────────
# DOMAINS
# ─────────────────────────────────────────────────────────────────

Test-Step "Domains: List (Initial)" {
    $r = Invoke-RestMethod -Uri "$base/domains" -Method GET -Headers $h
    Write-Host " (Count: $($r.Count))" -NoNewline
}

Test-Step "Domains: Create" {
    $body = @{ host = "api-test.com"; port = 80; path = "/" } | ConvertTo-Json -Compress
    $r = Invoke-WebRequest -Uri "$base/domains" -Method POST -Headers $h -Body $body -SkipHttpErrorCheck
    if ($r.StatusCode -ne 201) { throw "Status $($r.StatusCode): $($r.Content)" }
}

Test-Step "Domains: List (Verify Create)" {
    $r = Invoke-RestMethod -Uri "$base/domains" -Method GET -Headers $h
    $global:domain = $r | Where-Object { $_.host -eq "api-test.com" }
    if (-not $domain) { throw "Domain not found after create" }
    Write-Host " (Found: $($domain.id))" -NoNewline
}

Test-Step "Domains: Update" {
    $body = @{ domainId = $domain.id; https = $false } | ConvertTo-Json -Compress
    $r = Invoke-WebRequest -Uri "$base/domains" -Method PUT -Headers $h -Body $body -SkipHttpErrorCheck
    if ($r.StatusCode -ne 200) { throw "Status $($r.StatusCode): $($r.Content)" }
}

Test-Step "Domains: Delete" {
    $body = @{ domainId = $domain.id } | ConvertTo-Json -Compress
    $r = Invoke-WebRequest -Uri "$base/domains" -Method DELETE -Headers $h -Body $body -SkipHttpErrorCheck
    if ($r.StatusCode -ne 200) { throw "Status $($r.StatusCode): $($r.Content)" }
}

# ─────────────────────────────────────────────────────────────────
# PORTS
# ─────────────────────────────────────────────────────────────────

Test-Step "Ports: List (Initial)" {
    $r = Invoke-RestMethod -Uri "$base/ports" -Method GET -Headers $h
    Write-Host " (Count: $($r.Count))" -NoNewline
}

Test-Step "Ports: Create (9090->80)" {
    $body = @{ published = 9090; target = 80; protocol = "tcp" } | ConvertTo-Json -Compress
    $r = Invoke-WebRequest -Uri "$base/ports" -Method POST -Headers $h -Body $body -SkipHttpErrorCheck
    if ($r.StatusCode -ne 201) { throw "Status $($r.StatusCode): $($r.Content)" }
}

Test-Step "Ports: List (Verify Create)" {
    $r = Invoke-RestMethod -Uri "$base/ports" -Method GET -Headers $h
    $global:port = $r | Where-Object { $_.published -eq 9090 }
    if (-not $port) { throw "Port not found after create" }
}

Test-Step "Ports: Update (9091->80)" {
    $r = Invoke-RestMethod -Uri "$base/ports" -Method GET -Headers $h
    $index = 0
    # Find index of port 9090
    $found = $false
    for ($i = 0; $i -lt $r.Count; $i++) { if ($r[$i].published -eq 9090) { $index = $i; $found = $true; break } }
    if (-not $found) { throw "Port 9090 not found for update" }
    
    $body = @{ index = $index; published = 9091; target = 80; protocol = "tcp" } | ConvertTo-Json -Compress
    $r = Invoke-WebRequest -Uri "$base/ports" -Method PUT -Headers $h -Body $body -SkipHttpErrorCheck
    if ($r.StatusCode -ne 200) { throw "Status $($r.StatusCode): $($r.Content)" }
}

Test-Step "Ports: Delete" {
    $r = Invoke-RestMethod -Uri "$base/ports" -Method GET -Headers $h
    # Find index of port 9091
    $index = 0
    $found = $false
    for ($i = 0; $i -lt $r.Count; $i++) { if ($r[$i].published -eq 9091) { $index = $i; $found = $true; break } }
    if (-not $found) { throw "Port 9091 not found for delete" }

    $body = @{ index = $index } | ConvertTo-Json -Compress
    $r = Invoke-WebRequest -Uri "$base/ports" -Method DELETE -Headers $h -Body $body -SkipHttpErrorCheck
    if ($r.StatusCode -ne 200) { throw "Status $($r.StatusCode): $($r.Content)" }
}

# ─────────────────────────────────────────────────────────────────
# MOUNTS
# ─────────────────────────────────────────────────────────────────

Test-Step "Mounts: List (Initial)" {
    $r = Invoke-RestMethod -Uri "$base/mounts" -Method GET -Headers $h
    Write-Host " (Count: $($r.Count))" -NoNewline
}

Test-Step "Mounts: Create (test-vol)" {
    $body = @{ type = "volume"; name = "test-vol"; mountPath = "/data" } | ConvertTo-Json -Compress
    $r = Invoke-WebRequest -Uri "$base/mounts" -Method POST -Headers $h -Body $body -SkipHttpErrorCheck
    if ($r.StatusCode -ne 201) { throw "Status $($r.StatusCode): $($r.Content)" }
}

Test-Step "Mounts: List (Verify Create)" {
    $r = Invoke-RestMethod -Uri "$base/mounts" -Method GET -Headers $h
    $global:mount = $r | Where-Object { $_.name -eq "test-vol" }
    if (-not $mount) { throw "Mount not found after create" }
}

Test-Step "Mounts: Update" {
    $r = Invoke-RestMethod -Uri "$base/mounts" -Method GET -Headers $h
    $index = 0
    $found = $false
    for ($i = 0; $i -lt $r.Count; $i++) { if ($r[$i].name -eq "test-vol") { $index = $i; $found = $true; break } }
    if (-not $found) { throw "Mount test-vol not found for update" }

    $body = @{ index = $index; type = "volume"; name = "test-vol"; mountPath = "/data-updated" } | ConvertTo-Json -Compress
    $r = Invoke-WebRequest -Uri "$base/mounts" -Method PUT -Headers $h -Body $body -SkipHttpErrorCheck
    if ($r.StatusCode -ne 200) { throw "Status $($r.StatusCode): $($r.Content)" }
}

Test-Step "Mounts: Delete" {
    $r = Invoke-RestMethod -Uri "$base/mounts" -Method GET -Headers $h
    $index = 0
    $found = $false
    for ($i = 0; $i -lt $r.Count; $i++) { if ($r[$i].name -eq "test-vol") { $index = $i; $found = $true; break } }
    if (-not $found) { throw "Mount test-vol not found for delete" }

    $body = @{ index = $index } | ConvertTo-Json -Compress
    $r = Invoke-WebRequest -Uri "$base/mounts" -Method DELETE -Headers $h -Body $body -SkipHttpErrorCheck
    if ($r.StatusCode -ne 200) { throw "Status $($r.StatusCode): $($r.Content)" }
}

Write-Host "✅ Resource Validation Suite Completed Successfully!" -ForegroundColor Green
