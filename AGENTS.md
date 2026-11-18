# MoGo 项目开发规范

## 技术基线

- **Web 前端**：React + Tailwind CSS（Tailcss）+ i18n + Rsbuild（RustBuild）
- **手机端**：RNN（按当前约定用于 React Native 手机端）
- **后端**：C++20 + CMake + libhv
- **数据持久化**：SQLite
- **单用户资料**：独立 JSON 文件持久化，不使用 SQLite；所有资料字段均为选填，不引入登录或多用户模型。

除非有明确的技术或业务理由，不引入与上述基线冲突的框架、运行时或持久化方案。

## 代码设计原则

- 优先复用已有代码、公共组件、工具类和基础设施，避免重复实现。
- 保持模块职责单一，按领域和职责拆分代码，减少模块之间的直接耦合。
- 明确区分表示层、业务层、数据访问层和基础设施层，避免跨层调用实现细节。
- 面向接口和稳定契约编程；公共接口变更时同步更新调用方、文档和必要的测试。
- 不为了抽象而抽象。只有在确实减少重复、隔离变化或改善可测试性时才新增抽象。
- 修改现有代码时保持变更范围聚焦，不进行与当前需求无关的大规模重构。

## 注释与文档

- 只添加必要且有价值的注释，重点说明设计原因、约束条件和不直观的业务规则。
- 不添加描述显而易见代码行为的注释，也不使用注释掩盖复杂或不清晰的实现。
- 对公共模块、核心接口、复杂业务流程和关键配置补充简洁文档。
- 注释应与代码同步维护，过期注释必须及时删除或修正。

## 实现要求

- 新功能优先接入已有的项目结构和公共能力。
- 处理错误、边界条件和资源释放，避免静默失败。
- 涉及数据库结构或持久化行为的变更，需要考虑兼容已有数据和升级路径。
- 前后端接口应保持稳定、明确，并尽量复用共享的数据模型或协议约定。
- 完成改动后，运行与变更范围匹配的构建、检查和测试。

## Git 提交与 Pull Request 规范

- 所有 Git commit message 必须遵循 Conventional Commits 规范。
- 所有 Pull Request 标题必须遵循 Conventional Commits 规范。
- 推荐格式：`<type>(<scope>): <description>`；没有明确 scope 时可使用 `<type>: <description>`。
- 常用 type 包括 `feat`、`fix`、`docs`、`refactor`、`test`、`build`、`ci`、`chore` 和 `perf`。
- description 应简洁明确，描述本次提交或 PR 的实际变更，不使用含糊标题。
- 存在破坏性变更时，应使用 `!` 标记或在正文中添加 `BREAKING CHANGE:` 说明。

## 后端模块规范

- 后端采用按业务功能拆分的 C++20 模块化单体结构，每个功能使用独立 CMake Target 和 Feature Option。
- 跨功能共享能力放入 `backend/core_shared`，不得将个人财务领域逻辑放入共享模块。
- 个人财务按 `domain`、`application`、`infrastructure` 分层放入 `backend/features/personal_finance`；后续功能建立同级 feature 目录。
- `domain` 与 `application` 不得依赖 libhv、React Native、SQLite 头文件或平台 API；具体能力通过接口和适配器注入。
- SQLite 实现放入 feature 的 `infrastructure/sqlite`，HTTP JSON 映射放入 `backend/transports/http`，禁止在 HTTP Handler 中直接编写 SQL。
- Web 调试端通过 libhv HTTP Adapter 调用业务核心；未来 React Native 手机端通过 C++ Turbo Native Adapter 直接调用同一核心，不在手机内依赖 localhost HTTP Server。
- 平台入口只负责组装启用的功能与适配器，不承载领域规则。功能之间不得直接访问对方的内部模型或基础设施实现。
- 数据库迁移必须兼容已有 SQLite 数据，并同步维护 `backend/database/migrations` 中的审计 SQL。
- 默认只监听本机回环地址；移动端构建应关闭 HTTP Target，只链接实际启用的功能模块。

