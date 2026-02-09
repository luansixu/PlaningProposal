# SaveLoadUI.gd - 存档加载界面
# 提供游戏存档、读档和删除存档的功能

extends Control

# 节点引用
@onready var save_list = $Panel/VBoxContainer/SaveList
@onready var save_name_input = $Panel/VBoxContainer/SaveNameContainer/SaveNameInput
@onready var save_button = $Panel/VBoxContainer/ButtonContainer/SaveButton
@onready var load_button = $Panel/VBoxContainer/ButtonContainer/LoadButton
@onready var delete_button = $Panel/VBoxContainer/ButtonContainer/DeleteButton
@onready var close_button = $Panel/VBoxContainer/ButtonContainer/CloseButton
@onready var status_label = $Panel/VBoxContainer/StatusLabel

# 游戏存档管理器
var save_manager

# 当前选中的存档
var selected_save = ""

func _ready():
	# 获取存档管理器
	save_manager = get_node_or_null("/root/GameSaveManager")
	
	# 连接信号
	save_button.pressed.connect(_on_save_pressed)
	load_button.pressed.connect(_on_load_pressed)
	delete_button.pressed.connect(_on_delete_pressed)
	close_button.pressed.connect(_on_close_pressed)
	save_manager.save_completed.connect(_on_save_completed)
	save_manager.load_completed.connect(_on_load_completed)
	
	# 初始状态
	load_button.disabled = true
	delete_button.disabled = true
	status_label.text = ""
	
	# 加载存档列表
	refresh_save_list()
	
	# 默认隐藏
	hide()

# 显示界面
func show_ui():
	show()
	refresh_save_list()

# 隐藏界面
func hide_ui():
	hide()

# 刷新存档列表
func refresh_save_list():
	# 清空列表
	save_list.clear()
	
	# 获取所有存档
	var saves = save_manager.get_save_files()
	
	# 添加到列表
	for save_name in saves:
		var save_info = save_manager.get_save_info(save_name)
		var display_text = save_name
		
		# 如果有时间戳，添加日期信息
		if save_info.has("timestamp") and save_info["timestamp"] > 0:
			var datetime = Time.get_datetime_dict_from_unix_time(save_info["timestamp"])
			display_text += " (%04d-%02d-%02d %02d:%02d)" % [
				datetime["year"], 
				datetime["month"], 
				datetime["day"],
				datetime["hour"],
				datetime["minute"]
			]
		
		# 添加场景和角色数量信息
		if save_info.has("scene_name"):
			display_text += " - " + save_info["scene_name"]
		
		if save_info.has("character_count"):
			display_text += " (" + str(save_info["character_count"]) + "个角色)"
		
		save_list.add_item(display_text, null, true)
		save_list.set_item_metadata(save_list.get_item_count() - 1, save_name)
	
	# 连接选择信号
	if not save_list.item_selected.is_connected(_on_save_selected):
		save_list.item_selected.connect(_on_save_selected)

# 保存按钮回调
func _on_save_pressed():
	var save_name = save_name_input.text.strip_edges()
	
	# 检查是否输入了存档名
	if save_name.is_empty():
		status_label.text = "请输入存档名称"
		return
	
	# 保存游戏
	save_manager.save_game(save_name)

# 加载按钮回调
func _on_load_pressed():
	if selected_save.is_empty():
		status_label.text = "请先选择一个存档"
		return
	
	# 加载游戏
	save_manager.load_game(selected_save)

# 删除按钮回调
func _on_delete_pressed():
	if selected_save.is_empty():
		status_label.text = "请先选择一个存档"
		return
	
	# 删除存档
	if save_manager.delete_save(selected_save):
		refresh_save_list()
		selected_save = ""
		load_button.disabled = true
		delete_button.disabled = true
		status_label.text = "存档已删除"

# 关闭按钮回调
func _on_close_pressed():
	hide_ui()

# 存档选择回调
func _on_save_selected(index):
	selected_save = save_list.get_item_metadata(index)
	load_button.disabled = false
	delete_button.disabled = false
	save_name_input.text = selected_save

# 保存完成回调
func _on_save_completed(success: bool, message: String):
	status_label.text = message
	if success:
		refresh_save_list()

# 加载完成回调
func _on_load_completed(success: bool, message: String):
	status_label.text = message
	if success:
		hide_ui()
