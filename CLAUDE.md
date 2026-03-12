[根目录](../CLAUDE.md) > **agri-system-vue (前端)**

# 前端模块 - Vue 3 SPA 应用

## 模块职责

提供智慧农业管理系统的 Web 用户界面，包括登录注册、工作台仪表盘、系统管理(用户/角色)、任务派单与接单、作物管理、物资仓储、IoT 监测、统计报表等全部前端功能。共 18 个页面视图、7 个 API 模块。

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Vue | 3.5.26 | 响应式 UI 框架 |
| TypeScript | 5.9 | 类型安全 |
| Vite | 7.3.1 | 构建工具 & 开发服务器 |
| Pinia | 3.0.4 | 状态管理 |
| Vue Router | 4.6.4 | 路由管理 |
| Element Plus | 2.13.2 | UI 组件库 |
| ECharts / vue-echarts | 6.0 / 8.0 | 图表可视化 |
| Axios | 1.13.2 | HTTP 请求 |
| Node.js | >= 20.19 或 >= 22.12 | 运行时要求 |

## 入口与启动

- **入口文件**: `src/main.ts` -- 创建 Vue 应用，挂载 Pinia、Router、Element Plus
- **HTML 模板**: `index.html`
- **构建配置**: `vite.config.ts` -- 开发代理 `/api` -> `http://127.0.0.1:8080`(可通过 `VITE_API_BASE_URL` 环境变量覆盖)
- **开发端口**: `5173` (strictPort)
- **开发命令**: `npm run dev`

## 目录结构

```
src/
  api/              # API 层
    http.ts         # Axios 实例 & 拦截器（请求头注入 JWT / 统一响应处理 / 401 自动登出）
    index.ts        # 聚合导出
    modules/        # 按业务域拆分的 API 函数（自动生成，勿手动编辑）
      auth.ts       # 登录/注册
      system.ts     # 用户/角色/菜单 CRUD + 角色分配
      task.ts       # 任务 CRUD / 派单 / 接单 / 拒单
      crop.ts       # 品种 / 批次 / 生长日志
      iot.ts        # 传感器数据 / 预警规则
      material.ts   # 物资信息 / 出入库
      report.ts     # Dashboard 数据
      index.ts      # 模块聚合导出
  components/       # 公共组件
    BaseChart.vue   # ECharts 封装组件（接收 EChartsOption）
    dashboard/      # 仪表盘专用组件
      TaskTrendChart.vue
    page/           # 页面状态组件
      PageState.vue # 统一的 loading/error/empty 状态展示
  composables/      # 组合式函数
    usePageState.ts # 页面加载/错误状态管理（含 Axios 错误消息提取）
  constants/        # 常量定义
    permission.ts   # 角色类型定义 (AppRole) & 别名映射 (ROLE_ALIAS_MAP) & 菜单权限矩阵 (MENU_ACCESS)
    task.ts         # 任务状态/优先级枚举映射 (TASK_STATUS / TASK_STATUS_MAP / TASK_PRIORITY_MAP)
  layouts/          # 布局组件
    AppLayout.vue   # 主布局（侧边栏导航 + 顶栏，根据角色过滤菜单）
    AuthLayout.vue  # 认证页布局
  router/           # 路由
    index.ts        # 路由表 (14 个业务路由) + beforeEach 权限守卫 + 动态导入错误恢复
  stores/           # Pinia Store
    auth.ts         # 认证状态（token/user/roles/login/logout）
    counter.ts      # 示例 store (未使用)
  types/            # TypeScript 类型
    api.ts          # R<T> 响应体、MpPage<T> 分页
    entity.ts       # 全部业务实体接口 (19 个类型 + 类型别名)
  utils/            # 工具函数
    permission.ts   # 角色解析 (resolveUserRoles) & 权限判断 (hasAnyRole)
  views/            # 页面视图 (18 个 .vue 文件)
    auth/           # 登录 (LoginView) / 注册 (RegisterView)
    dashboard/      # 工作台首页 (index.vue) -- 统计卡片/饼图/折线图/待处理任务/预警/快捷入口
    system/         # 用户管理 (SystemUserView) / 角色管理 (SystemRoleView)
    task/           # 任务列表 (TaskListView) / 我的任务 (MyTaskView) / 任务分页旧版 (TaskListPage) / 执行日志 (TaskLogView)
    crop/           # 品种 (CropVarietyView) / 批次 (CropBatchView) / 生长日志 (GrowthLogView)
    material/       # 库存 (MaterialInventoryView) / 出入库 (MaterialLogView)
    iot/            # 设备监测 (IotMonitorView) / 预警规则 (IotRuleView)
    report/         # 统计报表 (ReportAnalyticsView)
    error/          # 403 页面 (ForbiddenView)
    DashboardPage.vue  # 旧版仪表盘 (保留)
```

## 对外接口 (API 调用清单)

### 认证
| 函数 | 方法 | 路径 |
|------|------|------|
| `login` | POST | `/login` |
| `register` | POST | `/register` |

