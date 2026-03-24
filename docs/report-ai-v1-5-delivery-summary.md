# 统计报表 V1.5 AI 总结交付说明

## 交付范围

本次交付实现的是**统计报表页当前 Tab 的 AI 自动总结能力**，不包含问答、多轮对话和综合分析。

页面能力包括：

- 右下角悬浮 `AI 解读` 按钮
- 右侧覆盖式抽屉
- 当前 Tab 流式 section 展示：
  - `conclusion`
  - `reason`
  - `risk`
  - `attention`
- 同一 `Tab + 已应用筛选条件` 的缓存复用
- 查询 / 重置 / 切 Tab 时的流中止与缓存失效

## 业务逻辑

### 1. AI 只读当前模块

用户停留在哪个 Tab，AI 就分析哪个 Tab：

- `task`
- `production`
- `cost`

### 2. AI 使用“已应用筛选”而不是“草稿筛选”

页面上的筛选表单允许先改值、再点查询。  
因此 AI 请求不能直接读草稿值，而要读页面已经生效的数据口径：

- `filter`：草稿筛选
- `appliedFilters`：当前图表真正使用的筛选条件

这样可以避免：

> 图表还是旧数据，但 AI 却按新草稿去总结

### 3. 缓存与失效

缓存只在收到后端 `done` 事件后写入。

以下场景会中止当前流并关闭抽屉：

- 切换 Tab
- 点击查询
- 点击重置

其中：

- 切换 Tab：中止当前流
- 查询 / 重置：中止当前流并清空 AI 缓存

## 前端实现结构

### 关键文件

- `src/api/reportAi.ts`
- `src/utils/reportFilter.ts`
- `src/views/report/reportAiSummaryShared.ts`
- `src/views/report/useReportAiSummary.ts`
- `src/components/report/ReportAiFab.vue`
- `src/components/report/ReportAiDrawer.vue`
- `src/components/report/ReportAiSection.vue`
- `src/views/report/ReportAnalyticsView.vue`

### 职责划分

#### `reportAi.ts`

负责：

- `fetch + ReadableStream` 流式请求
- `Authorization` 请求头
- SSE `data:` 分帧解析
- `AbortSignal` 中止

#### `reportAiSummaryShared.ts`

负责：

- section 顺序与标签
- reducer
- cache key
- 空 skeleton state

#### `useReportAiSummary.ts`

负责：

- drawer 可见性
- 当前 stream 状态
- `AbortController`
- cache 读写
- open / close / abort / clearCache

#### `ReportAnalyticsView.vue`

负责：

- 页面级查询与 Tab 逻辑
- 把 `appliedFilters` 提供给 AI hook
- 在切 Tab / 查询 / 重置时执行 AI 失效控制

## 后端接口口径

前端固定调用：

`POST /api/report/analytics/ai-summary/stream`

前端只传：

- `currentTab`
- `filters`

不传图表 option，也不传前端自己聚合出来的文本。

## 验证结果

已通过：

- `reportAiSummaryShared.test.ts`
- `ReportAiDrawer.spec.ts`
- `ReportAnalyticsAiFlow.spec.ts`
- `ReportAnalyticsView.spec.ts`
- `reportAnalyticsShared.test.ts`
- `npm run type-check`
- `npm run build`

## 分支与提交

- repo: `agri-system-vue`
- branch: `feat/report-ai-v1-5`
- 当前补充中文注释后的最新提交：`47f91a5`

## 备注

工作区里仍有一个**预先存在且未触碰**的文件：

- `src/components.d.ts`

它不属于这次 AI 功能改动。
