extends StaticBody2D

@export var sit_position: Vector2 = Vector2.ZERO  # 角色坐下时的位置偏移
@export var sit_direction: String = "right"  # 坐下时角色朝向
@export var base_z_index: int = 0  # 基础Z轴顺序
var occupied = false
var current_character = null

func _ready():
	# 将椅子加入chairs组
	add_to_group("chairs")
	# 添加交互区域
	var interaction_area = Area2D.new()
	var collision_shape = CollisionShape2D.new()
	var shape = CircleShape2D.new()
	shape.radius = 32  # 交互范围
	collision_shape.shape = shape
	interaction_area.add_child(collision_shape)
	add_child(interaction_area)
	
	# 连接信号
	interaction_area.body_entered.connect(_on_body_entered)
	interaction_area.body_exited.connect(_on_body_exited)
	
	# 设置椅子的Z轴顺序
	z_index = base_z_index

func _draw():
	# 绘制坐位位置指示器（仅在编辑器中可见）
	if Engine.is_editor_hint():
		draw_circle(sit_position, 5, Color.RED)
		# 绘制一条从椅子中心到坐位的线
		draw_line(Vector2.ZERO, sit_position, Color.YELLOW, 2)

func _on_body_entered(body: Node2D):
	if body.is_in_group("controllable_characters"):
		body.near_chair = self

func _on_body_exited(body: Node2D):
	if body.is_in_group("controllable_characters") and body.near_chair == self:
		body.near_chair = null

# 检查点击位置是否在椅子上
func is_clicked_on(click_position: Vector2) -> bool:
	var distance = global_position.distance_to(click_position)
	return distance <= 32.0  # 椅子的点击检测范围

# 获取椅子的坐位置（全局坐标）
func get_sit_position() -> Vector2:
	return global_position + sit_position

func sit_character(character: CharacterBody2D):
	if occupied:
		return false
		
	occupied = true
	current_character = character
	
	# 将角色移动到椅子的坐位置
	character.global_position = global_position + sit_position
	
	# 根据坐姿调整Z轴顺序
	if sit_direction == "up":
		# 角色在椅子后面
		character.z_index = base_z_index  # 角色保持在基础层
		z_index = base_z_index + 1  # 椅子移到角色上面
	else:
		# 角色在椅子前面
		character.z_index = base_z_index + 1  # 角色在椅子前面
		z_index = base_z_index  # 椅子保持原位
	
	return true

func stand_up():
	if current_character:
		# 计算角色站起后的位置（椅子背后16px）
		var stand_up_offset = Vector2.ZERO
		if sit_direction == "up":
			# 椅子朝上，角色站在椅子下方（背后）
			stand_up_offset = Vector2(0, 16)
		elif sit_direction == "down":
			# 椅子朝下，角色站在椅子上方（背后）
			stand_up_offset = Vector2(0, -20)
		elif sit_direction == "left":
			# 椅子朝左，角色站在椅子右方（背后）
			stand_up_offset = Vector2(16, 0)
		elif sit_direction == "right":
			# 椅子朝右，角色站在椅子左方（背后）
			stand_up_offset = Vector2(-20, 0)
		
		# 将角色移动到椅子背后的位置
		current_character.global_position = global_position + stand_up_offset
		
		# 重置Z轴顺序
		current_character.z_index = base_z_index  # 角色回到基础层
		z_index = base_z_index  # 椅子回到默认层
		occupied = false
		current_character = null
		return true
	return false
