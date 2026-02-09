extends RefCounted

class_name BackgroundStoryManager

# 故事背景数据结构
class StoryBackground:
	var map_name: String
	var company_name: String
	var background_description: String
	var preset_rules: Array[String]
	
	func _init(name: String, company: String, description: String, rules: Array[String]):
		map_name = name
		company_name = company
		background_description = description
		preset_rules = rules

# 社会规则数据结构
class SocialRule:
	var rule_text: String
	var is_custom: bool
	
	func _init(text: String, custom: bool = false):
		rule_text = text
		is_custom = custom

# 当前状态
static var current_map_name: String = "Office"
static var custom_rules: Array[String] = []

# 预设的故事背景配置
static var BACKGROUND_CONFIGS = {
	"Office": {
		"company_name": "CountSheep游戏公司",
		"company_description": "一家专注于休闲小游戏开发的创新公司，主要产品是《CountSheep》小游戏。游戏宣传语：Can't Sleep? Count Sheep。游戏玩法：通过让用户数手机屏幕上跳过的小羊，然后有九宫格数字按钮来计数得分。该游戏目前十分流行，吸引了许多跟时髦的小青年充值购买小羊皮肤和按键皮肤。",
		"environment_description": "这是一家现代化的公司，有多个工作区、会议室和休息区。办公室装修简洁明亮，有大窗户可以看到外面的景色。工作环境轻松愉快，鼓励创新和团队合作。",
		"time_period": "现代（2024年）",
		"cultural_context": "现代都市办公文化，注重工作与生活平衡，团队协作和创新思维。",
		"economic_situation": "公司处于快速发展期，游戏收入稳定增长，员工待遇良好。",
		"social_rules": [
			"工作时间内应保持专业态度",
			"鼓励团队合作和知识分享",
			"尊重同事的个人空间和工作习惯",
			"会议室使用需要提前预约",
			"保持工作区域整洁",
			"午休时间可以适当放松",
			"重要决策需要团队讨论"
		]
	},
	"School": {
		"company_name": "阳光学院",
		"company_description": "一所注重全面发展的现代化学校，致力于培养学生的学术能力和综合素质。学校设有完善的教学设施和丰富的课外活动。",
		"environment_description": "校园环境优美，有教学楼、图书馆、实验室、体育馆等设施。绿树成荫，学习氛围浓厚。",
		"time_period": "现代（2024年）",
		"cultural_context": "教育文化环境，重视知识传授、品德培养和师生关系。",
		"economic_situation": "学校资金充足，设施完善，教师待遇稳定。",
		"social_rules": [
			"上课时间保持安静，认真听讲",
			"尊重老师和同学",
			"按时完成作业和任务",
			"保持校园环境整洁",
			"遵守校规校纪",
			"积极参与课堂讨论",
			"课间时间可以适当休息和交流"
		]
	},
	"Jail": {
		"company_name": "新希望监狱",
		"company_description": "一所现代化的监狱，致力于罪犯改造和社会复归。采用人性化管理方式，注重教育和职业培训。",
		"environment_description": "监狱设施完善，有牢房、食堂、图书馆、工作坊等区域。环境相对封闭但管理规范。",
		"time_period": "现代（2024年）",
		"cultural_context": "监狱改造文化，强调纪律、秩序和个人改造。",
		"economic_situation": "监狱运营规范，有基本的生活保障和工作机会。",
		"social_rules": [
			"严格遵守监狱作息时间",
			"服从管理人员的指挥",
			"不得发生冲突和暴力行为",
			"积极参与改造活动",
			"保持个人和环境卫生",
			"尊重其他服刑人员",
			"按时参加工作和学习"
		]
	}
}

# 当前激活的故事背景
static var current_background: StoryBackground

# 用户自定义规则存储文件路径
static var CUSTOM_RULES_FILE = "user://custom_social_rules.json"

# 初始化背景故事管理器
static func initialize(map_name: String = "Office"):
	set_background(map_name)

# 设置当前地图的故事背景
static func set_background(map_name: String):
	if not BACKGROUND_CONFIGS.has(map_name):
		print("[BackgroundStoryManager] 警告：未找到地图 '%s' 的背景配置，使用默认Office配置" % map_name)
		map_name = "Office"
	
	var config = BACKGROUND_CONFIGS[map_name]
	var social_rules_array: Array[String] = []
	for rule in config["social_rules"]:
		social_rules_array.append(rule)
	
	current_background = StoryBackground.new(
		map_name,
		config["company_name"],
		config["company_description"] + "\n" + config["environment_description"] + "\n时代背景：" + config["time_period"] + "\n文化背景：" + config["cultural_context"] + "\n经济状况：" + config["economic_situation"],
		social_rules_array
	)
	
	current_map_name = map_name
	
	# 加载用户自定义规则
	load_custom_rules()
	
	print("[BackgroundStoryManager] 已设置故事背景：%s" % map_name)

