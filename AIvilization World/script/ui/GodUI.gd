extends Control

# 脚本引用
var BackgroundStoryManager = preload("res://script/ai/background_story/BackgroundStoryManager.gd")

# 面板引用
@onready var left_panel = $HBoxContainer/LeftPanel
@onready var right_panel = $HBoxContainer/RightPanel
@onready var character_list = $HBoxContainer/LeftPanel/VBoxContainer/CharacterList
@onready var character_detail = $HBoxContainer/LeftPanel/VBoxContainer/CharacterDetail
@onready var toggle_ui_button = $HBoxContainer/RightPanel/VBoxContainer/ToggleUIButton

# 弹窗引用
@onready var implant_memory_popup = $Popups/ImplantMemoryPopup
@onready var disease_popup = $Popups/DiseasePopup
@onready var money_popup = $Popups/MoneyPopup
@onready var emotion_popup = $Popups/EmotionPopup
@onready var task_popup = $Popups/TaskPopup
@onready var background_popup = $Popups/BackgroundPopup

# 角色详情面板引用
@onready var task_detail_list = $HBoxContainer/LeftPanel/VBoxContainer/CharacterDetail/TabContainer/任务/TaskDetailList
@onready var ai_settings_container = $HBoxContainer/LeftPanel/VBoxContainer/CharacterDetail/TabContainer/AI设置/AISettingsContainer
@onready var avatar_sprite = $HBoxContainer/LeftPanel/VBoxContainer/CharacterDetail/HBoxContainer/Avatar/AnimatedSprite2D

# 当前选中的角色
var selected_character = null
var all_characters = []
var ui_visible = true

func _ready():
	# 初始隐藏头像动画节点
	if avatar_sprite:
		avatar_sprite.visible = false
	
	# 连接按钮信号
	$HBoxContainer/RightPanel/VBoxContainer/ImplantMemoryButton.pressed.connect(_on_implant_memory_pressed)
	$HBoxContainer/RightPanel/VBoxContainer/DiseaseButton.pressed.connect(_on_disease_pressed)
	$HBoxContainer/RightPanel/VBoxContainer/MoneyButton.pressed.connect(_on_money_pressed)
	$HBoxContainer/RightPanel/VBoxContainer/EmotionButton.pressed.connect(_on_emotion_pressed)
	$HBoxContainer/RightPanel/VBoxContainer/TaskButton.pressed.connect(_on_task_pressed)
	$HBoxContainer/RightPanel/VBoxContainer/BackgroundButton.pressed.connect(_on_background_pressed)
	toggle_ui_button.pressed.connect(_on_toggle_ui_pressed)
	
	# 连接角色列表信号
	character_list.item_selected.connect(_on_character_selected)
	
	# 连接弹窗按钮信号
	implant_memory_popup.get_node("VBoxContainer/HBoxContainer/CancelButton").pressed.connect(func(): implant_memory_popup.hide())
	implant_memory_popup.get_node("VBoxContainer/HBoxContainer/ConfirmButton").pressed.connect(_on_implant_memory_confirm)
	
	disease_popup.get_node("VBoxContainer/HBoxContainer/CancelButton").pressed.connect(func(): disease_popup.hide())
	disease_popup.get_node("VBoxContainer/HBoxContainer/ConfirmButton").pressed.connect(_on_disease_confirm)
	
	money_popup.get_node("VBoxContainer/HBoxContainer/CancelButton").pressed.connect(func(): money_popup.hide())
	money_popup.get_node("VBoxContainer/HBoxContainer/ConfirmButton").pressed.connect(_on_money_confirm)
	
	emotion_popup.get_node("VBoxContainer/HBoxContainer/CancelButton").pressed.connect(func(): emotion_popup.hide())
	emotion_popup.get_node("VBoxContainer/HBoxContainer/ConfirmButton").pressed.connect(_on_emotion_confirm)
	
	task_popup.get_node("VBoxContainer/ButtonContainer/CloseButton").pressed.connect(func(): task_popup.hide())
	task_popup.get_node("VBoxContainer/ButtonContainer/RefreshButton").pressed.connect(_on_refresh_tasks)
	task_popup.get_node("VBoxContainer/AddTaskContainer/AddTaskButton").pressed.connect(_on_add_task)
	task_popup.get_node("VBoxContainer/AddTaskContainer/PriorityContainer/PrioritySlider").value_changed.connect(_on_priority_changed)
	
	# 连接弹窗的close_requested信号（点击右上角X按钮时触发）
	implant_memory_popup.close_requested.connect(func(): implant_memory_popup.hide())
	disease_popup.close_requested.connect(func(): disease_popup.hide())
	money_popup.close_requested.connect(func(): money_popup.hide())
	emotion_popup.close_requested.connect(func(): emotion_popup.hide())
	task_popup.close_requested.connect(func(): task_popup.hide())
	background_popup.close_requested.connect(func(): background_popup.hide())
	
	# 连接滑块信号
	disease_popup.get_node("VBoxContainer/SeveritySlider").value_changed.connect(_on_disease_severity_changed)
	emotion_popup.get_node("VBoxContainer/EmotionStrength").value_changed.connect(_on_emotion_strength_changed)
	
	# 初始化任务系统
	_init_task_system()
	
	# 初始化疾病选项
	var disease_selector = disease_popup.get_node("VBoxContainer/DiseaseSelector")
	disease_selector.add_item("感冒")
	disease_selector.add_item("发烧")
	disease_selector.add_item("过敏")
	disease_selector.add_item("抑郁")
	disease_selector.add_item("焦虑")
	disease_selector.add_item("受伤")
	
	# 初始化情感类型选项
	var emotion_selector = emotion_popup.get_node("VBoxContainer/EmotionType")
	emotion_selector.add_item("喜欢")
	emotion_selector.add_item("尊敬")
	emotion_selector.add_item("嫉妒")
	emotion_selector.add_item("愤怒")
	emotion_selector.add_item("信任")
	emotion_selector.add_item("怀疑")
	emotion_selector.add_item("崇拜")
	
	# 获取场景中的角色
	_update_character_lists()
	
	# 初始关闭UI
	_toggle_ui(true)