## 前端跨平台复用规范

- Web 与未来 React Native 手机端采用“共享业务逻辑，平台独立渲染”的架构。
- 与平台无关的领域逻辑、数据协议、工具、校验规则、API 客户端及 i18n 业务文案放入对应的 `fronted/features/<feature>/core`；无领域依赖的公共能力放入 `fronted/core-shared/core`。
- 可由 Web 和 React Native 共用的 React 状态与业务流程放入对应的 `fronted/features/<feature>/react`，优先通过 Hook 暴露。
- Web 的 HTML、DOM、Tailwind 样式和浏览器交互只允许存在于 `fronted/apps/web/`；React Native 原生组件只允许存在于未来的 `fronted/apps/mobile/`。
- 共享模块不得依赖 `window`、`document`、`localStorage` 等浏览器专属能力，也不得依赖 React Native 专属模块；平台能力必须通过参数或适配器注入。
- 不强求直接复用 Web 和 React Native 的视图组件。优先复用业务逻辑、状态管理、接口协议、校验规则和展示模型，避免在共享代码中堆积平台判断。
- 新增业务规则时优先修改共享模块并补充单元测试，禁止在 Web 与 React Native 中分别实现同一规则。
- 具体目录职责和依赖关系见 `docs/frontend-architecture.md`。

## 国际化规范

- 所有面向用户的界面文案必须接入 i18n，不允许在 Web 或未来 React Native 组件中硬编码中文或英文。
- Web 与 React Native 共用的业务文案、接口错误映射和语言资源维护在对应 feature 的 `core`；分类翻译键属于 `fronted/features/personal-finance/core`，平台层统一组合各模块资源。
- 新增界面功能时必须同时补齐当前支持语言的翻译；不得只添加一种语言后依赖 fallback 交付。
- 分类、预警和接口错误应使用稳定的 code 或 i18n key 翻译，不以数据库中的中文名称或后端中文 message 作为主要展示内容。
- 金额、日期和时间必须使用当前语言对应的 `Intl` 格式化能力，不手动拼接货币符号、日期分隔符或固定区域格式。
- 平台层只负责语言选择的持久化和渲染；共享业务逻辑不得直接依赖浏览器或 React Native 的本地存储实现。
- 完成界面改动后，至少验证中文和英文两种语言下的主要页面与交互。

## Web 主题规范

- Web 界面必须同时适配浅色和深色主题；新增组件时不得只实现单一主题样式。
- 首次访问时主题默认跟随系统偏好，用户主动选择后由 Web 平台层持久化；共享模块不得依赖浏览器主题 API 或存储。
- 明暗主题应保持现有简洁朴素的视觉风格，确保文本、边框、表单、反馈状态和弹窗具有清晰对比度。
- 主题切换相关的用户可见文案和无障碍名称必须接入 i18n。
- 完成 Web 界面改动后，至少验证浅色和深色两种主题下的主要页面与交互。

## 交互反馈规范

- 临时性的操作结果、业务预警、禁止操作和需要用户立即确认的信息，优先使用模态弹窗反馈，不使用容易被忽略的页面内提示条代替。
- 表单字段旁的持续校验说明、加载状态以及需要保留重试入口的页面级错误，可以使用页面内提示。
- 同类弹窗应复用平台公共组件，文案必须接入 i18n，并支持键盘关闭、焦点管理和明暗主题。


## 百宝箱产品形态

- React Native 手机端是最终产品，Web 端主要用于调试共享业务逻辑、接口和交互流程。
- Web 首页采用移动端优先的功能列表，一行展示一个具体功能；第一项为个人财务管理。
- 新增百宝箱功能时使用独立 feature 目录，首页只维护功能入口，不在导航层实现业务逻辑。
- 跨端业务逻辑继续优先放入共享模块，Web 与 React Native 分别负责平台渲染。
