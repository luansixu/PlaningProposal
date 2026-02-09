# 故事背景管理系统

## 概述

故事背景管理系统允许根据不同的地图设置不同的故事背景，并支持用户在 GodUI 界面中额外设置社会规则。最终故事背景和社会规则都会被集成到 AI 对话的 prompt 中。

## 文件结构

```
script/ai/background_story/
├── BackgroundStoryManager.gd    # 核心管理类
├── BackgroundStoryUI.gd         # UI组件类（可选）
└── README.md                    # 本文档
```

## 核心功能

### 1. 预设故事背景

系统预设了三种地图的故事背景：
- **Office（办公室）**: 现代企业办公环境
- **School（学校）**: 教育机构环境
- **Jail（监狱）**: 监狱管理环境

每种背景包含：
- 地图名称
- 机构名称
- 背景描述
- 预设社会规则

### 2. 自定义社会规则

用户可以通过 GodUI 界面添加、删除、清空自定义社会规则，这些规则会与预设规则一起应用到 AI 对话中。

## API 接口

### BackgroundStoryManager 静态方法

#### 基础操作

```gdscript
# 设置当前故事背景
BackgroundStoryManager.set_background(map_name: String) -> bool

# 获取故事背景信息
BackgroundStoryManager.get_background(map_name: String) -> StoryBackground

# 获取可用地图列表
BackgroundStoryManager.get_available_maps() -> Array[String]
```

#### 当前状态获取

```gdscript
# 获取当前地图名称
BackgroundStoryManager.get_current_map_name() -> String

# 获取当前公司名称
BackgroundStoryManager.get_current_company_name() -> String

# 获取当前背景描述
BackgroundStoryManager.get_current_background_description() -> String
```

#### 规则管理

```gdscript
# 获取预设规则
BackgroundStoryManager.get_preset_rules() -> Array[String]

# 获取自定义规则
BackgroundStoryManager.get_custom_rules() -> Array[String]

# 获取所有规则（预设+自定义）
BackgroundStoryManager.get_all_rules() -> Array[String]

# 添加自定义规则
BackgroundStoryManager.add_custom_rule(rule: String) -> bool

# 移除自定义规则
BackgroundStoryManager.remove_custom_rule(index: int) -> bool

# 清空所有自定义规则
BackgroundStoryManager.clear_custom_rules()
```

#### Prompt 生成

```gdscript
# 生成完整的背景和规则 prompt
BackgroundStoryManager.generate_background_prompt() -> String

# 获取背景摘要信息
BackgroundStoryManager.get_background_summary() -> Dictionary
```

#### 数据持久化

```gdscript
# 保存自定义规则到文件
BackgroundStoryManager.save_custom_rules(file_path: String) -> bool

# 从文件加载自定义规则
BackgroundStoryManager.load_custom_rules(file_path: String) -> bool
```

## 使用示例

### 1. 在地图选择时设置背景

```gdscript
# 在 MapSelection.gd 中
func _on_office_selected():
    # 设置办公室故事背景
    BackgroundStoryManager.set_background("Office")
    # 加载场景
    get_tree().change_scene_to_file("res://scene/Office.tscn")
```

### 2. 在 AI 对话中使用背景

```gdscript
# 在 ConversationManager.gd 中
func build_dialog_prompt(...):
    # 获取故事背景和社会规则
    var background_prompt = BackgroundStoryManager.generate_background_prompt()
    
    var prompt = "你是一个员工..."
    
    # 添加故事背景和社会规则
    if not background_prompt.is_empty():
        prompt += "\n\n" + background_prompt
    
    # 继续构建其他 prompt 内容...
```

### 3. 在 UI 中管理规则

```gdscript
# 在 GodUI.gd 中
func _on_background_pressed():
    background_popup.popup_centered()
    _init_background_popup()

func _on_add_rule_pressed():
    var rule_text = add_rule_input.text.strip_edges()
    if BackgroundStoryManager.add_custom_rule(rule_text):
        add_rule_input.text = ""
        _update_custom_rules_display()
```

## 数据结构

### StoryBackground 类

```gdscript
class StoryBackground:
    var map_name: String          # 地图名称
    var company_name: String      # 机构名称
    var background_description: String  # 背景描述
    var preset_rules: Array[String]     # 预设规则列表
```

### SocialRule 类

```gdscript
class SocialRule:
    var rule_text: String        # 规则文本
    var is_custom: bool          # 是否为自定义规则
```

## 预设配置

### Office（办公室）
- **机构名称**: 创新科技有限公司
- **背景**: 现代化办公环境，注重效率和团队协作
- **预设规则**: 工作时间规范、会议礼仪、着装要求等

### School（学校）
- **机构名称**: 阳光中学
- **背景**: 教育机构环境，师生关系和谐
- **预设规则**: 课堂纪律、师生礼仪、学习规范等

### Jail（监狱）
- **机构名称**: 第一监狱
- **背景**: 严格管理的监狱环境
- **预设规则**: 监狱纪律、安全规定、行为规范等

## 扩展指南

### 添加新的地图背景

1. 在 `BackgroundStoryManager.gd` 的 `story_backgrounds` 字典中添加新配置：

```gdscript
static var story_backgrounds = {
    "NewMap": StoryBackground.new(
        "NewMap",
        "新机构名称",
        "新的背景描述...",
        ["规则1", "规则2", "规则3"]
    )
}
```

2. 在地图选择界面调用 `BackgroundStoryManager.set_background("NewMap")`

### 自定义 UI 组件

可以使用 `BackgroundStoryUI.gd` 作为参考，创建自定义的故事背景管理界面。

## 注意事项

1. **线程安全**: 所有方法都是静态的，可以在任何地方安全调用
2. **数据持久化**: 自定义规则会在游戏会话中保持，但需要手动保存到文件以实现跨会话持久化
3. **性能考虑**: prompt 生成是实时的，频繁调用时注意性能影响
4. **错误处理**: 所有方法都包含适当的错误检查和默认值处理

## 更新日志

- **v1.0**: 初始版本，支持基础的故事背景和社会规则管理
- 预设三种地图背景（Office、School、Jail）
- 支持自定义社会规则的增删改查
- 集成到 AI 对话 prompt 生成中
- 提供完整的 GodUI 界面支持