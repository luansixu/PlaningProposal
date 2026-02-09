# SaveLoadUIManager.gd - 存档加载界面管理器
# 作为CanvasLayer类型的UI，用于在游戏中显示存档界面

extends CanvasLayer

@onready var save_load_ui = $SaveLoadUI

func _ready():
	hide_ui()
	
	# 设置为单例，确保在场景转换时不被销毁
	set_process_input(true)

# 处理输入事件
func _input(event):
	if event.is_action_pressed("toggle_save_load"):  # F3键
		if save_load_ui.visible:
			hide_ui()
		else:
			show_ui()
		get_viewport().set_input_as_handled()
	
	# 处理ESC键关闭界面
	if event is InputEventKey and event.pressed and event.keycode == KEY_ESCAPE:
		if save_load_ui.visible:
			hide_ui()
			get_viewport().set_input_as_handled()

# 显示存档界面
func show_ui():
	save_load_ui.show()
	save_load_ui.refresh_save_list()

# 隐藏存档界面
func hide_ui():
	save_load_ui.hide()