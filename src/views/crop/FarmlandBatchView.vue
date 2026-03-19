<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'

import {
  createCropFarmland,
  getCropFarmlandAll,
  getCropVarietyAll,
  removeCropFarmlandByIds,
  updateCropFarmland,
} from '@/api/modules/crop'
import { listSystemUser } from '@/api/modules/system'
import { FARMLAND_STATUS_MAP } from '@/constants/task'
import { ROLE_ALIAS_MAP } from '@/constants/permission'
import type { AgriFarmland, BaseCropVariety, SysUser } from '@/types/entity'

import FarmlandCardList from './components/FarmlandCardList.vue'
import BatchPanel from './components/BatchPanel.vue'

interface FarmlandFormModel {
  id?: number
  code: string
  name: string
  area: number | null
  location: string
  status: number
  managerUserId: number | null
  cropAdaptNote: string
}

const farmlands = ref<AgriFarmland[]>([])
const farmlandLoading = ref(false)
const selectedId = ref<number | null>(null)
const userMap = ref<Map<number, string>>(new Map())
const managerOptions = ref<SysUser[]>([])
const varieties = ref<BaseCropVariety[]>([])

const selectedFarmland = computed(() =>
  farmlands.value.find((f) => f.id === selectedId.value) ?? null,
)

const dialogVisible = ref(false)
const dialogTitle = ref('')
const formRef = ref<FormInstance>()

const form = reactive<FarmlandFormModel>({
  id: undefined,
  code: '',
  name: '',
  area: null,
  location: '',
  status: 1,
  managerUserId: null,
  cropAdaptNote: '',
})

const rules: FormRules<FarmlandFormModel> = {
  name: [{ required: true, message: '请输入农田名称', trigger: 'blur' }],
  area: [{ required: true, message: '请输入面积', trigger: 'change' }],
}

const fetchFarmlands = async () => {
  farmlandLoading.value = true
  try {
    farmlands.value = await getCropFarmlandAll()
    if (farmlands.value.length > 0 && selectedId.value == null) {
      selectedId.value = farmlands.value[0].id ?? null
    }
  } catch {
    farmlands.value = []
    ElMessage.error('加载农田列表失败')
  } finally {
    farmlandLoading.value = false
  }
}

const fetchUsers = async () => {
  try {
    const res = await listSystemUser({ pageSize: 200 })
    const map = new Map<number, string>()
    const managers: SysUser[] = []
    for (const u of res.items || []) {
      if (u.userId != null) {
        map.set(u.userId, u.realName || u.username || `用户${u.userId}`)
        const resolved = (u.roleNames || []).some((r) => ROLE_ALIAS_MAP[r] === 'FARM_OWNER' || ROLE_ALIAS_MAP[r] === 'ADMIN')
        if (resolved) managers.push(u)
      }
    }
    userMap.value = map
    managerOptions.value = managers
  } catch {
    userMap.value = new Map()
    managerOptions.value = []
  }
}

const fetchVarieties = async () => {
  try {
    varieties.value = await getCropVarietyAll()
  } catch {
    varieties.value = []
  }
}

const handleSelect = (id: number) => {
  selectedId.value = id
}

const resetForm = () => {
  form.id = undefined
  form.code = ''
  form.name = ''
  form.area = null
  form.location = ''
  form.status = 1
  form.managerUserId = null
  form.cropAdaptNote = ''
}

const handleAdd = () => {
  resetForm()
  dialogTitle.value = '新增农田'
  dialogVisible.value = true
}

const handleEdit = (farmland: AgriFarmland) => {
  resetForm()
  dialogTitle.value = '编辑农田'
  form.id = farmland.id
  form.code = farmland.code || ''
  form.name = farmland.name || ''
  form.area = farmland.area ?? null
  form.location = farmland.location || ''
  form.status = farmland.status ?? 1
  form.managerUserId = farmland.managerUserId ?? null
  form.cropAdaptNote = farmland.cropAdaptNote || ''
  dialogVisible.value = true
}

