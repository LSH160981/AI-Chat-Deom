<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modelValue" class="modal-backdrop" @click.self="onCancel">
        <div class="modal-box" :class="type">
          <div v-if="icon" class="modal-icon">{{ icon }}</div>
          <h3 v-if="title" class="modal-title">{{ title }}</h3>
          <p v-if="message" class="modal-message">{{ message }}</p>
          <slot />
          <div class="modal-actions" :class="{ single: !showCancel }">
            <button v-if="showCancel" class="modal-btn cancel" @click="onCancel">{{ cancelText || $t('common.cancel') }}</button>
            <button class="modal-btn confirm" :class="type" @click="onConfirm">{{ confirmText || $t('common.confirm') }}</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
const props = defineProps({
  modelValue: Boolean,
  title: String,
  message: String,
  icon: String,
  type: { type: String, default: 'default' }, // default | danger | warning
  confirmText: String,
  cancelText: String,
  showCancel: { type: Boolean, default: true },
})

const emit = defineEmits(['update:modelValue', 'confirm', 'cancel'])

const onConfirm = () => {
  emit('confirm')
  emit('update:modelValue', false)
}

const onCancel = () => {
  emit('cancel')
  emit('update:modelValue', false)
}
</script>

<style>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  backdrop-filter: blur(2px);
}

.modal-box {
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  max-width: 360px;
  width: 100%;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.18);
  text-align: center;
}

.modal-icon { font-size: 36px; margin-bottom: 12px; }
.modal-title { font-size: 17px; font-weight: 700; color: #1a1a1a; margin-bottom: 8px; }
.modal-message { font-size: 14px; color: #666; line-height: 1.6; margin-bottom: 20px; }

.modal-actions { display: flex; gap: 10px; margin-top: 20px; }
.modal-actions.single { justify-content: center; }

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
.modal-btn.cancel { background: #f0f0f0; color: #555; }
.modal-btn.cancel:hover { background: #e5e5e5; }
.modal-btn.confirm { background: #1a1a1a; color: #fff; }
.modal-btn.confirm:hover { background: #333; }
.modal-btn.confirm.danger { background: #e53e3e; }
.modal-btn.confirm.danger:hover { background: #c53030; }

/* 动画 */
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s, transform 0.2s; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from .modal-box, .modal-leave-to .modal-box { transform: scale(0.92); }
</style>
