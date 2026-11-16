#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_PID=""
FRONTEND_PID=""
SHUTTING_DOWN=0

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf '缺少命令：%s。请先安装后再重试。\n' "$1" >&2
    exit 1
  fi
}

terminate_tree() {
  local pid="$1"
  local child

  while IFS= read -r child; do
    [[ -n "$child" ]] && terminate_tree "$child"
  done < <(pgrep -P "$pid" 2>/dev/null || true)

  kill -TERM "$pid" 2>/dev/null || true
}

handle_signal() {
  exit 0
}

cleanup() {
  local exit_code=$?

  if [[ -z "$FRONTEND_PID" && -z "$BACKEND_PID" ]]; then
    return
  fi

  if [[ "$SHUTTING_DOWN" -eq 1 ]]; then
    return
  fi
  SHUTTING_DOWN=1
  trap - EXIT INT TERM

  printf '\n正在停止 MoGo 开发服务...\n'
  [[ -n "$FRONTEND_PID" ]] && terminate_tree "$FRONTEND_PID"
  [[ -n "$BACKEND_PID" ]] && terminate_tree "$BACKEND_PID"
  [[ -n "$FRONTEND_PID" ]] && wait "$FRONTEND_PID" 2>/dev/null || true
  [[ -n "$BACKEND_PID" ]] && wait "$BACKEND_PID" 2>/dev/null || true
  printf '前端和后端均已停止。\n'

  exit "$exit_code"
}

trap cleanup EXIT
trap handle_signal INT TERM

require_command npm
require_command mvn
require_command pgrep
require_command lsof

cd "$ROOT_DIR"

port_pid() {
  local pid
  pid="$(lsof -nP -tiTCP:"$1" -sTCP:LISTEN 2>/dev/null | head -n 1 || true)"
  printf '%s' "$pid"
}

process_summary() {
  local pid="$1"
  ps -p "$pid" -o command= 2>/dev/null | cut -c1-120
}

WEB_PID="$(port_pid 3000)"
API_PID="$(port_pid 8080)"

if [[ -n "$WEB_PID" && -n "$API_PID" ]]; then
  printf 'MoGo 已经在运行，无需重复启动。\n'
  printf '  Web：  http://localhost:3000（PID %s）\n' "$WEB_PID"
  printf '  API：  http://localhost:8080（PID %s）\n' "$API_PID"
  exit 0
fi

if [[ -n "$WEB_PID" ]]; then
  printf '无法启动：Web 端口 3000 已被占用。\n' >&2
  printf '  PID %s：%s\n' "$WEB_PID" "$(process_summary "$WEB_PID")" >&2
  printf '请先停止该进程，再重新运行 make dev-gui。\n' >&2
  exit 1
fi

if [[ -n "$API_PID" ]]; then
  printf '无法启动：API 端口 8080 已被占用。\n' >&2
  printf '  PID %s：%s\n' "$API_PID" "$(process_summary "$API_PID")" >&2
  printf '请先停止该进程，再重新运行 make dev-gui。\n' >&2
  exit 1
fi

if [[ ! -d node_modules ]]; then
  printf '首次启动，正在安装前端依赖...\n'
  npm install
fi

printf '正在启动 MoGo...\n'
printf '  Web：  http://localhost:3000\n'
printf '  API：  http://localhost:8080\n'
printf '按 Ctrl+C 可同时停止前端和后端。\n\n'

(
  cd "$ROOT_DIR/backend"
  exec mvn spring-boot:run
) &
BACKEND_PID=$!

(
  cd "$ROOT_DIR"
  exec npm run dev:web
) &
FRONTEND_PID=$!

while kill -0 "$BACKEND_PID" 2>/dev/null && kill -0 "$FRONTEND_PID" 2>/dev/null; do
  sleep 1
done

if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
  if wait "$BACKEND_PID"; then
    printf '后端服务已退出。\n' >&2
    exit 1
  else
    status=$?
    printf '后端服务异常退出，状态码：%s。\n' "$status" >&2
    exit "$status"
  fi
fi

if wait "$FRONTEND_PID"; then
  printf '前端服务已退出。\n' >&2
  exit 1
else
  status=$?
  printf '前端服务异常退出，状态码：%s。\n' "$status" >&2
  exit "$status"
fi
