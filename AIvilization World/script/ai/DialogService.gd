extends Node
class_name DialogService

# 活跃的对话管理器字典
var active_conversations: Dictionary = {}

# 对话范围设置
var max_dialog_distance: float = 100.0

# 信号
signal conversation_started(conversation_id: String, speaker_name: String, listener_name: String)
signal conversation_ended(conversation_id: String)
signal dialog_generated(conversation_id: String, speaker_name: String, dialog_text: String)

func _ready():
	print("[DialogService] 对话服务已初始化")

# 尝试开始对话
func try_start_conversation(speaker: CharacterBody2D, listener: CharacterBody2D) -> bool:
	if not speaker or not listener:
		print("[DialogService] 无效的对话参与者")
		return false
	
	# 检查距离
	if not _is_in_range(speaker, listener):
		print("[DialogService] 角色距离过远，无法开始对话")
		return false
	
	# 检查是否已经在对话中
	if is_character_in_conversation(speaker) or is_character_in_conversation(listener):
		print("[DialogService] 其中一个角色已经在对话中")
		return false
	
	# 创建新的对话管理器
	var conversation = ConversationManager.new(speaker, listener)
	active_conversations[conversation.conversation_id] = conversation
	
	# 连接信号
	conversation.conversation_ended.connect(_on_conversation_ended)
	conversation.dialog_generated.connect(_on_dialog_generated)
	
	# 开始对话
	conversation.start_conversation()
	
	# 发出信号
	conversation_started.emit(conversation.conversation_id, speaker.name, listener.name)
	
	print("[DialogService] 开始新对话：%s <-> %s (ID: %s)" % [speaker.name, listener.name, conversation.conversation_id])
	return true

# 结束指定对话
func end_conversation(conversation_id: String) -> bool:
	if not active_conversations.has(conversation_id):
		print("[DialogService] 对话不存在：%s" % conversation_id)
		return false
	
	var conversation = active_conversations[conversation_id]
	conversation.end_conversation()
	return true

# 结束角色参与的所有对话
func end_character_conversations(character: CharacterBody2D):
	var conversations_to_end = []
	
	for conversation_id in active_conversations:
		var conversation = active_conversations[conversation_id]
		if conversation.speaker == character or conversation.listener == character:
			conversations_to_end.append(conversation_id)
	
	for conversation_id in conversations_to_end:
		end_conversation(conversation_id)

# 检查角色是否在对话中
func is_character_in_conversation(character: CharacterBody2D) -> bool:
	for conversation_id in active_conversations:
		var conversation = active_conversations[conversation_id]
		if conversation.speaker == character or conversation.listener == character:
			return true
	return false

# 获取角色参与的对话ID列表
func get_character_conversations(character: CharacterBody2D) -> Array:
	var conversation_ids = []
	
	for conversation_id in active_conversations:
		var conversation = active_conversations[conversation_id]
		if conversation.speaker == character or conversation.listener == character:
			conversation_ids.append(conversation_id)
	
	return conversation_ids

# 获取活跃对话数量
func get_active_conversation_count() -> int:
	return active_conversations.size()

# 获取所有活跃对话信息
func get_active_conversations_info() -> Array:
	var info = []
	
	for conversation_id in active_conversations:
		var conversation = active_conversations[conversation_id]
		info.append({
			"id": conversation_id,
			"speaker": conversation.speaker.name,
			"listener": conversation.listener.name,
			"is_active": conversation.is_active
		})
	
	return info

# 检查是否在对话范围内
func _is_in_range(node1: Node2D, node2: Node2D) -> bool:
	return node1.global_position.distance_to(node2.global_position) <= max_dialog_distance

# 对话结束回调
func _on_conversation_ended(conversation_id: String):
	print("[DialogService] 对话结束：%s" % conversation_id)
	
	if active_conversations.has(conversation_id):
		active_conversations.erase(conversation_id)
	
	conversation_ended.emit(conversation_id)

# 对话生成回调
func _on_dialog_generated(speaker_name: String, dialog_text: String):
	# 找到对应的对话ID
	var conversation_id = ""
	for id in active_conversations:
		var conversation = active_conversations[id]
		if conversation.speaker.name == speaker_name:
			conversation_id = id
			break
	
	dialog_generated.emit(conversation_id, speaker_name, dialog_text)

# 清理所有对话
func cleanup_all_conversations():
	print("[DialogService] 清理所有对话")
	
	for conversation_id in active_conversations:
		var conversation = active_conversations[conversation_id]
		conversation.end_conversation()
	
	active_conversations.clear()

# 调试信息
func print_debug_info():
	print("[DialogService] 当前活跃对话数：%d" % active_conversations.size())
	for conversation_id in active_conversations:
		var conversation = active_conversations[conversation_id]
		print("  - %s: %s <-> %s (活跃: %s)" % [conversation_id, conversation.speaker.name, conversation.listener.name, conversation.is_active])