# 获取当前故事背景信息（用于prompt）
static func get_background_info_for_prompt() -> String:
	if not current_background:
		initialize()
	
	var info = ""
	info += "\n\n=== 故事背景信息 ==="
	info += "\n机构名称：" + current_background.company_name
	info += "\n" + current_background.background_description
	
	info += "\n\n=== 社会规则 ==="
	info += "\n以下是你必须遵守的社会规则和行为准则："
	
	# 添加预设规则
	for i in range(current_background.preset_rules.size()):
		info += "\n%d. %s" % [i + 1, current_background.preset_rules[i]]
	
	# 添加用户自定义规则
	if custom_rules.size() > 0:
		info += "\n\n=== 额外社会规则 ==="
		info += "\n以下是额外的重要规则："
		for i in range(custom_rules.size()):
			info += "\n%d. %s" % [i + 1, custom_rules[i]]
	
	info += "\n\n注意：你的所有行为和决策都应该符合以上背景设定和社会规则。"
	
	return info



# 添加用户自定义规则
static func add_custom_rule(rule: String):
	if rule.strip_edges().is_empty():
		return false
	
	custom_rules.append(rule.strip_edges())
	save_custom_rules()
	print("[BackgroundStoryManager] 已添加自定义规则：%s" % rule)
	return true

# 移除用户自定义规则
static func remove_custom_rule(index: int):
	if index < 0 or index >= custom_rules.size():
		return false
	
	var removed_rule = custom_rules[index]
	custom_rules.remove_at(index)
	save_custom_rules()
	print("[BackgroundStoryManager] 已移除自定义规则：%s" % removed_rule)
	return true

# 获取所有自定义规则
static func get_custom_rules() -> Array[String]:
	return custom_rules

# 清空所有自定义规则
static func clear_custom_rules():
	custom_rules.clear()
	save_custom_rules()
	print("[BackgroundStoryManager] 已清空所有自定义规则")

# 保存用户自定义规则到文件
static func save_custom_rules():
	var save_data = {
		"map_name": current_map_name,
		"custom_rules": custom_rules
	}
	
	var file = FileAccess.open(CUSTOM_RULES_FILE, FileAccess.WRITE)
	if file:
		file.store_string(JSON.stringify(save_data))
		file.close()
		print("[BackgroundStoryManager] 自定义规则已保存")
	else:
		print("[BackgroundStoryManager] 保存自定义规则失败")

# 从文件加载用户自定义规则
static func load_custom_rules():
	if not FileAccess.file_exists(CUSTOM_RULES_FILE):
		return
	
	var file = FileAccess.open(CUSTOM_RULES_FILE, FileAccess.READ)
	if not file:
		return
	
	var json_string = file.get_as_text()
	file.close()
	
	var json = JSON.new()
	var parse_result = json.parse(json_string)
	
	if parse_result != OK:
		print("[BackgroundStoryManager] 解析自定义规则文件失败")
		return
	
	var save_data = json.data
	if save_data.has("map_name") and save_data["map_name"] == current_map_name:
		if save_data.has("custom_rules"):
			custom_rules = save_data["custom_rules"]
			print("[BackgroundStoryManager] 已加载 %d 条自定义规则" % custom_rules.size())

# 获取可用的地图列表
static func get_available_maps() -> Array[String]:
	var maps: Array[String] = []
	for key in BACKGROUND_CONFIGS.keys():
		maps.append(key)
	return maps

# 获取当前地图名称
static func get_current_map_name() -> String:
	return current_map_name

# 获取当前公司名称
static func get_current_company_name() -> String:
	if current_background:
		return current_background.company_name
	return "未知机构"

# 获取当前背景描述
static func get_current_background_description() -> String:
	if current_background:
		return current_background.background_description
	return "无背景描述"

# 获取预设规则
static func get_preset_rules() -> Array[String]:
	if current_background:
		return current_background.preset_rules
	return []

# 获取所有规则（预设+自定义）
static func get_all_rules() -> Array[String]:
	var all_rules: Array[String] = []
	all_rules.append_array(get_preset_rules())
	all_rules.append_array(custom_rules)
	return all_rules

# 生成完整的背景和规则prompt
static func generate_background_prompt() -> String:
	var prompt = ""
	
	# 添加背景描述
	var background_desc = get_current_background_description()
	if not background_desc.is_empty():
		prompt += "## 故事背景\n"
		prompt += background_desc + "\n\n"
	
	# 添加社会规则
	var all_rules = get_all_rules()
	if all_rules.size() > 0:
		prompt += "## 社会规则\n"
		for i in range(all_rules.size()):
			prompt += "%d. %s\n" % [i + 1, all_rules[i]]
		prompt += "\n"
	
	return prompt

# 生成简化的背景信息（用于UI显示）
static func get_background_summary() -> Dictionary:
	return {
		"map_name": current_map_name,
		"company_name": get_current_company_name(),
		"preset_rules_count": get_preset_rules().size(),
		"custom_rules_count": custom_rules.size(),
		"total_rules_count": get_all_rules().size()
	}

# 检查地图是否存在
static func is_map_available(map_name: String) -> bool:
	return BACKGROUND_CONFIGS.has(map_name)
