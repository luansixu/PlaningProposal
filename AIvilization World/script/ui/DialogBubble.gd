extends Node2D

var target_node: Node2D = null
var text_label: Label
var background: NinePatchRect
var tween: Tween
var is_target_on_right: bool = false

func _ready():
	# 设置显示层级
	z_index = 100
	
	# 创建背景
	background = NinePatchRect.new()
	background.texture = preload("res://asset/ui/dialog_bubble_bg.png")
	background.patch_margin_left = 8
	background.patch_margin_top = 8
	background.patch_margin_right = 8
	background.patch_margin_bottom = 8
	add_child(background)
	
	# 创建文本标签
	text_label = Label.new()
	text_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	text_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	text_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	text_label.custom_minimum_size = Vector2(100, 40)
	# 设置自定义字体
	var custom_font = preload("res://asset/fonts/fusion-pixel-12px-proportional-zh_hans.otf")
	text_label.add_theme_font_override("font", custom_font)
	text_label.add_theme_font_size_override("font_size", 12) # 设置字体大小
	text_label.add_theme_color_override("font_color", Color(0, 0, 0, 1)) # 设置字体颜色为黑色
	background.add_child(text_label)
	
	# 初始时隐藏
	hide()

# 显示对话内容
func show_dialog(text: String, duration: float = 5.0, target_on_right: bool = false):
	text_label.text = text
	is_target_on_right = target_on_right
	
	# 调整背景大小以适应文本
	await get_tree().process_frame
	var text_size = text_label.size
	background.size = text_size + Vector2(20, 20)
	text_label.position = Vector2(10, 10)
	
	# 显示气泡
	show()
	
	# 创建消失动画
	if tween:
		tween.kill()
	tween = create_tween()
	tween.tween_interval(duration)
	tween.tween_callback(hide)

# 更新位置
func _process(_delta):
	if target_node and visible:
		# 水平居中：气泡中心对齐角色中心
		var horizontal_offset = -background.size.x / 2
		# 根据气泡高度动态计算垂直偏移，确保不遮挡角色
		# 气泡高度 + 额外间距(20像素)确保完全不遮挡
		var vertical_offset = -(background.size.y + 20)
		# 将气泡定位在目标节点正上方居中
		global_position = target_node.global_position + Vector2(horizontal_offset, vertical_offset)
