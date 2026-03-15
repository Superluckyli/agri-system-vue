<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, Search } from '@element-plus/icons-vue'

import { listMaterialInfo, listMaterialStockLog } from '@/api/modules/material'
import type { MaterialInfo, MaterialStockLog } from '@/types/entity'

type TimeRange = [string, string] | []

interface QueryParams {
  materialId: number | null
  changeType: string
  timeRange: TimeRange
  pageNum: number
  pageSize: number
}

const loading = ref(false)
const loadError = ref('')
const dataTruncated = ref(false)

const materialOptions = ref<MaterialInfo[]>([])
const logs = ref<MaterialStockLog[]>([])

const queryParams = reactive<QueryParams>({
  materialId: null,
  changeType: '',
  timeRange: [],
  pageNum: 1,
  pageSize: 10,
})

function parseTime(value?: string): number {
  if (!value) return 0
  const t = new Date(value).getTime()
  return Number.isFinite(t) ? t : 0
}

async function fetchMaterials(): Promise<void> {
  try {
    const res = await listMaterialInfo({ pageNum: 1, pageSize: 500 })
    materialOptions.value = res.items || []
  } catch (error) {
    const message = error instanceof Error && error.message ? error.message : '加载物料选项失败'
    ElMessage.error(message)
    materialOptions.value = []
  }
}

async function fetchLogs(): Promise<void> {
  loading.value = true
  loadError.value = ''
  dataTruncated.value = false
  try {
    const res = await listMaterialStockLog({
      pageNum: 1,
      pageSize: 500,
      materialId: queryParams.materialId || undefined,
      changeType: queryParams.changeType || undefined,
    })
    logs.value = res.items || []
    dataTruncated.value = Number(res.total || 0) > logs.value.length
    queryParams.pageNum = 1
  } catch (error) {
    logs.value = []
    loadError.value = error instanceof Error ? error.message : '加载库存变动记录失败'
  } finally {
    loading.value = false
  }
}

const filteredLogs = computed(() => {
  if (!queryParams.timeRange || queryParams.timeRange.length !== 2) {
    return [...logs.value].sort((a, b) => parseTime(b.createdAt) - parseTime(a.createdAt))
  }
  const [start, end] = queryParams.timeRange
  const startTime = new Date(start).getTime()
  const endTime = new Date(end).getTime()
  return logs.value
    .filter((item) => {
      const t = parseTime(item.createdAt)
      return t >= startTime && t <= endTime
    })
    .sort((a, b) => parseTime(b.createdAt) - parseTime(a.createdAt))
})

const total = computed(() => filteredLogs.value.length)

const pagedLogs = computed(() => {
  const start = (queryParams.pageNum - 1) * queryParams.pageSize
  return filteredLogs.value.slice(start, start + queryParams.pageSize)
})

const CHANGE_TYPE_MAP: Record<string, { label: string; tag: '' | 'success' | 'warning' | 'info' | 'danger' }> = {
  purchase_in: { label: '采购入库', tag: 'success' },
  task_out: { label: '任务出库', tag: 'warning' },
  manual_in: { label: '手动入库', tag: 'success' },
  manual_out: { label: '手动出库', tag: 'warning' },
  adjust: { label: '库存调整', tag: 'info' },
}

function formatChangeType(changeType?: string): { label: string; tag: string } {
  if (!changeType) return { label: '未知', tag: 'info' }
  return CHANGE_TYPE_MAP[changeType] ?? { label: changeType, tag: 'info' }
}

function getMaterialName(materialId?: number): string {
  const found = materialOptions.value.find((item) => item.materialId === materialId)
  return found?.name || `物料ID: ${materialId ?? '-'}`
}

function handleQuery(): void {
  queryParams.pageNum = 1
  void fetchLogs()
}

function resetQuery(): void {
  queryParams.materialId = null
  queryParams.changeType = ''
  queryParams.timeRange = []
  queryParams.pageNum = 1
  queryParams.pageSize = 10
  void fetchLogs()
}

function handleSizeChange(size: number): void {
  queryParams.pageSize = size
  queryParams.pageNum = 1
}

function handleCurrentChange(page: number): void {
  queryParams.pageNum = page
}

onMounted(() => {
  void Promise.all([fetchMaterials(), fetchLogs()])
})
</script>

<template>
  <div class="app-container">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <div class="title">库存变动记录</div>
          <div class="subtitle">查看物料出入库及库存调整流水</div>
        </div>
      </template>

      <el-form :model="queryParams" inline label-width="88px">
        <el-form-item label="物料">
          <el-select v-model="queryParams.materialId" placeholder="全部物料" clearable filterable style="width: 220px">
            <el-option
              v-for="item in materialOptions"
              :key="item.materialId"
              :label="item.name || `物料ID: ${item.materialId}`"
              :value="item.materialId"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="变动类型">
          <el-select v-model="queryParams.changeType" placeholder="全部类型" clearable style="width: 150px">
            <el-option
              v-for="(item, key) in CHANGE_TYPE_MAP"
              :key="key"
              :label="item.label"
              :value="key"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="queryParams.timeRange"
            type="datetimerange"
            value-format="YYYY-MM-DDTHH:mm:ss"
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            style="width: 380px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleQuery">查询</el-button>
          <el-button :icon="Refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>

      <el-alert v-if="dataTruncated" type="warning" :closable="false" style="margin-bottom: 12px">
        <template #title>
          库存变动记录超过 500 条，当前仅拉取前 500 条用于查询和筛选。
        </template>
      </el-alert>

      <el-alert v-if="loadError" type="error" :closable="false" style="margin-bottom: 12px">
        <template #title>加载失败：{{ loadError }}</template>
        <el-button text type="primary" @click="fetchLogs">点击重试</el-button>
      </el-alert>

      <el-table v-loading="loading" :data="pagedLogs" style="width: 100%">
        <el-table-column label="ID" prop="id" width="80" align="center" />
        <el-table-column label="物料" min-width="160">
          <template #default="scope">
            {{ getMaterialName(scope.row.materialId) }}
          </template>
        </el-table-column>
        <el-table-column label="变动类型" width="110" align="center">
          <template #default="scope">
            <el-tag :type="formatChangeType(scope.row.changeType).tag">
              {{ formatChangeType(scope.row.changeType).label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="数量" width="100" align="center">
          <template #default="scope">
            {{ scope.row.qty ?? '-' }}
          </template>
        </el-table-column>
        <el-table-column label="变动前" width="100" align="center">
          <template #default="scope">
            {{ scope.row.beforeStock ?? '-' }}
          </template>
        </el-table-column>
        <el-table-column label="变动后" width="100" align="center">
          <template #default="scope">
            {{ scope.row.afterStock ?? '-' }}
          </template>
        </el-table-column>
        <el-table-column label="关联类型" prop="relatedType" width="100" align="center" />
        <el-table-column label="关联ID" prop="relatedId" width="90" align="center" />
        <el-table-column label="备注" prop="remark" min-width="180" show-overflow-tooltip />
        <el-table-column label="创建时间" prop="createdAt" min-width="180" />
        <template #empty>
          <el-empty description="暂无库存变动记录" />
        </template>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-show="total > 0"
          v-model:current-page="queryParams.pageNum"
          v-model:page-size="queryParams.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="total"
          background
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.app-container {
  padding: 24px;
}

.card-header .title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.card-header .subtitle {
  margin-top: 4px;
  font-size: 13px;
  color: #909399;
}

.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
