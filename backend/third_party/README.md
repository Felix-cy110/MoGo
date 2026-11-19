# 第三方依赖

- `nlohmann/json.hpp`：nlohmann/json v3.12.0，MIT；原始单头文件，未经修改。
  来源：https://github.com/nlohmann/json/tree/v3.12.0/single_include/nlohmann
  SHA-256：`aaf127c04cb31c406e5b04a63f1ae89369fccde6d8fa7cdda1ed4f32dfc5de63`。
  CMake 和 CocoaPods 共用同一版本，不在移动端构建时额外运行 Git 下载。
- Android SQLite 3.50.4：构建时由 `cmake/AndroidSQLite.cmake` 下载官方 amalgamation 并验证 SHA-256；公有领域。
  iOS 使用系统 SQLite。应用运行时不需要网络。