# 每帧更新一次角色列表，确保能捕获到动态添加的角色
func _process(_delta):
	# 每隔一段时间更新角色列表
	if Engine.get_process_frames() % 60 == 0:  # 每约1秒检查一次
		_update_character_lists()

func _update_character_lists():
	# 获取所有角色
	var new_characters = get_tree().get_nodes_in_group("controllable_characters")
	
	# 检查是否有变化
	var has_changes = false
	if new_characters.size() != all_characters.size():
		has_changes = true
	else:
		for i in range(new_characters.size()):
			if not (i < all_characters.size() and new_characters[i] == all_characters[i]):
				has_changes = true
				break
	
	if not has_changes:
		return
		
	# 更新角色列表
	all_characters = new_characters
	
	# 清空角色列表
	character_list.clear()
	
	# 更新所有弹窗的角色选择器
	var popup_selectors = [
		implant_memory_popup.get_node("VBoxContainer/CharacterSelector"),
		disease_popup.get_node("VBoxContainer/CharacterSelector"),
		money_popup.get_node("VBoxContainer/CharacterSelector"),
		emotion_popup.get_node("VBoxContainer/CharacterSelectorA"),
		emotion_popup.get_node("VBoxContainer/CharacterSelectorB"),
		task_popup.get_node("VBoxContainer/CharacterSelector")
	]
	
	for selector in popup_selectors:
		selector.clear()
	
	# 添加角色到列表和选择器
	for character in all_characters:
		var name = character.name
		character_list.add_item(name)
		
		for selector in popup_selectors:
			selector.add_item(name)
	
	# 如果之前有选中的角色，尝试保持选中状态
	if selected_character:
		var index = all_characters.find(selected_character)
		if index >= 0:
			character_list.select(index)
		else:
			selected_character = null
			_update_character_detail() # 清空详情

func _on_character_selected(index):
	if index >= 0 and index < all_characters.size():
		selected_character = all_characters[index]
		_update_character_detail()

func _update_character_detail():
	if not selected_character:
		# 清空详情显示
		character_detail.get_node("NameLabel").text = "姓名："
		character_detail.get_node("HBoxContainer/VBoxContainer/MoneyLabel").text = "存款：0"
		character_detail.get_node("HBoxContainer/VBoxContainer/MoodLabel").text = "心情：普通"
		character_detail.get_node("HBoxContainer/VBoxContainer/HealthLabel").text = "健康：良好"
		character_detail.get_node("TabContainer/人设/PersonalityText").text = "选择一个角色查看人设..."
		_clear_children(character_detail.get_node("TabContainer/记忆/MemoryList"))
		_clear_children(character_detail.get_node("TabContainer/情感/RelationList"))
		
		# 隐藏Avatar动画节点
		if avatar_sprite:
			avatar_sprite.stop()
			avatar_sprite.visible = false
		
		# 清空AI设置界面
		if ai_settings_container and ai_settings_container.has_method("set_character"):
			ai_settings_container.set_character("")
		
		return
	
	# 基本信息
	character_detail.get_node("NameLabel").text = "姓名：" + selected_character.name
	
	# 尝试获取角色属性，如果不存在则使用默认值
	var money = selected_character.get_meta("money", 0)
	var mood = selected_character.get_meta("mood", "普通")
	var health = selected_character.get_meta("health", "良好")
	
	character_detail.get_node("HBoxContainer/VBoxContainer/MoneyLabel").text = "存款：" + str(money)
	character_detail.get_node("HBoxContainer/VBoxContainer/MoodLabel").text = "心情：" + str(mood)
	character_detail.get_node("HBoxContainer/VBoxContainer/HealthLabel").text = "健康：" + str(health)
	
	# 人设
	var personality_data = CharacterPersonality.get_personality(selected_character.name)
	var personality_text = ""
	if personality_data.has("personality"):
		personality_text = "人设：" + personality_data["personality"] + "\n\n"
	if personality_data.has("position"):
		personality_text += "职位：" + personality_data["position"] + "\n\n"
	if personality_data.has("speaking_style"):
		personality_text += "说话风格：" + personality_data["speaking_style"] + "\n\n"
	if personality_data.has("work_duties"):
		personality_text += "工作职责：" + personality_data["work_duties"] + "\n\n"
	if personality_data.has("work_habits"):
		personality_text += "工作习惯：" + personality_data["work_habits"]
	
	if personality_text.is_empty():
		personality_text = "未设置人设"
	
	character_detail.get_node("TabContainer/人设/PersonalityText").text = personality_text
	
	# 记忆 - 使用MemoryManager获取记忆信息
	var memory_list = character_detail.get_node("TabContainer/记忆/MemoryList")
	_clear_children(memory_list)
	
	
	var memories = MemoryManager.get_character_memories(selected_character)
	for memory in memories:
		var memory_label = Label.new()
		# 处理不同格式的记忆数据
		var memory_text = ""
		if typeof(memory) == TYPE_DICTIONARY:
			# 使用MemoryManager的格式化函数处理Dictionary格式
			memory_text = MemoryManager._format_memory_for_display(memory)
		elif typeof(memory) == TYPE_STRING:
			# 直接使用String格式的记忆
			memory_text = memory
		else:
			# 其他类型转换为字符串
			memory_text = str(memory)
		
		memory_label.text = memory_text
		memory_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		memory_list.add_child(memory_label)
		memory_list.add_child(HSeparator.new())
	
	# 情感关系
	var relation_list = character_detail.get_node("TabContainer/情感/RelationList")
	_clear_children(relation_list)
	
	var relations = selected_character.get_meta("relations", {})
	for target_name in relations:
		var relation = relations[target_name]
		var relation_label = Label.new()
		var emotion_text = relation["type"] if relation.has("type") else "未知"
		var strength = relation["strength"] if relation.has("strength") else 0
		relation_label.text = "对 " + target_name + " 的情感：" + emotion_text + " (强度：" + str(strength) + ")"
		relation_list.add_child(relation_label)
	
	# 更新Avatar动画
	_update_avatar_animation()
	
	# 更新任务信息
	_update_task_detail()
	
	# 更新AI设置界面
	if ai_settings_container and ai_settings_container.has_method("set_character"):
		ai_settings_container.set_character(selected_character.name)

