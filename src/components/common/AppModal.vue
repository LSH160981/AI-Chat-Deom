<!--
  ============================================================
  文件说明：AppModal.vue
  功能：通用模态弹窗组件，支持 alert / confirm 两种使用场景。
  特性：
    - 通过 Teleport 将弹窗挂载到 body，避免层叠上下文问题
    - 支持 Transition 动画（淡入淡出 + 缩放）
    - 支持三种样式类型：default / danger / warning
    - 可控制是否显示取消按钮（仅确认场景可隐藏取消）
    - 通过 v-model（modelValue）控制显示/隐藏
    - 支持 slot 插入自定义内容
  使用方式：
    配合 useModal composable 的 alert() / confirm() 函数调用，
    或直接在模板中使用 v-model 控制。
  ============================================================
-->
<template>
  <!-- Teleport：将弹窗渲染到 body，防止被父级 overflow:hidden 截断 -->
  <Teleport to="body">
    <!-- Transition：提供淡入淡出动画，name="modal" 对应 CSS 中的 .modal-enter-* 类 -->
    <Transition name="modal">
      <!-- 遮罩层：v-if 控制显隐，点击遮罩背景（self）触发取消 -->
      <div v-if="modelValue" class="modal-backdrop" @click.self="onCancel">
        <!-- 弹窗主体：根据 type prop 动态绑定样式类（default/danger/warning） -->
        <div class="modal-box" :class="type">
          <!-- 可选图标区域（如 ⚠️ ⚙️ 等 emoji） -->
          <div v-if="icon" class="modal-icon">{{ icon }}</div>
          <!-- 可选标题 -->
          <h3 v-if="title" class="modal-title">{{ title }}</h3>
          <!-- 可选描述文本 -->
          <p v-if="message" class="modal-message">{{ message }}</p>
          <!-- prompt 输入框（可选）：用于重命名等场景 -->
          <input
            v-if="showInput"
            class="modal-input"
            :value="inputValue"
            :placeholder="inputPlaceholder"
            :maxlength="inputMaxLength"
            @input="$emit('update:inputValue', $event.target.value)"
          />

          <!-- 默认插槽：允许插入自定义内容（如表单、列表等） -->
          <slot />

          <!-- 操作按钮区域：showCancel=false 时添加 single 类居中显示 -->
          <div class="modal-actions" :class="{ single: !showCancel }">
            <!-- 取消按钮：仅在 showCancel=true 时显示 -->
            <button v-if="showCancel" class="modal-btn cancel" @click="onCancel">{{ cancelText || $t('common.cancel') }}</button>
            <!-- 确认按钮：根据 type 绑定颜色类（danger 为红色） -->
            <button ref="confirmBtn" class="modal-btn confirm" :class="type" @click="onConfirm">{{ confirmText || $t('common.confirm') }}</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
/**
 * Props 定义
 * @prop {Boolean} modelValue   - 控制弹窗显示/隐藏（v-model 绑定）
 * @prop {String}  title        - 弹窗标题（可选）
 * @prop {String}  message      - 弹窗描述文本（可选）
 * @prop {String}  icon         - 顶部图标，通常为 emoji（可选）
 * @prop {String}  type         - 弹窗类型：default | danger | warning，影响确认按钮颜色
 * @prop {String}  confirmText  - 确认按钮文字，默认使用 i18n 的 common.confirm
 * @prop {String}  cancelText   - 取消按钮文字，默认使用 i18n 的 common.cancel
 * @prop {Boolean} showCancel   - 是否显示取消按钮，默认 true（alert 场景可设为 false）
 */
import { nextTick, ref, watch } from 'vue'

const props = defineProps({
  modelValue: Boolean,
  title: String,
  message: String,
  icon: String,
  type: { type: String, default: 'default' }, // default | danger | warning
  confirmText: String,
  cancelText: String,
  showCancel: { type: Boolean, default: true },

  // 是否自动聚焦确认按钮（危险操作确认：Tab/回车更快）
  focusConfirm: { type: Boolean, default: false },

  // prompt 输入框（可选）
  showInput: { type: Boolean, default: false },
  inputValue: { type: String, default: '' },
  inputPlaceholder: { type: String, default: '' },
  inputMaxLength: { type: Number, default: 30 },
})

const confirmBtn = ref(null)

watch(() => props.modelValue, async (v) => {
  if (!v) return
  if (!props.focusConfirm) return
  await nextTick()
  confirmBtn.value?.focus?.()
})

/**
 * Emits 定义
 * update:modelValue - 关闭弹窗时通知父组件更新 v-model
 * confirm           - 用户点击确认时触发
 * cancel            - 用户点击取消或点击遮罩时触发
 * update:inputValue - 输入框变化时同步
 */
const emit = defineEmits(['update:modelValue', 'confirm', 'cancel', 'update:inputValue'])

/**
 * 处理确认操作
 * 触发 confirm 事件，并通过 update:modelValue 关闭弹窗
 */
const onConfirm = () => {
  emit('confirm')
  emit('update:modelValue', false) // 关闭弹窗
}

/**
 * 处理取消操作（点击取消按钮或点击遮罩背景）
 * 触发 cancel 事件，并通过 update:modelValue 关闭弹窗
 */
const onCancel = () => {
  emit('cancel')
  emit('update:modelValue', false) // 关闭弹窗
}
</script>

<style>
/* 弹窗遮罩层：全屏覆盖，半透明黑色背景 + 模糊效果 */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  backdrop-filter: blur(2px); /* 背景模糊增强层次感 */
}

/* 弹窗主体容器 */
.modal-box {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 16px;
  padding: 24px;
  max-width: 360px;
  width: 100%;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.3);
  text-align: center;
}

.modal-icon { font-size: 36px; margin-bottom: 12px; }
.modal-title { font-size: 17px; font-weight: 700; color: var(--text); margin-bottom: 8px; }
.modal-message { font-size: 14px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 20px; }

.modal-input {
  width: 100%;
  height: 40px;
  padding: 0 12px;
  border-radius: 12px;
  border: 1px solid var(--input-border);
  background: var(--input-bg);
  color: var(--text);
  font-size: 14px;
  outline: none;
}
.modal-input:focus {
  border-color: #60a5fa;
  box-shadow: 0 0 0 3px rgba(96,165,250,0.25);
}

/* 按钮操作区域 */
.modal-actions { display: flex; gap: 10px; margin-top: 20px; }
/* single：仅有确认按钮时居中显示 */
.modal-actions.single { justify-content: center; }

/* 按钮公共样式 */
.modal-btn {
  flex: 1;
  padding: 10px 16px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: background 0.15s;
}
/* 取消按钮：次要样式 */
.modal-btn.cancel { background: var(--hover-bg); color: var(--text-secondary); }
.modal-btn.cancel:hover { background: var(--active-bg); }
/* 确认按钮：主要样式（默认） */
.modal-btn.confirm { background: var(--text); color: var(--bg); }
.modal-btn.confirm:hover { opacity: 0.85; }
/* 危险确认按钮：红色警示样式 */
.modal-btn.confirm.danger { background: #e53e3e; color: #fff; }
.modal-btn.confirm.danger:hover { background: #c53030; }

/* 弹窗进入/离开过渡动画 */
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s, transform 0.2s; }
/* 遮罩层淡入淡出 */
.modal-enter-from, .modal-leave-to { opacity: 0; }
/* 弹窗主体缩放动画 */
.modal-enter-from .modal-box, .modal-leave-to .modal-box { transform: scale(0.92); }
</style>
