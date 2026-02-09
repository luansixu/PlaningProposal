# GameSaveManager.gd - 游戏存档管理器
# 负责保存和加载游戏中所有角色的数据

extends Node

# 存档文件路径
const SAVE_DIR = "user://saves/"
const SAVE_FILE_EXTENSION = ".json"

# 当前存档数据
var current_save_data = {}

# 信号
signal save_completed(success: bool, message: String)
signal load_completed(success: bool, message: String)

func _ready():
	# 确保存档目录存在
	var dir = DirAccess.open("user://")
	if not dir.dir_exists("saves"):
		dir.make_dir("saves")
	print("[GameSaveManager] 游戏存档管理器已初始化")

# 保存游戏数据
func save_game(save_name: String = "") -> bool:
	if save_name.is_empty():
		save_name = "autosave_" + Time.get_datetime_string_from_system().replace(":", "-")
	
	var save_data = collect_game_data()
	var file_path = SAVE_DIR + save_name + SAVE_FILE_EXTENSION
	
	var file = FileAccess.open(file_path, FileAccess.WRITE)
	if file:
		var json_string = JSON.stringify(save_data)
		file.store_string(json_string)
		file.close()
		
		current_save_data = save_data
		print("[GameSaveManager] 游戏已保存到: ", file_path)
		save_completed.emit(true, "游戏保存成功: " + save_name)
		return true
	else:
		print("[GameSaveManager错误] 无法创建存档文件: ", file_path)
		save_completed.emit(false, "保存失败: 无法创建文件")
		return false

# 加载游戏数据
func load_game(save_name: String) -> bool:
	var file_path = SAVE_DIR + save_name + SAVE_FILE_EXTENSION
	
	if not FileAccess.file_exists(file_path):
		print("[GameSaveManager错误] 存档文件不存在: ", file_path)
		load_completed.emit(false, "存档文件不存在: " + save_name)
		return false
	
	var file = FileAccess.open(file_path, FileAccess.READ)
	if file:
		var content = file.get_as_text()
		file.close()
		
		if content.strip_edges() != "":
			var data = JSON.parse_string(content)
			if data:
				current_save_data = data
				apply_game_data(data)
				print("[GameSaveManager] 游戏已从存档加载: ", file_path)
				load_completed.emit(true, "游戏加载成功: " + save_name)
				return true
			else:
				print("[GameSaveManager错误] JSON解析失败")
				load_completed.emit(false, "存档文件损坏")
		else:
			print("[GameSaveManager错误] 存档文件为空")
			load_completed.emit(false, "存档文件为空")
	else:
		print("[GameSaveManager错误] 无法打开存档文件: ", file_path)
		load_completed.emit(false, "无法打开存档文件")
	
	return false

# 收集游戏数据
func collect_game_data() -> Dictionary:
	var game_data = {
		"version": "1.0",
		"timestamp": Time.get_unix_time_from_system(),
		"scene_name": get_tree().current_scene.name,
		"characters": [],
		"rooms": {},
		"global_state": {}
	}
	
	# 收集角色数据
	var characters = get_tree().get_nodes_in_group("character")
	for character in characters:
		var character_data = collect_character_data(character)
		if character_data:
			game_data["characters"].append(character_data)
	
	# 收集房间数据
	var room_manager = get_node_or_null("/root/Office/RoomManager")
	if room_manager and room_manager.has_method("get_rooms_data"):
		game_data["rooms"] = room_manager.get_rooms_data()
	elif room_manager and room_manager.has_property("rooms"):
		# 如果没有专门的方法，直接获取rooms属性
		for room_name in room_manager.rooms:
			var room = room_manager.rooms[room_name]
			game_data["rooms"][room_name] = {
				"name": room.name,
				"position": {"x": room.position.x, "y": room.position.y},
				"size": {"x": room.size.x, "y": room.size.y},
				"description": room.description
			}
	
	# 收集全局状态
	game_data["global_state"] = collect_global_state()
	
	print("[GameSaveManager] 已收集 ", game_data["characters"].size(), " 个角色的数据")
	return game_data

# 收集单个角色数据
func collect_character_data(character: Node) -> Dictionary:
	if not character:
		return {}
	
	var character_data = {
		"name": character.name,
		"position": {"x": character.global_position.x, "y": character.global_position.y},
		"facing_direction": "",
		"is_sitting": false,
		"current_chair": null,
		"is_player_controlled": false,
		"ai_state": {},
		"tasks": [],
		"personality": {}
	}
	
	# 获取角色控制器数据
	var controller = character.get_node_or_null("CharacterController")
	if not controller:
		controller = character
	
	if controller:
		# 基本状态
		if controller.has_property("facing_direction"):
			character_data["facing_direction"] = controller.facing_direction
		if controller.has_property("is_sitting"):
			character_data["is_sitting"] = controller.is_sitting
		if controller.has_property("current_chair") and controller.current_chair:
			character_data["current_chair"] = controller.current_chair.name
	
	# 获取AI代理数据
	var ai_agent = character.get_node_or_null("AIAgent")
	if ai_agent:
		character_data["is_player_controlled"] = ai_agent.is_player_controlled if ai_agent.has_property("is_player_controlled") else false
		
		# AI状态
		if ai_agent.has_property("current_state"):
			character_data["ai_state"]["current_state"] = ai_agent.current_state
		
		# 任务数据
		if ai_agent.has_property("current_tasks"):
			character_data["tasks"] = ai_agent.current_tasks.duplicate() if ai_agent.current_tasks else []
		elif ai_agent.has_property("tasks"):
			character_data["tasks"] = ai_agent.tasks.duplicate() if ai_agent.tasks else []
	
	# 获取角色性格数据
	var personality = CharacterPersonality.get_personality(character.name) if CharacterPersonality else {}
	character_data["personality"] = personality
	
	return character_data

