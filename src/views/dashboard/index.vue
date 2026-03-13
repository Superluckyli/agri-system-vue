<script setup lang="ts">
defineOptions({ name: 'DashboardIndex' })

import { computed, markRaw, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Bell, DataAnalysis, Document, TrendCharts, Warning } from '@element-plus/icons-vue'
import type { EChartsOption } from 'echarts'

import BaseChart from '@/components/BaseChart.vue'
import { listIotData, listIotRule } from '@/api/modules/iot'
import { listMaterialInfo } from '@/api/modules/material'
import { getReportDashboard } from '@/api/modules/report'
import { listTask } from '@/api/modules/task'
import type { AgriTask, AgriTaskRule, DashboardData, IotSensorData, MaterialInfo } from '@/types/entity'
import { TASK_STATUS_V2, TASK_STATUS_MAP } from '@/constants/task'

interface AlertItem {
  id: string
  title: string
  desc: string
  level: 'danger' | 'warning' | 'info'
  time: string
  targetPath: string
}

const router = useRouter()

const loading = ref(true)
const loadError = ref('')
const dataTruncated = ref(false)

const dashboardData = ref<DashboardData>({})
const pendingTasks = ref<AgriTask[]>([])
const latestAlerts = ref<AlertItem[]>([])

const stats = ref([
  { label: '待分配任务', value: 0, icon: markRaw(Document), color: '#409eff' },
  { label: '待接单任务', value: 0, icon: markRaw(Warning), color: '#e6a23c' },
  { label: '执行中任务', value: 0, icon: markRaw(DataAnalysis), color: '#67c23a' },
  { label: '今日新增任务', value: 0, icon: markRaw(TrendCharts), color: '#909399' },
])

