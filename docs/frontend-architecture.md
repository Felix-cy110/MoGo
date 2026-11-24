# 前端跨平台架构

MoGo 的 Web 与未来 React Native 客户端遵循“共享业务逻辑，平台独立渲染”的原则。

## 目录职责

| 目录 | 职责 | 可否被 RN 复用 |
| --- | --- | --- |
| `fronted/core-shared/core` | 无领域依赖的 JSON 请求和结构化 API 错误 | 可以，通过参数注入请求实现 |
| `fronted/features/personal-finance/core` | 金额、日期、业务校验、请求模型、API 客户端、业务文案 | 可以，不能依赖 React 或浏览器 DOM |
| `fronted/features/personal-finance/react` | 基于 React Hook 的页面状态、异步流程和业务动作 | 可以，Web 与 RN 使用同一套 Hook |
| `fronted/features/user-profile/core` | 用户资料草稿、选填校验、接口模型、错误映射和中英文文案 | 可以，不依赖个人财务模块 |
| `fronted/features/user-profile/react` | 用户资料加载、重试、保存和反馈状态 | 可以，未来 RN 注入同契约的 Native Adapter |
| `fronted/features/investment-management/core` | 投资 API、精确十进制输入校验、日期草稿、展示格式、中英文文案 | 可以，计算结果来自 C++ 核心 |
| `fronted/features/investment-management/react` | 标的列表、买入编辑、保存与刷新反馈流程 | 可以，Web 与 RN 共用 Hook |
| `fronted/apps/web/src/components` | Web 公共控件与左标题右输入的表单行 | 仅 Web 组件复用 |
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

- 新增业务规则时，优先放入对应 `fronted/features/<feature>/core` 并补单元测试。
- 新增页面状态或异步流程时，优先放入对应 `fronted/features/<feature>/react`。
- Web 组件不得直接拼装接口载荷或复制后端错误码判断。
- 共享代码不得使用 `window`、`document`、`localStorage` 或浏览器专属 API；平台能力通过参数注入。
- Web 的 API 地址和 `fetch` 实现通过 `createFinanceApi` 注入。
- 未来 RN 应提供与 HTTP 客户端相同业务方法的 Native Adapter，让共享 Hook 依赖稳定服务接口，而不是依赖 localhost 或 HTTP 细节。

## 国际化

- 中英文业务资源和接口错误映射存放在对应 feature 的 `core` 中，Web 平台层组合各模块资源；分类翻译键继续属于个人财务模块。
- Web 和 React Native 使用同一套翻译 key，不复制业务文案。
- 平台层可分别实现语言选择持久化；Web 当前使用 `localStorage`，共享层不依赖该实现。
- 金额、日期和时间统一通过共享的 `Intl` 格式化工具展示。
- 语言、主题等全局设置文案放入 `fronted/core-shared/core`，由 Web 与未来 React Native 共用；平台层分别负责持久化与界面渲染。
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
- 内置“其他”分类统一置底，按稳定 code/i18n key 识别，不允许编辑或删除。共享 Hook 拦截操作，Web 弹窗提示；后端业务层同样校验并返回 `CATEGORY_PROTECTED`，未来 RN 复用相同规则和错误映射。
- 分类反馈由共享模块按错误码与操作映射：重复名称弹窗“分类已存在”，受保护分类分别弹窗“禁止编辑”或“禁止删除”。失败时保留输入草稿，其他校验及请求错误继续使用原有行内提示。


## 消费分析

- 个人财务首页只提供一个“消费分析”入口，周期选择放在独立分析页面，避免首页堆叠周度和月度按钮。
- 周度和月度日期范围、分析展示模型以及 API 客户端维护在共享 core；异步加载和周期切换维护在 `useFinanceAnalytics`，供 Web 与未来 React Native 复用。
- Web 当前以简单指标、每日趋势条和分类占比展示，不引入仅 Web 可用的图表依赖。

## 百宝箱入口

- React Native 手机端是最终产品形态，Web 端定位为共享逻辑和接口的调试入口。
- Web 首页按“一行一个功能”展示百宝箱模块，保持移动端优先的简单列表结构。
- 第一个功能为个人财务管理，后续功能以独立 feature 目录接入，首页只负责导航，不承载领域逻辑。
- 百宝箱功能名称和说明统一接入 i18n；具体业务状态仍优先放入对应共享模块。
- 右上角提供用户和设置入口；语言与明暗主题切换集中在独立设置页，业务页面不直接堆放切换控件。

## 用户资料

- 首页主题按钮旁提供用户图标入口，打开独立 `/profile` 页面；不作为百宝箱业务功能列表项，也不引入登录。
- 姓名、性别、年龄、国家、职业、月收入全部选填，国家和职业为自由文本；性别可以保持“未填写”，已填写字段可清空后保存。月收入按人民币元输入，转换为整数分后持久化。
- `useUserProfile` 负责加载、重试、校验、保存、防重复提交及反馈。加载失败不展示可保存的空表单，保存失败保留草稿。
- 持久化仅由 C++ JSON Adapter 完成，不使用 SQLite 或浏览器本地存储保存资料。
- Web 与财务表单复用公共 `FormFieldRow`；页面支持中英文和明暗主题，未来 RN 独立渲染界面并复用 core 与 Hook。
- 保存成功、保存失败和提交校验结果使用公共模态弹窗反馈；加载失败保留页面内重试入口，避免用户误用空表单覆盖资料。
- 调试时可以通过 `MOGO_API_TARGET=http://127.0.0.1:8081` 为 Web 指定另一个本机后端；未设置时仍代理到 `http://localhost:8080`。

## 已落地的 RN 手机端

- `fronted/apps/mobile` 独立渲染原生页面；`native` 是本地 TurboModule workspace，Android/iOS 仅做路径、线程和 C++ 生命周期适配。
- 共享 Hooks 继续注入稳定服务接口，手机提供 `createNativeApis`，Web 继续用 HTTP 客户端。
- Metro/Jest 统一将共享 Hook 解析到 mobile 的 React 19；Web 保持 React 18，不混用 renderer。
- 语言/主题在手机设置页管理；页面文案组合现有 feature 的资源。
- 构建、环境和验证边界见 `docs/mobile-development.md`。

## Web 与 RN 的个人财务界面一致性

Web 已确认的功能、信息层级和入口位置是 RN 个人财务页面的设计基准。平台独立渲染允许使用原生选择器、触摸滑动、键盘避让和无障碍焦点，不应导致预算进度、日期切换或统计指标遗漏。

- 日概览包含今天／昨天切换、统计入口、消费总额、预算／剩余、使用率和进度条；权限始终读取 `useDailyFinance.access`。
- 表单保持左标签右输入，预算保存与分类管理位于对应行；记录整行点击编辑，分类汇总包含笔数。
- 统计共用 `buildAnalyticsView` 的分类占比和 `buildTrendChart` / `findNearestTrendPoint` 的几何、节点选择算法；平台只处理事件与绘制。
- RN 的预算概览、记录列表、分类汇总与编辑弹窗分别拆分组件；公共表单行、按钮与 `FormDialog` 放在移动平台公共组件中。
- 新增或修改 Web 功能时检查 RN 是否接入同一共享状态和流程；使用中英文、明暗主题及窄屏场景验收两个平台。

投资管理的计算口径、数据结构和接口见 [investment-management.md](investment-management.md)。