# 收集全局状态
func collect_global_state() -> Dictionary:
	var global_state = {
		"game_time": Time.get_unix_time_from_system(),
		"settings": {}
	}
	
	# 获取设置管理器数据
	var settings_manager = get_node_or_null("/root/SettingsManager")
	if settings_manager and settings_manager.has_method("get_settings"):
		global_state["settings"] = settings_manager.get_settings()
	
	return global_state

# 应用游戏数据
func apply_game_data(data: Dictionary):
	if not data.has("characters"):
		print("[GameSaveManager警告] 存档中没有角色数据")
		return
	
	# 应用角色数据
	var characters = get_tree().get_nodes_in_group("character")
	for character_data in data["characters"]:
		var character = find_character_by_name(character_data["name"])
		if character:
			apply_character_data(character, character_data)
		else:
			print("[GameSaveManager警告] 未找到角色: ", character_data["name"])
	
	# 应用全局状态
	if data.has("global_state"):
		apply_global_state(data["global_state"])
	
	print("[GameSaveManager] 游戏数据应用完成")

# 应用单个角色数据
func apply_character_data(character: Node, data: Dictionary):
	if not character or not data:
		return
	
	# 设置位置
	if data.has("position"):
		var pos = data["position"]
		character.global_position = Vector2(pos["x"], pos["y"])
	
	# 获取角色控制器
	var controller = character.get_node_or_null("CharacterController")
	if not controller:
		controller = character
	
	if controller:
		# 设置朝向
		if data.has("facing_direction") and controller.has_property("facing_direction"):
			controller.facing_direction = data["facing_direction"]
		
		# 设置坐下状态
		if data.has("is_sitting") and controller.has_property("is_sitting"):
			controller.is_sitting = data["is_sitting"]
		
		# 恢复椅子状态
		if data.has("current_chair") and data["current_chair"]:
			var chair = find_chair_by_name(data["current_chair"])
			if chair and controller.has_property("current_chair"):
				controller.current_chair = chair
	
	# 获取AI代理
	var ai_agent = character.get_node_or_null("AIAgent")
	if ai_agent:
		# 设置玩家控制状态
		if data.has("is_player_controlled") and ai_agent.has_method("toggle_player_control"):
			ai_agent.toggle_player_control(data["is_player_controlled"])
		
		# 恢复AI状态
		if data.has("ai_state") and data["ai_state"].has("current_state") and ai_agent.has_property("current_state"):
			ai_agent.current_state = data["ai_state"]["current_state"]
		
		# 恢复任务
		if data.has("tasks"):
			if ai_agent.has_property("current_tasks"):
				ai_agent.current_tasks = data["tasks"].duplicate()
			elif ai_agent.has_property("tasks"):
				ai_agent.tasks = data["tasks"].duplicate()
	
	print("[GameSaveManager] 已恢复角色数据: ", character.name)

# 应用全局状态
func apply_global_state(data: Dictionary):
	if not data:
		return
	
	# 应用设置
	if data.has("settings"):
		var settings_manager = get_node_or_null("/root/SettingsManager")
		if settings_manager and settings_manager.has_method("update_settings"):
			settings_manager.update_settings(data["settings"])

# 根据名称查找角色
func find_character_by_name(character_name: String) -> Node:
	var characters = get_tree().get_nodes_in_group("character")
	for character in characters:
		if character.name == character_name:
			return character
	return null

# 根据名称查找椅子
func find_chair_by_name(chair_name: String) -> Node:
	var chairs = get_tree().get_nodes_in_group("chairs")
	for chair in chairs:
		if chair.name == chair_name:
			return chair
	return null

# 获取所有存档文件列表
func get_save_files() -> Array:
	var save_files = []
	var dir = DirAccess.open(SAVE_DIR)
	if dir:
		dir.list_dir_begin()
		var file_name = dir.get_next()
		while file_name != "":
			if file_name.ends_with(SAVE_FILE_EXTENSION):
				var save_name = file_name.get_basename()
				save_files.append(save_name)
			file_name = dir.get_next()
		dir.list_dir_end()
	return save_files

# 删除存档文件
func delete_save(save_name: String) -> bool:
	var file_path = SAVE_DIR + save_name + SAVE_FILE_EXTENSION
	if FileAccess.file_exists(file_path):
		var dir = DirAccess.open(SAVE_DIR)
		if dir:
			var result = dir.remove(save_name + SAVE_FILE_EXTENSION)
			if result == OK:
				print("[GameSaveManager] 已删除存档: ", save_name)
				return true
			else:
				print("[GameSaveManager错误] 删除存档失败: ", save_name)
	else:
		print("[GameSaveManager错误] 存档文件不存在: ", save_name)
	return false

# 获取存档信息
func get_save_info(save_name: String) -> Dictionary:
	var file_path = SAVE_DIR + save_name + SAVE_FILE_EXTENSION
	if not FileAccess.file_exists(file_path):
		return {}
	
	var file = FileAccess.open(file_path, FileAccess.READ)
	if file:
		var content = file.get_as_text()
		file.close()
		
		var data = JSON.parse_string(content)
		if data:
			return {
				"name": save_name,
				"timestamp": data.get("timestamp", 0),
				"scene_name": data.get("scene_name", "未知"),
				"character_count": data.get("characters", []).size(),
				"version": data.get("version", "未知")
			}
	return {}
