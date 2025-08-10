import { createRouter, createWebHashHistory } from 'vue-router'
import { MENU_IDS, WHITE_LIST, ERROR_PAGES } from '@/constants/constants'

// 获取用户权限菜单（从接口或store获取）
// const getUserAuthMenu = () => {
//   // TODO: 这里应该从store或接口获取用户权限
//   // 例如：return useAppStore().userMenus 
//   // 或者：return JSON.parse(localStorage.getItem('user_menus') || '[]')
  
//   // 临时返回默认权限，实际应该动态获取
//   return [MENU_IDS.HOME, MENU_IDS.CREDENTIAL, MENU_IDS.CALENDAR, MENU_IDS.REQUIREMENT_MANAGEMENT, MENU_IDS.MY_TASKS]
// }

// 定义路由
const routes = [
  {
    path: '/',
    component: () => import('@/components/Layout/index.vue'),
    redirect: '/home',
    children: [
      {
        path: 'home',
        name: 'Home',
        component: () => import('@/views/Home/index.vue'),
        meta: { titleKey: 'menu.home', icon: 'home', menuId: MENU_IDS.HOME }
      },
      {
        path: 'credential',
        name: 'Credential',
        component: () => import('@/views/Credential/index.vue'),
        meta: {
          titleKey: 'menu.credential',
          icon: 'credential',
          menuId: MENU_IDS.CREDENTIAL
        }
      },
      {
        path: 'calendar',
        name: 'Calendar',
        component: () => import('@/views/Calendar/index.vue'),
        meta: {
          titleKey: 'menu.calendar',
          icon: 'calendar',
          menuId: MENU_IDS.CALENDAR
        }
      },
      {
        path: 'requirements',
        name: 'RequirementManagement',
        component: () => import('@/views/RM/index.vue'),
        meta: {
          titleKey: 'menu.requirements',
          icon: 'requirement-management',
          menuId: MENU_IDS.REQUIREMENT_MANAGEMENT
        }
      },
      {
        path: 'my-tasks',
        name: 'MyTasks',
        component: () => import('@/views/MyTasks/index.vue'),
        meta: {
          titleKey: 'menu.myTasks',
          icon: 'my-tasks',
          menuId: MENU_IDS.MY_TASKS
        }
      },
      {
        path: 'user-agent',
        name: 'UserAgent',
        component: () => import('@/views/UserAgent/index.vue'),
        meta: {
          titleKey: 'menu.userAgent',
          icon: 'user-agent',
          menuId: MENU_IDS.USER_AGENT
        }
      },
      {
        path: 'cron',
        name: 'Cron',
        component: () => import('@/views/Cron/index.vue'),
        meta: {
          titleKey: 'menu.cron',
          icon: 'cron',
          menuId: MENU_IDS.CRON
        }
      },
      {
        path: 'iframe',
        name: 'Iframe',
        component: () => import('@/views/Iframe/index.vue'),
        meta: {
          titleKey: 'menu.iframe',
          icon: 'iframe',
          menuId: MENU_IDS.IFRAME
        }
      },
      {
        path: 'debug',
        name: 'Debug',
        component: () => import('@/views/Debug/index.vue'),
        meta: {
          titleKey: 'Debug',
          icon: 'bug',
          menuId: 'debug'
        }
      }
    ]
  },
  // 登录注册页面不包含在Layout中
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login/index.vue'),
    meta: { titleKey: 'login.title' }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/Register/index.vue'),
    meta: { titleKey: 'register.title' }
  },
  {
    path: '/403',
    name: '403',
    component: () => import('@/views/Error/403.vue'),
    meta: { titleKey: 'error.403.title', menuId: MENU_IDS.FORBIDDEN }
  },
  {
    path: '/404',
    name: '404',
    component: () => import('@/views/Error/404.vue'),
    meta: { titleKey: 'error.404.title', menuId: MENU_IDS.NOT_FOUND }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/Error/404.vue'),
    meta: { titleKey: 'error.404.title', menuId: MENU_IDS.NOT_FOUND }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  
  // 检查是否是白名单路径
  if (WHITE_LIST.includes(to.path)) {
    next()
    return
  }
  
  // 检查是否是错误页面（404、403等）
  if (ERROR_PAGES.includes(to.meta.menuId)) {
    next()
    return
  }
  
  // 动态获取用户权限并检查是否有权限访问
  // const userAuthMenu = getUserAuthMenu()
  // if (userAuthMenu.includes(to.meta.menuId)) {
  //   next()
  //   return
  // }
  next()
  // next('/403')
})

router.afterEach((to) => {
  
  // 动态设置页面标题
  if (to.meta.title) {
    document.title = `${to.meta.title} - Billion Agents`
  } else {
    document.title = 'Billion Agents'
  }
})

export default router