### 系统管理
| 函数 | 方法 | 路径 |
|------|------|------|
| `listSystemUser` | GET | `/system/user/list` |
| `createSystemUser` | POST | `/system/user` |
| `updateSystemUser` | PUT | `/system/user` |
| `removeSystemUserByUserIds` | DELETE | `/system/user/{userIds}` |
| `getSystemUserByUserId` | GET | `/system/user/{userId}` |
| `getUserRoles` | GET | `/system/user/{userId}/roles` |
| `assignUserRoles` | PUT | `/system/user/{userId}/roles` |
| `listSystemRole` | GET | `/system/role/list` |
| `listAllRoles` | GET | `/system/role/all` |
| `createSystemRole` | POST | `/system/role` |
| `updateSystemRole` | PUT | `/system/role` |
| `removeSystemRoleByRoleIds` | DELETE | `/system/role/{roleIds}` |
| `listSystemMenu` | GET | `/system/menu/list` |
| `createSystemMenu` | POST | `/system/menu` |
| `updateSystemMenu` | PUT | `/system/menu` |
| `removeSystemMenuByMenuId` | DELETE | `/system/menu/{menuId}` |

### 任务管理
| 函数 | 方法 | 路径 |
|------|------|------|
| `listTask` | GET | `/task/list` |
| `createTask` | POST | `/task` |
| `updateTask` | PUT | `/task` |
| `assignTask` | PUT | `/task/assign` |
| `acceptTask` | POST | `/task/accept` |
| `rejectTask` | POST | `/task/reject` |
| `removeTaskByIds` | DELETE | `/task/{ids}` |
| `listTaskLog` | GET | `/task/log/list` |
| `createTaskLog` | POST | `/task/log` |

### 作物管理
| 函数 | 方法 | 路径 |
|------|------|------|
| `listCropVariety` | GET | `/crop/variety/list` |
| `getCropVarietyAll` | GET | `/crop/variety/all` |
| `createCropVariety` | POST | `/crop/variety` |
| `updateCropVariety` | PUT | `/crop/variety` |
| `removeCropVarietyByIds` | DELETE | `/crop/variety/{ids}` |
| `listCropBatch` | GET | `/crop/batch/list` |
| `createCropBatch` | POST | `/crop/batch` |
| `updateCropBatch` | PUT | `/crop/batch` |
| `removeCropBatchByIds` | DELETE | `/crop/batch/{ids}` |
| `listCropGrowthLog` | GET | `/crop/growth-log/list/{batchId}` |
| `createCropGrowthLog` | POST | `/crop/growth-log` |

### IoT 监测
| 函数 | 方法 | 路径 |
|------|------|------|
| `listIotData` | GET | `/iot/data/list` |
| `listIotRule` | GET | `/iot/rule/list` |
| `createIotRule` | POST | `/iot/rule` |
| `updateIotRule` | PUT | `/iot/rule` |
| `removeIotRuleById` | DELETE | `/iot/rule/{id}` |

### 物资管理
| 函数 | 方法 | 路径 |
|------|------|------|
| `listMaterialInfo` | GET | `/material/info/list` |
| `createMaterialInfo` | POST | `/material/info` |
| `updateMaterialInfo` | PUT | `/material/info` |
| `removeMaterialInfoByIds` | DELETE | `/material/info/{ids}` |
| `listMaterialLog` | GET | `/material/log/list` |
| `createMaterialLogExecute` | POST | `/material/log/execute` |

### 报表
| 函数 | 方法 | 路径 |
|------|------|------|
| `getReportDashboard` | GET | `/report/dashboard` |

## 关键依赖与配置

- **路径别名**: `@` -> `./src` (Vite + TSConfig 配置)
- **API 代理**: `/api` -> `http://127.0.0.1:8080` (可通过 `VITE_API_BASE_URL` 覆盖)，前端请求 baseURL 为 `/api`
- **JWT**: 请求拦截器自动在 Header 注入 `Authorization: Bearer {token}`
- **401 处理**: 响应拦截器自动触发 `authStore.logout()` 跳转登录页
- **动态导入容错**: `router.onError` 检测 chunk 加载失败后自动 `window.location.assign` 刷新
- **API 代码生成**: `npm run api:generate` 从 `openapi/endpoints.json` 生成 `src/api/modules/` 下所有文件

## 数据模型 (关键类型)

核心实体定义在 `src/types/entity.ts` (19 个接口 + 5 个类型别名)：

