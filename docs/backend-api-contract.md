# MoGo HTTP API

HTTP API 仅服务于 Web 调试端，默认监听 `127.0.0.1:8080`。未来 React Native 手机端直接调用 C++ Native Adapter，但应复用本契约中的请求、响应模型和错误 code。

## 路由

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/health` | 后端健康检查 |
| `GET` | `/api/profile` | 读取本机单用户资料，文件不存在时所有字段返回 `null` |
| `PUT` | `/api/profile` | 完整替换用户资料并写入本地 JSON 文件，所有字段选填 |
| `GET` | `/api/categories` | 获取启用的消费分类 |
| `GET` | `/api/categories/manage?query=关键字` | 查询全部分类，包含已删除分类并支持名称或 code 模糊搜索 |
| `POST` | `/api/categories` | 新增自定义分类，备注规则固定为 `OPTIONAL` |
| `PUT` | `/api/categories/{categoryId}` | 修改启用分类的名称 |
| `DELETE` | `/api/categories/{categoryId}` | 软删除分类；历史消费仍保留分类名称 |
| `GET` | `/api/dashboard?date=YYYY-MM-DD` | 获取指定日期的预算、消费与分类汇总 |
| `GET` | `/api/analytics?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` | 获取日期范围内的消费总额、每日趋势和分类汇总 |
| `PUT` | `/api/budgets/daily` | 新增或更新每日预算 |
| `POST` | `/api/expenses` | 新增消费并返回本次跨越的预警阈值 |
| `PUT` | `/api/expenses/{expenseId}` | 编辑已有消费，保持记录 ID 和发生时间不变 |
| `POST` | `/api/backup/export` | 使用用户密码导出 SQLite 与资料 JSON 的加密备份 |
| `POST` | `/api/backup/import` | 解密并按冲突策略恢复本地数据 |

内置 `code=OTHER`（“其他”）分类禁止修改和删除，两种操作均返回 `403 CATEGORY_PROTECTED`。其他默认分类和自定义分类仍可编辑、软删除；保护规则与分类显示名称无关。

## 主要载荷

每日预算：

```json
{
  "date": "2026-11-17",
  "amountCents": 10000
}
```

新增消费：

```json
{
  "date": "2026-11-17",
  "amountCents": 2500,
  "categoryId": 1,
  "note": "午餐",
  "clientRequestId": "stable-client-request-id"
}
```

编辑消费：

```json
{
  "amountCents": 2300,
  "categoryId": 2,
  "note": "地铁"
}
```

消费写入响应包含 `expense`、当日金额汇总、预算使用率和 `alerts`。只有本次操作从阈值下方跨到阈值上方时才返回对应预警；当前规则为 80% `BUDGET_WARNING` 和 100% `BUDGET_EXCEEDED`。

## 稳定错误 code

| HTTP 状态 | code | 说明 |
| --- | --- | --- |
| `400` | `VALIDATION_ERROR` | 日期、金额、字段类型或长度不合法 |
| `400` | `CATEGORY_NOT_FOUND` | 分类不存在或不可用 |
| `400` | `NOTE_REQUIRED` | 必填备注分类未填写备注 |
| `403` | `CATEGORY_PROTECTED` | 内置“其他”分类不允许修改或删除 |
| `404` | `EXPENSE_NOT_FOUND` | 编辑的消费记录不存在 |
| `409` | `CATEGORY_NAME_EXISTS` | 分类名称重复 |
| `500` | `INTERNAL_ERROR` | 未映射的服务端错误 |

客户端应使用 `code` 映射 i18n 文案，不应依赖后端中文 `message`。

## 本地数据备份

导出请求：

```json
{ "password": "至少八个字符" }
```

响应中的 `content` 是 `MOGO-BACKUP/1` 文本封装的认证密文，Web 将它下载为 `.mogo` 文件；客户端不得把解密后的 SQLite 或 JSON 暴露给 JS。

导入请求：

```json
{
  "content": "MOGO-BACKUP/1\\n...",
  "password": "至少八个字符",
  "conflictPolicy": "OVERWRITE"
}
```

`OVERWRITE` 整包恢复备份并在失败时回滚；`KEEP_EXISTING` 保留已经存在的本地文件，只补入缺失文件，不进行可能破坏外键关系的逐表合并。错误密码与密文篡改统一返回 `BACKUP_DECRYPT_FAILED`，避免泄露校验细节。具体格式和安全约束见 [data-backup.md](data-backup.md)。

| HTTP 状态 | code | 说明 |
| --- | --- | --- |
| `400` | `BACKUP_PASSWORD_INVALID` | 密码少于 8 个字符或超过长度限制 |
| `400` | `BACKUP_DECRYPT_FAILED` | 密码错误、文件损坏或认证失败 |
| `400` | `BACKUP_INVALID` | 解密成功但备份内容不完整或版本不支持 |
| `500` | `BACKUP_EXPORT_FAILED` | 无法生成 SQLite 快照或加密文件 |
| `500` | `BACKUP_RESTORE_FAILED` | 恢复失败，已尝试回滚原有数据 |

## 用户资料契约

用户资料与个人财务独立，无需用户 ID、登录或 SQLite。`GET /api/profile` 与 `PUT /api/profile` 成功响应均为以下资料对象，响应设置 `Cache-Control: no-store`。

| 字段 | 类型 | 是否必填 | 规则 |
| --- | --- | --- | --- |
| `name` | string / null | 否 | 姓名，去除首尾空白，最多 100 个 Unicode 字符 |
| `gender` | string / null | 否 | `MALE`、`FEMALE`、`OTHER`；`null` 为未填写 |
| `age` | integer / null | 否 | 0 至 150；不接受小数、数字字符串或布尔值 |
| `country` | string / null | 否 | 国家，自由文本，去除首尾空白，最多 100 个 Unicode 字符 |
| `occupation` | string / null | 否 | 职业，自由文本，去除首尾空白，最多 100 个 Unicode 字符 |
| `monthlyIncomeCents` | integer / null | 否 | 月收入，单位为人民币分；0 至 99,999,999,999，避免浮点金额误差 |

`PUT` 为完整替换：未传字段、`null` 或空文本均清空对应值，因此 `{}` 也是合法请求。请求/响应不暴露文件路径或 `schemaVersion`；文件格式版本由 JSON 适配器管理。

| HTTP 状态 | code | 说明 |
| --- | --- | --- |
| `400` | `VALIDATION_ERROR` | JSON 对象或文本字段类型不合法 |
| `400` | `PROFILE_AGE_INVALID` | 年龄不是 0 至 150 的整数 |
| `400` | `PROFILE_GENDER_INVALID` | 性别 code 不合法 |
| `400` | `PROFILE_MONTHLY_INCOME_INVALID` | 月收入不是支持范围内的整数分 |
| `400` | `PROFILE_TEXT_TOO_LONG` | 文本字段超过长度限制 |
| `500` | `PROFILE_READ_FAILED` | 原资料无法读取或格式损坏 |
| `500` | `PROFILE_WRITE_FAILED` | 文件写入失败，或已有文件损坏导致拒绝覆盖 |
| `500` | `PROFILE_VERSION_UNSUPPORTED` | 文件版本不受支持，拒绝读取或覆盖 |
