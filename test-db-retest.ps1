$h = @{ "Authorization" = "Bearer Q9hT6wlFTDVAPoC1dTMO6XggJltqV70JU5WY4Pg87CozscC0510a2NBk0IEgKXoV"; "Content-Type" = "application/json" }
$base = "https://deploy.frontbase.dev/api/v1/projects/hello-world/services"
$pg = "$base/postgres/test-pg4"
$out = [System.Collections.Generic.List[string]]::new()

# cleanup + create
Invoke-WebRequest $pg -Method DELETE -Headers $h -SkipHttpErrorCheck | Out-Null
Start-Sleep -Seconds 2
$c = Invoke-WebRequest "$base/postgres" -Method POST -Headers $h -Body '{"projectName":"hello-world","serviceName":"test-pg4","password":"TestPass123"}' -SkipHttpErrorCheck
$out.Add("create: $($c.StatusCode)")

# Wait for Postgres healthcheck to pass (Docker starts postgres, runs healthcheck)
Write-Host "Waiting 40s for postgres container to be healthy..."
Start-Sleep -Seconds 40

# expose with fixed schema (exposedPort: number)
$r1 = Invoke-WebRequest "$pg/expose" -Method POST -Headers $h -Body '{"exposedPort":15432}' -SkipHttpErrorCheck -TimeoutSec 20
$out.Add("expose: $($r1.StatusCode) $($r1.Content)")

# credentials with running DB
$r2 = Invoke-WebRequest "$pg/credentials" -Method PUT -Headers $h -Body '{"password":"NewPass789"}' -SkipHttpErrorCheck -TimeoutSec 20
$out.Add("credentials: $($r2.StatusCode) $($r2.Content)")

# destroy
Invoke-WebRequest $pg -Method DELETE -Headers $h -SkipHttpErrorCheck | Out-Null
$out.Add("destroy: done")

$out | Set-Content db-retest.txt -Encoding UTF8
Get-Content db-retest.txt
