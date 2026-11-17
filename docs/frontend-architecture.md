# 前端跨平台架构

MoGo 的 Web 与未来 React Native 客户端遵循“共享业务逻辑，平台独立渲染”的原则。

## 目录职责

| 目录 | 职责 | 可否被 RN 复用 |
| --- | --- | --- |
| `fronted/features/personal-finance/core` | 金额、日期、业务校验、请求模型、API 客户端、业务文案 | 可以，不能依赖 React 或浏览器 DOM |
| `fronted/features/personal-finance/react` | 基于 React Hook 的页面状态、异步流程和业务动作 | 可以，Web 与 RN 使用同一套 Hook |
| `fronted/apps/web/src/features` | Web 页面和 Web 组件 | 不直接复用，包含 HTML 与 Tailwind 类名 |
| 未来 `fronted/apps/mobile/` | React Native Screen 与原生组件 | 使用共享核心和 Hook，独立实现原生 UI |

## 依赖方向

```text
Web / React Native UI
        ↓
fronted/features/personal-finance/react
        ↓
fronted/features/personal-finance/core
        ↓
平台服务适配器
   ├── Web：libhv HTTP API
   └── React Native：C++ Turbo Native Module（未来）
                    ↓
          C++ Personal Finance Core
                    ↓
                  SQLite
```

共享模块不得反向依赖 Web 或 React Native。平台组件只负责渲染和处理平台事件，不重复业务校验、金额转换或接口协议。

## 组件复用边界

Web 的 `<input>`、`<table>` 和 Tailwind 样式无法直接在 React Native 使用，因此默认不追求跨平台复用视图组件。优先复用以下内容：

1. API 客户端和数据协议；
2. 金额、日期、分类和预警等领域逻辑；
3. 表单校验和提交载荷构造；
4. React Hook 中的加载、保存、错误和预警状态；
5. i18n 文案键和基础业务文案。

只有当 Web 与 RN 的交互和渲染确实一致时，才抽取无平台依赖的展示模型或 Headless 组件，避免为了“共用组件”引入大量平台判断。

## 新功能开发规则

- 新增业务规则时，优先放入 `fronted/features/personal-finance/core` 并补单元测试。
- 新增页面状态或异步流程时，优先放入 `fronted/features/personal-finance/react`。
- Web 组件不得直接拼装接口载荷或复制后端错误码判断。
- 共享代码不得使用 `window`、`document`、`localStorage` 或浏览器专属 API；平台能力通过参数注入。
- Web 的 API 地址和 `fetch` 实现通过 `createFinanceApi` 注入。
- 未来 RN 应提供与 HTTP 客户端相同业务方法的 Native Adapter，让共享 Hook 依赖稳定服务接口，而不是依赖 localhost 或 HTTP 细节。

## 国际化

- 中英文资源、分类翻译键和接口错误码映射统一存放在 `fronted/features/personal-finance/core`。
- Web 和 React Native 使用同一套翻译 key，不复制业务文案。
- 平台层可分别实现语言选择持久化；Web 当前使用 `localStorage`，共享层不依赖该实现。
- 金额、日期和时间统一通过共享的 `Intl` 格式化工具展示。
- 新功能必须一次性补齐全部受支持语言，并验证语言切换后的布局和业务反馈。


## Web 明暗主题

- Web 主题切换属于平台渲染能力，集中维护在 `fronted/apps/web/src/hooks/useColorTheme.js`，不得混入共享业务模块。
- 首次访问默认跟随操作系统明暗偏好，用户手动切换后使用 `localStorage` 保存选择。
- 新增 Web 组件时必须同时适配浅色与深色主题，并保证表单、反馈状态和弹窗具有足够对比度。
- 主题切换按钮的可访问名称等用户可见文案必须接入全局 i18n。


## 消费分类管理

- 默认分类由后端初始化，自定义分类通过稳定 API 写入 SQLite，并与默认分类使用同一数据模型。
- 分类管理使用独立页面；新增、模糊搜索、编辑和删除流程由 `useCategoryManagement` 维护，Web 与未来 React Native 共用。
- 默认分类使用 i18n key 展示；用户创建或改名后的分类名称属于用户数据，不自动翻译。
- 删除分类采用软删除：记账选择器只返回启用分类，管理查询同时返回启用和已删除分类，历史消费及分类汇总继续显示删除前的分类名称。
- 用户自定义分类的备注固定为选填，由后端设置默认规则；客户端不允许覆盖该约束。


## 百宝箱入口

- React Native 手机端是最终产品形态，Web 端定位为共享逻辑和接口的调试入口。
- Web 首页按“一行一个功能”展示百宝箱模块，保持移动端优先的简单列表结构。
- 第一个功能为个人财务管理，后续功能以独立 feature 目录接入，首页只负责导航，不承载领域逻辑。
- 百宝箱功能名称和说明统一接入 i18n；具体业务状态仍优先放入对应共享模块。
