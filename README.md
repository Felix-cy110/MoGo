# MoGo

个人财务管理系统，当前提供无登录的本机 Web 版本。

## 目录

- `fronted/`：React、Tailwind CSS、i18next 和 Rsbuild Web 前端
- `shared/finance-core/`：Web 与未来 React Native 共用的领域逻辑、API 客户端和业务文案
- `shared/finance-react/`：Web 与未来 React Native 共用的 React Hook 和页面状态
- `backend/`：JDK 17、Spring Boot、Maven 和 SQLite 后端
- `docs/frontend-architecture.md`：前端跨平台复用边界和开发规则

## 安装依赖

在仓库根目录统一安装 npm workspace 依赖：

```bash
npm install
```

## 启动

先在一个终端启动后端：

```bash
cd backend
mvn spring-boot:run
```

再在仓库根目录启动 Web 前端：

```bash
npm run dev:web
```

打开 `http://localhost:3000`。SQLite 数据库默认保存在 `backend/data/mogo.db`。

## 验证

```bash
cd backend && mvn test
cd .. && npm run check
```

`npm run check` 会运行共享业务逻辑测试并构建 Web 前端。

## 许可证

本项目采用 [MIT 许可证](LICENSE)。
