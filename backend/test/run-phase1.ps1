$ErrorActionPreference = 'Stop'

$backendDirectory = Split-Path -Parent $PSScriptRoot
$composeFile = Join-Path $backendDirectory 'compose.test.yaml'
$databaseUrl = 'postgresql://linebooking:linebooking_test_only@127.0.0.1:54231/linebooking_test?schema=public'
$redisUrl = 'redis://127.0.0.1:54232'
$locationPushed = $false

try {
  docker compose -f $composeFile up -d --wait

  Push-Location $backendDirectory
  $locationPushed = $true
  $env:DATABASE_URL = $databaseUrl
  $env:TEST_DATABASE_URL = $databaseUrl
  $env:TEST_DATABASE_ACKNOWLEDGED = 'true'
  $env:REDIS_URL = $redisUrl
  $env:NODE_ENV = 'test'

  npx prisma db push
  if ($LASTEXITCODE -ne 0) { throw 'Prisma test schema setup failed' }

  npm test -- --runInBand
  if ($LASTEXITCODE -ne 0) { throw 'Backend unit tests failed' }

  npm run test:e2e -- --runInBand
  if ($LASTEXITCODE -ne 0) { throw 'Backend E2E tests failed' }

  # The integration suite uses TEST_DATABASE_URL directly. Keep DATABASE_URL
  # distinct so its production-database safety gate remains effective.
  $env:DATABASE_URL = 'postgresql://production-sentinel:invalid@127.0.0.1:1/production'
  npm run test:integration -- --runInBand
  if ($LASTEXITCODE -ne 0) { throw 'Backend concurrency tests failed' }
}
finally {
  if ($locationPushed) {
    Pop-Location
  }
  docker compose -f $composeFile down --volumes
}
