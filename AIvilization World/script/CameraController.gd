extends Camera2D

@export var follow_speed: float = 5.0  # 相机跟随速度
@export var zoom_level: float = 0.8    # 默认缩放级别（全局视图，显示更多内容）
@export var character_zoom: float = 1.5  # 跟随角色时的缩放级别
@export var drag_speed: float = 1.0  # 拖拽移动的速度
@export var zoom_speed: float = 0.1  # 滚轮缩放速度
@export var min_zoom: float = 0.5  # 最小缩放级别
@export var max_zoom: float = 2.0  # 最大缩放级别 拖拽移动速度

var target: Node2D = null
var original_position: Vector2
var is_dragging: bool = false
var drag_start_position: Vector2
var camera_start_position: Vector2
var manual_position: Vector2  # 手动拖拽后的位置
var is_manual_mode: bool = false  # 是否处于手动控制模式
var manual_zoom: float = 0.8  # 手动模式下的缩放级别

func _ready():
		# 设置初始位置为地图中心（根据你的地图大小调整这些值）
		position = Vector2(576, 320)  # 这个值应该是你的地图中心点坐标
		# 保存初始位置
		original_position = position
		manual_position = position
		# 设置初始缩放为全局视图
		zoom = Vector2(zoom_level, zoom_level)
		make_current()

func _process(delta):
	if is_manual_mode:
		# 手动模式：保持在手动设置的位置和缩放
		position = position.lerp(manual_position, follow_speed * delta)
		zoom = zoom.lerp(Vector2(manual_zoom, manual_zoom), follow_speed * delta)
	elif target:
		# 平滑跟随目标
		position = position.lerp(target.position, follow_speed * delta)
		# 平滑缩放
		zoom = zoom.lerp(Vector2(character_zoom, character_zoom), follow_speed * delta)
	else:
		# 如果没有目标，回到原始位置和缩放
		position = position.lerp(original_position, follow_speed * delta)
		zoom = zoom.lerp(Vector2(zoom_level, zoom_level), follow_speed * delta)

func _input(event):
	# 处理鼠标拖拽
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_RIGHT:
			if event.pressed:
				# 开始拖拽
				is_dragging = true
				drag_start_position = event.position
				camera_start_position = position
				# 保存当前缩放级别
				manual_zoom = zoom.x
			else:
				# 结束拖拽
				is_dragging = false
	
	if event is InputEventMouseMotion and is_dragging:
		# 拖拽移动相机
		var mouse_delta = event.position - drag_start_position
		# 将屏幕坐标转换为世界坐标（考虑缩放）
		var world_delta = mouse_delta / zoom.x * drag_speed
		manual_position = camera_start_position - world_delta
		is_manual_mode = true
	
	# 处理鼠标滚轮缩放
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_WHEEL_UP:
			# 放大
			zoom_camera(zoom_speed)
		elif event.button_index == MOUSE_BUTTON_WHEEL_DOWN:
			# 缩小
			zoom_camera(-zoom_speed)
	
	# 处理空格键恢复视角
	if event is InputEventKey and event.pressed and event.keycode == KEY_SPACE:
		restore_view()

func zoom_camera(delta_zoom: float):
	"""缩放相机，限制在最小和最大缩放范围内"""
	var current_zoom = zoom.x
	var new_zoom = clamp(current_zoom + delta_zoom, min_zoom, max_zoom)
	
	if is_manual_mode:
		# 手动模式下更新manual_zoom
		manual_zoom = new_zoom
	elif target:
		# 跟随角色模式下更新character_zoom
		character_zoom = new_zoom
	else:
		# 地图模式下更新zoom_level
		zoom_level = new_zoom

func restore_view():
	"""恢复到选中角色的中心视角，如果没有选中角色则居中显示地图"""
	is_manual_mode = false
	if target:
		# 恢复跟随选中角色
		follow_character(target)
	else:
		# 回到地图中心
		position = original_position
		zoom = Vector2(zoom_level, zoom_level)

func follow_character(character: Node2D):
	if character:
		target = character
		is_manual_mode = false  # 退出手动模式
	else:
		target = null
