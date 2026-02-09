extends Control

func _ready():
	# 连接按钮信号
	$NinePatchRect/VBoxContainer/StartButton.pressed.connect(_on_start_pressed)
	$NinePatchRect/VBoxContainer/SettingsButton.pressed.connect(_on_settings_pressed)
	$NinePatchRect/VBoxContainer/QuitButton.pressed.connect(_on_quit_pressed)

func _on_start_pressed():
	# 切换到地图选择场景
	get_tree().change_scene_to_file("res://scene/MapSelection.tscn")

func _on_settings_pressed():
	# 使用全局设置界面（动态获取）
	var settings = get_node_or_null("/root/GlobalSettings")
	if settings and settings.has_method("show_settings"):
		settings.show_settings()
	else:
		# 如果找不到全局设置，则切换到GlobalSettingsUI场景
		get_tree().change_scene_to_file("res://scene/ui/GlobalSettingsUI.tscn")

func _on_quit_pressed():
	# 退出游戏
	get_tree().quit()
