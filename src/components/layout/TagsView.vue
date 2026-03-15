<script setup lang="ts">
/**
 * TagsView — 多标签页导航 (route history)
 *
 * 记录访问过的路由标签，支持关闭、右键关闭其他。
 * 与 keep-alive 配合使用需在 AppLayout 中设置 include 列表。
 */
import { ref, watch, computed } from 'vue'
import { useRoute, useRouter, type RouteLocationNormalized } from 'vue-router'

interface TagItem {
  path: string
  name: string
  title: string
  /** 是否固定不可关闭 */
  affix?: boolean
}

const route = useRoute()
const router = useRouter()

const tags = ref<TagItem[]>([
  { path: '/dashboard', name: 'dashboard', title: '工作台', affix: true },
])

const activeTag = computed(() => route.path)

function addTag(to: RouteLocationNormalized) {
  const title = (to.meta?.title as string) || to.name?.toString() || to.path
  if (!title || to.path === '/login' || to.path === '/register' || to.path === '/403') return

  const exists = tags.value.find((t) => t.path === to.path)
  if (!exists) {
    tags.value.push({
      path: to.path,
      name: to.name?.toString() || '',
      title,
    })
  }
}

function closeTag(tag: TagItem) {
  if (tag.affix) return
  const idx = tags.value.findIndex((t) => t.path === tag.path)
  if (idx === -1) return
  tags.value.splice(idx, 1)

  // 如果关闭的是当前路由，跳转到最后一个标签
  if (tag.path === route.path) {
    const last = tags.value[tags.value.length - 1]
    if (last) router.push(last.path)
  }
}

function closeOthers() {
  tags.value = tags.value.filter((t) => t.affix || t.path === route.path)
}

function navigateTo(tag: TagItem) {
  if (tag.path !== route.path) {
    router.push(tag.path)
  }
}

// 监听路由变化，自动添加标签
watch(() => route.path, () => addTag(route), { immediate: true })

defineExpose({ tags })
</script>

<template>
  <div class="tags-view">
    <div class="tags-view__scroll">
      <div
        v-for="tag in tags"
        :key="tag.path"
        class="tags-view__item"
        :class="{ 'tags-view__item--active': activeTag === tag.path }"
        @click="navigateTo(tag)"
        @contextmenu.prevent="closeOthers"
      >
        <span class="tags-view__title">{{ tag.title }}</span>
        <span
          v-if="!tag.affix"
          class="tags-view__close"
          @click.stop="closeTag(tag)"
        >
          &times;
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tags-view {
  height: 34px;
  border-bottom: 1px solid var(--el-border-color-light);
  background: var(--el-bg-color);
  padding: 0 12px;
  display: flex;
  align-items: center;
}
.tags-view__scroll {
  display: flex;
  gap: 4px;
  overflow-x: auto;
  white-space: nowrap;
}
.tags-view__item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0 10px;
  height: 26px;
  border: 1px solid var(--el-border-color);
  border-radius: 3px;
  font-size: 12px;
  cursor: pointer;
  user-select: none;
  color: var(--el-text-color-regular);
  background: var(--el-bg-color);
  transition: all 0.2s;
}
.tags-view__item:hover {
  color: var(--el-color-primary);
}
.tags-view__item--active {
  color: #fff;
  background: var(--el-color-primary);
  border-color: var(--el-color-primary);
}
.tags-view__close {
  font-size: 14px;
  line-height: 1;
  border-radius: 50%;
  width: 14px;
  height: 14px;
  text-align: center;
}
.tags-view__close:hover {
  background: rgba(0, 0, 0, 0.15);
}
.tags-view__item--active .tags-view__close:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>
