import { createRouter, createWebHistory } from 'vue-router'

import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginPage.vue'),
      meta: {
        title: '登录',
        public: true,
      },
    },
    {
      path: '/',
      component: () => import('@/layouts/AppLayout.vue'),
      children: [
        {
          path: '',
          redirect: '/dashboard',
        },
        {
          path: 'dashboard',
          name: 'dashboard',
          component: () => import('@/views/DashboardPage.vue'),
          meta: {
            title: '数据看板',
          },
        },
        {
          path: 'system/users',
          name: 'system-users',
          component: () => import('@/views/system/UserListPage.vue'),
          meta: {
            title: '用户管理',
          },
        },
        {
          path: 'tasks',
          name: 'tasks',
          component: () => import('@/views/task/TaskListPage.vue'),
          meta: {
            title: '任务列表',
          },
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/dashboard',
    },
  ],
})

router.beforeEach((to) => {
  const authStore = useAuthStore()
  const isPublic = Boolean(to.meta.public)

  if (isPublic) {
    if (to.path === '/login' && authStore.isAuthenticated) {
      return '/dashboard'
    }

    return true
  }

  if (!authStore.isAuthenticated) {
    return {
      path: '/login',
      query: { redirect: to.fullPath },
    }
  }

  return true
})

router.afterEach((to) => {
  const title = typeof to.meta.title === 'string' ? to.meta.title : '农业系统'
  document.title = `${title} | 农业系统`
})

export default router
