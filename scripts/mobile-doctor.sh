#!/usr/bin/env bash
set -euo pipefail
platform="${1:-all}"
case "$platform" in ios|android|all) ;; *) echo '用法：mobile-doctor.sh [ios|android|all]' >&2; exit 2;; esac
missing=0
check() {
  if ! command -v "$1" >/dev/null 2>&1; then printf '缺少 %s：%s\n' "$1" "$2"; missing=1; fi
}
check node '需要 Node 22.13+ 或 24.3+'
check npm '请先安装 Node/npm，然后在仓库根目录运行 npm ci'
if [[ "$platform" == ios || "$platform" == all ]]; then
  if ! xcodebuild -version >/dev/null 2>&1; then
    echo 'iOS：需要完整 Xcode；仅 Command Line Tools 不足以构建 RN 应用。'; missing=1
  fi
  check bundle '安装 Ruby Bundler，在 fronted/apps/mobile 运行 bundle install'
  root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
  if ! (cd "$root/fronted/apps/mobile" && bundle exec pod --version >/dev/null 2>&1); then
    echo 'iOS：CocoaPods 不可用，请参考 docs/mobile-development.md。'; missing=1
  fi
fi
if [[ "$platform" == android || "$platform" == all ]]; then
  check java '安装 JDK 17'
  sdk="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/Library/Android/sdk}}"
  if [[ ! -d "$sdk/platforms" || ! -x "$sdk/platform-tools/adb" ]]; then
    echo 'Android：请安装 Android SDK（API 37、Build Tools 37.0.0）、NDK 27.1.12297006、CMake 3.22.1，并设置 ANDROID_HOME。'; missing=1
  fi
fi
if [[ "$missing" == 0 ]]; then echo '移动端环境基本检查通过；仍需启动模拟器或连接真机。'; fi
exit "$missing"
