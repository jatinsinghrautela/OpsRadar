param([switch]$Release, [switch]$AllowHttp, [switch]$SkipOptimization, [ValidateSet('arm64-v8a','armeabi-v7a','x86_64','x86')][string]$Architecture='arm64-v8a')
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot
if (-not $env:ANDROID_HOME) {
  $standardSdk=Join-Path $env:LOCALAPPDATA 'Android\Sdk'
  if (Test-Path -LiteralPath $standardSdk) { $env:ANDROID_HOME=$standardSdk }
  elseif (Test-Path -LiteralPath 'D:\Android\Sdk') { $env:ANDROID_HOME='D:\Android\Sdk' }
  else { throw 'Set ANDROID_HOME to your installed Android SDK directory.' }
}
$env:GRADLE_USER_HOME = Join-Path $projectRoot '..\.cache\gradle'
$env:TEMP = Join-Path $projectRoot '..\.cache\tmp'
$env:TMP = $env:TEMP
$env:npm_config_cache = Join-Path $projectRoot '..\.cache\npm'
$env:ANDROID_USER_HOME = Join-Path $projectRoot '..\.cache\android'
New-Item -ItemType Directory -Force $env:TEMP, $env:GRADLE_USER_HOME, $env:ANDROID_USER_HOME | Out-Null
$env:OPSRADAR_ALLOW_HTTP = if ($AllowHttp) { 'true' } else { 'false' }
npx.cmd expo prebuild --platform android --no-install
if ($LASTEXITCODE -ne 0) { throw 'Android prebuild failed' }
Set-Location android
$buildOptions=@('--no-daemon','--max-workers=2',"-PreactNativeArchitectures=$Architecture")
if ($SkipOptimization) { $buildOptions+=@('-Pandroid.enableMinifyInReleaseBuilds=false','-Pandroid.enableShrinkResourcesInReleaseBuilds=false') }
if ($Release) {
  if (-not $env:OPSRADAR_KEYSTORE_FILE -or -not $env:OPSRADAR_KEY_ALIAS -or -not $env:OPSRADAR_KEYSTORE_PASSWORD -or -not $env:OPSRADAR_KEY_PASSWORD) {
    throw 'Release requires your private OPSRADAR_KEYSTORE_FILE, OPSRADAR_KEY_ALIAS, OPSRADAR_KEYSTORE_PASSWORD and OPSRADAR_KEY_PASSWORD. Never commit these values.'
  }
  .\gradlew.bat assembleRelease @buildOptions
  if ($LASTEXITCODE -ne 0) { throw 'Signed release APK build failed' }
  Write-Output (Join-Path (Get-Location) 'app\build\outputs\apk\release\app-release.apk')
} else {
  .\gradlew.bat assembleDebug @buildOptions
  if ($LASTEXITCODE -ne 0) { throw 'Android APK build failed' }
  Write-Output (Join-Path (Get-Location) 'app\build\outputs\apk\debug\app-debug.apk')
}
