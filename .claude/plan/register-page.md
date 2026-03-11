# 实施计划：农业主题注册页面

## 任务类型
- [x] 前端 (→ Gemini 主导设计)
- [ ] 后端
- [ ] 全栈

## 技术方案

基于 Codex 后端分析 + Gemini 前端设计的综合方案：

- **布局**：单列垂直布局，复用登录页 `el-card` 模式（430px max-width, 16px border-radius）
- **背景**：沿用登录页农业绿色渐变，微调色调区分
- **注册后行为**：返回登录页（API `register()` 返回 `void`，不支持自动登录）
- **表单字段**：username, realName, phone(可选), password, confirmPassword
- **农业主题**：Element Plus 图标、绿色调配色、农业文案

## 实施步骤

### Step 1 — 创建 RegisterView.vue

**文件**：`src/views/auth/RegisterView.vue`

**结构**：
```vue
<script setup lang="ts">
// 导入：vue, vue-router, element-plus, register API, usePageState, SysUser 类型
// 表单接口：RegisterForm { username, realName, phone, password, confirmPassword }
// 验证规则：FormRules（含 confirmPassword 自定义校验器）
// handleSubmit：校验 → start() → register(payload) → ElMessage.success → router.push('/login') → finish()
// payload 仅发送：{ username, password, realName, phone }，不发送 confirmPassword/userId/status/createTime
</script>

<template>
  <!-- .register-page > el-card.register-card -->
  <!--   .register-card__header: h2 "加入智慧农业平台" + p 描述 -->
  <!--   el-form (label-position="top") -->
  <!--     用户名 (el-input + User icon prefix) -->
  <!--     真实姓名 (el-input + Postcard icon prefix) -->
  <!--     手机号 (el-input + Iphone icon prefix) -->
  <!--     密码 (el-input type="password" + Lock icon prefix) -->
  <!--     确认密码 (el-input type="password" + Lock icon prefix) -->
  <!--     el-alert (错误提示) -->
  <!--     el-button "立即注册" -->
  <!--     底部链接 "已有账户？去登录" router-link to="/login" -->
</template>

<style scoped>
/* 复用登录页样式模式 */
/* .register-page: min-height 100vh, grid 居中, 农业渐变背景(微调色调) */
/* .register-card: width min(460px, 100%), 比登录卡片略宽以容纳更多字段 */
/* .register-card__header: #213b2a 标题色, --agri-text-muted 描述色 */
/* .register-card__footer: 居中, 14px, "去登录"链接使用 --agri-primary 色 */
</style>
```

**验证规则**：
| 字段 | 规则 |
|------|------|
| username | required, 3-32 chars, trigger: blur |
| realName | required, max 32 chars, trigger: blur |
| phone | optional, 中国手机号正则 `/^1[3-9]\d{9}$/`（仅非空时校验）, trigger: blur |
| password | required, 6-32 chars, trigger: blur |
| confirmPassword | required, 自定义校验器 — 必须与 password 一致, trigger: blur |

### Step 2 — 注册路由

**文件**：`src/router/index.ts`

**变更**：在 `/login` 路由后添加：
```typescript
{
  path: '/register',
  name: 'register',
  component: () => import('@/views/auth/RegisterView.vue'),
},
```

### Step 3 — 更新路由守卫公开路径

**文件**：`src/router/index.ts`

**变更**：将公开路径检测从硬编码改为集合判断：
```typescript
// Before:
const isPublic = to.path === '/login' || to.path === '/403'

// After:
const publicPaths = new Set(['/login', '/register', '/403'])
const isPublic = publicPaths.has(to.path)
```

同时，在已认证用户重定向逻辑中加入 `/register`：
```typescript
// Before:
if (to.path === '/login' && authStore.token) {

// After:
if ((to.path === '/login' || to.path === '/register') && authStore.token) {
```

### Step 4 — 登录页添加注册入口

**文件**：`src/views/auth/LoginView.vue`

**变更**：在 `el-button` 后添加底部链接：
```html
<div class="login-card__footer">
  还没有账户？<router-link to="/register">立即注册</router-link>
</div>
```

添加对应样式：
```css
.login-card__footer {
  text-align: center;
  margin-top: 16px;
  font-size: 14px;
  color: var(--agri-text-muted);
}
.login-card__footer a {
  color: #2f8a4c;
  text-decoration: none;
  font-weight: 500;
}
```

## 关键文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/views/auth/RegisterView.vue` | **新建** | 注册页面主体（表单 + 农业主题样式） |
| `src/router/index.ts:9-14` | 修改 | 添加 /register 路由 |
| `src/router/index.ts:118` | 修改 | 公开路径集合化 + 已认证用户重定向 |
| `src/views/auth/LoginView.vue:112-113` | 修改 | 添加"立即注册"导航链接 |

## 风险与缓解

| 风险 | 缓解措施 |
|------|----------|
| 验证规则与 SystemUserView 不一致 | 统一使用 username 3-32、realName required 的规则集 |
| 已认证用户访问 /register | 路由守卫拦截，重定向到 /dashboard |
| 注册失败错误重复（axios toast + el-alert） | usePageState 捕获错误显示在 el-alert，保持与登录页一致模式 |
| phone 字段可选但后端可能要求格式 | 仅在用户填写时触发正则校验 |

## SESSION_ID（供 /ccg:execute 使用）
- CODEX_SESSION: 019cd3a6-b8a1-73f3-bd0e-bb38ced5d9e5
- GEMINI_SESSION: 无（需重新建立）
