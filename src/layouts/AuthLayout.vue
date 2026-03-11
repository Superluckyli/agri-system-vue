<script setup lang="ts">
defineProps<{
  /** 表单区域标题 */
  title: string
  /** 表单区域副标题 */
  subtitle?: string
}>()
</script>

<template>
  <div class="auth-container">
    <!-- 左侧品牌展示面板 -->
    <aside class="auth-aside">
      <div class="auth-aside__decor auth-aside__decor--1"></div>
      <div class="auth-aside__decor auth-aside__decor--2"></div>

      <div class="brand-content">
        <div class="brand-logo">
          <div class="brand-logo__leaf"></div>
          <div class="brand-logo__leaf brand-logo__leaf--small"></div>
        </div>
        <h1 class="brand-title">智慧农事管理平台</h1>
        <p class="brand-slogan">用科技链接土地，赋能现代农业数字化升级</p>
        <div class="brand-features">
          <div class="brand-features__item">
            <span class="brand-features__dot"></span>
            <span>种植全流程管理</span>
          </div>
          <div class="brand-features__item">
            <span class="brand-features__dot"></span>
            <span>物联网设备监测</span>
          </div>
          <div class="brand-features__item">
            <span class="brand-features__dot"></span>
            <span>智能任务调度</span>
          </div>
        </div>
      </div>

      <div class="auth-aside__footer">
        &copy; 2026 智慧农事科技
      </div>
    </aside>

    <!-- 右侧表单面板 -->
    <main class="auth-main">
      <div class="auth-form-wrapper">
        <div class="auth-form-header">
          <h2 class="auth-form-header__title">{{ title }}</h2>
          <p v-if="subtitle" class="auth-form-header__subtitle">{{ subtitle }}</p>
        </div>

        <slot />
      </div>
    </main>
  </div>
</template>

<style scoped>
/* ===== Element Plus 主色覆盖 ===== */
.auth-container :deep(.el-button--primary) {
  --el-button-bg-color: var(--agri-primary, #2f8a4c);
  --el-button-border-color: var(--agri-primary, #2f8a4c);
  --el-button-hover-bg-color: #3a9d5a;
  --el-button-hover-border-color: #3a9d5a;
  --el-button-active-bg-color: #267a3f;
  --el-button-active-border-color: #267a3f;
  --el-button-disabled-bg-color: #8bc4a0;
  --el-button-disabled-border-color: #8bc4a0;
}

/* 输入框聚焦色 */
.auth-container :deep(.el-input__wrapper:focus-within) {
  box-shadow: 0 0 0 1px var(--agri-primary, #2f8a4c) inset;
}

/* ===== 容器：全屏分栏 ===== */
.auth-container {
  display: flex;
  min-height: 100vh;
}

/* ===== 左侧品牌面板 ===== */
.auth-aside {
  position: relative;
  flex: 0 0 55%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 40px;
  overflow: hidden;
  background: linear-gradient(135deg, #2f8a4c 0%, #1a4d2e 60%, #122e1a 100%);
  box-shadow: inset 0 0 120px rgba(0, 0, 0, 0.15);
  color: #fff;
}

/* 田垄纹理 */
.auth-aside::before {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    45deg,
    rgba(255, 255, 255, 0.025) 0,
    rgba(255, 255, 255, 0.025) 1px,
    transparent 1px,
    transparent 24px
  );
  mask-image: radial-gradient(ellipse at 50% 50%, black 30%, transparent 75%);
  -webkit-mask-image: radial-gradient(ellipse at 50% 50%, black 30%, transparent 75%);
  pointer-events: none;
}

/* 装饰圆环 - 左上 */
.auth-aside__decor--1 {
  position: absolute;
  top: -80px;
  left: -80px;
  width: 320px;
  height: 320px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.08);
  animation: decor-rotate 60s linear infinite;
}

/* 装饰圆环 - 右下 */
.auth-aside__decor--2 {
  position: absolute;
  bottom: -60px;
  right: -60px;
  width: 240px;
  height: 240px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.04) 0%, transparent 70%);
  border: 1px solid rgba(255, 255, 255, 0.06);
  animation: decor-rotate 45s linear infinite reverse;
}

@keyframes decor-rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 品牌内容 */
.brand-content {
  position: relative;
  z-index: 1;
  text-align: center;
  max-width: 380px;
}

/* Logo - 抽象叶片 */
.brand-logo {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  margin-bottom: 28px;
}

.brand-logo__leaf {
  width: 52px;
  height: 52px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 0 50% 0 50%;
  border: 1.5px solid rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(4px);
  transform: rotate(-10deg);
}

.brand-logo__leaf--small {
  position: absolute;
  top: 6px;
  right: 2px;
  width: 28px;
  height: 28px;
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
  transform: rotate(20deg);
}

.brand-title {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  letter-spacing: 2px;
  line-height: 1.4;
}

.brand-slogan {
  margin: 12px 0 0;
  font-size: 15px;
  font-weight: 300;
  opacity: 0.8;
  line-height: 1.6;
  letter-spacing: 0.5px;
}

/* 特性列表 */
.brand-features {
  margin-top: 40px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  text-align: left;
}

.brand-features__item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  opacity: 0.75;
}

.brand-features__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.6);
  flex-shrink: 0;
}

.auth-aside__footer {
  position: absolute;
  bottom: 24px;
  font-size: 12px;
  opacity: 0.4;
}

/* ===== 右侧表单面板 ===== */
.auth-main {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
  background: var(--agri-surface, #fbfcf9);
}

.auth-form-wrapper {
  width: 100%;
  max-width: 420px;
  animation: form-enter 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes form-enter {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.auth-form-header {
  margin-bottom: 28px;
}

.auth-form-header__title {
  margin: 0;
  font-size: 26px;
  font-weight: 600;
  color: var(--agri-text, #25352b);
}

.auth-form-header__subtitle {
  margin: 8px 0 0;
  font-size: 14px;
  color: var(--agri-text-muted, #647164);
  line-height: 1.5;
}

/* ===== 响应式：平板及以下 ===== */
@media (max-width: 991px) {
  .auth-container {
    flex-direction: column;
  }

  .auth-aside {
    flex: 0 0 auto;
    padding: 36px 24px;
  }

  .brand-slogan,
  .brand-features {
    display: none;
  }

  .brand-logo {
    width: 48px;
    height: 48px;
    margin-bottom: 16px;
  }

  .brand-logo__leaf {
    width: 36px;
    height: 36px;
  }

  .brand-logo__leaf--small {
    width: 20px;
    height: 20px;
  }

  .brand-title {
    font-size: 22px;
  }

  .auth-aside__decor--1 {
    width: 200px;
    height: 200px;
    top: -60px;
    left: -60px;
  }

  .auth-aside__decor--2 {
    width: 160px;
    height: 160px;
    bottom: -40px;
    right: -40px;
  }

  .auth-aside__footer {
    display: none;
  }

  .auth-main {
    padding: 32px 20px;
    align-items: flex-start;
  }

  .auth-form-header {
    margin-bottom: 20px;
  }
}

/* ===== 响应式：手机 ===== */
@media (max-width: 575px) {
  .auth-aside {
    padding: 28px 20px;
  }

  .brand-title {
    font-size: 18px;
    letter-spacing: 1px;
  }

  .auth-form-wrapper {
    max-width: 100%;
  }

  .auth-form-header__title {
    font-size: 22px;
  }
}
</style>
