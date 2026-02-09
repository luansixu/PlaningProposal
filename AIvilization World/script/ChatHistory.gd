extends Node

class_name ChatHistory

# 存储对话历史记录的字典，按角色分组
var history = {}

# 当前对话的角色列表
var participants = []

# 对话历史记录文件的基础路径
const HISTORY_DIR = "user://chat_history/"

func _ready():
	# 确保历史记录目录存在
	var dir = DirAccess.open("user://")
	if not dir.dir_exists("chat_history"):
		dir.make_dir("chat_history")
	
	# 加载历史记录
	load_history()

# 添加一条对话记录并保存到文件
func add_message(speaker_name: String, message: String):
	# 确保说话者在参与者列表中
	if not speaker_name in participants:
		participants.append(speaker_name)
	
	# 获取对话的另一方
	var other_participant = ""
	for participant in participants:
		if participant != speaker_name:
			other_participant = participant
			break
	
	# 如果没有其他参与者，使用speaker_name作为key
	if other_participant.is_empty():
		other_participant = speaker_name
	
	# 初始化对话记录列表
	if not other_participant in history:
		history[other_participant] = []
	
	# 直接使用传入的消息，不再添加说话者前缀
	# 因为DialogManager.gd已经格式化过消息
	var message_data = {
		"message": message,
		"timestamp": Time.get_unix_time_from_system(),
		"participants": participants.duplicate()
	}
	
	# 按时间顺序插入消息
	var messages = history[other_participant]
	var insert_index = messages.size()
	for i in range(messages.size()):
		if message_data["timestamp"] < messages[i]["timestamp"]:
			insert_index = i
			break
	
	messages.insert(insert_index, message_data)
	# 保存到文件
	save_history()

# 获取所有对话历史
func get_history() -> Dictionary:
	return history

# 获取指定角色的对话历史
func get_history_by_participant(participant_name: String) -> Array:
	if participant_name in history:
		return history[participant_name]
	return []

# 获取与特定角色的最近对话记录
func get_recent_conversation_with(participant_name: String, max_messages: int = 5) -> String:
	var conversation_text = ""
	var messages = get_history_by_participant(participant_name)
	
	if messages.size() == 0:
		return ""
	
	# 获取最近的消息（按时间戳排序后取最后几条）
	messages.sort_custom(func(a, b): return a["timestamp"] < b["timestamp"])
	var recent_messages = messages.slice(max(0, messages.size() - max_messages))
	
	# 格式化消息 - 直接使用存储的消息内容，不进行额外解析
	for message in recent_messages:
		conversation_text += message["message"] + "\n"
	
	return conversation_text.rstrip("\n")

# 获取格式化的对话历史文本
func get_formatted_history() -> String:
	var formatted_text = ""
	var all_messages = []
	
	# 收集所有消息
	for participant in history:
		for message in history[participant]:
			all_messages.append({
				"message": message["message"],
				"timestamp": message["timestamp"]
			})
	
	# 按时间戳排序
	all_messages.sort_custom(func(a, b): return a["timestamp"] < b["timestamp"])
	
	# 格式化消息 - 直接使用存储的消息内容，不进行额外解析
	for message in all_messages:
		formatted_text += message["message"] + "\n"
	
	return formatted_text

# 清空对话历史
func clear_history():
	history.clear()
	participants.clear()
	# 同时删除历史记录文件
	var file_path = get_history_file_path()
	if FileAccess.file_exists(file_path):
		var dir = DirAccess.open("user://chat_history")
		dir.remove(file_path)

# 保存对话历史到文件
func save_history() -> void:
	var file_path = get_history_file_path()
	var file = FileAccess.open(file_path, FileAccess.WRITE)
	if file:
		var json_string = JSON.stringify(history)
		file.store_string(json_string)

# 从文件加载对话历史
func load_history() -> void:
	var file_path = get_history_file_path()
	if FileAccess.file_exists(file_path):
		var file = FileAccess.open(file_path, FileAccess.READ)
		if file:
			var json_string = file.get_as_text()
			var json = JSON.parse_string(json_string)
			if json:
				history = json

# 获取历史记录文件路径
func get_history_file_path() -> String:
	# 使用所属节点的名称作为文件名
	var node_name = get_parent().name if get_parent() else "default"
	return HISTORY_DIR + node_name + "_history.json"