const submitForm = async () => {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  const payload: AgriFarmland = {
    id: form.id,
    code: form.code.trim() || undefined,
    name: form.name.trim(),
    area: Number(form.area),
    location: form.location.trim() || undefined,
    status: form.status,
    managerUserId: form.managerUserId ?? undefined,
    cropAdaptNote: form.cropAdaptNote.trim() || undefined,
  }

  try {
    if (payload.id) {
      await updateCropFarmland(payload)
      ElMessage.success('更新农田成功')
    } else {
      delete payload.id
      await createCropFarmland(payload)
      ElMessage.success('新增农田成功')
    }
    dialogVisible.value = false
    await fetchFarmlands()
  } catch (error) {
    const message = error instanceof Error && error.message ? error.message : '保存农田失败'
    ElMessage.error(message)
  }
}

const handleDelete = (farmland: AgriFarmland) => {
  if (!farmland.id) return
  ElMessageBox.confirm(`确认删除农田「${farmland.name || '#' + farmland.id}」吗？`, '提示', {
    type: 'warning',
    confirmButtonText: '删除',
    cancelButtonText: '取消',
  })
    .then(async () => {
      await removeCropFarmlandByIds({ ids: farmland.id as number })
      ElMessage.success('删除成功')
      if (selectedId.value === farmland.id) {
        selectedId.value = null
      }
      await fetchFarmlands()
    })
    .catch(() => {})
}

onMounted(() => {
  void Promise.all([fetchFarmlands(), fetchUsers(), fetchVarieties()])
})
</script>

<template>
  <div class="farmland-batch-page">
    <div class="page-header">
      <span class="page-title">农田与种植批次管理</span>
      <span class="page-subtitle">左侧选择农田，右侧查看对应批次履历</span>
    </div>

    <div class="page-body">
      <div class="left-panel">
        <FarmlandCardList
          :farmlands="farmlands"
          :selected-id="selectedId"
          :loading="farmlandLoading"
          :user-map="userMap"
          @select="handleSelect"
          @add="handleAdd"
          @edit="handleEdit"
          @delete="handleDelete"
        />
      </div>
      <div class="right-panel">
        <BatchPanel
          :farmland="selectedFarmland"
          :varieties="varieties"
          :farmland-options="farmlands"
        />
      </div>
    </div>

    <!-- Farmland CRUD dialog -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="560px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="编号" prop="code">
          <el-input v-model="form.code" placeholder="可选，如 F-001" />
        </el-form-item>
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" placeholder="例如：东区1号田" />
        </el-form-item>
        <el-form-item label="面积(亩)" prop="area">
          <el-input-number v-model="form.area" :min="0.01" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="位置" prop="location">
          <el-input v-model="form.location" placeholder="例如：农场东侧" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="form.status" style="width: 100%">
            <el-option
              v-for="(val, key) in FARMLAND_STATUS_MAP"
              :key="key"
              :label="val.text"
              :value="Number(key)"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="负责人" prop="managerUserId">
          <el-select v-model="form.managerUserId" placeholder="请选择负责人" clearable style="width: 100%">
            <el-option
              v-for="u in managerOptions"
              :key="u.userId"
              :label="u.realName || u.username || `用户${u.userId}`"
              :value="u.userId"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="作物适配" prop="cropAdaptNote">
          <el-input v-model="form.cropAdaptNote" type="textarea" :rows="3" placeholder="适合种植的作物及注意事项" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.farmland-batch-page {
  padding: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.page-header {
  margin-bottom: 16px;
}

.page-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.page-subtitle {
  margin-left: 12px;
  font-size: 13px;
  color: #909399;
}

.page-body {
  flex: 1;
  display: flex;
  gap: 16px;
  min-height: 0;
}

.left-panel {
  width: 380px;
  flex-shrink: 0;
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.right-panel {
  flex: 1;
  min-width: 0;
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
</style>
