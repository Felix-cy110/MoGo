# React Native 手机端

## 目录与运行边界

```text
fronted/apps/mobile/
  src/screens/            原生页面，按功能拆分
  src/components/         行式表单、选择弹窗、按钮等纯 RN 组件
  src/platform/           原生语言/主题偏好、日期与生命周期
  src/services/           Native API 契约适配，不实现业务规则
  native/src/             TurboModule Codegen 规格
  native/android/         Kotlin 异步队列 + JNI + CMake
  native/ios/             Objective-C++ 异步队列
  android/、ios/          原生应用工程
backend/transports/
  native/                 无 RN/HTTP 依赖的离线入口与命令适配
  contracts/              HTTP、Native 共用的 JSON 展示契约
```

调用方向：RN 页面 → 已有共享 React Hook → Native API → TurboModule → C++ Application → Repository。

- 分类、金额、预算预警、统计、资料校验继续复用 `fronted/features/*/{core,react}` 与 `backend/features/*`；原生适配层不写 SQL 或领域规则。
- Android/iOS 在单独串行队列执行 C++ 与磁盘操作，不阻塞 JS/UI 线程；Android 释放模块时关闭 C++ 句柄。
- 手机内不启动 libhv、HTTP Server、WebView，也不访问开发机 API。首次构建需要下载开发依赖，**安装完成后的记账、投资记录及资料管理不需要网络**；BTC/ETH 的可选行情直接订阅 OKX 公共 WebSocket（WSS），后台停止连接，断网时省略价格。
- 财务：Android `filesDir/mogo/mogo.db`；iOS `Application Support/MoGo/mogo.db`。
- 个人资料：同目录 `user-profile.json`，所有字段选填（包括月收入），不放 SQLite。
- 语言/主题偏好才使用 AsyncStorage；财务和资料不能放入 AsyncStorage。
- 手机与 Web 是两份独立本地数据，不自动同步；不得复制用户开发数据库到安装包。
- 目前无登录、同步或加密功能；本地财务/资料为应用沙盒内的明文。卸载应用可能删除数据。

## 安装与启动

RN 0.88.1 使用 React 19.3；现有 Web 维持 React 18.3.1。Metro/Jest 将共享 Hook 的 React 解析固定到 mobile workspace，不能去修改 Web 的 React 版本“解决”重复 React。

先在仓库根目录安装：

```bash
npm ci
make mobile-doctor
```

Node 使用 22.13+（22.x）、24.3+（24.x）或 26+；建议沿用当前 Node 24。

### Android

安装 JDK 17、Android Studio/SDK、SDK API 37、Build Tools 37.0.0、NDK 27.1.12297006、CMake 3.22.1。设置 `ANDROID_HOME`，启动模拟器或连接已开启 USB 调试的手机：

```bash
make dev-mobile       # 第一个终端：Metro
make mobile-android  # 第二个终端：编译、安装、启动
```

Android 主 Manifest 申请 INTERNET 权限以获取可选的 OKX 行情，debug 同时用于连接 Metro；断网仍可操作全部本地记录。模板 release 暂用公开 debug key，**仅供开发验收，正式分发前必须配置私有签名**。Android SQLite 使用校验哈希的官方 amalgamation，不能链接开发机 SQLite 或 Android 私有系统库。

### iOS

需要完整 Xcode（Command Line Tools 不够）、iOS SDK、Ruby Bundler 和 CocoaPods。先配置 Xcode 开发目录，再执行：

```bash
cd fronted/apps/mobile
bundle install
cd ios
bundle exec pod install
cd ../../../..
make dev-mobile       # 第一个终端
make mobile-ios       # 第二个终端；默认模拟器
```

真机需在 Xcode 中打开 `fronted/apps/mobile/ios/MoGo.xcworkspace`，选择自己的签名团队和设备。调试包需要 Metro；离线验收必须使用包含 JS bundle 的 Release 包。

### 验证

```bash
make mobile-check       # ESLint、TS bridge contract、RN 页面/适配测试
make mobile-core-test   # 不启动 HTTP，验证真实 SQLite 和 JSON 持久化
make check              # 已有 Web/共享逻辑/C++ 回归
```

JS 页面沿用项目 JSX 风格；TypeScript 检查覆盖桥接规格，不宣称全部共享 JS 已严格类型化。页面测试覆盖中英文 × 明暗主题、月收入、分类保护、点击行编辑等。原生核心测试覆盖重开数据、软删除、重复分类、消费幂等、80%/100% 预警、统计与错误码。

### 按需编译

Android（在 mobile/android 下）：

```bash
./gradlew assembleDebug -PmogoFeaturePersonalFinance=OFF -PmogoFeatureUserProfile=ON
```

