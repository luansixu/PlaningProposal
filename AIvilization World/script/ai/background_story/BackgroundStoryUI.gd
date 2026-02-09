extends Control

class_name BackgroundStoryUI

# UI节点引用
@onready var map_label: Label
@onready var company_label: Label
@onready var preset_rules_list: VBoxContainer
@onready var custom_rules_list: VBoxContainer
@onready var add_rule_input: LineEdit
@onready var add_rule_button: Button
@onready var clear_rules_button: Button
@onready var refresh_button: Button

# 信号
signal rules_changed

func _ready():
	# 查找UI节点
	find_ui_nodes()
	
	# 连接信号
	connect_signals()
	
	# 初始化显示
	refresh_display()

func find_ui_nodes():
	# 这些节点需要在场景中预先创建
	map_label = find_child("MapLabel", true, false)
	company_label = find_child("CompanyLabel", true, false)
	preset_rules_list = find_child("PresetRulesList", true, false)
	custom_rules_list = find_child("CustomRulesList", true, false)
	add_rule_input = find_child("AddRuleInput", true, false)
	add_rule_button = find_child("AddRuleButton", true, false)
	clear_rules_button = find_child("ClearRulesButton", true, false)
	refresh_button = find_child("RefreshButton", true, false)

func connect_signals():
	if add_rule_button:
		add_rule_button.pressed.connect(_on_add_rule_pressed)
	
	if clear_rules_button:
		clear_rules_button.pressed.connect(_on_clear_rules_pressed)
	
	if refresh_button:
		refresh_button.pressed.connect(_on_refresh_pressed)
	
	if add_rule_input:
		add_rule_input.text_submitted.connect(_on_rule_input_submitted)

# 刷新显示内容
func refresh_display():
	update_map_info()
	update_preset_rules()
	update_custom_rules()

# 更新地图信息显示
func update_map_info():
	var map_name = BackgroundStoryManager.get_current_map_name()
	var company_name = BackgroundStoryManager.get_current_company_name()
	
	if map_label:
		map_label.text = "当前地图：" + map_name
	
	if company_label:
		company_label.text = "机构名称：" + company_name

# 更新预设规则显示
func update_preset_rules():
	if not preset_rules_list:
		return
	
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
		rule_label.add_theme_color_override("font_color", Color.WHITE)
		preset_rules_list.add_child(rule_label)

# 更新自定义规则显示
func update_custom_rules():
	if not custom_rules_list:
		return
	
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
	if not add_rule_input:
		return
	
	var rule_text = add_rule_input.text.strip_edges()
	if rule_text.is_empty():
		return
	
	if BackgroundStoryManager.add_custom_rule(rule_text):
		add_rule_input.text = ""
		update_custom_rules()
		rules_changed.emit()

# 输入框回车提交
func _on_rule_input_submitted(text: String):
	_on_add_rule_pressed()

# 删除规则按钮点击
func _on_delete_rule_pressed(index: int):
	if BackgroundStoryManager.remove_custom_rule(index):
		update_custom_rules()
		rules_changed.emit()

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
		update_custom_rules()
		rules_changed.emit()
		dialog.queue_free()
	)
	
	# 连接取消信号
	dialog.canceled.connect(func():
		dialog.queue_free()
	)

# 刷新按钮点击
func _on_refresh_pressed():
	refresh_display()

# 设置地图（外部调用）
func set_map(map_name: String):
	BackgroundStoryManager.set_background(map_name)
	refresh_display()
	rules_changed.emit()

# 获取当前规则数量
func get_total_rules_count() -> int:
	var preset_count = BackgroundStoryManager.get_preset_rules().size()
	var custom_count = BackgroundStoryManager.get_custom_rules().size()
	return preset_count + custom_count

# 创建简单的UI布局（如果场景中没有预设UI）
func create_simple_ui():
	# 创建主容器
	var main_container = VBoxContainer.new()
	add_child(main_container)
	
	# 地图信息
	var info_container = VBoxContainer.new()
	main_container.add_child(info_container)
	
	map_label = Label.new()
	map_label.name = "MapLabel"
	map_label.text = "当前地图：未知"
	info_container.add_child(map_label)
	
	company_label = Label.new()
	company_label.name = "CompanyLabel"
	company_label.text = "机构名称：未知"
	info_container.add_child(company_label)
	
	# 分隔线
	main_container.add_child(HSeparator.new())
	
	# 预设规则标题
	var preset_title = Label.new()
	preset_title.text = "预设社会规则："
	preset_title.add_theme_color_override("font_color", Color.CYAN)
	main_container.add_child(preset_title)
	
	# 预设规则列表
	preset_rules_list = VBoxContainer.new()
	preset_rules_list.name = "PresetRulesList"
	main_container.add_child(preset_rules_list)
	
	# 分隔线
	main_container.add_child(HSeparator.new())
	
	# 自定义规则标题
	var custom_title = Label.new()
	custom_title.text = "自定义社会规则："
	custom_title.add_theme_color_override("font_color", Color.YELLOW)
	main_container.add_child(custom_title)
	
	# 自定义规则列表
	custom_rules_list = VBoxContainer.new()
	custom_rules_list.name = "CustomRulesList"
	main_container.add_child(custom_rules_list)
	
	# 添加规则输入
	var input_container = HBoxContainer.new()
	main_container.add_child(input_container)
	
	add_rule_input = LineEdit.new()
	add_rule_input.name = "AddRuleInput"
	add_rule_input.placeholder_text = "输入新的社会规则..."
	add_rule_input.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	input_container.add_child(add_rule_input)
	
	add_rule_button = Button.new()
	add_rule_button.name = "AddRuleButton"
	add_rule_button.text = "添加"
	input_container.add_child(add_rule_button)
	
	# 操作按钮
	var button_container = HBoxContainer.new()
	main_container.add_child(button_container)
	
	clear_rules_button = Button.new()
	clear_rules_button.name = "ClearRulesButton"
	clear_rules_button.text = "清空自定义规则"
	button_container.add_child(clear_rules_button)
	
	refresh_button = Button.new()
	refresh_button.name = "RefreshButton"
	refresh_button.text = "刷新"
	button_container.add_child(refresh_button)
	
	# 重新连接信号
	connect_signals()