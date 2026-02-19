$log = "db-audit-results.json"
$base = "https://deploy.frontbase.dev/api/v1/projects/hello-world/services"
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

# ══════════════════════════════════════════════════════════════════
# POSTGRES — full 8-operation sweep
# ══════════════════════════════════════════════════════════════════
Write-Host "`n=== POSTGRES: Full sweep ==="
$pg = "$base/postgres/test-pg-audit"

Req "pg-cleanup" DELETE $pg | Out-Null; Start-Sleep -s 2

# 1. create
Req "pg-create" POST "$base/postgres" @{
    projectName = "hello-world"
    serviceName = "test-pg-audit"
    password    = "TestPass123"
}
Start-Sleep -s 3

# 2. inspect
Req "pg-inspect" GET $pg

# 3. credentials
Req "pg-credentials" PUT "$pg/credentials" @{ password = "NewPass456" }

# 4. resources
Req "pg-resources" PUT "$pg/resources" @{ memoryLimit = 512; cpuLimit = 0.5 }

# 5. expose (port 5432)
Req "pg-expose" POST "$pg/expose" @{ ports = @(5432) }

# 6. disable
Req "pg-disable" POST "$pg/disable"
Start-Sleep -s 2

# 7. enable
Req "pg-enable" POST "$pg/enable"
Start-Sleep -s 2

# 8. destroy
Req "pg-destroy" DELETE $pg

# ══════════════════════════════════════════════════════════════════
# REDIS — spot check (create + destroy)
# ══════════════════════════════════════════════════════════════════
Write-Host "`n=== REDIS: Spot check ==="
$rd = "$base/redis/test-redis-audit"
Req "redis-cleanup" DELETE $rd | Out-Null; Start-Sleep -s 2
Req "redis-create" POST "$base/redis" @{ projectName = "hello-world"; serviceName = "test-redis-audit" }
Start-Sleep -s 2
Req "redis-inspect" GET $rd
Req "redis-disable" POST "$rd/disable"
Start-Sleep -s 1
Req "redis-destroy" DELETE $rd

# ══════════════════════════════════════════════════════════════════
# MYSQL — spot check (create + credentials + destroy)
# ══════════════════════════════════════════════════════════════════
Write-Host "`n=== MYSQL: Spot check ==="
$my = "$base/mysql/test-mysql-audit"
Req "mysql-cleanup" DELETE $my | Out-Null; Start-Sleep -s 2
Req "mysql-create" POST "$base/mysql" @{
    projectName = "hello-world"
    serviceName = "test-mysql-audit"
    password    = "TestPass123"
}
Start-Sleep -s 2
Req "mysql-credentials" PUT "$my/credentials" @{ password = "New123"; rootPassword = "Root123" }
Req "mysql-destroy" DELETE $my

# Save
$results | ConvertTo-Json -Depth 10 | Set-Content $log -Encoding UTF8
Write-Host "`nDone. Results in $log"
