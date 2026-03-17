<!--
  FancySelect.vue
  自绘下拉选择器（替代原生 <select>），解决“展开的系统下拉菜单很丑且不可控”的问题。

  特点：
  - 视觉可控：圆角/阴影/hover/focus
  - 支持 icon（比如国旗）对齐
  - 支持分组（group header，不可选）
-->
<template>
  <div class="fs" ref="rootEl">
    <button
      class="fs-trigger"
      :class="{ open: open, disabled: disabled }"
      :disabled="disabled"
      type="button"
      @click="toggle"
    >
      <span class="fs-trigger-inner">
        <span v-if="selected?.icon" class="fs-icon">
          <img v-if="isUrlIcon(selected.icon)" class="fs-icon-img" :src="selected.icon" alt="" />
          <span v-else class="fs-icon-emoji">{{ selected.icon }}</span>
        </span>
        <span class="fs-label" :class="{ placeholder: !selectedLabel }">{{ selectedLabel || placeholder }}</span>
      </span>
      <span class="fs-chevron" aria-hidden="true">▾</span>
    </button>

    <!--
      重要：下拉面板用 Teleport 挂到 body，避免被父容器 overflow/z-index 裁剪导致“看不到”。
    -->
    <Teleport to="body">
      <div v-if="open" ref="popEl" class="fs-pop" role="listbox" :style="popStyle">
        <div class="fs-pop-inner" :class="{ 'no-icon-col': !useIconCol }">
          <template v-for="(it, idx) in normalizedItems" :key="it.key || idx">
            <div v-if="it.type === 'group'" class="fs-group">{{ it.label }}</div>
            <button
              v-else
              type="button"
              class="fs-item"
              :class="{ selected: it.value === modelValue }"
              @click="choose(it.value)"
            >
              <!-- icon slot：需要 icon 列时才渲染；否则列表项整体左对齐 -->
              <span v-if="useIconCol" class="fs-icon" :class="{ placeholder: !it.icon }">
                <img v-if="it.icon && isUrlIcon(it.icon)" class="fs-icon-img" :src="it.icon" alt="" />
                <span v-else class="fs-icon-emoji">{{ it.icon || '' }}</span>
              </span>
              <span class="fs-item-label">{{ it.label }}</span>
              <span class="fs-check" aria-hidden="true">{{ it.value === modelValue ? '✓' : '' }}</span>
            </button>
          </template>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, nextTick, ref } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '请选择…' },
  disabled: { type: Boolean, default: false },
  /**
   * items: Array<
   *  | { type?: 'item', value: string, label: string, icon?: string, key?: string }
   *  | { type: 'group', label: string, key?: string }
   * >
   */
  items: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:modelValue', 'change'])

const open = ref(false)
const rootEl = ref(null)
const popEl = ref(null)
const popStyle = ref({})

const normalizedItems = computed(() => {
  return (props.items || []).map((x, i) => ({
    type: x.type || 'item',
    value: x.value,
    label: x.label,
    icon: x.icon,
    key: x.key || `${x.type || 'item'}-${x.value || x.label || i}`,
  }))
})

const selected = computed(() => normalizedItems.value.find(x => x.type !== 'group' && x.value === props.modelValue) || null)
const selectedLabel = computed(() => selected.value?.label || '')

// 是否存在分组标题 / icon，用于决定列表项是否需要“icon占位列”（无分组且无 icon 时左对齐）
const hasGroups = computed(() => normalizedItems.value.some(x => x.type === 'group'))
const hasIcons  = computed(() => normalizedItems.value.some(x => x.type !== 'group' && !!x.icon))
const useIconCol = computed(() => hasGroups.value || hasIcons.value)

const isUrlIcon = (s) => typeof s === 'string' && /^https?:\/\//.test(s)

const choose = (v) => {
  emit('update:modelValue', v)
  emit('change', v)
  open.value = false
}

const updatePopPos = () => {
  if (!rootEl.value) return
  const trigger = rootEl.value.querySelector('.fs-trigger')
  if (!trigger) return
  const r = trigger.getBoundingClientRect()

  // 固定定位，避免受任何父容器影响
  const width = Math.max(r.width, 220)
  // 默认向下展开；若底部空间不足则向上
  const preferDownTop = r.bottom + 8
  const maxH = 260
  const viewportH = window.innerHeight
  const downFits = preferDownTop + maxH < viewportH - 10
  const top = downFits ? preferDownTop : Math.max(10, r.top - 8 - maxH)

  popStyle.value = {
    position: 'fixed',
    left: `${Math.max(10, Math.min(r.left, window.innerWidth - width - 10))}px`,
    top: `${top}px`,
    width: `${Math.min(width, window.innerWidth - 20)}px`,
    zIndex: 9999,
  }
}

