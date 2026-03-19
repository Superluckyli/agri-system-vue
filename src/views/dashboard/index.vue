<script setup lang="ts">
defineOptions({ name: 'DashboardIndex' })

import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { getReportDashboardV2 } from '@/api/modules/report'
import { getMaterialInfoLowStock } from '@/api/modules/material'
import type { DashboardV2Data, CropProgressItem, AlertItem, LowStockItem, MaterialInfo } from '@/types/entity'

const router = useRouter()
const loading = ref(true)
const loadError = ref('')
const data = ref<DashboardV2Data>({})

// 摘要卡片
const taskCompleted = computed(() => data.value.taskCompletion?.completed ?? 0)
const taskTotal = computed(() => data.value.taskCompletion?.total ?? 0)
const taskPercent = computed(() => taskTotal.value > 0 ? Math.round(taskCompleted.value / taskTotal.value * 100) : 0)
const taskRemaining = computed(() => Math.max(0, taskTotal.value - taskCompleted.value))

const activeArea = computed(() => data.value.farmlandStats?.activeArea ?? 0)
const utilizationRate = computed(() => data.value.farmlandStats?.utilizationRate ?? 0)

const alertCount = computed(() => data.value.alertCount ?? 0)

const monthlySpending = computed(() => {
  const v = data.value.monthlySpending ?? 0
  return v >= 10000 ? `¥${(v / 10000).toFixed(2)}w` : `¥${v.toLocaleString()}`
})

// 作物进度
const cropList = computed<CropProgressItem[]>(() => data.value.cropProgress ?? [])

// 预警列表
const alerts = computed<AlertItem[]>(() => data.value.recentAlerts ?? [])

// 低库存
const lowStockList = ref<LowStockItem[]>([])
const lowStockLoadError = ref('')

function alertLevelColor(level?: string) {
  if (level === 'CRITICAL') return '#f56c6c'
  if (level === 'WARNING') return '#e6a23c'
  return '#909399'
}

function alertLevelTag(level?: string) {
  if (level === 'CRITICAL') return 'danger'
  if (level === 'WARNING') return 'warning'
  return 'info'
}

function stockStatusType(status?: string): 'danger' | 'warning' | 'success' | 'info' {
  if (status === 'CRITICAL') return 'danger'
  if (status === 'LOW_STOCK') return 'warning'
  if (status === 'IN_TRANSIT') return 'info'
  return 'success'
}

function stockStatusLabel(status?: string) {
  if (status === 'CRITICAL') return '严重不足'
  if (status === 'LOW_STOCK') return '库存偏低'
  if (status === 'IN_TRANSIT') return '采购中'
  return '正常'
}

function healthColor(pct?: number) {
  if (!pct || pct <= 30) return '#f56c6c'
  if (pct <= 60) return '#e6a23c'
  return '#67c23a'
}

function cropProgressColor(pct?: number) {
  if (!pct) return '#409eff'
  if (pct >= 90) return '#67c23a'
  if (pct >= 60) return '#409eff'
  return '#2f8a4c'
}

function cropProgressLabel(item: CropProgressItem) {
  if ((item.progressPercent ?? 0) >= 95) return 'SOON'
  if ((item.progressPercent ?? 0) >= 100) return 'FINISH'
  return ''
}

function buildLowStockItem(item: MaterialInfo): LowStockItem {
  const currentStock = Number(item.currentStock || 0)
  const safeThreshold = Number(item.safeThreshold || 0)
  let healthPercent = 0
  if (safeThreshold > 0) {
    const pct = Math.round((currentStock * 100) / safeThreshold)
    healthPercent = Math.min(100, Math.max(0, pct))
  }
  const status = currentStock <= safeThreshold * 0.3
    ? 'CRITICAL'
    : 'LOW_STOCK'

  return {
    materialId: item.materialId,
    name: item.name,
    category: item.category,
    unit: item.unit,
    currentStock: item.currentStock,
    safeThreshold: item.safeThreshold,
    unitPrice: item.unitPrice,
    healthPercent,
    status,
  }
}

function goToBatchManage() {
  router.push('/crop/batch')
}

function goToMaterial() {
  router.push({ path: '/material/inventory', query: { lowStock: '1' } })
}

function goToPurchase() {
  router.push({ path: '/purchase', query: { prefill: 'lowstock' } })
}

