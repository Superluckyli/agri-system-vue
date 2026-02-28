<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Document, Warning, DataAnalysis, TrendCharts } from '@element-plus/icons-vue'
import { getReportDashboard } from '@/api/modules/report'
import type { DashboardData, NameValueItem } from '@/api/types/models'
import BaseChart from '@/components/BaseChart.vue'

const loading = ref(true)
const dashboardData = ref<DashboardData>({})

// 模拟卡片头部数据提取（原接口可能不在 dashboardData 第一层结构，默认使用 mock，如果有按接口适配）
const stats = ref([
  { label: '待处理任务数', value: 0, icon: Document, color: '#409EFF' },
  { label: '今日预警数', value: 0, icon: Warning, color: '#E6A23C' },
  { label: '本月入库物资', value: 0, icon: DataAnalysis, color: '#67C23A' },
  { label: '设备在线率', value: '100%', icon: TrendCharts, color: '#909399' }
])

// 初始化图表空选项，待 API 放回后渲染真实数据
const cropPieOption = ref<any>({})
const taskLineOption = ref<any>({})

const fetchData = async () => {
  try {
    loading.value = true
    const res = await getReportDashboard()
    // res 本身包含 { cropDistribution, taskTrend, envMonitor }
    dashboardData.value = res || {}

    // 假设 res 里带了卡片数据，可以这里赋值，没有时采用图表里提取出来的假数据展现
    if (res.envMonitor && res.envMonitor.length > 0) {
       stats.value[1].value = Number(res.envMonitor[0].value) || 0
    }

    renderCharts()
  } catch (error) {
    console.error('获取 Dashboard 失败', error)
  } finally {
    loading.value = false
  }
}

const renderCharts = () => {
  const data = dashboardData.value
  
  // 1. 作物分布 (饼图)
  const cropData: NameValueItem[] = data.cropDistribution || [
    { name: '冬小麦', value: 120 },
    { name: '玉米', value: 80 },
    { name: '大豆', value: 45 }
  ]
  cropPieOption.value = {
    title: { text: '农场作物种植分布', left: 'center' },
    tooltip: { trigger: 'item' },
    legend: { orient: 'vertical', left: 'left' },
    series: [
      {
        name: '种植面积(亩)',
        type: 'pie',
        radius: '50%',
        data: cropData,
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }
    ]
  }

  // 2. 任务状态趋势 (柱状图/折线图组合)
  const taskTrend = data.taskTrend || {
     xAxis: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
     series: [
       { name: '完成任务', type: 'line', data: [120, 132, 101, 134, 90, 230, 210] }
     ]
  }
  taskLineOption.value = {
    title: { text: taskTrend.title || '近七日各项农业任务趋势' },
    tooltip: { trigger: 'axis' },
    legend: { data: taskTrend.series?.map(s => s.name) },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: taskTrend.xAxis
    },
    yAxis: { type: 'value' },
    series: taskTrend.series?.map(s => ({
       ...s,
       smooth: true
    })) || []
  }
}

onMounted(() => {
  fetchData()
})
</script>

<template>
  <div class="dashboard-container" v-loading.fullscreen.lock="loading" element-loading-text="Dashboard 初始化中...">
    
    <!-- 数据概览卡片 -->
    <el-row :gutter="20" class="panel-group">
      <el-col :xs="12" :sm="12" :lg="6" v-for="(item, index) in stats" :key="index">
        <el-card class="box-card" shadow="hover">
          <div class="card-content">
            <el-icon :class="['card-icon']" :color="item.color" :size="48">
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

    <!-- 图表展示区 -->
    <el-row :gutter="20">
      <el-col :xs="24" :lg="10">
        <el-card shadow="hover">
          <div v-if="!loading && cropPieOption.series" class="chart-wrapper">
             <BaseChart :options="cropPieOption" height="350px" />
          </div>
          <el-empty v-else description="暂无图表数据" />
        </el-card>
      </el-col>
      <el-col :xs="24" :lg="14">
        <el-card shadow="hover">
          <div v-if="!loading && taskLineOption.series" class="chart-wrapper">
             <BaseChart :options="taskLineOption" height="350px" />
          </div>
           <el-empty v-else description="暂无趋势数据" />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.dashboard-container {
  padding: 24px;
}
.panel-group {
  margin-bottom: 24px;
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
  transition: all 0.3s ease-out;
}
.card-icon:hover {
  transform: scale(1.1);
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
  background: #fff;
}
</style>