const toggle = async () => {
  if (props.disabled) return
  open.value = !open.value
  if (open.value) {
    await nextTick()
    updatePopPos()
  }
}

const onDocDown = (e) => {
  if (!open.value) return

  // Teleport 到 body 后，popEl 不再是 rootEl 的子节点；需要同时判断 popEl
  const t = e.target
  if (rootEl.value?.contains(t)) return
  if (popEl.value?.contains(t)) return

  open.value = false
}

const onKeyDown = (e) => {
  if (!open.value) return
  if (e.key === 'Escape') open.value = false
}

const onWin = () => { if (open.value) updatePopPos() }

onMounted(() => {
  document.addEventListener('mousedown', onDocDown)
  document.addEventListener('keydown', onKeyDown)
  window.addEventListener('resize', onWin)
  window.addEventListener('scroll', onWin, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDocDown)
  document.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('resize', onWin)
  window.removeEventListener('scroll', onWin, true)
})
</script>

<style scoped>
.fs { position: relative; width: 100%; max-width: 260px; }

.fs-trigger {
  width: 100%;
  height: 36px;
  padding: 0 12px;
  border-radius: 12px;
  border: 1px solid var(--input-border);
  background: linear-gradient(180deg, var(--input-bg), var(--card-bg));
  color: var(--text);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
  box-shadow: 0 1px 0 rgba(255,255,255,0.04), 0 8px 18px rgba(0,0,0,0.06);
}

.fs-trigger:hover { border-color: var(--text-secondary); }
.fs-trigger.open {
  border-color: #60a5fa;
  box-shadow: 0 0 0 3px rgba(96,165,250,0.25), 0 10px 22px rgba(0,0,0,0.10);
}
.fs-trigger.disabled { opacity: 0.5; cursor: not-allowed; }

.fs-trigger-inner { display: inline-flex; align-items: center; gap: 8px; min-width: 0; height: 20px; }

/*
  国旗图标：统一用 <img>（SVG），彻底消除 emoji 基线差异导致的“图标/文字不对齐”。
  仍兼容 emoji：若传入非 URL icon，会显示为文本。
*/
.fs-icon {
  width: 26px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.fs-icon.placeholder { opacity: 0; }
.fs-icon-img { width: 22px; height: 16px; border-radius: 3px; display: block; box-shadow: 0 0 0 1px rgba(0,0,0,0.18); }
.fs-icon-emoji { font-size: 18px; line-height: 20px; display: inline-flex; align-items: center; justify-content: center; }

.fs-label {
  height: 20px;
  display: inline-flex;
  align-items: center;
  font-size: 13px;
  font-weight: 650;
  line-height: 20px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.fs-label.placeholder { color: var(--text-muted); font-weight: 500; }
.fs-chevron { color: var(--text-muted); font-size: 12px; }

.fs-pop {
  /* position/left/top/width/z-index 由 popStyle（fixed + Teleport）控制 */
}

.fs-pop-inner {
  border-radius: 14px;
  border: 1px solid var(--border);
  background: var(--bg-secondary);
  box-shadow: 0 18px 40px rgba(0,0,0,0.22);
  overflow: hidden;
  padding: 6px;
  max-height: 260px;
  overflow-y: auto;
}

.fs-group {
  font-size: 11px;
  color: var(--text-muted);
  padding: 8px 10px;
}

.fs-item {
  width: 100%;
  display: grid;
  grid-template-columns: 26px minmax(0, 1fr) 20px;
  align-items: center;
  gap: 8px;
  padding: 9px 10px;
  border-radius: 10px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--text-secondary);
  text-align: left;
}

/* 列表里的 icon：不再用 translate hack，统一交给 img 的盒模型对齐 */
.fs-item .fs-icon { height: 20px; }

/* 无 icon 列（无分组且无 icon）时，让文本左对齐，不留空白 */
.fs-pop-inner.no-icon-col .fs-item { grid-template-columns: minmax(0, 1fr) 20px; }
.fs-pop-inner.no-icon-col .fs-item-label { grid-column: 1; }
.fs-pop-inner.no-icon-col .fs-check { grid-column: 2; }

.fs-item:hover { background: var(--hover-bg); color: var(--text); }
.fs-item.selected { background: rgba(96,165,250,0.12); color: var(--text); }

.fs-item-label {
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.fs-check { text-align: right; color: #60a5fa; font-weight: 700; }
</style>