# 更新Avatar动画
func _update_avatar_animation():
	if not avatar_sprite or not selected_character:
		return
	
	# 显示Avatar动画节点
	avatar_sprite.visible = true
	
	# 根据角色名称设置对应的动画
	# 这里假设动画名称格式为 "角色名_idle"（全小写）
	var animation_name = selected_character.name.to_lower() + "_idle"
	
	# 检查是否存在该动画
	if avatar_sprite.sprite_frames and avatar_sprite.sprite_frames.has_animation(animation_name):
		avatar_sprite.play(animation_name)
	else:
		# 如果没有找到特定角色的动画，尝试播放默认动画
		if avatar_sprite.sprite_frames and avatar_sprite.sprite_frames.has_animation("default"):
			avatar_sprite.play("default")
		else:
			# 如果连默认动画都没有，尝试播放第一个可用的动画
			var animations = avatar_sprite.sprite_frames.get_animation_names()
			if animations.size() > 0:
				avatar_sprite.play(animations[0])
			else:
				print("警告：没有找到可用的动画")

func _clear_children(node):
	for child in node.get_children():
		child.queue_free()

func _on_toggle_ui_pressed():
	_toggle_ui(!ui_visible)

func _toggle_ui(show):
	ui_visible = show
	left_panel.visible = show
	right_panel.visible = show # 确保右侧面板也能切换
	toggle_ui_button.visible = true # 总是保持可见
	toggle_ui_button.text = "隐藏 UI" if show else "显示 UI"

func _on_implant_memory_pressed():
	implant_memory_popup.popup_centered()

func _on_disease_pressed():
	disease_popup.popup_centered()

func _on_money_pressed():
	money_popup.popup_centered()

func _on_emotion_pressed():
	emotion_popup.popup_centered()
	
func _on_task_pressed():
	task_popup.popup_centered()
	_update_task_list()

func _on_implant_memory_confirm():
	var character_selector = implant_memory_popup.get_node("VBoxContainer/CharacterSelector")
	var memory_input = implant_memory_popup.get_node("VBoxContainer/MemoryInput")
	
	if character_selector.selected < 0 or all_characters.size() <= character_selector.selected:
		return
	
	var character = all_characters[character_selector.selected]
	var memory_text = memory_input.text
	
	if memory_text.strip_edges().is_empty():
		return
	
	# 使用MemoryManager添加记忆，设置为高重要性（玩家植入的记忆应该被优先考虑）
	MemoryManager.add_memory(character, memory_text, MemoryManager.MemoryType.PERSONAL, MemoryManager.MemoryImportance.HIGH)
	print("记忆已通过MemoryManager保存: ", memory_text)
	
	# 更新角色详情
	if selected_character == character:
		_update_character_detail()
	
	memory_input.text = ""
	implant_memory_popup.hide()