| 类型 | 说明 |
|------|------|
| `SysUser` | 系统用户 (含 roleNames/roleIds) |
| `SysRole` | 系统角色 |
| `SysMenu` | 菜单权限 |
| `AgriTask` | 农业任务 (核心业务实体) |
| `TaskAssignRequest` | 派单请求体 |
| `TaskAcceptDTO` | 接单请求体 |
| `TaskRejectDTO` | 拒单请求体 |
| `TaskExecutionLog` | 任务执行日志 |
| `BaseCropVariety` | 作物品种 |
| `CropBatch` | 种植批次 |
| `GrowthStageLog` | 生长日志 |
| `IotSensorData` | 传感器数据 |
| `AgriTaskRule` | IoT 预警规则 |
| `MaterialInfo` | 物资信息 |
| `MaterialInoutLog` | 出入库记录 |
| `DashboardData` | 仪表盘聚合数据 |
| `ChartDataVO` | 图表数据 (xAxis + series) |
| `NameValueItem` | 通用 name-value 项 |
| `LoginBody` / `LoginData` | 登录请求/响应 |

## 权限体系

角色定义在 `src/constants/permission.ts`，支持 30+ 别名映射 (`ROLE_ALIAS_MAP`)：

| 角色 Key | 中文 | 可访问菜单 |
|----------|------|------------|
| ADMIN | 超级管理员 | 全部 |
| FARM_OWNER | 农场主 | 全部 |
| MANAGER | 管理员 | 工作台/系统管理/任务管理/作物/物资出入库/IoT规则/报表 |
| FARMER | 农户 | 我的任务/执行日志/物资库存/IoT监测 |
| WORKER | 工人 | 我的任务/执行日志/物资库存 |
| DEMO | 演示账号 | 无菜单权限 |

路由守卫逻辑：
- 公开路径：`/login`, `/register`, `/403`
- 无 token 访问受保护路径 -> 重定向至 `/login`
- 有 token 但权限不足 -> `/403`；特例：FARMER/WORKER 角色访问 `/dashboard` 时自动重定向到 `/task/my`
- 已登录访问 `/login` 或 `/register` -> 重定向至 `/dashboard`

## Dashboard 页面架构

`src/views/dashboard/index.vue` 是核心聚合页面：

1. **统计卡片** -- 4 个实时指标 (待分配/待接单/执行中/今日新增任务)
2. **作物分布饼图** -- 调用 `/report/dashboard` -> `cropDistribution`
3. **任务趋势折线图** -- 调用 `/report/dashboard` -> `taskTrend`
4. **待处理任务列表** -- 最近 20 条未完成任务
5. **预警面板** -- 前端侧实时匹配 IoT 规则 + 物资库存阈值 (按类别不同阈值)
6. **快捷入口** -- 创建任务 / 查看库存预警 / 查看报表

## 测试与质量

- 无自动化测试框架
- 代码质量依赖 `vue-tsc` 类型检查 + ESLint 9 (缓存模式)
- 运行 `npm run type-check` 检查类型
- 运行 `npm run lint` 检查代码规范

## 常见问题 (FAQ)

1. **Q: API 模块如何更新？**
   A: 修改 `openapi/endpoints.json`，运行 `npm run api:generate`，它生成 `src/api/modules/` 下的文件。禁止手动编辑这些文件 (文件头有 `/* eslint-disable */` 标记)。

2. **Q: 如何添加新页面？**
   A: 在 `src/views/` 下创建 `.vue` 文件，在 `src/router/index.ts` 添加路由并设置 `meta.roles` 权限 (使用 `MENU_ACCESS` 常量)。

3. **Q: 前端如何判断用户权限？**
   A: 路由守卫在 `router.beforeEach` 中调用 `hasAnyRole()` 校验。布局组件 `AppLayout.vue` 根据角色过滤导航菜单。角色来源于 `authStore.roles`，经 `resolveUserRoles()` 标准化处理 (支持别名映射)。

4. **Q: 库存预警阈值如何配置？**
   A: Dashboard 前端硬编码在 `CATEGORY_THRESHOLD_MAP` (Fertilizer=100, Pesticide=30, Seed=80, Tool=10，默认=50)。后续可改为后端配置。

## 相关文件清单

| 类别 | 文件 |
|------|------|
| 入口 | `src/main.ts`, `index.html` |
| 构建 | `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json` |
| 依赖 | `package.json` |
| 代码质量 | `eslint.config.ts`, `.editorconfig` |
| 路由 | `src/router/index.ts` |
| 状态 | `src/stores/auth.ts` |
| HTTP | `src/api/http.ts` |
| 类型 | `src/types/api.ts`, `src/types/entity.ts` |
| 权限 | `src/constants/permission.ts`, `src/utils/permission.ts` |
| 常量 | `src/constants/task.ts` |
| 组合式 | `src/composables/usePageState.ts` |
| 组件 | `src/components/BaseChart.vue`, `src/components/page/PageState.vue` |

## 变更记录 (Changelog)

| 时间 | 操作 | 说明 |
|------|------|------|
| 2026-03-12T03:09:04+08:00 | 增量更新 | 补扫 Dashboard/MyTaskView/SystemUserView/usePageState/PageState 等页面；补充 Dashboard 架构说明、权限守卫详细逻辑、路由容错、环境变量、库存预警阈值 FAQ；完善目录结构描述 |
| 2026-03-12T02:16:28 | 初始生成 | 由架构师扫描工具首次生成 |
