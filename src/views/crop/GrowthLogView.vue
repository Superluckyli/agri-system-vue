<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { Plus, Refresh } from '@element-plus/icons-vue'

import { createCropGrowthLog, listCropGrowthLog } from '@/api/modules/crop'
import type { GrowthStageLog } from '@/api/types/models'

interface GrowthLogFormModel {
  stageName: string
  logDate: string
  imageUrl: string
  description: string
}

const route = useRoute()
const router = useRouter()

const batchId = computed(() => Number(route.params.batchId))
const validBatchId = computed(() => Number.isFinite(batchId.value) && batchId.value > 0)

const loading = ref(false)
const submitLoading = ref(false)
const loadError = ref('')
const logs = ref<GrowthStageLog[]>([])

const dialogVisible = ref(false)
const formRef = ref<FormInstance>()

const form = reactive<GrowthLogFormModel>({
  stageName: '',
  logDate: '',
  imageUrl: '',
  description: '',
})

const rules: FormRules<GrowthLogFormModel> = {
  stageName: [{ required: true, message: '请输入生长阶段', trigger: 'blur' }],
  logDate: [{ required: true, message: '请选择记录时间', trigger: 'change' }],
  description: [{ required: true, message: '请输入日志描述', trigger: 'blur' }],
}

const sortedLogs = computed(() => {
  return [...logs.value].sort((a, b) => {
    const aTime = a.logDate ? new Date(a.logDate).getTime() : 0
    const bTime = b.logDate ? new Date(b.logDate).getTime() : 0
    return bTime - aTime
  })
})

const resetForm = () => {
  form.stageName = ''
  form.logDate = ''
  form.imageUrl = ''
  form.description = ''
}

const fetchLogs = async () => {
  if (!validBatchId.value) {
    loadError.value = '无效的批次ID，请从种植批次页面进入'
    logs.value = []
    return
  }

  loading.value = true
  loadError.value = ''
  try {
    logs.value = await listCropGrowthLog({ batchId: batchId.value })
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '加载生长日志失败'
    logs.value = []
  } finally {
    loading.value = false
  }
}

const handleAdd = () => {
  if (!validBatchId.value) return
  resetForm()
  dialogVisible.value = true
}

const submitForm = async () => {
  if (!formRef.value || !validBatchId.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  const payload: GrowthStageLog = {
    batchId: batchId.value,
    stageName: form.stageName.trim(),
    logDate: form.logDate,
    imageUrl: form.imageUrl.trim() || undefined,
    description: form.description.trim(),
  }

  submitLoading.value = true
  try {
    await createCropGrowthLog(payload)
    ElMessage.success('新增生长日志成功')
    dialogVisible.value = false
    await fetchLogs()
  } catch (error) {
    const message = error instanceof Error && error.message ? error.message : '新增日志失败'
    ElMessage.error(message)
  } finally {
    submitLoading.value = false
  }
}

const goBackBatch = () => {
  void router.push('/crop/batch')
}

watch(
  () => route.params.batchId,
  () => {
    void fetchLogs()
  },
)

onMounted(() => {
  void fetchLogs()
})
</script>

<template>
  <div class="app-container">
    <el-card shadow="never">
      <template #header>
        <div class="header-row">
          <div>
            <div class="title">生长日志</div>
            <div class="subtitle">批次 ID：{{ validBatchId ? batchId : '无效' }}</div>
          </div>
          <div class="actions">
            <el-button @click="goBackBatch">返回批次管理</el-button>
            <el-button :icon="Refresh" @click="fetchLogs">刷新</el-button>
            <el-button type="primary" :icon="Plus" :disabled="!validBatchId" @click="handleAdd">新增日志</el-button>
          </div>
        </div>
      </template>

      <el-alert
        v-if="!validBatchId || loadError"
        :type="validBatchId ? 'error' : 'warning'"
        :closable="false"
        style="margin-bottom: 14px"
      >
        <template #title>{{ loadError || '无效的批次ID，请从“种植批次管理”页点击进入。' }}</template>
      </el-alert>

      <el-skeleton :loading="loading" animated :rows="6">
        <template #default>
          <el-empty v-if="sortedLogs.length === 0" description="暂无生长日志" />
          <el-timeline v-else>
            <el-timeline-item
              v-for="item in sortedLogs"
              :key="item.logId || `${item.logDate}-${item.stageName}`"
              :timestamp="item.logDate || '-'"
              placement="top"
            >
              <el-card shadow="hover">
                <div class="timeline-title">{{ item.stageName || '未命名阶段' }}</div>
                <div class="timeline-text">{{ item.description || '暂无描述' }}</div>
                <div v-if="item.imageUrl" class="timeline-link">
                  图片链接：
                  <el-link :href="item.imageUrl" target="_blank" type="primary">{{ item.imageUrl }}</el-link>
                </div>
              </el-card>
            </el-timeline-item>
          </el-timeline>
        </template>
      </el-skeleton>
    </el-card>

    <el-dialog v-model="dialogVisible" title="新增生长日志" width="560px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="生长阶段" prop="stageName">
          <el-input v-model="form.stageName" placeholder="例如：Seedling / Tillering / Maturity" />
        </el-form-item>
        <el-form-item label="记录时间" prop="logDate">
          <el-date-picker
            v-model="form.logDate"
            type="datetime"
            value-format="YYYY-MM-DDTHH:mm:ss"
            placeholder="请选择记录时间"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="图片链接">
          <el-input v-model="form.imageUrl" placeholder="可选：输入图片 URL" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="form.description" type="textarea" :rows="4" placeholder="请输入阶段描述" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="submitForm">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.app-container {
  padding: 24px;
}

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.subtitle {
  margin-top: 4px;
  font-size: 13px;
  color: #909399;
}

.actions {
  display: flex;
  gap: 8px;
}

.timeline-title {
  font-weight: 600;
  color: #303133;
}

.timeline-text {
  margin-top: 8px;
  color: #606266;
  line-height: 1.6;
}

.timeline-link {
  margin-top: 8px;
}
</style>
