<template>
  <div class="home p-6">
    <h1 class="text-3xl font-bold text-gray-800 mb-6">首页</h1>
    <div class="flex gap-4 flex-wrap">
      <el-button type="primary">Primary</el-button>
      <el-button>Default</el-button>
      <el-button type="success">Success</el-button>
      <el-button type="danger">Danger</el-button>
    </div>
    <div class="mt-6 p-4 bg-white rounded-lg shadow">
      <p class="text-gray-600">计数器: <span class="font-bold text-2xl">{{ count }}</span></p>
      <div class="mt-4 flex gap-2">
        <el-button @click="store.increment()">+1</el-button>
        <el-button @click="store.decrement()">-1</el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useCounterStore } from '../stores/counter'
import { storeToRefs } from 'pinia'

const store = useCounterStore()
const { count } = storeToRefs(store)
</script>
