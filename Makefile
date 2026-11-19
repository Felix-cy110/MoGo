SHELL := /bin/bash

.PHONY: help backend-configure backend-build backend-test dev-gui check

help:
	@printf '%s\n' \
	  'MoGo 可用命令：' \
	  '  make dev-gui           同时启动 Web 前端和 C++ 后端' \
	  '  make backend-build     配置并编译 C++ 后端' \
	  '  make backend-test      运行 C++ 后端测试' \
	  '  make check             运行前端检查、后端构建和测试' \
	  '  make dev-mobile        启动 RN Metro（无需启动 HTTP 后端）' \
	  '  make mobile-ios        启动 iOS 应用' \
	  '  make mobile-android    启动 Android 应用' \
	  '  make mobile-check      检查 RN 代码和页面测试' \
	  '  make mobile-core-test  验证原生离线核心' \
	  '  make mobile-doctor     检查原生开发环境'

backend-configure:
	@cmake --preset dev -S backend

backend-build: backend-configure
	@cmake --build backend/build/dev --parallel

backend-test: backend-build
	@ctest --test-dir backend/build/dev --output-on-failure

dev-gui:
	@./scripts/dev-gui.sh

check:
	@npm run check
	@$(MAKE) backend-test

.PHONY: dev-mobile mobile-android mobile-ios mobile-check mobile-core-test mobile-doctor

dev-mobile:
	@npm run dev:mobile

mobile-android:
	@./scripts/mobile-doctor.sh android
	@npm run android

mobile-ios:
	@./scripts/mobile-doctor.sh ios
	@npm run ios

mobile-check:
	@npm run check:mobile

mobile-core-test:
	@cmake -S backend -B backend/build/native -DMOGO_ENABLE_HTTP=OFF -DMOGO_ENABLE_NATIVE=ON -DMOGO_BUILD_TESTS=ON
	@cmake --build backend/build/native --parallel
	@ctest --test-dir backend/build/native --output-on-failure

mobile-doctor:
	@./scripts/mobile-doctor.sh
