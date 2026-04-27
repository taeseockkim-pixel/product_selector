# Vite 설정 참조

이 프로젝트의 `vite.config.ts` 관련 빠른 참조.

---

## 현재 설정

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
```

---

## 자주 쓰는 Vite 설정

### 빌드 최적화
```typescript
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        vendor: ['react', 'react-dom'],
        data: ['./src/data/products.json'],  // 데이터 별도 청크
      }
    }
  }
}
```

### 경로 별칭 (@ 사용)
```typescript
import path from 'path'
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
  }
}
```

### 환경 변수 접두사 (현재 미사용)
- Vite 환경 변수는 반드시 `VITE_` 접두사 필요
- `import.meta.env.VITE_API_URL` 으로 접근
