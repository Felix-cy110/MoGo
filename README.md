# MoGo

以 React Native 手机端为最终目标的个人手机百宝箱。当前 Web 端主要用于调试共享业务逻辑和后端接口。

## 目录

- `fronted/apps/web/`：React、Tailwind CSS、i18next 和 Rsbuild Web 调试端，首页按功能列表组织
- 未来 `fronted/apps/mobile/`：React Native 手机端应用
- `fronted/core-shared/core/`：无领域依赖的跨端公共能力
- `fronted/features/personal-finance/core/`：Web 与未来 React Native 共用的领域逻辑、API 客户端和业务文案
- `fronted/features/personal-finance/react/`：Web 与未来 React Native 共用的 React Hook 和页面状态
- `fronted/features/user-profile/`：跨端复用的用户资料模型、校验、文案及 Hook
- `backend/core_shared/`：跨功能共享的 C++ 基础能力
- `backend/features/personal_finance/`：个人财务领域、应用和 SQLite 适配器
- `backend/features/user_profile/`：单用户资料领域、应用和 JSON 文件适配器
- `backend/transports/http/`：供 Web 调试使用的 libhv HTTP 适配器
- `backend/platforms/desktop/`：桌面开发进程入口
- `backend/`：C++20、CMake、libhv 和 SQLite 后端工程
- `docs/frontend-architecture.md`：前端跨平台复用边界和开发规则
- `docs/backend-architecture.md`：后端模块、依赖方向和按需编译规则
- `docs/backend-api-contract.md`：个人财务与用户资料 HTTP 接口契约
- 全局支持中文和英文以及明暗主题，可在页面右上角切换；Web 会保存上次选择的语言和主题
- 百宝箱第一项为个人财务管理，内置正餐、通勤、随心吃和其他分类；分类管理页支持新增、模糊搜索、编辑和软删除，删除后历史消费仍保留原分类名称；消费分析页支持周度和月度趋势
- 首页用户图标进入个人资料页，姓名、性别、年龄、国家、职业和月收入均为选填，可留空或清空后保存，无需登录；月收入以人民币元输入并使用整数分持久化

## 安装依赖

在仓库根目录统一安装 npm workspace 依赖：

```bash
npm install
```

## 启动

在仓库根目录运行：

```bash
make dev-gui
```

该命令会增量编译 C++ 后端，并同时启动 libhv 后端和 Web 前端；首次运行时会自动安装 npm 依赖及下载固定版本的 libhv、nlohmann/json 源码。按 `Ctrl+C` 会同时停止两个服务。重复执行时，如果 3000 和 8080 上已有 MoGo 服务，会直接提示服务已运行；代码更新后需先停止旧服务再重新启动。

- Web：`http://localhost:3000`
- API：`http://localhost:8080`

财务 SQLite 数据库默认保存在 `backend/data/mogo.db`。用户资料独立保存在 `backend/data/user-profile.json`，只有主动保存才创建文件；本地明文保存，不进入 Git，不写入 SQLite。

如需分别启动，也可以运行：

```bash
make backend-build
backend/build/dev/bin/mogo_backend --database backend/data/mogo.db --profile backend/data/user-profile.json
npm run dev:web
```

只编译未来手机端需要的 C++ 核心，不包含 HTTP 适配器：

```bash
cmake --preset mobile-core -S backend
cmake --build backend/build/mobile-core --parallel
```

## 验证

```bash
make check
```

`make check` 会运行共享前端逻辑测试、构建 Web，并编译和测试 C++ 后端。

## 许可证

本项目采用 [MIT 许可证](LICENSE)。
