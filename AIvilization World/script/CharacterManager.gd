extends Node

var current_character: CharacterBody2D = null
var dialog_manager: Node
const DIALOG_DISTANCE = 100.0  # 触发对话的距离阈值

# GodUI引用
var god_ui: Control = null

func _ready():
	dialog_manager = get_node("/root/DialogManager")  # 获取对话管理器引用
	# 获取所有可控制的角色
	for character in get_tree().get_nodes_in_group("controllable_characters"):
		character.set_selected(false)
	
	# 延迟获取GodUI引用，确保场景完全加载
	call_deferred("_init_godui_reference")

func _unhandled_input(event):
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		# 将屏幕坐标转换为全局坐标
		var camera = get_viewport().get_camera_2d()
		var click_position = event.position
		if camera:
			click_position = get_viewport().get_canvas_transform().affine_inverse() * click_position
			
		var clicked_character = get_clicked_character(click_position)
		var clicked_chair = get_clicked_chair(click_position)
		
		if clicked_character:
			select_character(clicked_character)
		elif clicked_chair and current_character:
			# 点击了椅子，让当前角色移动到椅子并自动坐下
			if current_character.has_method("move_to_chair"):
				if current_character.move_to_chair(clicked_chair):
					print("[CharacterManager] %s 开始移动到椅子 %s" % [current_character.name, clicked_chair.name])
				else:
					print("[CharacterManager] %s 无法移动到椅子 %s（可能已被占用）" % [current_character.name, clicked_chair.name])
			else:
				# 兼容旧版本，直接移动到椅子位置
				current_character.move_to(clicked_chair.global_position)
		elif current_character:
			current_character.move_to(click_position)

func get_clicked_character(click_position):
	var space = get_tree().root.get_world_2d().direct_space_state
	var query = PhysicsPointQueryParameters2D.new()
	query.position = click_position
	query.collision_mask = 1  # 设置适当的碰撞层
	query.collide_with_areas = false
	query.collide_with_bodies = true
	
	var result = space.intersect_point(query)
	for collision in result:
		var collider = collision.collider
		if collider.is_in_group("controllable_characters"):
			return collider
	return null

# 获取点击位置的椅子
func get_clicked_chair(click_position):
	# 获取场景中所有椅子
	var chairs = get_tree().get_nodes_in_group("chairs")
	for chair in chairs:
		if chair.has_method("is_clicked_on") and chair.is_clicked_on(click_position):
			return chair
	return null

# 获取指定角色附近的其他角色
func get_nearby_character(character: CharacterBody2D) -> CharacterBody2D:
	for other in get_tree().get_nodes_in_group("controllable_characters"):
		if other != character:
			var distance = character.global_position.distance_to(other.global_position)
			if distance <= DIALOG_DISTANCE:
				return other
	return null

func select_character(character: CharacterBody2D):
	# 如果点击的是当前选中的角色，则取消选择并回到全局视图
	if character == current_character:
		current_character.set_selected(false)
		current_character = null
		
		# 相机回到全局视图
		var camera = get_viewport().get_camera_2d()
		if camera and camera.has_method("follow_character"):
			camera.follow_character(null)
		
		# 同步更新GodUI左侧边栏（取消选择）
		_sync_godui_selection(null)
		return
	
	# 选择新角色
	if current_character:
		current_character.set_selected(false)
	
	current_character = character
	current_character.set_selected(true)
	
	# 相机跟随新选中的角色
	var camera = get_viewport().get_camera_2d()
	if camera and camera.has_method("follow_character"):
		camera.follow_character(character)
	
	# 同步更新GodUI左侧边栏
	_sync_godui_selection(character)

# 初始化GodUI引用
func _init_godui_reference():
	# 尝试从场景树中找到GodUI节点
	god_ui = get_tree().get_first_node_in_group("godui")
	if not god_ui:
		# 如果没有找到组，尝试通过路径查找
		var canvas_layer = get_tree().get_first_node_in_group("canvas_layer")
		if canvas_layer:
			god_ui = canvas_layer.get_node_or_null("GodUI")
		else:
			# 最后尝试直接从根节点查找
			var office_scene = get_tree().current_scene
			if office_scene:
				var canvas_layers = office_scene.find_children("*", "CanvasLayer")
				for layer in canvas_layers:
					var ui = layer.get_node_or_null("GodUI")
					if ui:
						god_ui = ui
						break
	
	if god_ui:
		print("[CharacterManager] 成功找到GodUI节点")
	else:
		print("[CharacterManager] 警告：未找到GodUI节点")

# 同步GodUI的角色选择
func _sync_godui_selection(character: CharacterBody2D):
	if not god_ui:
		return
	
	# 获取所有可控制的角色列表
	var all_characters = get_tree().get_nodes_in_group("controllable_characters")
	
	if character == null:
		# 取消选择，清空GodUI的选择
		if god_ui.has_method("clear_character_selection"):
			god_ui.clear_character_selection()
		else:
			# 如果没有专门的清空方法，设置selected_character为null并更新详情
			god_ui.selected_character = null
			if god_ui.has_method("_update_character_detail"):
				god_ui._update_character_detail()
	else:
		# 选择角色，同步到GodUI
		var character_index = all_characters.find(character)
		if character_index >= 0:
			# 更新GodUI的选中角色
			god_ui.selected_character = character
			# 更新角色列表的选择状态
			if god_ui.character_list and god_ui.character_list.has_method("select"):
				god_ui.character_list.select(character_index)
			# 更新角色详情显示
			if god_ui.has_method("_update_character_detail"):
				god_ui._update_character_detail()
