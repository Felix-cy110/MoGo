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
| `backend/features/user_profile/domain/` | 单用户资料模型，所有字段均可为空 |
| `backend/features/user_profile/application/` | 资料校验、保存用例及仓储接口 |
| `backend/features/user_profile/infrastructure/json/` | 本地 JSON 文件读取、格式版本检查和原子替换 |
| `backend/transports/http/` | libhv 路由、JSON 映射、CORS 和 HTTP 错误映射 |
| `backend/platforms/desktop/` | Web 调试用桌面进程入口 |
| 未来 `backend/platforms/mobile/` | React Native C++ Turbo Native Module 适配器 |
| `backend/database/migrations/` | 可审计的数据库结构和升级脚本 |

## Personal Finance 内部边界

Personal Finance 对外保留 `FinanceService` 门面，HTTP 与未来原生适配器不直接依赖内部用例类。门面只负责并发串行化和委派，具体职责按用例拆分：

| 模块 | 职责 |
| --- | --- |
| `CategoryService` | 分类查询、搜索、新增、编辑、停用及内置分类保护 |
| `BudgetService` | 每日预算校验与保存 |
| `ExpenseService` | 消费新增、编辑、幂等请求、备注规则和结果组装 |
| `AlertService` | 预算阈值状态计算、跨阈值事件和预警持久化 |
| `FinanceQueryService` | 当日看板与区间统计查询 |

领域模型按 `category`、`expense`、`alert`、`dashboard`、`analytics` 和 `money` 分文件维护。`BudgetUsage`、分类保护和备注策略属于领域行为，不放入 HTTP 或 SQLite 层。

仓储接口按分类、预算、消费、预警、只读统计和事务能力拆分；`FinanceRepository` 仅作为当前组合接口。SQLite 适配器仍可使用一个对象共享连接和事务，但实现文件按同样职责拆分，迁移和通用 Statement/行映射独立维护。

## 按需编译

每项百宝箱功能使用独立 CMake Target，并由 Feature Option 控制。当前选项如下：

| CMake Option | 默认值 | 作用 |
| --- | --- | --- |
| `MOGO_FEATURE_PERSONAL_FINANCE` | `ON` | 编译个人财务领域、应用与 SQLite 适配器 |
| `MOGO_FEATURE_USER_PROFILE` | `ON` | 编译独立用户资料领域、应用与 JSON 文件适配器 |
| `MOGO_ENABLE_HTTP` | `ON` | 编译 libhv HTTP 适配器和桌面进程 |
| `MOGO_BUILD_TESTS` | `ON` | 编译 CTest 测试 |

`dev` preset 包含 HTTP 与测试；`mobile-core` preset 不包含 libhv HTTP 层，用于验证手机核心可独立构建。未来新增功能时，应新增同级 `features/<feature>/` Target 和独立 Option，平台入口只链接实际启用的功能。

用户资料可以在关闭个人财务和 HTTP 的情况下单独编译，不需要 SQLite 或 libhv；JSON 适配器使用独立的 nlohmann/json 头文件库。启用 HTTP 时，桌面入口只组装已启用功能，健康检查不依赖个人财务模块。

## 数据格式

数据库使用 `backend/data/mogo.db`。日期统一保存为 `YYYY-MM-DD` 文本，时间统一保存为 `YYYY-MM-DDTHH:MM:SS` 本地时间文本；C++ 后端不包含其他技术栈数据格式的运行时兼容逻辑。

V001 在事务中创建个人财务表、索引和默认数据。迁移 SQL 的审计版本位于 `backend/database/migrations/V001__personal_finance_initial.sql`；运行时迁移与该文件必须同步维护。

## 单用户资料

用户资料不写入 SQLite。桌面入口默认存储到 `backend/data/user-profile.json`（从 `backend` 目录运行），可通过 `--profile <path>` 指定位置；未来手机端由平台适配器传入应用私有目录中的路径。

- 没有登录、用户 ID 或多用户列表；单个文件代表当前设备的用户资料。
- 文件使用 `schemaVersion: 1`，姓名、性别、年龄、国家、职业均可为 `null`。空文本保存为 `null`；年龄 `0` 不视为空值。
- 性别保存稳定 code：`MALE`、`FEMALE`、`OTHER`，显示文案由客户端翻译；年龄如填写，必须为 0 至 150 的整数；文本字段最多 100 个 Unicode 字符。
- 文件不存在时返回空资料，不创建文件；只有主动保存才写入文件，允许全部留空或清空原有字段。
- 资料文件和临时文件不进入 Git。保存时使用同目录临时文件、检查写入和关闭结果后原子重命名；文件权限限制为当前用户读写，仓储内互斥保护并发请求。
- 文件损坏或版本不受支持时返回明确错误，不自动清空或覆盖原文件；页面加载失败时禁止保存，提供重试入口。
- JSON 是本机明文文件，不上传到远程服务，也不提供加密存储。原子替换防止进程中断留下半写入的目标文件，不等同于断电后的磁盘持久性保证。
