<script setup lang="ts" generic="T extends Record<string, any>">
/**
 * ProTable — 通用 CRUD 表格组件
 *
 * 接收 api 函数 + columns 配置，内置分页/搜索/工具栏/loading 状态。
 * 通过 slot 支持自定义列渲染和工具栏扩展。
 */
import { ref, reactive, onMounted } from 'vue'
import type { PageResult } from '@/types/api'

// ======================== 类型定义 ========================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ProTableColumn<R = any> {
  /** 字段 key，对应数据属性名 */
  prop: string
  /** 列标题 */
  label: string
  /** 列宽 */
  width?: number | string
  /** 最小宽度 */
  minWidth?: number | string
  /** 对齐方式 */
  align?: 'left' | 'center' | 'right'
  /** 是否固定列 */
  fixed?: 'left' | 'right' | boolean
  /** 是否显示溢出 tooltip */
  showOverflowTooltip?: boolean
  /** 具名插槽名 (默认用 prop 作为 slot name) */
  slotName?: string
  /** 简单格式化函数 (不使用 slot 时) */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  formatter?: (row: R, col: ProTableColumn<R>, cellValue: any) => string
}

export interface QueryField {
  /** 字段 key */
  prop: string
  /** 标签文本 */
  label: string
  /** 控件类型 */
  type?: 'input' | 'select'
  /** select 选项 */
  options?: Array<{ label: string; value: string | number }>
  /** 占位文本 */
  placeholder?: string
}

// ======================== Props ========================

const props = withDefaults(
  defineProps<{
    /** 数据获取函数，接收分页+查询参数，返回 PageResult<T> */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    api: (params: Record<string, any>) => Promise<PageResult<T>>
    /** 列定义 */
    columns: ProTableColumn<T>[]
    /** 搜索字段定义 */
    queryFields?: QueryField[]
    /** 表格标题 */
    title?: string
    /** 行 key */
    rowKey?: string
    /** 默认每页条数 */
    defaultPageSize?: number
  }>(),
  {
    queryFields: () => [],
    title: '',
    rowKey: 'id',
    defaultPageSize: 10,
  },
)

// ======================== 状态 ========================

const loading = ref(false)
const list = ref<T[]>([]) as { value: T[] }
const total = ref(0)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const queryParams = reactive<Record<string, any>>({
  pageNum: 1,
  pageSize: props.defaultPageSize,
})

// 初始化搜索字段默认值
if (props.queryFields) {
  for (const field of props.queryFields) {
    if (!(field.prop in queryParams)) {
      queryParams[field.prop] = undefined
    }
  }
}

// ======================== 数据获取 ========================

async function fetchData() {
  loading.value = true
  try {
    const res = await props.api(queryParams)
    list.value = res.items || []
    total.value = res.total || 0
  } catch (e) {
    console.error('ProTable fetchData error:', e)
    list.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function handleQuery() {
  queryParams.pageNum = 1
  void fetchData()
}

function resetQuery() {
  if (props.queryFields) {
    for (const field of props.queryFields) {
      queryParams[field.prop] = undefined
    }
  }
  queryParams.pageNum = 1
  void fetchData()
}

function handleSizeChange(val: number) {
  queryParams.pageSize = val
  queryParams.pageNum = 1
  void fetchData()
}

function handleCurrentChange(val: number) {
  queryParams.pageNum = val
  void fetchData()
}

/** 外部调用刷新 */
function refresh() {
  void fetchData()
}

onMounted(() => void fetchData())

// ======================== 暴露 ========================

defineExpose({ refresh, fetchData, list, total, loading, queryParams })
</script>

<template>
  <el-card shadow="never">
    <!-- 标题栏 -->
    <template v-if="title || $slots.title" #header>
      <div style="display: flex; align-items: center; justify-content: space-between">
        <slot name="title">
          <span style="font-weight: 600">{{ title }}</span>
        </slot>
      </div>
    </template>

    <!-- 搜索栏 -->
    <el-form
      v-if="queryFields && queryFields.length > 0"
      :inline="true"
      @submit.prevent="handleQuery"
      style="margin-bottom: 16px"
    >
      <template v-for="field in queryFields" :key="field.prop">
        <el-form-item :label="field.label">
          <el-select
            v-if="field.type === 'select'"
            v-model="queryParams[field.prop]"
            :placeholder="field.placeholder || `请选择${field.label}`"
            clearable
            style="width: 180px"
          >
            <el-option
              v-for="opt in field.options"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
          <el-input
            v-else
            v-model="queryParams[field.prop]"
            :placeholder="field.placeholder || `请输入${field.label}`"
            clearable
            style="width: 180px"
          />
        </el-form-item>
      </template>
      <el-form-item>
        <el-button type="primary" @click="handleQuery">搜索</el-button>
        <el-button @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <!-- 工具栏 -->
    <div v-if="$slots.toolbar" style="margin-bottom: 16px">
      <slot name="toolbar" />
    </div>

    <!-- 表格 -->
    <el-table v-loading="loading" :data="list" :row-key="rowKey" border>
      <template v-for="col in columns" :key="col.prop">
        <el-table-column
          :prop="col.prop"
          :label="col.label"
          :width="col.width"
          :min-width="col.minWidth"
          :align="col.align || 'left'"
          :fixed="col.fixed"
          :show-overflow-tooltip="col.showOverflowTooltip !== false"
          :formatter="col.formatter as any"
        >
          <template v-if="$slots[col.slotName || col.prop]" #default="scope">
            <slot :name="col.slotName || col.prop" :row="scope.row" :index="scope.$index" />
          </template>
        </el-table-column>
      </template>

      <!-- 操作列 -->
      <el-table-column v-if="$slots.action" label="操作" align="center" fixed="right" width="180">
        <template #default="scope">
          <slot name="action" :row="scope.row" :index="scope.$index" />
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div style="display: flex; justify-content: flex-end; margin-top: 16px">
      <el-pagination
        v-model:current-page="queryParams.pageNum"
        v-model:page-size="queryParams.pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>
  </el-card>
</template>