function parseNumber(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function parseTime(value?: string): number {
  if (!value) return 0
  const t = new Date(value).getTime()
  return Number.isFinite(t) ? t : 0
}

const CATEGORY_THRESHOLD_MAP: Record<string, number> = {
  Fertilizer: 100,
  Pesticide: 30,
  Seed: 80,
  Tool: 10,
}

function isLowStock(item: MaterialInfo): boolean {
  const threshold = CATEGORY_THRESHOLD_MAP[item.category || ''] ?? 50
  return parseNumber(item.currentStock) <= threshold
}

function buildAlerts(
  iotRules: AgriTaskRule[],
  iotData: IotSensorData[],
  materials: MaterialInfo[],
): AlertItem[] {
  const ruleAlerts: AlertItem[] = []
  const enabledRules = iotRules.filter((rule) => rule.isEnable === 1)
  const sortedData = [...iotData].sort((a, b) => parseTime(b.createTime) - parseTime(a.createTime))

  for (const data of sortedData.slice(0, 120)) {
    const sensorType = data.sensorType || ''
    const value = parseNumber(data.value)
    const matchedRule = enabledRules.find((rule) => {
      if (rule.sensorType !== sensorType) return false
      const minVal = parseNumber(rule.minVal)
      const maxVal = parseNumber(rule.maxVal)
      return value < minVal || value > maxVal
    })

    if (!matchedRule) continue

    const level = matchedRule.priority === 1 ? 'danger' : matchedRule.priority === 2 ? 'warning' : 'info'
    ruleAlerts.push({
      id: `rule-${matchedRule.ruleId}-${data.dataId}`,
      title: `${matchedRule.ruleName || '规则预警'} (${sensorType})`,
      desc: `监测值 ${value} 超出阈值 [${matchedRule.minVal ?? '-'}, ${matchedRule.maxVal ?? '-'}]`,
      level,
      time: data.createTime || '-',
      targetPath: '/iot/rule',
    })
  }

  const inventoryAlerts: AlertItem[] = materials
    .filter((item) => isLowStock(item))
    .map((item) => ({
      id: `material-${item.materialId}`,
      title: `库存预警：${item.name || item.materialId}`,
      desc: `当前库存 ${item.currentStock ?? '-'} ${item.unit || ''}`,
      level: 'warning' as const,
      time: item.updatedAt || '-',
      targetPath: '/material/inventory?lowStock=1',
    }))

  return [...ruleAlerts, ...inventoryAlerts]
    .sort((a, b) => parseTime(b.time) - parseTime(a.time))
    .slice(0, 8)
}

async function fetchData(): Promise<void> {
  loading.value = true
  loadError.value = ''
  dataTruncated.value = false

  try {
    const [dashboardRes, pendingAssign, pendingAccept, inProgress, latestTaskRes, iotDataRes, iotRuleRes, materialRes] =
      await Promise.all([
        getReportDashboard().catch(() => null),
        listTask({ pageNum: 1, pageSize: 1, statusV2: TASK_STATUS_V2.PENDING_REVIEW }).catch(() => null),
        listTask({ pageNum: 1, pageSize: 1, statusV2: TASK_STATUS_V2.PENDING_ACCEPT }).catch(() => null),
        listTask({ pageNum: 1, pageSize: 1, statusV2: TASK_STATUS_V2.IN_PROGRESS }).catch(() => null),
        listTask({ pageNum: 1, pageSize: 20 }).catch(() => null),
        listIotData({ pageNum: 1, pageSize: 300 }).catch(() => null),
        listIotRule({ pageNum: 1, pageSize: 200 }).catch(() => null),
        listMaterialInfo({ pageNum: 1, pageSize: 300 }).catch(() => null),
      ])

    dashboardData.value = dashboardRes || {}

    stats.value[0]!.value = parseNumber(pendingAssign?.total)
    stats.value[1]!.value = parseNumber(pendingAccept?.total)
    stats.value[2]!.value = parseNumber(inProgress?.total)

    const today = new Date().toISOString().slice(0, 10)
    const latestTasks = latestTaskRes?.records || []
    stats.value[3]!.value = latestTasks.filter((item) => (item.createTime || '').includes(today)).length

    pendingTasks.value = latestTasks
      .filter((item) => item.statusV2 === TASK_STATUS_V2.PENDING_REVIEW || item.statusV2 === TASK_STATUS_V2.PENDING_ACCEPT)
      .slice(0, 8)

    const rules = iotRuleRes?.records || []
    const data = iotDataRes?.records || []
    const materials = materialRes?.records || []
    latestAlerts.value = buildAlerts(rules, data, materials)

    dataTruncated.value =
      parseNumber(iotDataRes?.total) > data.length ||
      parseNumber(iotRuleRes?.total) > rules.length ||
      parseNumber(materialRes?.total) > materials.length ||
      parseNumber(latestTaskRes?.total) > latestTasks.length
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '加载工作台数据失败'
  } finally {
    loading.value = false
  }
}

const cropPieOption = computed<EChartsOption>(() => {
  const cropData = (dashboardData.value.cropDistribution || []).map((item) => ({
    name: item.name || '未命名',
    value: parseNumber(item.value),
  }))
  return {
    title: { text: '作物种植分布', left: 'center' },
    tooltip: { trigger: 'item' },
    legend: { orient: 'vertical', left: 'left' },
    series: [
      {
        name: '分布',
        type: 'pie' as const,
        radius: '55%',
        data: cropData,
      },
    ],
  }
})

const taskTrendOption = computed<EChartsOption>(() => {
  const xAxis = dashboardData.value.taskTrend?.xAxis || []
  const series = dashboardData.value.taskTrend?.series || []

  return {
    title: { text: dashboardData.value.taskTrend?.title || '任务趋势' },
    tooltip: { trigger: 'axis' },
    legend: { top: 4 },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: xAxis,
    },
    yAxis: { type: 'value' },
    series: Array.isArray(series)
      ? series.map((item, index) => ({
          name: item.name || `序列${index + 1}`,
          type: 'line',
          smooth: true,
          data: Array.isArray(item.data) ? item.data : [],
        }))
      : [],
  }
})

function handleTaskNavigate(task?: AgriTask): void {
  if (task?.statusV2 !== undefined) {
    void router.push({ path: '/task/list', query: { statusV2: task.statusV2 } })
    return
  }
  void router.push('/task/list')
}

function handleAlertNavigate(alert: AlertItem): void {
  void router.push(alert.targetPath)
}

function goCreateTask(): void {
  void router.push('/task/list')
}

function goInventoryAlerts(): void {
  void router.push('/material/inventory?lowStock=1')
}

function goReport(): void {
  void router.push('/report/analytics')
}

onMounted(() => {
  void fetchData()
})
</script>