func _on_disease_confirm():
	var character_selector = disease_popup.get_node("VBoxContainer/CharacterSelector")
	var disease_selector = disease_popup.get_node("VBoxContainer/DiseaseSelector")
	var severity_slider = disease_popup.get_node("VBoxContainer/SeveritySlider")
	
	if character_selector.selected < 0 or all_characters.size() <= character_selector.selected:
		return
	
	var character = all_characters[character_selector.selected]
	var disease_type = disease_selector.get_item_text(disease_selector.selected)
	var severity = int(severity_slider.value)
	
	# 设置疾病
	var health_info = disease_type + " (严重程度：" + str(severity) + "/10)"
	character.set_meta("health", health_info)
	
	# 添加疾病相关记忆
	var character_data = character.get_meta("character_data", {})
	if not character_data.has("memories"):
		character_data["memories"] = []
	
	var current_time = Time.get_datetime_dict_from_system()
	var time_str = "%04d-%02d-%02d %02d:%02d" % [
		current_time.year, current_time.month, current_time.day,
		current_time.hour, current_time.minute
	]
	
	var severity_text = "轻微"
	if severity > 3 and severity <= 7:
		severity_text = "中等"
	elif severity > 7:
		severity_text = "严重"
		
	# 使用MemoryManager添加疾病记忆
	var memory_text = "感到身体不适，患上了%s程度的%s" % [severity_text, disease_type]
	MemoryManager.add_memory(character, memory_text, MemoryManager.MemoryType.PERSONAL, MemoryManager.MemoryImportance.HIGH)
	
	# 更新角色详情
	if selected_character == character:
		_update_character_detail()
	
	disease_popup.hide()

func _on_money_confirm():
	var character_selector = money_popup.get_node("VBoxContainer/CharacterSelector")
	var money_input = money_popup.get_node("VBoxContainer/MoneyInput")
	var reason_input = money_popup.get_node("VBoxContainer/ReasonInput")
	
	if character_selector.selected < 0 or all_characters.size() <= character_selector.selected:
		return
	
	var character = all_characters[character_selector.selected]
	var amount = int(money_input.value)
	var reason = reason_input.text
	
	# 调试信息：打印原因输入
	print("原因输入框内容: '", reason, "'")
	print("原因输入框内容长度: ", reason.length())
	print("去除空格后的原因: '", reason.strip_edges(), "'")
	
	if reason.strip_edges().is_empty():
		reason = "未知原因"
		print("原因为空，设置为: ", reason)
	else:
		print("使用用户输入的原因: ", reason)
	
	# 修改金钱
	if not character.has_meta("money"):
		character.set_meta("money", 0)
	
	var current_money = character.get_meta("money", 0)
	current_money += amount
	character.set_meta("money", current_money)
	
	# 添加金钱相关记忆
	var character_data = character.get_meta("character_data", {})
	if not character_data.has("memories"):
		character_data["memories"] = []
	
	var current_time = Time.get_datetime_dict_from_system()
	var time_str = "%04d-%02d-%02d %02d:%02d" % [
		current_time.year, current_time.month, current_time.day,
		current_time.hour, current_time.minute
	]
	
	var memory_text = ""
	if amount > 0:
		memory_text = "获得了 " + str(amount) + " 元，原因是：" + reason
	else:
		memory_text = "损失了 " + str(abs(amount)) + " 元，原因是：" + reason
	
	# 使用MemoryManager添加金钱记忆
	MemoryManager.add_memory(character, memory_text, MemoryManager.MemoryType.PERSONAL, MemoryManager.MemoryImportance.NORMAL)
	print("记忆已通过MemoryManager保存: ", memory_text)
	
	# 更新角色详情
	if selected_character == character:
		_update_character_detail()
	
	money_input.value = 0
	reason_input.text = ""
	money_popup.hide()

func _on_emotion_confirm():
	var selector_a = emotion_popup.get_node("VBoxContainer/CharacterSelectorA")
	var selector_b = emotion_popup.get_node("VBoxContainer/CharacterSelectorB")
	var emotion_type = emotion_popup.get_node("VBoxContainer/EmotionType")
	var emotion_strength = emotion_popup.get_node("VBoxContainer/EmotionStrength")
	
	if selector_a.selected < 0 or selector_b.selected < 0 or all_characters.size() <= selector_a.selected or all_characters.size() <= selector_b.selected:
		return
	
	var character_a = all_characters[selector_a.selected]
	var character_b = all_characters[selector_b.selected]
	
	if character_a == character_b:
		return
	
	var type = emotion_type.get_item_text(emotion_type.selected)
	var strength = int(emotion_strength.value)
	
	# 设置情感关系
	if not character_a.has_meta("relations"):
		character_a.set_meta("relations", {})
	
	var relations = character_a.get_meta("relations", {})
	relations[character_b.name] = {
		"type": type,
		"strength": strength
	}
	character_a.set_meta("relations", relations)
	
	# 添加情感相关记忆
	if not character_a.has_meta("memories"):
		character_a.set_meta("memories", [])
	
	var current_time = Time.get_datetime_dict_from_system()
	var time_str = "%04d-%02d-%02d %02d:%02d" % [
		current_time.year, current_time.month, current_time.day,
		current_time.hour, current_time.minute
	]
	
	var strength_text = ""
	if strength < -5:
		strength_text = "强烈地"
	elif strength < 0:
		strength_text = "轻微地"
	elif strength == 0:
		strength_text = "中立地"
	elif strength <= 5:
		strength_text = "轻微地"
	else:
		strength_text = "强烈地"
	
	var emotion_text = ""
	if strength < 0:
		emotion_text = "对%s产生了%s%s的负面情感" % [character_b.name, strength_text, type]
	elif strength == 0:
		emotion_text = "对%s的%s情感变为中立" % [character_b.name, type]
	else:
		emotion_text = "对%s产生了%s%s的正面情感" % [character_b.name, strength_text, type]
	
	# 使用MemoryManager添加情感记忆
	MemoryManager.add_memory(character_a, emotion_text, MemoryManager.MemoryType.EMOTION, MemoryManager.MemoryImportance.NORMAL)
	
	# 更新角色详情
	if selected_character == character_a:
		_update_character_detail()
	
	emotion_popup.hide()

