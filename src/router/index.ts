import { createRouter, createWebHistory } from 'vue-router'
import { MENU_ACCESS, type AppRole } from '@/constants/permission'
import { hasAnyRole } from '@/utils/permission'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/auth/LoginView.vue'),
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/auth/RegisterView.vue'),
    },
    {
      path: '/403',
      name: 'forbidden',
      component: () => import('@/views/error/ForbiddenView.vue'),
    },

    {
      path: '/',
      component: () => import('@/layouts/AppLayout.vue'),
      redirect: '/dashboard',
      children: [
        {
          path: 'dashboard',
          name: 'dashboard',
          meta: { title: '工作台', roles: MENU_ACCESS.dashboard },
          component: () => import('@/views/dashboard/index.vue'),
        },
        {
          path: 'system/user',
          name: 'SystemUser',
          meta: { title: '用户管理', roles: MENU_ACCESS.system },
          component: () => import('@/views/system/SystemUserView.vue'),
        },
        {
          path: 'system/role',
          name: 'SystemRole',
          meta: { title: '角色管理', roles: MENU_ACCESS.system },
          component: () => import('@/views/system/SystemRoleView.vue'),
        },
        {
          path: 'task/list',
          name: 'TaskList',
          meta: { title: '任务调度', roles: MENU_ACCESS.taskManage },
          component: () => import('@/views/task/TaskListView.vue'),
        },
        {
          path: 'task/my',
          name: 'MyTask',
          meta: { title: '我的任务', roles: MENU_ACCESS.myTask },
          component: () => import('@/views/task/MyTaskView.vue'),
        },
        {
          path: 'task/log',
          name: 'TaskLog',
          meta: { title: '执行日志', roles: MENU_ACCESS.taskLog },
          component: () => import('@/views/task/TaskLogView.vue'),
        },
        {
          path: 'crop/variety',
          name: 'CropVariety',
          meta: { title: '品种管理', roles: MENU_ACCESS.crop },
          component: () => import('@/views/crop/CropVarietyView.vue'),
        },
        {
          path: 'crop/farmland-batch',
          name: 'FarmlandBatch',
          meta: { title: '农田与批次管理', roles: MENU_ACCESS.farmland },
          component: () => import('@/views/crop/FarmlandBatchView.vue'),
        },
        {
          path: 'crop/batch',
          redirect: '/crop/farmland-batch',
        },
        {
          path: 'crop/farmland',
          redirect: '/crop/farmland-batch',
        },
        {
          path: 'crop/growth-log/:batchId',
          name: 'GrowthLog',
          meta: { title: '生长日志', roles: MENU_ACCESS.crop },
          component: () => import('@/views/crop/GrowthLogView.vue'),
        },
        {
          path: 'material/inventory',
          name: 'MaterialInventory',
          meta: { title: '物资台账', roles: MENU_ACCESS.materialInventory },
          component: () => import('@/views/material/MaterialInventoryView.vue'),
        },
        {
          path: 'material/log',
          name: 'MaterialLog',
          meta: { title: '库存流水', roles: MENU_ACCESS.materialLog },
          component: () => import('@/views/material/MaterialLogView.vue'),
        },
        {
          path: 'supplier-purchase',
          name: 'SupplierPurchase',
          meta: { title: '供应商与采购', roles: MENU_ACCESS.supplier },
          component: () => import('@/views/supplier/SupplierPurchaseView.vue'),
        },
        {
          path: 'supplier',
          redirect: '/supplier-purchase',
        },
        {
          path: 'purchase',
          name: 'PurchaseOrder',
          meta: { title: '采购管理', roles: MENU_ACCESS.purchase },
          component: () => import('@/views/purchase/PurchaseOrderView.vue'),
        },
        {
          path: 'chat',
          name: 'ChatRoom',
          meta: { title: '聊天室', roles: MENU_ACCESS.chat },
          component: () => import('@/views/chat/ChatView.vue'),
        },
        {
          path: 'iot/monitor',
          name: 'IotMonitor',
          meta: { title: '设备监测', roles: MENU_ACCESS.iotMonitor },
          component: () => import('@/views/iot/IotMonitorView.vue'),
        },
        {
          path: 'iot/rule',
          name: 'IotRule',
          meta: { title: '预警规则', roles: MENU_ACCESS.iotRule },
          component: () => import('@/views/iot/IotRuleView.vue'),
        },
        {
          path: 'report/analytics',
          name: 'ReportAnalytics',
          meta: { title: '统计报表', roles: MENU_ACCESS.report },
          component: () => import('@/views/report/ReportAnalyticsView.vue'),
        },
        {
          path: 'profile',
          name: 'Profile',
          meta: { title: '个人设置' },
          component: () => import('@/views/system/ProfileView.vue'),
        },
      ],
    },
  ],
})

router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore()

  const publicPaths = new Set(['/login', '/register', '/403'])
  const isPublic = publicPaths.has(to.path)
  if (!isPublic && !authStore.token) {
    next({ path: '/login', query: { redirect: to.fullPath } })
    return
  }

  if ((to.path === '/login' || to.path === '/register') && authStore.token) {
    next('/dashboard')
    return
  }

  if (!isPublic && authStore.token) {
    let requiredRoles: AppRole[] | undefined
    for (let i = to.matched.length - 1; i >= 0; i -= 1) {
      const roleMeta = to.matched[i]?.meta?.roles as AppRole[] | undefined
      if (roleMeta && roleMeta.length > 0) {
        requiredRoles = roleMeta
        break
      }
    }

    if (requiredRoles && !hasAnyRole(authStore.roles, requiredRoles)) {
      if (
        to.path === '/dashboard' &&
        hasAnyRole(authStore.roles, MENU_ACCESS.myTask)
      ) {
        next('/task/my')
        return
      }
      next({ path: '/403', query: { redirect: to.fullPath } })
      return
    }
  }

  next()
})

router.onError((error, to) => {
  const message = error instanceof Error ? error.message : String(error)
  const isChunkLoadError =
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('Importing a module script failed')

  if (isChunkLoadError) {
    window.location.assign(to.fullPath)
    return
  }

  console.error('[router] navigation error:', error)
})

export default router