<template>
  <div class="dashboard-container">
    <el-skeleton :loading="loading" animated :rows="10">
      <template #default>
        <el-alert v-if="loadError" type="error" :closable="false" style="margin-bottom: 12px">
          <template #title>加载失败：{{ loadError }}</template>
          <el-button text type="primary" @click="fetchData">点击重试</el-button>
        </el-alert>

        <el-alert v-if="dataTruncated" type="info" :closable="false" style="margin-bottom: 12px">
          <template #title>部分业务数据超过本页拉取上限，当前仅展示近期数据。</template>
        </el-alert>

        <el-row :gutter="20" class="panel-group">
          <el-col v-for="(item, index) in stats" :key="index" :xs="12" :sm="12" :lg="6">
            <el-card class="box-card" shadow="hover">
              <div class="card-content">
                <el-icon class="card-icon" :color="item.color" :size="48">
                  <component :is="item.icon" />
                </el-icon>
                <div class="card-info">
                  <div class="card-title">{{ item.label }}</div>
                  <div class="card-value">{{ item.value }}</div>
                </div>
              </div>
            </el-card>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :xs="24" :lg="10">
            <el-card shadow="hover">
              <div class="chart-wrapper">
                <BaseChart :options="cropPieOption" height="350px" />
              </div>
            </el-card>
          </el-col>
          <el-col :xs="24" :lg="14">
            <el-card shadow="hover">
              <div class="chart-wrapper">
                <BaseChart :options="taskTrendOption" height="350px" />
              </div>
            </el-card>
          </el-col>
        </el-row>

        <el-row :gutter="20" style="margin-top: 16px">
          <el-col :xs="24" :lg="10">
            <el-card shadow="hover">
              <template #header>待处理任务</template>
              <el-table :data="pendingTasks" size="small" style="width: 100%">
                <el-table-column prop="taskName" label="任务" min-width="140" show-overflow-tooltip />
                <el-table-column label="状态" width="110" align="center">
                  <template #default="scope">
                    <el-tag v-if="scope.row.statusV2 !== undefined" :type="TASK_STATUS_MAP[scope.row.statusV2]?.type">
                      {{ TASK_STATUS_MAP[scope.row.statusV2]?.text }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="90" align="center">
                  <template #default="scope">
                    <el-button link type="primary" @click="handleTaskNavigate(scope.row)">去处理</el-button>
                  </template>
                </el-table-column>
                <template #empty>
                  <el-empty description="暂无待处理任务" :image-size="80" />
                </template>
              </el-table>
            </el-card>
          </el-col>

          <el-col :xs="24" :lg="8">
            <el-card shadow="hover">
              <template #header>最新预警</template>
              <div v-if="latestAlerts.length > 0" class="alert-list">
                <div
                  v-for="item in latestAlerts"
                  :key="item.id"
                  class="alert-item"
                  role="button"
                  tabindex="0"
                  @click="handleAlertNavigate(item)"
                >
                  <div class="alert-main">
                    <el-icon class="alert-icon"><Bell /></el-icon>
                    <div>
                      <div class="alert-title">
                        <el-tag :type="item.level" size="small">{{ item.level }}</el-tag>
                        <span style="margin-left: 8px">{{ item.title }}</span>
                      </div>
                      <div class="alert-desc">{{ item.desc }}</div>
                    </div>
                  </div>
                  <div class="alert-time">{{ item.time }}</div>
                </div>
              </div>
              <el-empty v-else description="暂无预警" :image-size="80" />
            </el-card>
          </el-col>

          <el-col :xs="24" :lg="6">
            <el-card shadow="hover">
              <template #header>快捷入口</template>
              <div class="quick-actions">
                <el-button type="primary" @click="goCreateTask">创建任务</el-button>
                <el-button type="warning" @click="goInventoryAlerts">查看库存预警</el-button>
                <el-button type="success" @click="goReport">查看报表</el-button>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </template>
    </el-skeleton>
  </div>
</template>

<style scoped>
.dashboard-container {
  position: relative;
  width: 100%;
  max-width: 100%;
  overflow-x: hidden;
  padding: 24px;
}

.panel-group {
  margin-bottom: 18px;
}

.box-card {
  height: 108px;
}

.card-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-icon {
  padding: 14px;
  border-radius: 6px;
  background-color: #f4f4f5;
}

.card-info {
  text-align: right;
}

.card-title {
  color: #8c8c8c;
  font-size: 14px;
  margin-bottom: 6px;
}

.card-value {
  color: #666;
  font-size: 24px;
  font-weight: bold;
}

.chart-wrapper {
  overflow: hidden;
  background: #fff;
}

.quick-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.alert-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.alert-item {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 8px 10px;
  cursor: pointer;
}

.alert-item:hover {
  background: #f7f9fb;
}

.alert-main {
  display: flex;
  gap: 8px;
}

.alert-icon {
  margin-top: 2px;
  color: #909399;
}

.alert-title {
  font-size: 13px;
  color: #303133;
}

.alert-desc {
  margin-top: 4px;
  color: #606266;
  font-size: 12px;
}

.alert-time {
  margin-top: 6px;
  color: #909399;
  font-size: 11px;
}
</style>