func _on_disease_severity_changed(value):
	var severity_text = ""
	if value <= 3:
		severity_text = "轻微"
	elif value <= 7:
		severity_text = "中等"
	else:
		severity_text = "严重"
	
	disease_popup.get_node("VBoxContainer/SeverityLabel").text = severity_text + " (" + str(int(value)) + "/10)"

func _on_emotion_strength_changed(value):
	var strength_text = ""
	if value < -5:
		strength_text = "强烈厌恶"
	elif value < 0:
		strength_text = "轻度厌恶"
	elif value == 0:
		strength_text = "中立"
	elif value <= 5:
		strength_text = "轻度喜欢"
	else:
		strength_text = "强烈喜欢"
	
	emotion_popup.get_node("VBoxContainer/StrengthLabel").text = strength_text + " (" + str(int(value)) + "/10)"

# 初始化任务系统
func _init_task_system():
	# 为每个角色初始化任务列表
	for character in all_characters:
		if not character.has_meta("tasks"):
			character.set_meta("tasks", [])
			
		# 为每个角色设置每日任务刷新的时间戳
		if not character.has_meta("last_task_refresh"):
			character.set_meta("last_task_refresh", Time.get_unix_time_from_system())

# 更新任务列表UI
func _update_task_list():
	var character_selector = task_popup.get_node("VBoxContainer/CharacterSelector")
	if character_selector.selected < 0 or character_selector.selected >= all_characters.size():
		return
		
	var selected_character = all_characters[character_selector.selected]
	
	# 获取任务列表
	var character_data = selected_character.get_meta("character_data", {})
	var tasks = character_data.get("tasks", [])
	
	# 清空当前任务容器
	var task_container = task_popup.get_node("VBoxContainer/TaskList/TaskContainer")
	for child in task_container.get_children():
		child.queue_free()
		
	# 按渴望程度排序任务（从高到低）
	tasks.sort_custom(func(a, b): return a["priority"] > b["priority"])
	
	# 添加任务到UI
	for i in range(tasks.size()):
		var task = tasks[i]
		
		# 创建任务项容器
		var task_item = HBoxContainer.new()
		task_item.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		
		# 创建任务描述标签
		var task_label = Label.new()
		task_label.text = "%d. %s (渴望程度: %d/10)" % [i + 1, task["description"], task["priority"]]
		task_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		task_item.add_child(task_label)
		
		# 创建完成按钮
		var complete_button = Button.new()
		complete_button.text = "完成"
		complete_button.pressed.connect(_on_complete_task.bind(i))
		task_item.add_child(complete_button)
		
		# 创建删除按钮
		var delete_button = Button.new()
		delete_button.text = "删除"
		delete_button.pressed.connect(_on_delete_task.bind(i))
		task_item.add_child(delete_button)
		
		# 添加任务项到容器
		task_container.add_child(task_item)
		
	# 检查是否需要刷新每日任务
	_check_daily_task_refresh(selected_character)

# 添加新任务
func _on_add_task():
	var character_selector = task_popup.get_node("VBoxContainer/CharacterSelector")
	if character_selector.selected < 0 or character_selector.selected >= all_characters.size():
		return
		
	var selected_character = all_characters[character_selector.selected]
	
	# 获取任务描述和优先级
	var task_input = task_popup.get_node("VBoxContainer/AddTaskContainer/TaskInput")
	var priority_slider = task_popup.get_node("VBoxContainer/AddTaskContainer/PriorityContainer/PrioritySlider")
	
	var task_description = task_input.text.strip_edges()
	var priority = int(priority_slider.value)
	
	if task_description.is_empty():
		return
		
	# 创建新任务
	var new_task = {
		"description": task_description,
		"priority": priority,
		"created_at": Time.get_unix_time_from_system(),
		"completed": false
	}
	
	# 添加到角色的任务列表
	var tasks = selected_character.get_meta("tasks", [])
	tasks.append(new_task)
	selected_character.set_meta("tasks", tasks)
	
	# 清空输入框
	task_input.text = ""
	priority_slider.value = 5
	
	# 更新任务列表UI
	_update_task_list()
	
	# 添加任务记忆
	var current_time = Time.get_datetime_dict_from_system()
	var time_str = "%04d-%02d-%02d %02d:%02d" % [
		current_time.year, current_time.month, current_time.day,
		current_time.hour, current_time.minute
	]
	var memory_text = "你给自己安排了一个新任务：%s（渴望程度：%d/10）" % [task_description, priority]
	
	# 使用MemoryManager添加记忆
	MemoryManager.add_memory(selected_character, memory_text, MemoryManager.MemoryType.TASK, MemoryManager.MemoryImportance.NORMAL)
	
	# 如果当前选中的角色是正在查看的角色，更新详情面板
	if selected_character == selected_character:
		_update_character_detail()

