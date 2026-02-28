import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/auth/LoginView.vue')
    },
    {
      path: '/',
      component: () => import('@/layouts/AppLayout.vue'),
      redirect: '/dashboard',
      children: [
        {
          path: 'dashboard',
          name: 'dashboard',
          component: () => import('@/views/dashboard/index.vue')
        },
        {
          path: 'system/user',
          name: 'SystemUser',
          component: () => import('@/views/system/SystemUserView.vue')
        },
        {
          path: 'system/role',
          name: 'SystemRole',
          component: () => import('@/views/system/SystemRoleView.vue')
        }
      ]
    }
  ]
})

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  if (to.path !== '/login' && !authStore.token) {
    next('/login')
  } else {
    next()
  }
})

router.onError((error, to) => {
  const message = error instanceof Error ? error.message : String(error)
  const isChunkLoadError =
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('Importing a module script failed')

  if (isChunkLoadError) {
    // Recover from stale asset chunks by reloading the requested route once.
    window.location.assign(to.fullPath)
    return
  }

  console.error('[router] navigation error:', error)
})

export default router
