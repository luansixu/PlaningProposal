extends Node

# 记忆类型枚举
enum MemoryType {
	PERSONAL,      # 个人记忆
	INTERACTION,   # 互动记忆
	TASK,          # 任务记忆
	EMOTION,       # 情感记忆
	EVENT          # 事件记忆
}

# 记忆重要性等级
enum MemoryImportance {
	LOW = 1,
	NORMAL = 3,
	HIGH = 5,
	CRITICAL = 10
}

# 获取角色的所有记忆
func get_character_memories(character: Node) -> Array:
	if not character:
		return []
	
	# 从character_data中获取记忆
	var character_data = character.get_meta("character_data", {})
	var memories = character_data.get("memories", [])
	
	return memories

# 添加记忆到角色
func add_memory(character: Node, memory_content: String, memory_type: MemoryType = MemoryType.PERSONAL, importance: MemoryImportance = MemoryImportance.NORMAL) -> void:
	if not character or memory_content.strip_edges().is_empty():
		return
	
	# 获取当前时间
	var current_time = Time.get_datetime_dict_from_system()
	var time_str = "%04d-%02d-%02d %02d:%02d" % [
		current_time.year, current_time.month, current_time.day,
		current_time.hour, current_time.minute
	]
	
	# 创建记忆对象
	var memory_obj = {
		"content": memory_content,
		"timestamp": time_str,
		"type": memory_type,
		"importance": importance,
		"created_at": Time.get_unix_time_from_system()
	}
	
	# 获取或创建character_data
	var character_data = character.get_meta("character_data", {})
	if not character_data.has("memories"):
		character_data["memories"] = []
	
	# 添加记忆
	character_data["memories"].append(memory_obj)
	character.set_meta("character_data", character_data)
	
	# 清理旧记忆，保持记忆数量在合理范围内
	_cleanup_old_memories(character)

# 获取格式化的记忆文本（用于AI prompt）
func get_formatted_memories_for_prompt(character: Node, max_count: int = -1) -> String:
	var memories = get_character_memories(character)
	
	if memories.is_empty():
		return "\n\n记忆信息：\n- 暂无重要记忆"
	
	# 转换记忆格式并按重要性和时间排序
	var formatted_memories = []
	for memory in memories:
		var formatted_memory = _format_memory_for_display(memory)
		if not formatted_memory.is_empty():
			formatted_memories.append({
				"text": formatted_memory,
				"importance": _get_memory_importance(memory),
				"timestamp": _get_memory_timestamp(memory)
			})
	
	# 按重要性排序，重要性相同时按时间排序（最新的在前）
	formatted_memories.sort_custom(func(a, b): 
		if a.importance != b.importance:
			return a.importance > b.importance
		return a.timestamp > b.timestamp
	)
	
	# 构建prompt文本
	var prompt_text = "\n\n记忆信息："
	var display_count = formatted_memories.size() if max_count == -1 else min(max_count, formatted_memories.size())
	
	for i in range(display_count):
		prompt_text += "\n- " + formatted_memories[i].text
	
	if max_count != -1 and formatted_memories.size() > display_count:
		prompt_text += "\n- ...还有 %d 条其他记忆" % (formatted_memories.size() - display_count)
	
	return prompt_text

# 获取最近的记忆（用于对话历史）
func get_recent_memories(character: Node, hours: int = 24) -> Array:
	var memories = get_character_memories(character)
	var recent_memories = []
	var current_time = Time.get_unix_time_from_system()
	var time_threshold = current_time - (hours * 3600)  # 转换为秒
	
	for memory in memories:
		var memory_time = _get_memory_timestamp(memory)
		if memory_time >= time_threshold:
			recent_memories.append(memory)
	
	return recent_memories

# 搜索相关记忆
func search_memories(character: Node, keywords: Array) -> Array:
	var memories = get_character_memories(character)
	var relevant_memories = []
	
	for memory in memories:
		var memory_text = _format_memory_for_display(memory).to_lower()
		for keyword in keywords:
			if memory_text.contains(keyword.to_lower()):
				relevant_memories.append(memory)
				break
	
	return relevant_memories

# 清理旧记忆，保持记忆数量在合理范围内
func _cleanup_old_memories(character: Node, max_memories: int = 50) -> void:
	var character_data = character.get_meta("character_data", {})
	var memories = character_data.get("memories", [])
	
	if memories.size() <= max_memories:
		return
	
	# 按重要性和时间排序，保留最重要和最新的记忆
	var sorted_memories = []
	for memory in memories:
		sorted_memories.append({
			"data": memory,
			"importance": _get_memory_importance(memory),
			"timestamp": _get_memory_timestamp(memory)
		})
	
	sorted_memories.sort_custom(func(a, b):
		if a.importance != b.importance:
			return a.importance > b.importance
		return a.timestamp > b.timestamp
	)
	
	# 保留前max_memories个记忆
	var kept_memories = []
	for i in range(min(max_memories, sorted_memories.size())):
		kept_memories.append(sorted_memories[i].data)
	
	character_data["memories"] = kept_memories
	character.set_meta("character_data", character_data)

# 格式化记忆用于显示
func _format_memory_for_display(memory: Dictionary) -> String:
	var content = memory.get("content", "")
	var timestamp = memory.get("timestamp", "")
	if not timestamp or str(timestamp).strip_edges().is_empty():
		return content
	else:
		return "[%s] %s" % [timestamp, content]

# 获取记忆的重要性
func _get_memory_importance(memory: Dictionary) -> int:
	return memory.get("importance", MemoryImportance.NORMAL)

# 获取记忆的时间戳
func _get_memory_timestamp(memory: Dictionary) -> float:
	return memory.get("created_at", 0.0)
