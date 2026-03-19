<script setup lang="ts">
import { computed, ref } from 'vue'
import { Plus, Edit, Delete } from '@element-plus/icons-vue'
import { SUPPLIER_STATUS_MAP } from '@/constants/task'
import type { SupplierInfo } from '@/types/entity'

const props = defineProps<{
  suppliers: SupplierInfo[]
  selectedId: number | null
  loading: boolean
}>()

const emit = defineEmits<{
  select: [id: number]
  add: []
  edit: [supplier: SupplierInfo]
  delete: [supplier: SupplierInfo]
}>()

const searchText = ref('')

const filteredSuppliers = computed(() => {
  if (!searchText.value.trim()) return props.suppliers
  const keyword = searchText.value.trim().toLowerCase()
  return props.suppliers.filter(
    (s) =>
      (s.name && s.name.toLowerCase().includes(keyword)) ||
      (s.contactName && s.contactName.toLowerCase().includes(keyword)),
  )
})
</script>

<template>
  <div class="supplier-card-list">
    <div class="panel-header">
      <span class="panel-title">供应商列表</span>
      <el-button type="primary" :icon="Plus" size="small" circle @click="emit('add')" />
    </div>

    <el-input
      v-model="searchText"
      placeholder="搜索供应商..."
      clearable
      size="small"
      class="search-input"
    />

    <div v-loading="loading" class="card-scroll">
      <div
        v-for="item in filteredSuppliers"
        :key="item.id"
        class="supplier-card"
        :class="{ 'is-selected': item.id === selectedId }"
        @click="item.id && emit('select', item.id)"
      >
        <div class="card-top">
          <span class="card-name">{{ item.name || '未命名' }}</span>
          <el-tag
            v-if="item.status != null && SUPPLIER_STATUS_MAP[item.status]"
            :type="SUPPLIER_STATUS_MAP[item.status]?.type"
            size="small"
          >
            {{ SUPPLIER_STATUS_MAP[item.status]?.text }}
          </el-tag>
        </div>
        <div class="card-info">
          <span>联系人: {{ item.contactName || '-' }}</span>
          <span>电话: {{ item.phone || '-' }}</span>
        </div>
        <div v-if="item.address" class="card-info">
          <span>地址: {{ item.address }}</span>
        </div>
        <div class="card-actions">
          <el-button
            :icon="Edit"
            size="small"
            link
            type="primary"
            @click.stop="emit('edit', item)"
          >编辑</el-button>
          <el-button
            :icon="Delete"
            size="small"
            link
            type="danger"
            @click.stop="emit('delete', item)"
          >删除</el-button>
        </div>
      </div>

      <el-empty v-if="!loading && filteredSuppliers.length === 0" description="暂无供应商数据" :image-size="80" />
    </div>
  </div>
</template>

<style scoped>
.supplier-card-list {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 0 12px;
}

.panel-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.search-input {
  margin-bottom: 12px;
}

.card-scroll {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.supplier-card {
  padding: 12px;
  margin-bottom: 10px;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
  border-left: 3px solid #e4e7ed;
  cursor: pointer;
  transition: all 0.2s;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.supplier-card:hover {
  border-left-color: #a0cfff;
  background: #f5f9ff;
}

.supplier-card.is-selected {
  border-left-color: #409eff;
  background: #ecf5ff;
}

.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.card-name {
  font-weight: 600;
  font-size: 14px;
  color: #303133;
}

.card-info {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #909399;
  margin-bottom: 4px;
}

.card-actions {
  display: flex;
  gap: 4px;
  margin-top: 8px;
  justify-content: flex-end;
}
</style>
