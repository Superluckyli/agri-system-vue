<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { Plus, Refresh } from '@element-plus/icons-vue'

import { createTaskLogAdd, listTaskLog } from '@/api/modules/task'
import type { AgriTaskLog } from '@/types/entity'

interface GrowthLogFormModel {
  growthNote: string
  abnormalNote: string
  imageUrls: string
}

const route = useRoute()
const router = useRouter()

const batchId = computed(() => Number(route.params.batchId))
const validBatchId = computed(() => Number.isFinite(batchId.value) && batchId.value > 0)

const loading = ref(false)
const submitLoading = ref(false)
const loadError = ref('')
const logs = ref<AgriTaskLog[]>([])
const total = ref(0)

const dialogVisible = ref(false)
const formRef = ref<FormInstance>()

const form = ref<GrowthLogFormModel>({
  growthNote: '',
  abnormalNote: '',
  imageUrls: '',
})

const rules: FormRules<GrowthLogFormModel> = {
  growthNote: [{ required: true, message: '请输入生长记录描述', trigger: 'blur' }],
}

const sortedLogs = computed(() => {
  return [...logs.value].sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0
    return bTime - aTime
  })
})

const resetForm = () => {
  form.value = { growthNote: '', abnormalNote: '', imageUrls: '' }
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
    const res = await listTaskLog({ batchId: batchId.value, pageNum: 1, pageSize: 500 })
    logs.value = res.records || []
    total.value = Number(res.total || 0)
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

  const payload: AgriTaskLog = {
    batchId: batchId.value,
    action: 'growth_record',
    growthNote: form.value.growthNote.trim(),
    abnormalNote: form.value.abnormalNote.trim() || undefined,
    imageUrls: form.value.imageUrls.trim() || undefined,
  }

  submitLoading.value = true
  try {
    await createTaskLogAdd(payload)
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
        <template #title>{{ loadError || '无效的批次ID，请从"种植批次管理"页点击进入。' }}</template>
      </el-alert>

      <el-skeleton :loading="loading" animated :rows="6">
        <template #default>
          <el-empty v-if="sortedLogs.length === 0" description="暂无生长日志" />
          <el-timeline v-else>
            <el-timeline-item
              v-for="item in sortedLogs"
              :key="item.id || item.createdAt"
              :timestamp="item.createdAt || '-'"
              placement="top"
            >
              <el-card shadow="hover">
                <div class="timeline-title">{{ item.action || '生长记录' }}</div>
                <div class="timeline-text">{{ item.growthNote || '暂无描述' }}</div>
                <div v-if="item.abnormalNote" class="timeline-text" style="color: #e6a23c">
                  异常说明：{{ item.abnormalNote }}
                </div>
                <div v-if="item.imageUrls" class="timeline-link">
                  <el-image
                    v-for="(url, idx) in item.imageUrls.split(',')"
                    :key="idx"
                    :src="url"
                    :preview-src-list="item.imageUrls.split(',')"
                    fit="cover"
                    style="width: 56px; height: 56px; border-radius: 4px; margin-right: 6px"
                  />
                </div>
                <div v-if="item.remark" class="timeline-text" style="font-size: 12px; color: #909399">
                  备注：{{ item.remark }}
                </div>
              </el-card>
            </el-timeline-item>
          </el-timeline>
        </template>
      </el-skeleton>
    </el-card>

    <el-dialog v-model="dialogVisible" title="新增生长日志" width="560px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="生长记录" prop="growthNote">
          <el-input v-model="form.growthNote" type="textarea" :rows="4" placeholder="请输入生长记录描述" />
        </el-form-item>
        <el-form-item label="异常说明">
          <el-input v-model="form.abnormalNote" type="textarea" :rows="2" placeholder="可选：填写异常情况" />
        </el-form-item>
        <el-form-item label="图片URL">
          <el-input v-model="form.imageUrls" placeholder="多张图片用逗号分隔" maxlength="500" show-word-limit />
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
