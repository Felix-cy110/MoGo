# 个人财务 HTTP API

HTTP API 仅服务于 Web 调试端，默认监听 `127.0.0.1:8080`。未来 React Native 手机端直接调用 C++ Native Adapter，但应复用本契约中的请求、响应模型和错误 code。

## 路由

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/health` | 后端健康检查 |
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
| `404` | `EXPENSE_NOT_FOUND` | 编辑的消费记录不存在 |
| `409` | `CATEGORY_NAME_EXISTS` | 分类名称重复 |
| `500` | `INTERNAL_ERROR` | 未映射的服务端错误 |

客户端应使用 `code` 映射 i18n 文案，不应依赖后端中文 `message`。
