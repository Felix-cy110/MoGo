# 第三方依赖

- `nlohmann/json.hpp`：nlohmann/json v3.12.0，MIT；原始单头文件，未经修改。
  来源：https://github.com/nlohmann/json/tree/v3.12.0/single_include/nlohmann
  SHA-256：`aaf127c04cb31c406e5b04a63f1ae89369fccde6d8fa7cdda1ed4f32dfc5de63`。
  CMake 和 CocoaPods 共用同一版本，不在移动端构建时额外运行 Git 下载。
- Android SQLite 3.50.4：构建时由 `cmake/AndroidSQLite.cmake` 下载官方 amalgamation 并验证 SHA-256；公有领域。
  iOS 使用系统 SQLite。应用运行时不需要网络。

- `infint/InfInt.hpp`：InfInt，MPL-2.0；原始 `InfInt.h` 仅改文件名，内容未经修改，许可全文随附。
  来源：https://github.com/sercantutar/infint/blob/fc767eda13ce5981b768bdac44b3344344033bf3/InfInt.h
  固定提交：`fc767eda13ce5981b768bdac44b3344344033bf3`；SHA-256：`a66d8bcdfd372a761181248007ebb23b090d3d0c5bbbd0a59d9cbdca1e608069`。
  仅投资管理的计算单元引用，用于整数与有理数精确运算；关闭该 feature 时不编译。平台限值宏适配放在调用方。

- `monocypher.c` / `monocypher.h`：Monocypher v4.0.3，BSD-2-Clause OR CC0-1.0；原始源码，未经修改。
  来源：https://github.com/LoupVaillant/Monocypher/tree/4.0.3/src
  许可文本保留在源码头部，作者信息随附于 `MONOCYPHER_AUTHORS.md`。
  用于本地备份的 Argon2id 密钥派生与 XChaCha20-Poly1305 认证加密。
