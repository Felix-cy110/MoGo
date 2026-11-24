# 投资管理

Web 与 React Native 共用表单校验、异步流程和 C++ 投资核心。用户手动维护指标，记录买入单价和实际投入 USDT；当前只支持买入，暂不计手续费、杠杆、卖出和行情。已有买入记录后锁定指标代码，包含已软删除的记录。

## 计算与精度

- 单笔币数量 = `quote_amount / unit_price`。
- 开仓均价 = `Σ quote_amount / Σ (quote_amount / unit_price)`；不能按价格直接平均，也不能用 USDT 金额直接给价格加权。
- 价格与 USDT 金额输入最多 18 位整数和 18 位小数，必须大于零，只接受普通十进制字符串，不接受科学计数法或 JSON number。
- SQLite TEXT 保存规范化十进制字符串。C++ 使用 InfInt 任意精度整数构成约分后的有理数，累加和除法保持精确；计算过程不使用 JS Number、SQLite REAL 或页面上舍入后的币数量。
- 输出采用十进制四舍五入（正数 half-up）：金额与均价最多 18 位小数，币数量最多 36 位小数，去掉末尾零；无有效记录时均价为 null。前端用 Intl 格式化整数和小数显示，整数以 BigInt 传入，避免精度损失。
- 例如 600 USDT 以单价 60000 买入，再以单价 66000 买入 1320 USDT：累计 0.03 BTC，均价 64000 USDT/BTC。

## 数据表

与个人财务共用 SQLite 文件，各自维护独立表。新增表不会改动已有财务和用户资料数据。审计 SQL：`backend/database/migrations/V002__investment_management_initial.sql`，与投资 SQLite 适配器中的 `migration.hpp` 同步维护。

### investment_targets

| 字段 | 类型 | 约束与用途 |
| --- | --- | --- |
| id | INTEGER | 主键 |
| name | TEXT | 必填，去除首尾空格；最多 240 UTF-8 字节 |
| symbol | TEXT | 必填，规范成大写；1–20 位字母、数字、点、横线、下划线，以字母或数字开头 |
| quote_currency | TEXT | 固定 USDT，系统填写 |
| note | TEXT | 选填，空字符串；最多 1500 UTF-8 字节 |
| archived_at | TEXT | 可空；非空表示归档，不删除历史 |
| created_at / updated_at | TEXT | 系统生成的 UTC ISO 8601 时间 |

未归档指标通过 `(name COLLATE NOCASE, quote_currency)` 部分唯一索引防重复。SQLite NOCASE 对 ASCII 字母忽略大小写；其他字符按原文比较。归档可恢复；若活动列表已有同名指标，恢复操作返回冲突。

### investment_trades

| 字段 | 类型 | 约束与用途 |
| --- | --- | --- |
| id | INTEGER | 主键 |
| target_id | INTEGER | 外键，ON DELETE RESTRICT |
| side | TEXT | 当前只允许 BUY |
| unit_price | TEXT | 正的精确十进制字符串，USDT/币 |
| quote_amount | TEXT | 正的精确十进制字符串，实际投入 USDT |
| occurred_at | TEXT | 用户可补录的实际买入时间，UTC ISO 8601，含毫秒 |
| note | TEXT | 选填，空字符串；最多 1500 UTF-8 字节 |
| client_request_id | TEXT | 必填且唯一，8–80 位字母、数字、下划线或横线 |
| created_at / updated_at | TEXT | 系统生成时间 |
| deleted_at | TEXT | 可空，软删除记录不参与汇总 |

记录按 `occurred_at DESC, id DESC` 排序，并建立对应的指标联合索引。记录不允许迁移到另一指标。同一保存的重试复用请求标识及载荷；修改过载荷或重试已删除的记录会返回 `INVESTMENT_REQUEST_CONFLICT`，不会静默创建另一笔。编辑与删除均重新计算汇总。

## 分层与接口

- `backend/features/investment_management/domain`：数据模型、十进制验证、精确数量和均价计算。
- `application`：指标、交易生命周期、幂等检查、字段锁定与仓储接口。
- `infrastructure/sqlite`：迁移、约束和查询；复用 `core_shared` 的 SQLite 连接和语句封装。
- 读取完整汇总、写入前校验及写入由事务包围；`BEGIN IMMEDIATE` 保护不同连接对同一 SQLite 文件的并发操作。
- HTTP 与 Native 共用 `transports/contracts/.../investment_json.hpp`。手机继续通过后台串行 Native Adapter 调用 C++，不使用 HTTP。

| HTTP | Native 方法 | 作用 |
| --- | --- | --- |
| GET /api/investment/targets?archived=false | investment.listTargets | 活动或归档指标及汇总 |
| GET /api/investment/targets/:id | investment.getTarget | 指标、汇总、有效交易及 symbolLocked |
| POST /api/investment/targets | investment.addTarget | 创建指标 |
| PUT /api/investment/targets/:id | investment.updateTarget | 修改名称、备注；有历史记录后禁止换币 |
| PUT /api/investment/targets/:id/archive | investment.archiveTarget | 归档/恢复，载荷 archived 为 boolean |
| POST /api/investment/trades | investment.addTrade | 添加买入 |
| PUT /api/investment/trades/:id | investment.updateTrade | 修改买入 |
| DELETE /api/investment/trades/:id | investment.deleteTrade | 软删除买入 |

目标输入为 `name, symbol, note, quoteCurrency`；买入输入为 `targetId, unitPrice, quoteAmount, occurredAt, note, clientRequestId`。所有价格、金额、数量、均价在响应中也是字符串。归档指标可以查询，恢复后才能继续编辑。

共享前端 core 提供 API 契约、草稿、校验和展示格式；react 包提供两个共享 Hook。Web 和 RN 分别渲染页面，复用平台表单与弹窗。保存失败保留草稿和请求标识；写入已成功但刷新失败时显示加载重试入口，避免再次提交已经成功的保存。

## 构建和验证

开关 `MOGO_FEATURE_INVESTMENT_MANAGEMENT` 默认 ON，关闭后不编译该功能和任意精度计算对象。Android 使用 `-PmogoFeatureInvestmentManagement=OFF`；iOS 在安装 Pods 时使用 `MOGO_FEATURE_INVESTMENT_MANAGEMENT=OFF`。RN 首页通过 capabilities 隐藏未编译的入口。

验证包含 C++ 精度/持久化/并发幂等测试、Native 契约测试、共享 JS 校验与格式测试、RN 页面与失败重试测试、Web 真实 HTTP 操作检查。Android/iOS Codegen、JS Bundle 和宿主机 C++ 构建不能替代原生安装包与真机验收。
