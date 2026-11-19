# MoGo React Native

Android/iOS 原生离线入口，复用 MoGo 共享 Hook 与 C++20 应用核心。

从**仓库根目录**运行 `npm ci`，然后 `make mobile-doctor`。完整环境配置、启动命令、存储位置、裁剪开关和验收限制见 [手机端开发说明](../../../docs/mobile-development.md)。

```bash
make dev-mobile
# 另一终端，根据目标平台：
make mobile-ios
make mobile-android
```

这不是 WebView，也不需要先启动 `make dev-gui`。
