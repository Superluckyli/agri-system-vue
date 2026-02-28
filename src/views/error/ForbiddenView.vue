<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const target = typeof route.query.redirect === 'string' ? route.query.redirect : '/dashboard'

function goBack(): void {
  void router.back()
}

function goHome(): void {
  void router.replace('/dashboard')
}

function tryTarget(): void {
  void router.replace(target)
}
</script>

<template>
  <div class="forbidden-page">
    <el-card shadow="never" class="forbidden-card">
      <h1>403</h1>
      <h3>无权限访问</h3>
      <p>当前账号没有访问该页面的前端权限。</p>
      <div class="actions">
        <el-button @click="goBack">返回上一页</el-button>
        <el-button @click="goHome">回到首页</el-button>
        <el-button type="primary" @click="tryTarget">重试目标页</el-button>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.forbidden-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  background: #f5f7fa;
}

.forbidden-card {
  width: min(520px, 100%);
  text-align: center;
}

h1 {
  margin: 0;
  font-size: 56px;
  line-height: 1;
  color: #f56c6c;
}

h3 {
  margin: 12px 0 8px;
  font-size: 24px;
  color: #303133;
}

p {
  margin: 0;
  color: #909399;
}

.actions {
  margin-top: 20px;
  display: flex;
  gap: 10px;
  justify-content: center;
}
</style>