async function loadData() {
  loading.value = true
  loadError.value = ''
  lowStockLoadError.value = ''
  try {
    data.value = await getReportDashboardV2()
    try {
      const lowStockMaterials = await getMaterialInfoLowStock()
      lowStockList.value = (lowStockMaterials || []).map(buildLowStockItem)
    } catch (error) {
      lowStockLoadError.value = error instanceof Error ? error.message : 'Low stock materials failed to load'
      lowStockList.value = []
    }
  } catch (e: any) {
    lowStockList.value = []
    loadError.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
</script>

<template>
  <div class="dashboard-v2">
    <!-- 加载/错误状态 -->
    <div v-if="loading" class="loading-mask">
      <el-skeleton :rows="8" animated />
    </div>
    <div v-else-if="loadError" class="error-box">
      <el-empty :description="loadError">
        <el-button type="primary" @click="loadData">重新加载</el-button>
      </el-empty>
    </div>
    <template v-else>
      <!-- Row 1: 四张摘要卡片 -->
      <div class="summary-row">
        <!-- 任务完成度 -->
        <div class="summary-card card-task" @click="router.push('/task/list')">
          <div class="card-header">
            <el-tag size="small" type="success" effect="dark" round>日常任务</el-tag>
            <el-icon :size="20" color="#67c23a"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg></el-icon>
          </div>
          <div class="card-label">今日行动完成度</div>
          <div class="card-value">
            <span class="big-num">{{ taskCompleted }}</span>
            <span class="sub-num">/ {{ taskTotal }}</span>
          </div>

        </div>

        <!-- 活跃耕地 -->
        <div class="summary-card card-farmland" @click="router.push('/crop/farmland-batch')">
          <div class="card-header">
            <el-tag size="small" type="primary" effect="dark" round>资源占用</el-tag>
            <el-icon :size="20" color="#409eff"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="M7 16l4-8 4 4 4-6"/></svg></el-icon>
          </div>
          <div class="card-label">活跃耕地覆盖</div>
          <div class="card-value">
            <span class="big-num">{{ activeArea }}</span>
            <span class="sub-num"> 亩</span>
          </div>

        </div>

        <!-- 预警 -->
        <div class="summary-card card-alert" @click="router.push('/iot/monitor')">
          <div class="card-header">
            <el-tag size="small" type="danger" effect="dark" round>紧急预警</el-tag>
            <el-icon :size="20" color="#f56c6c"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg></el-icon>
          </div>
          <div class="card-label">系统威胁等级</div>
          <div class="card-value">
            <span class="big-num" :style="{ color: alertCount > 0 ? '#f56c6c' : '#67c23a' }">{{ alertCount }}</span>
            <span class="sub-num"> {{ alertCount > 0 ? '处异常' : '安全' }}</span>
          </div>

        </div>

        <!-- 月度支出 -->
        <div class="summary-card card-budget" @click="router.push('/supplier-purchase')">
          <div class="card-header">
            <el-tag size="small" type="warning" effect="dark" round>财资快递</el-tag>
            <el-icon :size="20" color="#e6a23c"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 10h20"/></svg></el-icon>
          </div>
          <div class="card-label">本月采购支出</div>
          <div class="card-value">
            <span class="big-num">{{ monthlySpending }}</span>
          </div>

        </div>
      </div>

      <!-- Row 2: 作物进度 + 预警信息 -->
      <div class="middle-row">
        <!-- 左: 作物养成进度图 -->
        <div class="panel crop-panel">
          <div class="panel-header">
            <div>
              <div class="panel-title">作物养成进度图</div>
              <div class="panel-subtitle">GROWTH & HARVEST QUESTS</div>
            </div>
            <el-button type="success" round size="small" @click="goToBatchManage">管理批次</el-button>
          </div>
          <div class="crop-list" v-if="cropList.length">
            <div v-for="crop in cropList" :key="crop.id" class="crop-item">
              <div class="crop-info">
                <div class="crop-batch">
                  <span class="crop-dot" :style="{ background: cropProgressColor(crop.progressPercent) }"></span>
                  {{ crop.batchNo }} {{ crop.cropVariety }}
                </div>
                <div class="crop-meta">
                  {{ crop.farmlandName || '' }} · 预计收获 {{ crop.estimatedHarvestDate || '未定' }}
                </div>
              </div>
              <div class="crop-progress-row">
                <el-progress
                  :percentage="crop.progressPercent ?? 0"
                  :stroke-width="10"
                  :show-text="false"
                  :color="cropProgressColor(crop.progressPercent)"
                  style="flex: 1"
                />
                <span class="crop-pct">{{ crop.progressPercent ?? 0 }}%</span>
                <el-tag v-if="cropProgressLabel(crop)" size="small" :type="crop.progressPercent! >= 100 ? 'success' : 'warning'" effect="plain" round>
                  {{ cropProgressLabel(crop) }}
                </el-tag>
              </div>
            </div>
          </div>
          <el-empty v-else description="暂无活跃批次" :image-size="80" />
        </div>

        <!-- 右: 预警信息 -->
        <div class="panel alert-panel">
          <div class="panel-header">
            <div class="panel-title">预警信息</div>
            <el-tag size="small" type="danger" effect="dark" round v-if="alerts.length">LIVE</el-tag>
          </div>
          <div class="alert-feed" v-if="alerts.length">
            <div v-for="(alert, idx) in alerts" :key="idx" class="alert-feed-item">
              <div class="alert-feed-left">
                <el-tag :type="alertLevelTag(alert.level)" size="small" effect="plain">{{ alert.level }}</el-tag>
                <span class="alert-feed-desc">{{ alert.title }}</span>
              </div>
              <span class="alert-feed-time">{{ alert.time }}</span>
            </div>
          </div>
          <div v-else class="alert-stable">
            <div class="stable-text">SYSTEM STABLE — NO MORE ALERTS</div>
          </div>
        </div>
      </div>

      <!-- Row 3: 库存物资补给站 -->
      <div class="panel stock-panel">
        <div class="panel-header">
          <div class="panel-title">库存物资补给站</div>
          <div class="stock-actions">
            <el-button round size="small" @click="goToMaterial">筛选物资</el-button>
            <el-button type="primary" round size="small" @click="goToPurchase">一键采购</el-button>
          </div>
        </div>
        <el-table :data="lowStockList" style="width: 100%" v-if="lowStockList.length" :header-cell-style="{ background: '#fafafa', color: '#606266' }">
          <el-table-column prop="name" label="物资种类" min-width="180" />
          <el-table-column label="当前存量" min-width="120">
            <template #default="{ row }">
              <span style="font-weight: 600">{{ row.currentStock }} {{ row.unit }}</span>
            </template>
          </el-table-column>
          <el-table-column label="安全红线" min-width="120">
            <template #default="{ row }">
              {{ row.safeThreshold }} {{ row.unit }}
            </template>
          </el-table-column>
          <el-table-column label="健康度" min-width="160">
            <template #default="{ row }">
              <el-progress
                :percentage="row.healthPercent ?? 0"
                :stroke-width="8"
                :show-text="false"
                :color="healthColor(row.healthPercent)"
              />
            </template>
          </el-table-column>
          <el-table-column label="状态" min-width="120" align="center">
            <template #default="{ row }">
              <el-tag :type="stockStatusType(row.status)" size="small" effect="plain" round>
                {{ stockStatusLabel(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
        <el-empty v-else-if="lowStockLoadError" :description="lowStockLoadError" :image-size="60" />
        <el-empty v-else description="所有物资库存充足" :image-size="60" />
      </div>
    </template>
  </div>
</template>

<style scoped>
.dashboard-v2 {
  padding: 16px;
  max-width: 1400px;
  margin: 0 auto;
}

.loading-mask,
.error-box {
  padding: 60px 0;
}

/* Row 1: Summary Cards */
.summary-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}

.summary-card {
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  transition: box-shadow 0.2s;
  cursor: pointer;
}

.summary-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.card-label {
  font-size: 13px;
  color: #909399;
  margin-bottom: 4px;
}

.card-value {
  margin-bottom: 10px;
}

.big-num {
  font-size: 32px;
  font-weight: 700;
  color: #303133;
  line-height: 1.2;
}

.sub-num {
  font-size: 14px;
  color: #909399;
  margin-left: 2px;
}

.card-hint {
  margin-top: 8px;
  font-size: 12px;
  color: #a8abb2;
}

/* Row 2: Middle panels */
.middle-row {
  display: grid;
  grid-template-columns: 3fr 2fr;
  gap: 16px;
  margin-bottom: 16px;
}

.panel {
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.panel-title {
  font-size: 18px;
  font-weight: 700;
  color: #303133;
}

.panel-subtitle {
  font-size: 11px;
  color: #c0c4cc;
  letter-spacing: 1px;
  margin-top: 2px;
}

/* Crop progress */
.crop-list {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.crop-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.crop-info {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.crop-batch {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 6px;
}

.crop-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.crop-meta {
  font-size: 12px;
  color: #a8abb2;
}

.crop-progress-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.crop-pct {
  font-size: 13px;
  font-weight: 600;
  color: #606266;
  min-width: 48px;
  text-align: right;
}

/* Alert feed */
.alert-feed {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.alert-feed-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 12px;
  border-bottom: 1px solid #f2f3f5;
}

.alert-feed-item:last-child {
  border-bottom: none;
}

.alert-feed-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.alert-feed-desc {
  font-size: 13px;
  color: #606266;
}

.alert-feed-time {
  font-size: 13px;
  color: #c0c4cc;
  font-weight: 500;
}

.alert-stable {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
}

.stable-text {
  color: #c0c4cc;
  font-size: 13px;
  letter-spacing: 1px;
}

/* Stock panel */
.stock-panel {
  margin-bottom: 16px;
}

.stock-actions {
  display: flex;
  gap: 8px;
}

/* Responsive */
@media (max-width: 1024px) {
  .summary-row {
    grid-template-columns: repeat(2, 1fr);
  }
  .middle-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .summary-row {
    grid-template-columns: 1fr;
  }
}
</style>