# 完成任务
func _on_complete_task(task_index):
	var character_selector = task_popup.get_node("VBoxContainer/CharacterSelector")
	if character_selector.selected < 0 or character_selector.selected >= all_characters.size():
		return
		
	var selected_character = all_characters[character_selector.selected]
	
	# 获取任务列表
	var character_data = selected_character.get_meta("character_data", {})
	var tasks = character_data.get("tasks", [])
	
	if task_index < 0 or task_index >= tasks.size():
		return
		
	# 标记任务为已完成
	var task = tasks[task_index]
	task["completed"] = true
	task["completed_at"] = Time.get_unix_time_from_system()
	
	# 添加完成任务的记忆
	var memory_text = "你完成了任务：%s" % [task["description"]]
	
	# 使用MemoryManager添加记忆
	MemoryManager.add_memory(selected_character, memory_text, MemoryManager.MemoryType.TASK, MemoryManager.MemoryImportance.NORMAL)
	
	# 从列表中移除已完成的任务
	tasks.remove_at(task_index)
	character_data["tasks"] = tasks
	selected_character.set_meta("character_data", character_data)
	
	# 更新任务列表UI
	_update_task_list()
	
	# 如果当前选中的角色是正在查看的角色，更新详情面板
	if selected_character == selected_character:
		_update_character_detail()

# 删除任务
func _on_delete_task(task_index):
	var character_selector = task_popup.get_node("VBoxContainer/CharacterSelector")
	if character_selector.selected < 0 or character_selector.selected >= all_characters.size():
		return
		
	var selected_character = all_characters[character_selector.selected]
	
	# 获取任务列表
	var character_data = selected_character.get_meta("character_data", {})
	var tasks = character_data.get("tasks", [])
	
	if task_index < 0 or task_index >= tasks.size():
		return
		
	# 从列表中移除任务
	tasks.remove_at(task_index)
	character_data["tasks"] = tasks
	selected_character.set_meta("character_data", character_data)
	
	# 更新任务列表UI
	_update_task_list()

# 刷新任务列表
func _on_refresh_tasks():
	var character_selector = task_popup.get_node("VBoxContainer/CharacterSelector")
	if character_selector.selected < 0 or character_selector.selected >= all_characters.size():
		return
		
	var selected_character = all_characters[character_selector.selected]
	
	# 强制刷新任务
	_refresh_daily_tasks(selected_character)
	
	# 更新任务列表UI
	_update_task_list()

# 检查是否需要刷新每日任务
func _check_daily_task_refresh(character_node):
	if not character_node:
		return
		
	# 获取角色数据
	var character_data = character_node.get_meta("character_data", {})
	
	# 获取上次刷新时间
	var last_refresh = character_data.get("last_task_refresh", 0)
	var current_time = Time.get_unix_time_from_system()
	
	# 计算时间差（秒）
	var time_diff = current_time - last_refresh
	
	# 如果超过24小时（86400秒），刷新任务
	if time_diff >= 86400:
		_refresh_daily_tasks(character_node)

# 刷新每日任务
func _refresh_daily_tasks(character_node):
	if not character_node:
		return
		
	# 获取角色数据
	var character_data = character_node.get_meta("character_data", {})
	
	# 获取当前任务列表
	var tasks = character_data.get("tasks", [])
	
	# 保留未完成的任务
	var incomplete_tasks = []
	for task in tasks:
		if not task.get("completed", false):
			incomplete_tasks.append(task)
			
	# 重新排序任务（根据优先级从高到低）
	incomplete_tasks.sort_custom(func(a, b): return a["priority"] > b["priority"])
	
	# 如果任务数量少于10个，自动生成新任务
	while incomplete_tasks.size() < 10:
		# 生成随机任务
		var new_task = _generate_random_task(character_node)
		incomplete_tasks.append(new_task)
		
	# 更新任务列表
	character_data["tasks"] = incomplete_tasks
	
	# 更新刷新时间
	character_data["last_task_refresh"] = Time.get_unix_time_from_system()
	character_node.set_meta("character_data", character_data)
	
	# 添加任务刷新记忆
	var memory_text = "你重新整理了今天的任务计划，现在有%d个待完成的任务" % [incomplete_tasks.size()]
	
	# 使用MemoryManager添加记忆
	MemoryManager.add_memory(character_node, memory_text, MemoryManager.MemoryType.TASK, MemoryManager.MemoryImportance.NORMAL)

# 生成随机任务
func _generate_random_task(character_node):
	if not character_node:
		return null
		
	# 通用任务池
	var tasks_pool = [
		"检查邮件",
		"整理工作区",
		"与同事交流",
		"参加会议",
		"休息放松一下",
		"准备明天的工作",
		"回复重要邮件",
		"整理文件",
		"学习新技能",
		"思考工作改进方案",
		"与上级沟通工作进展",
		"帮助同事解决问题",
		"制定工作计划",
		"总结今日工作",
		"准备工作报告"
	]
	
	# 随机选择一个任务
	var random_task = tasks_pool[randi() % tasks_pool.size()]
	
	# 随机生成优先级（1-10）
	var random_priority = randi() % 10 + 1
	
	# 创建任务对象
	return {
		"description": random_task,
		"priority": random_priority,
		"created_at": Time.get_unix_time_from_system(),
		"completed": false
	}

