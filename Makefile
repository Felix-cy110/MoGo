SHELL := /bin/bash

.PHONY: help backend-configure backend-build backend-test dev-gui check

help:
	@printf '%s\n' \
	  'MoGo 可用命令：' \
	  '  make dev-gui           同时启动 Web 前端和 C++ 后端' \
	  '  make backend-build     配置并编译 C++ 后端' \
	  '  make backend-test      运行 C++ 后端测试' \
	  '  make check             运行前端检查、后端构建和测试'

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
