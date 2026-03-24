import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig({ mode: 'test', command: 'serve', isSsrBuild: false, isPreview: false }),
  defineConfig({
    test: {
      environment: 'jsdom',
      pool: 'threads',
      maxWorkers: 1,
      root: fileURLToPath(new URL('./', import.meta.url)),
      include: ['src/**/__tests__/**/*.{test,spec}.{ts,tsx}'],
      server: {
        deps: {
          inline: ['element-plus'],
        },
      },
    },
  }),
)
