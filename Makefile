SHELL := /bin/bash

.PHONY: help dev-gui check

help:
	@printf '%s\n' \
	  'MoGo 可用命令：' \
	  '  make dev-gui  同时启动 Web 前端和 Spring Boot 后端' \
	  '  make check    运行共享测试、Web 构建和后端测试'

dev-gui:
	@./scripts/dev-gui.sh

check:
	@npm run check
	@mvn -f backend/pom.xml test
