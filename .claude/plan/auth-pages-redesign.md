# 实施计划：登录/注册页面分栏式美化

## 任务类型
- [x] 前端 (Gemini 主导设计)
- [ ] 后端

## 设计方案

**分栏式布局 (Split-Panel)**：左侧品牌展示区 + 右侧表单操作区
- 左面板 (55%)：深绿渐变背景 + CSS-only 农业装饰 + 品牌文案
- 右面板 (45%)：干净的白色/surface 背景 + 表单
- 响应式：992px 以下左面板折叠为顶部紧凑横幅

## 组件架构

```
AuthLayout.vue (新建 - 共享布局)
├── aside.auth-aside (品牌面板)
│   ├── .brand-content (Logo + 标题 + Slogan)
│   └── ::before / ::after (CSS 装饰)
└── main.auth-main (表单面板)
    └── slot (默认插槽 → 表单内容)

LoginView.vue (改造 - 使用 AuthLayout 包裹)
RegisterView.vue (改造 - 使用 AuthLayout 包裹)
```

## 实施步骤

### Step 1 — 创建 AuthLayout.vue

**文件**：`src/layouts/AuthLayout.vue`（新建）

**职责**：
- 分栏式 flex 布局容器
- 左侧品牌面板（CSS-only 农业主题装饰）
- 右侧表单区域（通过 slot 分发）
- 响应式断点处理

**左侧面板 CSS 视觉规格**：
- 背景：`linear-gradient(135deg, #2f8a4c 0%, #1a4d2e 100%)`
- 田垄纹理：`repeating-linear-gradient(45deg, ...)` + `mask-image` 渐隐
- 抽象叶片 Logo：`border-radius: 0 100% 0 100%` 半透明形状
- 装饰圆环：两个大半透明圆（左上+右下），60s 极慢旋转
- 光影：`box-shadow: inset 0 0 100px rgba(0,0,0,0.2)`
- 品牌文字：白色，`letter-spacing: 2px`

**右侧面板规格**：
- 背景：`--agri-surface` (#fbfcf9)
- 表单卡片区域居中，max-width 420px
- 进场动画：`translateY(20px) + opacity 0→1`，0.6s ease

**响应式**：
- `>= 992px`：flex-direction: row，左55%右45%
- `< 992px`：flex-direction: column，左面板 200px 高度紧凑模式，隐藏 slogan

**Props**：
- `title`: string — 表单标题（"欢迎登录" / "创建账户"）
- `subtitle`: string — 表单副标题

### Step 2 — 改造 LoginView.vue

**文件**：`src/views/auth/LoginView.vue`（修改）

**变更**：
- 移除外层 `.login-page` 和 `.login-card` 布局样式
- 用 `<AuthLayout>` 包裹表单内容
- 保留所有 `<script>` 逻辑不变
- 移除页面级背景样式，仅保留表单内组件样式
- 增加输入框 prefix-icon（User, Lock）与注册页统一

### Step 3 — 改造 RegisterView.vue

**文件**：`src/views/auth/RegisterView.vue`（修改）

**变更**：
- 移除外层 `.register-page` 和 `.register-card` 布局样式
- 用 `<AuthLayout>` 包裹表单内容
- 保留所有 `<script>` 逻辑不变
- 移除页面级背景样式

### Step 4 — 清理遗留文件

**检查**：`src/views/LoginPage.vue` 是否仍在使用，如未引用则标记可删除

### Step 5 — 视觉验证

- 桌面端 (1920px, 1440px, 1280px) 分栏效果
- 平板端 (1024px, 768px) 过渡行为
- 移动端 (375px) 紧凑模式

## 关键文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/layouts/AuthLayout.vue` | **新建** | 共享认证布局组件 |
| `src/views/auth/LoginView.vue` | 修改 | 接入 AuthLayout，移除独立布局样式 |
| `src/views/auth/RegisterView.vue` | 修改 | 接入 AuthLayout，移除独立布局样式 |

## 设计 Token

| Token | 值 | 用途 |
|-------|-----|------|
| 左面板渐变起始 | `#2f8a4c` (--agri-primary) | 品牌区背景 |
| 左面板渐变终止 | `#1a4d2e` | 品牌区背景深色端 |
| 右面板背景 | `#fbfcf9` (--agri-surface) | 表单区背景 |
| 表单区 max-width | `420px` | 表单内容最大宽度 |
| 响应式断点 | `992px` | 分栏→堆叠切换 |
| 进场动画时长 | `0.6s` | 表单区入场 |
| 装饰旋转周期 | `60s` | 背景圆环动画 |

## SESSION_ID
- CODEX_SESSION: 019cd3ea-0227-7383-863a-72ec08bede28
- GEMINI_SESSION: 无（需重新建立）
