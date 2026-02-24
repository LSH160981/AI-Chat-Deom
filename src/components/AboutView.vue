<template>
  <div class="about p-6">
    <h1 class="text-3xl font-bold text-gray-800 mb-6">关于</h1>
    <el-card class="box-card max-w-md">
      <template #header>
        <div class="card-header">
          <span class="font-bold">关于本项目</span>
        </div>
      </template>
      <div class="text-gray-600">
        <p class="mb-2">⚡ Vue 3</p>
        <p class="mb-2">🎨 Element Plus</p>
        <p class="mb-2">📦 Pinia</p>
        <p class="mb-2">🛣️ Vue Router</p>
        <p>💨 Tailwind CSS</p>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.box-card {
  width: 100%;
}
</style>
