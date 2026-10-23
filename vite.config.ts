import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  // Load the server-only key explicitly; the missing VITE_ prefix keeps it out of client bundles.
  const env = loadEnv(mode, process.cwd(), 'CURRENCYBEACON_')

  return {
    plugins: [react()],
    server: {
      proxy: {
        // Forward same-origin browser requests to the provider to avoid its missing CORS headers.
        // Production hosting must supply an equivalent backend route.
        '/api/currency': {
          target: 'https://api.currencybeacon.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/currency/, '/v1'),
          configure: (proxy) => {
            // Add credentials to the outbound server request rather than the browser URL.
            proxy.on('proxyReq', (proxyRequest) => {
              proxyRequest.setHeader('Authorization', `Bearer ${env.CURRENCYBEACON_API_KEY ?? ''}`)
            })
          },
        },
      },
    },
  }
})
