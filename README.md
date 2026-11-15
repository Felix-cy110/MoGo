# MoGo

个人财务管理系统，当前提供无登录的本机 Web 版本。

## 目录

- `fronted/`：React、Tailwind CSS、i18next 和 Rsbuild 前端
- `backend/`：JDK 17、Spring Boot、Maven 和 SQLite 后端

## 启动

先在一个终端启动后端：

```bash
cd backend
mvn spring-boot:run
```

再在另一个终端启动前端：

```bash
cd fronted
npm install
npm run dev
```

打开 `http://localhost:3000`。SQLite 数据库默认保存在 `backend/data/mogo.db`。

## 验证

```bash
cd backend && mvn test
cd fronted && npm run build
```
