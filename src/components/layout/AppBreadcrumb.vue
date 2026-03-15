<script setup lang="ts">
/**
 * AppBreadcrumb — 基于 route.matched 自动生成面包屑导航
 */
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

interface BreadcrumbItem {
  title: string
  path?: string
}

const breadcrumbs = computed<BreadcrumbItem[]>(() => {
  const items: BreadcrumbItem[] = []
  for (const matched of route.matched) {
    const title = matched.meta?.title as string | undefined
    if (title) {
      items.push({
        title,
        path: matched.path || undefined,
      })
    }
  }
  return items
})

function handleClick(item: BreadcrumbItem) {
  if (item.path && item.path !== route.path) {
    router.push(item.path)
  }
}
</script>

<template>
  <el-breadcrumb separator="/" class="app-breadcrumb">
    <el-breadcrumb-item
      v-for="(item, index) in breadcrumbs"
      :key="item.title"
    >
      <span
        v-if="index < breadcrumbs.length - 1 && item.path"
        class="app-breadcrumb__link"
        @click="handleClick(item)"
      >
        {{ item.title }}
      </span>
      <span v-else class="app-breadcrumb__current">{{ item.title }}</span>
    </el-breadcrumb-item>
  </el-breadcrumb>
</template>

<style scoped>
.app-breadcrumb {
  line-height: 32px;
}
.app-breadcrumb__link {
  cursor: pointer;
  color: var(--el-text-color-regular);
}
.app-breadcrumb__link:hover {
  color: var(--el-color-primary);
}
.app-breadcrumb__current {
  color: var(--el-text-color-primary);
  font-weight: 500;
}
</style>
