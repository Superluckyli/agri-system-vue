<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'

import {
  createSupplier,
  getSupplierAll,
  removeSupplierByIds,
  updateSupplier,
} from '@/api/modules/supplier'
import { getMaterialInfoAll } from '@/api/modules/material'
import type { MaterialInfo, SupplierInfo } from '@/types/entity'

import SupplierCardList from './components/SupplierCardList.vue'
import PurchasePanel from './components/PurchasePanel.vue'

interface SupplierFormModel {
  id?: number
  name: string
  contactName: string
  phone: string
  address: string
  status: number
  remark: string
}

const route = useRoute()

const suppliers = ref<SupplierInfo[]>([])
const supplierLoading = ref(false)
const selectedId = ref<number | null>(null)
const materialOptions = ref<MaterialInfo[]>([])

const selectedSupplier = computed(() =>
  suppliers.value.find((s) => s.id === selectedId.value) ?? null,
)

const prefill = computed(() => (route.query.prefill as string) || undefined)

// --- 供应商 CRUD Dialog ---

const dialogVisible = ref(false)
const dialogTitle = ref('')
const formRef = ref<FormInstance>()

const form = reactive<SupplierFormModel>({
  id: undefined,
  name: '',
  contactName: '',
  phone: '',
  address: '',
  status: 1,
  remark: '',
})

const phoneValidator = (_rule: unknown, value: string, callback: (err?: Error) => void) => {
  if (value && !/^1\d{10}$/.test(value)) {
    callback(new Error('请输入正确的11位手机号'))
  } else {
    callback()
  }
}

const rules: FormRules<SupplierFormModel> = {
  name: [{ required: true, message: '请输入供应商名称', trigger: 'blur' }],
  phone: [{ validator: phoneValidator, trigger: 'blur' }],
}

const resetForm = () => {
  form.id = undefined
  form.name = ''
  form.contactName = ''
  form.phone = ''
  form.address = ''
  form.status = 1
  form.remark = ''
}

const fetchSuppliers = async () => {
  supplierLoading.value = true
  try {
    suppliers.value = await getSupplierAll()
    if (suppliers.value.length > 0 && selectedId.value == null) {
      selectedId.value = suppliers.value[0].id ?? null
    }
  } catch {
    suppliers.value = []
    ElMessage.error('加载供应商列表失败')
  } finally {
    supplierLoading.value = false
  }
}

const fetchMaterials = async () => {
  try {
    materialOptions.value = await getMaterialInfoAll()
  } catch {
    materialOptions.value = []
  }
}

const handleAddSupplier = () => {
  resetForm()
  dialogTitle.value = '新增供应商'
  dialogVisible.value = true
}

const handleEditSupplier = (supplier: SupplierInfo) => {
  resetForm()
  dialogTitle.value = '编辑供应商'
  form.id = supplier.id
  form.name = supplier.name || ''
  form.contactName = supplier.contactName || ''
  form.phone = supplier.phone || ''
  form.address = supplier.address || ''
  form.status = supplier.status ?? 1
  form.remark = supplier.remark || ''
  dialogVisible.value = true
}

const handleDeleteSupplier = (supplier: SupplierInfo) => {
  if (!supplier.id) return
  ElMessageBox.confirm(`确认删除供应商「${supplier.name || supplier.id}」吗？`, '提示', {
    type: 'warning',
    confirmButtonText: '删除',
    cancelButtonText: '取消',
  })
    .then(async () => {
      await removeSupplierByIds({ ids: supplier.id as number })
      ElMessage.success('删除成功')
      if (selectedId.value === supplier.id) {
        selectedId.value = null
      }
      await fetchSuppliers()
    })
    .catch(() => {})
}

const submitForm = async () => {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  const payload: SupplierInfo = {
    id: form.id,
    name: form.name.trim(),
    contactName: form.contactName.trim() || undefined,
    phone: form.phone.trim() || undefined,
    address: form.address.trim() || undefined,
    status: form.status,
    remark: form.remark.trim() || undefined,
  }

  try {
    if (payload.id) {
      await updateSupplier(payload)
      ElMessage.success('更新供应商成功')
    } else {
      delete payload.id
      await createSupplier(payload)
      ElMessage.success('新增供应商成功')
    }
    dialogVisible.value = false
    await fetchSuppliers()
  } catch (error) {
    const message = error instanceof Error && error.message ? error.message : '提交失败'
    ElMessage.error(message)
  }
}

onMounted(async () => {
  await Promise.all([fetchSuppliers(), fetchMaterials()])
})
</script>

<template>
  <div class="supplier-purchase-page">
    <div class="page-header">
      <span class="page-title">供应商与采购管理</span>
      <span class="page-subtitle">左侧选择供应商，右侧管理对应采购订单</span>
    </div>

    <div class="page-body">
      <div class="left-panel">
        <SupplierCardList
          :suppliers="suppliers"
          :selected-id="selectedId"
          :loading="supplierLoading"
          @select="(id) => (selectedId = id)"
          @add="handleAddSupplier"
          @edit="handleEditSupplier"
          @delete="handleDeleteSupplier"
        />
      </div>

      <div class="right-panel">
        <PurchasePanel
          :supplier="selectedSupplier"
          :supplier-options="suppliers"
          :material-options="materialOptions"
          :prefill="prefill"
        />
      </div>
    </div>

    <!-- 供应商 CRUD Dialog -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="560px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入供应商名称" />
        </el-form-item>
        <el-form-item label="联系人" prop="contactName">
          <el-input v-model="form.contactName" placeholder="联系人姓名" />
        </el-form-item>
        <el-form-item label="电话" prop="phone">
          <el-input v-model="form.phone" placeholder="联系电话" />
        </el-form-item>
        <el-form-item label="地址" prop="address">
          <el-input v-model="form.address" placeholder="供应商地址" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio :value="1">正常</el-radio>
            <el-radio :value="0">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="form.remark" type="textarea" :rows="3" placeholder="备注信息" />
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
.supplier-purchase-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 20px;
  background: #f5f7fa;
}

.page-header {
  margin-bottom: 16px;
  flex-shrink: 0;
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
