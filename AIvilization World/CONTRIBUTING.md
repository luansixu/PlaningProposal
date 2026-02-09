# 贡献指南

感谢您对Microverse项目的关注！我们欢迎所有形式的贡献，包括但不限于代码、文档、测试、反馈和建议。

## 🤝 如何贡献

### 报告问题

如果您发现了bug或有功能建议，请：

1. 首先检查[现有Issues](https://github.com/KsanaDock/Microverse/issues)，确保问题尚未被报告
2. 创建新的Issue，并提供以下信息：
   - 清晰的问题描述
   - 重现步骤（如果是bug）
   - 预期行为和实际行为
   - 系统环境信息（操作系统、Godot版本等）
   - 相关截图或日志（如果适用）

### 提交代码

#### 准备工作

1. Fork本项目到您的GitHub账户
2. 克隆您的Fork到本地：
   ```bash
   git clone https://github.com/KsanaDock/Microverse.git
   cd microverse
   ```
3. 添加上游仓库：
   ```bash
   git remote add upstream https://github.com/KsanaDock/Microverse.git
   ```

#### 开发流程

1. 创建新的功能分支：
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. 进行开发：
   - 遵循项目的代码风格
   - 添加必要的注释
   - 确保代码可以正常运行

3. 提交更改：
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

4. 推送到您的Fork：
   ```bash
   git push origin feature/your-feature-name
   ```

5. 创建Pull Request

## 📝 代码规范

### GDScript编码规范

1. **命名约定**：
   - 变量和函数使用snake_case：`my_variable`, `calculate_damage()`
   - 常量使用UPPER_CASE：`MAX_HEALTH`, `DEFAULT_SPEED`
   - 类名使用PascalCase：`CharacterManager`, `DialogService`

2. **缩进和格式**：
   - 使用Tab缩进（Godot默认）
   - 每行最大长度100字符
   - 函数之间空一行

3. **注释**：
   - 为复杂逻辑添加注释
   - 公共函数应有文档注释
   - 使用中文注释（项目主要面向中文用户）

4. **示例**：
   ```gdscript
   # 计算角色之间的距离
   # @param character1: 第一个角色
   # @param character2: 第二个角色
   # @return: 两个角色之间的距离
   func calculate_distance(character1: Node2D, character2: Node2D) -> float:
       var distance = character1.global_position.distance_to(character2.global_position)
       return distance
   ```

### 文件组织

1. **脚本文件**：
   - 按功能模块组织在`script/`目录下
   - AI相关脚本放在`script/ai/`
   - UI相关脚本放在`script/ui/`

2. **场景文件**：
   - 角色场景放在`scene/characters/`
   - UI场景放在`scene/ui/`
   - 地图场景放在`scene/maps/`

3. **资源文件**：
   - 图片资源放在`asset/`对应子目录
   - 字体文件放在`asset/fonts/`

## 🧪 测试

虽然项目目前没有自动化测试框架，但请确保：

1. 您的代码在Godot编辑器中没有错误
2. 相关功能可以正常运行
3. 没有破坏现有功能

## 📚 文档

如果您的贡献涉及新功能或API更改：

1. 更新相关的文档文件
2. 在代码中添加适当的注释
3. 如果需要，更新README.md

## 🔄 Pull Request流程

1. **PR标题**：使用清晰的标题描述您的更改
   - `feat: 添加新的AI角色系统`
   - `fix: 修复对话系统内存泄漏`
   - `docs: 更新API文档`

2. **PR描述**：
   - 描述您的更改内容
   - 说明更改的原因
   - 列出相关的Issue（如果有）
   - 提供测试说明

3. **代码审查**：
   - 维护者会审查您的代码
   - 根据反馈进行必要的修改
   - 所有检查通过后，PR将被合并

## 🎯 贡献领域

我们特别欢迎以下方面的贡献：

### 核心功能
- AI对话系统优化
- 新的AI服务提供商集成
- 角色行为和决策系统
- 记忆系统改进

### 用户界面
- UI/UX改进
- 新的主题和样式
- 可访问性增强
- 移动端适配

### 内容创作
- 新的角色和背景故事
- 场景和地图设计
- 音效和音乐
- 本地化和翻译

### 技术改进
- 性能优化
- 代码重构
- 错误处理改进
- 日志和调试工具

### 文档和教程
- API文档
- 使用教程
- 开发指南
- 示例项目

## 🏷️ 提交消息规范

使用以下前缀来标识提交类型：

- `feat:` 新功能
- `fix:` 错误修复
- `docs:` 文档更新
- `style:` 代码格式化（不影响功能）
- `refactor:` 代码重构
- `test:` 测试相关
- `chore:` 构建过程或辅助工具的变动

示例：
```
feat: 添加Kimi AI模型支持
fix: 修复角色移动时的碰撞检测问题
docs: 更新API配置文档
```

## 📞 联系方式

如果您有任何问题或需要帮助：

- 创建Issue进行讨论
- 发送邮件至：ksanadock@example.com
- 加入我们的社区讨论

## 📄 许可证

通过贡献代码，您同意您的贡献将在MIT许可证下发布。

---

再次感谢您的贡献！每一个贡献都让Microverse变得更好。