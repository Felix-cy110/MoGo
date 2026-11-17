# 后端架构

MoGo 后端以 C++20 业务核心为中心。Web 调试端通过 libhv HTTP 适配器调用；未来 React Native 手机端通过 C++ Turbo Native Module 直接调用同一业务核心，不在手机内启动 localhost HTTP 服务。

## 依赖方向

```text
Web
  -> libhv HTTP Adapter
        -> Personal Finance Application
              -> Personal Finance Domain
              -> FinanceRepository interface
                    <- SQLite Adapter

React Native
  -> C++ Turbo Native Adapter（未来）
        -> Personal Finance Application
              -> 同一 Domain 与 SQLite Adapter
```

Domain 和 Application 不依赖 libhv、React Native 或具体数据库。HTTP、SQLite 与未来 Turbo Native Module 都是外围适配器。

## 目录职责

| 目录 | 职责 |
| --- | --- |
| `backend/core_shared/` | 跨功能共享的错误类型和基础能力，不放个人财务规则 |
| `backend/features/personal_finance/domain/` | 金额、分类、消费、预警等领域模型 |
| `backend/features/personal_finance/application/` | 用例、校验、事务边界和仓储接口 |
| `backend/features/personal_finance/infrastructure/sqlite/` | SQLite 连接、迁移和仓储实现 |
| `backend/transports/http/` | libhv 路由、JSON 映射、CORS 和 HTTP 错误映射 |
| `backend/platforms/desktop/` | Web 调试用桌面进程入口 |
| 未来 `backend/platforms/mobile/` | React Native C++ Turbo Native Module 适配器 |
| `backend/database/migrations/` | 可审计的数据库结构和升级脚本 |

## 按需编译

每项百宝箱功能使用独立 CMake Target，并由 Feature Option 控制。当前选项如下：

| CMake Option | 默认值 | 作用 |
| --- | --- | --- |
| `MOGO_FEATURE_PERSONAL_FINANCE` | `ON` | 编译个人财务领域、应用与 SQLite 适配器 |
| `MOGO_ENABLE_HTTP` | `ON` | 编译 libhv HTTP 适配器和桌面进程 |
| `MOGO_BUILD_TESTS` | `ON` | 编译 CTest 测试 |

`dev` preset 包含 HTTP 与测试；`mobile-core` preset 不包含 libhv HTTP 层，用于验证手机核心可独立构建。未来新增功能时，应新增同级 `features/<feature>/` Target 和独立 Option，平台入口只链接实际启用的功能。

## 数据兼容

数据库仍使用 `backend/data/mogo.db`，表名和字段名保持不变。V001 在事务中创建缺失表，并将 Spring/Hibernate 旧实现写入的 epoch milliseconds 日期和时间原地转换为本地 ISO 文本格式。迁移失败会回滚，不会保留半完成状态。

迁移 SQL 的审计版本位于 `backend/database/migrations/V001__personal_finance_initial.sql`；运行时迁移与该文件必须同步维护。