# 更新任务详情显示
func _update_task_detail():
	if not selected_character:
		return
		
	# 清空当前任务详情列表
	_clear_children(task_detail_list)
	
	# 获取任务列表
	var character_data = selected_character.get_meta("character_data", {})
	var tasks = character_data.get("tasks", [])
	
	if tasks.is_empty():
		var no_task_label = Label.new()
		no_task_label.text = "暂无任务"
		task_detail_list.add_child(no_task_label)
		return
		
	# 按渴望程度排序任务（从高到低）
	tasks.sort_custom(func(a, b): return a["priority"] > b["priority"])
	
	# 显示任务统计
	var stats_label = Label.new()
	stats_label.text = "总任务数：%d" % tasks.size()
	stats_label.add_theme_font_size_override("font_size", 14)
	task_detail_list.add_child(stats_label)
	
	# 添加分隔线
	var separator = HSeparator.new()
	task_detail_list.add_child(separator)
	
	# 显示前5个最重要的任务
	var display_count = min(5, tasks.size())
	for i in range(display_count):
		var task = tasks[i]
		
		# 创建任务容器
		var task_container = VBoxContainer.new()
		task_container.add_theme_constant_override("separation", 2)
		
		# 任务标题
		var task_title = Label.new()
		task_title.text = "%d. %s" % [i + 1, task["description"]]
		task_title.add_theme_font_size_override("font_size", 12)
		task_title.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		task_container.add_child(task_title)
		
		# 任务详情
		var task_info = Label.new()
		var priority_text = "渴望程度：%d/10" % task["priority"]
		
		# 添加创建时间
		var created_time = Time.get_datetime_dict_from_unix_time(task["created_at"])
		var time_str = "%02d-%02d %02d:%02d" % [created_time.month, created_time.day, created_time.hour, created_time.minute]
		priority_text += " | 创建时间：%s" % time_str
		
		task_info.text = priority_text
		task_info.add_theme_font_size_override("font_size", 10)
		task_info.modulate = Color(0.7, 0.7, 0.7)
		task_container.add_child(task_info)
		
		# 添加任务容器到列表
		task_detail_list.add_child(task_container)
		
		# 添加分隔线（除了最后一个）
		if i < display_count - 1:
			var task_separator = HSeparator.new()
			task_detail_list.add_child(task_separator)
			
	# 如果还有更多任务，显示提示
	if tasks.size() > display_count:
		var more_label = Label.new()
		more_label.text = "...还有 %d 个任务" % (tasks.size() - display_count)
		more_label.add_theme_font_size_override("font_size", 10)
		more_label.modulate = Color(0.6, 0.6, 0.6)
		more_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		task_detail_list.add_child(more_label)

# 更新优先级滑块的值显示
func _on_priority_changed(value):
	var priority_value_label = task_popup.get_node("VBoxContainer/AddTaskContainer/PriorityContainer/PriorityValueLabel")
	priority_value_label.text = "%d/10" % int(value)

func _input(event):
	if event is InputEventKey and event.pressed:
		if event.keycode == KEY_F1:
			# 检查是否有任何设置UI可见
			var settings_ui_visible = false
			var settings = get_node_or_null("/root/GlobalSettings")
			if settings != null and settings.has_method("is_settings_visible"):
				settings_ui_visible = settings.is_settings_visible()
			
			if not settings_ui_visible:
				_toggle_ui(!ui_visible)

# 故事背景按钮点击
func _on_background_pressed():
	background_popup.popup_centered()
	_init_background_popup()

# 初始化故事背景弹窗
func _init_background_popup():
	# 初始化地图选择器
	var map_selector = background_popup.get_node("VBoxContainer/MapSelectionContainer/MapSelector")
	map_selector.clear()
	var available_maps = BackgroundStoryManager.get_available_maps()
	for map_name in available_maps:
		map_selector.add_item(map_name)
	
	# 设置当前选中的地图
	var current_map = BackgroundStoryManager.get_current_map_name()
	for i in range(map_selector.get_item_count()):
		if map_selector.get_item_text(i) == current_map:
			map_selector.selected = i
			break
	
	# 连接地图选择器信号
	if not map_selector.item_selected.is_connected(_on_map_selected):
		map_selector.item_selected.connect(_on_map_selected)
	
	# 连接弹窗按钮信号
	var add_rule_button = background_popup.get_node("VBoxContainer/AddRuleContainer/AddRuleButton")
	var clear_rules_button = background_popup.get_node("VBoxContainer/ButtonContainer/ClearRulesButton")
	var refresh_button = background_popup.get_node("VBoxContainer/ButtonContainer/RefreshButton")
	var close_button = background_popup.get_node("VBoxContainer/ButtonContainer/CloseButton")
	var add_rule_input = background_popup.get_node("VBoxContainer/AddRuleContainer/AddRuleInput")
	
	if not add_rule_button.pressed.is_connected(_on_add_rule_pressed):
		add_rule_button.pressed.connect(_on_add_rule_pressed)
	if not clear_rules_button.pressed.is_connected(_on_clear_rules_pressed):
		clear_rules_button.pressed.connect(_on_clear_rules_pressed)
	if not refresh_button.pressed.is_connected(_on_refresh_background_pressed):
		refresh_button.pressed.connect(_on_refresh_background_pressed)
	if not close_button.pressed.is_connected(func(): background_popup.hide()):
		close_button.pressed.connect(func(): background_popup.hide())
	if not add_rule_input.text_submitted.is_connected(_on_rule_input_submitted):
		add_rule_input.text_submitted.connect(_on_rule_input_submitted)
	
	# 刷新显示
	_refresh_background_display()

