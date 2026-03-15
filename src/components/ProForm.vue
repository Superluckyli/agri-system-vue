<script setup lang="ts">
/**
 * ProForm — 通用表单组件
 *
 * Schema 驱动渲染表单字段，支持 el-dialog / el-drawer 两种包装模式。
 * 内置校验、提交、重置逻辑。
 */
import { ref, computed, watch } from 'vue'
import type { FormRules, FormInstance } from 'element-plus'

// ======================== 类型定义 ========================

export interface FormField {
  /** 字段 key */
  prop: string
  /** 标签 */
  label: string
  /** 控件类型 */
  type?: 'input' | 'textarea' | 'number' | 'select' | 'date' | 'switch'
  /** select 选项 */
  options?: Array<{ label: string; value: string | number }>
  /** 占位文本 */
  placeholder?: string
  /** 是否必填 (自动生成 required 规则) */
  required?: boolean
  /** 默认值 */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  defaultValue?: any
  /** 禁用 */
  disabled?: boolean
  /** 跨列数 (1-24) */
  span?: number
}

// ======================== Props ========================

const props = withDefaults(
  defineProps<{
    /** 表单字段 schema */
    schema: FormField[]
    /** 弹窗标题 */
    title?: string
    /** 包装模式 */
    mode?: 'dialog' | 'drawer'
    /** 是否显示 */
    visible: boolean
    /** 表单初始数据 (编辑模式) */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    modelValue?: Record<string, any>
    /** 弹窗宽度 */
    width?: string | number
    /** 额外校验规则 (覆盖 schema.required 自动生成的规则) */
    rules?: FormRules
    /** 提交中 */
    loading?: boolean
  }>(),
  {
    title: '',
    mode: 'dialog',
    modelValue: () => ({}),
    width: '500px',
    rules: () => ({}),
    loading: false,
  },
)

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (e: 'submit', data: Record<string, any>): void
  (e: 'cancel'): void
}>()

// ======================== 状态 ========================

const formRef = ref<FormInstance>()
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const formData = ref<Record<string, any>>({})

/** 合并 schema.required + props.rules 生成最终规则 */
const mergedRules = computed<FormRules>(() => {
  const auto: FormRules = {}
  for (const field of props.schema) {
    if (field.required) {
      auto[field.prop] = [{ required: true, message: `${field.label}不能为空`, trigger: 'blur' }]
    }
  }
  return { ...auto, ...props.rules }
})

const dialogVisible = computed({
  get: () => props.visible,
  set: (val: boolean) => emit('update:visible', val),
})

// 初始化 / 重置表单
watch(
  () => props.visible,
  (val) => {
    if (val) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: Record<string, any> = {}
      for (const field of props.schema) {
        data[field.prop] =
          props.modelValue?.[field.prop] !== undefined
            ? props.modelValue[field.prop]
            : field.defaultValue !== undefined
              ? field.defaultValue
              : null
      }
      formData.value = data
    }
  },
)

// ======================== 操作 ========================

async function handleSubmit() {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  emit('submit', { ...formData.value })
}

function handleCancel() {
  dialogVisible.value = false
  emit('cancel')
}

function handleClosed() {
  formRef.value?.resetFields()
}
</script>

<template>
  <!-- Dialog 模式 -->
  <el-dialog
    v-if="mode === 'dialog'"
    v-model="dialogVisible"
    :title="title"
    :width="width"
    destroy-on-close
    @closed="handleClosed"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="mergedRules"
      label-width="100px"
    >
      <template v-for="field in schema" :key="field.prop">
        <el-form-item :label="field.label" :prop="field.prop">
          <!-- slot 覆盖 -->
          <slot :name="field.prop" :model="formData" :field="field">
            <el-select
              v-if="field.type === 'select'"
              v-model="formData[field.prop]"
              :placeholder="field.placeholder || `请选择${field.label}`"
              :disabled="field.disabled"
              clearable
              style="width: 100%"
            >
              <el-option
                v-for="opt in field.options"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
            <el-input
              v-else-if="field.type === 'textarea'"
              v-model="formData[field.prop]"
              type="textarea"
              :rows="3"
              :placeholder="field.placeholder || `请输入${field.label}`"
              :disabled="field.disabled"
            />
            <el-input-number
              v-else-if="field.type === 'number'"
              v-model="formData[field.prop]"
              :placeholder="field.placeholder"
              :disabled="field.disabled"
              controls-position="right"
              style="width: 100%"
            />
            <el-date-picker
              v-else-if="field.type === 'date'"
              v-model="formData[field.prop]"
              type="datetime"
              :placeholder="field.placeholder || `请选择${field.label}`"
              :disabled="field.disabled"
              style="width: 100%"
            />
            <el-switch
              v-else-if="field.type === 'switch'"
              v-model="formData[field.prop]"
              :disabled="field.disabled"
            />
            <el-input
              v-else
              v-model="formData[field.prop]"
              :placeholder="field.placeholder || `请输入${field.label}`"
              :disabled="field.disabled"
            />
          </slot>
        </el-form-item>
      </template>
    </el-form>
    <template #footer>
      <el-button @click="handleCancel">取消</el-button>
      <el-button type="primary" :loading="loading" @click="handleSubmit">确定</el-button>
    </template>
  </el-dialog>

  <!-- Drawer 模式 -->
  <el-drawer
    v-else
    v-model="dialogVisible"
    :title="title"
    :size="width"
    destroy-on-close
    @closed="handleClosed"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="mergedRules"
      label-width="100px"
    >
      <template v-for="field in schema" :key="field.prop">
        <el-form-item :label="field.label" :prop="field.prop">
          <slot :name="field.prop" :model="formData" :field="field">
            <el-select
              v-if="field.type === 'select'"
              v-model="formData[field.prop]"
              :placeholder="field.placeholder || `请选择${field.label}`"
              :disabled="field.disabled"
              clearable
              style="width: 100%"
            >
              <el-option
                v-for="opt in field.options"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
            <el-input
              v-else-if="field.type === 'textarea'"
              v-model="formData[field.prop]"
              type="textarea"
              :rows="3"
              :placeholder="field.placeholder || `请输入${field.label}`"
              :disabled="field.disabled"
            />
            <el-input-number
              v-else-if="field.type === 'number'"
              v-model="formData[field.prop]"
              :placeholder="field.placeholder"
              :disabled="field.disabled"
              controls-position="right"
              style="width: 100%"
            />
            <el-date-picker
              v-else-if="field.type === 'date'"
              v-model="formData[field.prop]"
              type="datetime"
              :placeholder="field.placeholder || `请选择${field.label}`"
              :disabled="field.disabled"
              style="width: 100%"
            />
            <el-switch
              v-else-if="field.type === 'switch'"
              v-model="formData[field.prop]"
              :disabled="field.disabled"
            />
            <el-input
              v-else
              v-model="formData[field.prop]"
              :placeholder="field.placeholder || `请输入${field.label}`"
              :disabled="field.disabled"
            />
          </slot>
        </el-form-item>
      </template>
    </el-form>
    <template #footer>
      <el-button @click="handleCancel">取消</el-button>
      <el-button type="primary" :loading="loading" @click="handleSubmit">确定</el-button>
    </template>
  </el-drawer>
</template>
