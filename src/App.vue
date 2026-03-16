<template>
  <div id="app">
    <router-view />
    <!-- 全局弹窗（替代 confirm/alert） -->
    <AppModal
      v-model="modalState.visible"
      :title="modalState.title"
      :message="modalState.message"
      :icon="modalState.icon"
      :type="modalState.type"
      :confirmText="modalState.confirmText"
      :cancelText="modalState.cancelText"
      :showCancel="modalState.showCancel"
      @confirm="modalOnConfirm"
      @cancel="modalOnCancel"
    />
  </div>
</template>

<script setup>
import AppModal from './components/AppModal.vue'
import { useModal } from './composables/useModal'

const { state: modalState, onConfirm: modalOnConfirm, onCancel: modalOnCancel } = useModal()
</script>
