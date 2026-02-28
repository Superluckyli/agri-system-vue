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
          meta: { roles: MENU_ACCESS.dashboard },
          component: () => import('@/views/dashboard/index.vue'),
        },
        {
          path: 'system/user',
          name: 'SystemUser',
          meta: { roles: MENU_ACCESS.system },
          component: () => import('@/views/system/SystemUserView.vue'),
        },
        {
          path: 'system/role',
          name: 'SystemRole',
          meta: { roles: MENU_ACCESS.system },
          component: () => import('@/views/system/SystemRoleView.vue'),
        },
        {
          path: 'task/list',
          name: 'TaskList',
          meta: { roles: MENU_ACCESS.taskManage },
          component: () => import('@/views/task/TaskListView.vue'),
        },
        {
          path: 'task/my',
          name: 'MyTask',
          meta: { roles: MENU_ACCESS.myTask },
          component: () => import('@/views/task/MyTaskView.vue'),
        },
        {
          path: 'task/log',
          name: 'TaskLog',
          meta: { roles: MENU_ACCESS.taskLog },
          component: () => import('@/views/task/TaskLogView.vue'),
        },
        {
          path: 'crop/variety',
          name: 'CropVariety',
          meta: { roles: MENU_ACCESS.crop },
          component: () => import('@/views/crop/CropVarietyView.vue'),
        },
        {
          path: 'crop/batch',
          name: 'CropBatch',
          meta: { roles: MENU_ACCESS.crop },
          component: () => import('@/views/crop/CropBatchView.vue'),
        },
        {
          path: 'crop/growth-log/:batchId',
          name: 'GrowthLog',
          meta: { roles: MENU_ACCESS.crop },
          component: () => import('@/views/crop/GrowthLogView.vue'),
        },
        {
          path: 'material/inventory',
          name: 'MaterialInventory',
          meta: { roles: MENU_ACCESS.materialInventory },
          component: () => import('@/views/material/MaterialInventoryView.vue'),
        },
        {
          path: 'material/log',
          name: 'MaterialLog',
          meta: { roles: MENU_ACCESS.materialLog },
          component: () => import('@/views/material/MaterialLogView.vue'),
        },
        {
          path: 'iot/monitor',
          name: 'IotMonitor',
          meta: { roles: MENU_ACCESS.iotMonitor },
          component: () => import('@/views/iot/IotMonitorView.vue'),
        },
        {
          path: 'iot/rule',
          name: 'IotRule',
          meta: { roles: MENU_ACCESS.iotRule },
          component: () => import('@/views/iot/IotRuleView.vue'),
        },
        {
          path: 'report/analytics',
          name: 'ReportAnalytics',
          meta: { roles: MENU_ACCESS.report },
          component: () => import('@/views/report/ReportAnalyticsView.vue'),
        },
      ],
    },
  ],
})

router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore()

  const isPublic = to.path === '/login' || to.path === '/403'
  if (!isPublic && !authStore.token) {
    next({ path: '/login', query: { redirect: to.fullPath } })
    return
  }

  if (to.path === '/login' && authStore.token) {
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