# 地图选择改变
func _on_map_selected(index: int):
	var map_selector = background_popup.get_node("VBoxContainer/MapSelectionContainer/MapSelector")
	var selected_map = map_selector.get_item_text(index)
	BackgroundStoryManager.set_background(selected_map)
	_refresh_background_display()

# 刷新故事背景显示
func _refresh_background_display():
	# 更新地图信息
	var map_info_label = background_popup.get_node("VBoxContainer/BackgroundInfoContainer/MapInfoLabel")
	var company_info_label = background_popup.get_node("VBoxContainer/BackgroundInfoContainer/CompanyInfoLabel")
	
	map_info_label.text = "当前地图：" + BackgroundStoryManager.get_current_map_name()
	company_info_label.text = "机构名称：" + BackgroundStoryManager.get_current_company_name()
	
	# 更新预设规则
	_update_preset_rules_display()
	
	# 更新自定义规则
	_update_custom_rules_display()

# 更新预设规则显示
func _update_preset_rules_display():
	var preset_rules_list = background_popup.get_node("VBoxContainer/PresetRulesContainer/PresetRulesScroll/PresetRulesList")
	
	# 清空现有内容
	for child in preset_rules_list.get_children():
		child.queue_free()
	
	# 添加预设规则
	var preset_rules = BackgroundStoryManager.get_preset_rules()
	for i in range(preset_rules.size()):
		var rule = preset_rules[i]
		var rule_label = Label.new()
		rule_label.text = "%d. %s" % [i + 1, rule]
		rule_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		rule_label.add_theme_color_override("font_color", Color.CYAN)
		preset_rules_list.add_child(rule_label)

# 更新自定义规则显示
func _update_custom_rules_display():
	var custom_rules_list = background_popup.get_node("VBoxContainer/CustomRulesContainer/CustomRulesScroll/CustomRulesList")
	
	# 清空现有内容
	for child in custom_rules_list.get_children():
		child.queue_free()
	
	# 添加自定义规则
	var custom_rules = BackgroundStoryManager.get_custom_rules()
	for i in range(custom_rules.size()):
		var rule = custom_rules[i]
		
		# 创建规则容器
		var rule_container = HBoxContainer.new()
		
		# 规则文本
		var rule_label = Label.new()
		rule_label.text = "%d. %s" % [i + 1, rule]
		rule_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		rule_label.add_theme_color_override("font_color", Color.YELLOW)
		rule_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		
		# 删除按钮
		var delete_button = Button.new()
		delete_button.text = "删除"
		delete_button.size_flags_horizontal = Control.SIZE_SHRINK_END
		delete_button.pressed.connect(func(): _on_delete_rule_pressed(i))
		
		rule_container.add_child(rule_label)
		rule_container.add_child(delete_button)
		custom_rules_list.add_child(rule_container)

# 添加规则按钮点击
func _on_add_rule_pressed():
	var add_rule_input = background_popup.get_node("VBoxContainer/AddRuleContainer/AddRuleInput")
	var rule_text = add_rule_input.text.strip_edges()
	if rule_text.is_empty():
		return
	
	if BackgroundStoryManager.add_custom_rule(rule_text):
		add_rule_input.text = ""
		_update_custom_rules_display()

# 输入框回车提交
func _on_rule_input_submitted(text: String):
	_on_add_rule_pressed()

# 删除规则按钮点击
func _on_delete_rule_pressed(index: int):
	if BackgroundStoryManager.remove_custom_rule(index):
		_update_custom_rules_display()

# 清空所有自定义规则
func _on_clear_rules_pressed():
	# 显示确认对话框
	var dialog = AcceptDialog.new()
	dialog.dialog_text = "确定要清空所有自定义规则吗？此操作不可撤销。"
	dialog.title = "确认清空"
	
	# 添加取消按钮
	dialog.add_cancel_button("取消")
	
	get_tree().current_scene.add_child(dialog)
	dialog.popup_centered()
	
	# 连接确认信号
	dialog.confirmed.connect(func():
		BackgroundStoryManager.clear_custom_rules()
		_update_custom_rules_display()
		dialog.queue_free()
	)
	
	# 连接取消信号
	dialog.canceled.connect(func():
		dialog.queue_free()
	)

# 刷新按钮点击
func _on_refresh_background_pressed():
	_refresh_background_display()

# 清空角色选择（供CharacterManager调用）
func clear_character_selection():
	selected_character = null
	# 清空角色列表的选择
	if character_list:
		character_list.deselect_all()
	# 更新角色详情显示
	_update_character_detail()
