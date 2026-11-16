# MoGo

以 React Native 手机端为最终目标的个人手机百宝箱。当前 Web 端主要用于调试共享业务逻辑和后端接口。

## 目录

- `fronted/`：React、Tailwind CSS、i18next 和 Rsbuild Web 调试端，首页按功能列表组织
- `shared/finance-core/`：Web 与未来 React Native 共用的领域逻辑、API 客户端和业务文案
- `shared/finance-react/`：Web 与未来 React Native 共用的 React Hook 和页面状态
- `backend/`：JDK 17、Spring Boot、Maven 和 SQLite 后端
- `docs/frontend-architecture.md`：前端跨平台复用边界和开发规则
- 全局支持中文和英文以及明暗主题，可在页面右上角切换；Web 会保存上次选择的语言和主题
- 百宝箱第一项为个人财务管理，内置正餐、通勤、随心吃和其他分类，也支持新增自定义消费分类

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

该命令会同时启动 Spring Boot 后端和 Web 前端；首次运行时会自动安装 npm 依赖。按 `Ctrl+C` 会同时停止两个服务。

- Web：`http://localhost:3000`
- API：`http://localhost:8080`

SQLite 数据库默认保存在 `backend/data/mogo.db`。

如需分别启动，也可以运行：

```bash
mvn -f backend/pom.xml spring-boot:run
npm run dev:web
```

## 验证

```bash
cd backend && mvn test
cd .. && npm run check
```

`npm run check` 会运行共享业务逻辑测试并构建 Web 前端。

## 许可证

本项目采用 [MIT 许可证](LICENSE)。