iOS（在 mobile/ios 下，改变开关后重新安装 Pods）：

```bash
MOGO_FEATURE_PERSONAL_FINANCE=OFF MOGO_FEATURE_USER_PROFILE=ON bundle exec pod install
```

手机首页读取原生 `capabilities`，不显示被裁剪的财务、投资管理或用户入口。LeetCode 仍为规划占位页面。HTTP 始终关闭；新增功能需要独立 CMake Target、命令适配和 capability。

## 初版验收记录（2026-11-19）

已执行：RN ESLint、桥接 TS 检查、14 项页面/接口测试、Android/iOS Codegen、双平台 release JS bundle；原生核心 3 组 CTest、三种 feature 裁剪组合、JNI C++ 语法检查；现有 Web 构建、共享测试及桌面后端回归。

**尚未执行：iOS/Android 原生完整编译、模拟器/真机运行与视觉验收。** 当前工作机只有 Command Line Tools，没有可用的完整 Xcode、CocoaPods 和 Android SDK。JS bundle/Codegen/宿主机 C++ 编译不能替代原生编译；补齐环境后需要继续验证：

- 中文/英文和浅色/深色下表单不截断，屏幕阅读器与返回键、软键盘、选择弹窗正常。
- 飞行模式下 Release 包记账、编辑、统计、保存资料；强制退出重开后记录/月收入保留。
- “其他”置底、必填备注、禁止编辑/删除；重复分类弹窗。
- 触达 80% 和超过 100% 时即时弹窗；滑动趋势图只显示金额。
- 原生 feature 裁剪构建、热重载与卸载模块后没有句柄泄漏。

## 个人财务界面对齐（2026-11-23）

手机端按 Web 的信息层级实现日概览、今天／昨天切换、预算进度和使用率、同行预算保存／分类管理、可点击记录、含笔数的分类汇总。昨天的权限、补录和预警文案复用共享逻辑。分类页保留全宽搜索，新增在同一行提交，编辑通过公共原生弹窗完成；统计使用周／月页签、时间范围、四项指标、滑动节点金额提示及分类占比。

本次验证包括 RN ESLint／类型检查／页面测试、共享前端测试、Web 构建、双平台 Codegen 和 release JS bundle、宿主机 C++ 原生核心测试。另用临时 RN Web 适配预览检查三个页面的 320/390 宽度 × 中英文 × 明暗主题共 24 组布局，以及英文窄屏编辑弹窗；预览工具与样例数据未进入项目。

这些检查不替代本次修改的 Android/iOS 真机视觉、软键盘与屏幕阅读器焦点验收。安装正式原生环境后，重点验证昨天记录的编辑限制、嵌套分类选择、编辑弹窗返回与焦点恢复、滑动图表和大字体换行。

## 投资管理

投资管理已接入本地 C++ 核心和 SQLite，支持统一的指标列表与搜索、买入记录、编辑删除与开仓均价。价格和实际投入 USDT 全程使用十进制字符串，精确计算由 C++ 负责。详见 [investment-management.md](investment-management.md)。

Android 裁剪：`./gradlew assembleDebug -PmogoFeatureInvestmentManagement=OFF`。iOS 裁剪：`MOGO_FEATURE_INVESTMENT_MANAGEMENT=OFF bundle exec pod install`。关闭后 RN capabilities 不提供此入口。

本次检查覆盖双平台 Codegen、双平台 release JS Bundle、宿主机 C++ 及 feature 开关组合、RN 测试，并用临时浏览器适配预览检查 320/390 宽度、中英文、明暗主题下的 RN 页面与表单。这些检查不替代 Android/iOS 真机验证；当前主机缺少完整 Xcode 和 Android SDK。后续需要检查原生 Intl/BigInt、软键盘、表单与系统弹窗焦点、飞行模式及强制重开后的持久化。

行情网络状态使用 `@react-native-community/netinfo` 原生模块；更新依赖后需重新构建安装 App，iOS 先重新安装 Pods，单独刷新 Metro 不能补齐原生模块。

## 加密数据备份

设置页通过 `@react-native-documents/picker` 选择 `.mogo` 文件，通过 `react-native-share` 调用系统分享／存储面板。TurboModule 的 `readBackupFile`、`writeBackupFile` 只处理已经加密的文本容器；密码派生、认证解密、SQLite 快照与恢复均在 C++ 串行队列完成。

新增或更新上述原生依赖后必须重新安装 Pods 并重建 App。当前工作机已验证 RN Codegen、JS 测试和宿主机 Native Core，尚未完成 Android/iOS 原生编译与系统文件选择器、分享面板的模拟器或真机验收。
