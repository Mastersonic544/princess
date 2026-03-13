---
name: optimizing-webapp
description: Optimizes a Vite React web app for better preload, load time, and overall user experience. Use when the user asks to optimize the webapp, improve performance, or enhance load times.
---

# Webapp Optimization Skill

## When to use this skill
- User asks to optimize the webapp.
- User wants to enhance preload and load times.
- User mentions improving the overall performance or user experience (UX) of the application.
- User wants to optimize Lighthouse scores.

## Workflow
1. [ ] **Analyze Current State**: Review `index.html`, `vite.config.ts`, and main entry points (`src/main.tsx`, `src/App.tsx`) to identify optimization opportunities.
2. [ ] **Implement Preloading in HTML**: Add `<link rel="preload">` tags in `index.html` for critical assets (e.g., main fonts, hero images) to reduce Highest Contentful Paint (HCP) and Largest Contentful Paint (LCP) times.
3. [ ] **Apply Code Splitting**: Identify distinct routes or heavy, non-critical components in the React application and implement `React.lazy()` with `<Suspense>` boundaries.
4. [ ] **Optimize Vite Build**: Update `vite.config.ts` to implement manual chunks for large vendor libraries (e.g., React, Firebase) to improve caching and reduce the initial main bundle size.
5. [ ] **Verify Firebase Imports**: Ensure that Firebase (and other large SDKs) are imported selectively (e.g., `import { getAuth } from 'firebase/auth'`) rather than importing the entire compat package.
6. [ ] **Validate Build**: Run `npm run build` to verify the new chunk sizes, ensure there are no build errors, and check that the chunk warning limits are respected.

## Instructions

### 1. Preloading Critical Assets
In `index.html`, add preload links for fonts and essential images in the `<head>` section:
```html
<!-- Example for Fonts -->
<link rel="preload" href="/fonts/your-custom-font.woff2" as="font" type="font/woff2" crossorigin="anonymous">

<!-- Example for Critical LCP Image -->
<link rel="preload" href="/hero-banner.webp" as="image">
```

### 2. Code Splitting in React
Use `React.lazy` for routing and large components to reduce initial JavaScript execution time.
```tsx
import React, { Suspense } from 'react';

// Instead of static imports:
// import AdminDashboard from './pages/AdminDashboard';

// Use lazy loading:
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'));

function App() {
  return (
    <Suspense fallback={<div className="loading-spinner">Loading...</div>}>
      <AdminDashboard />
    </Suspense>
  );
}
```

### 3. Vite Chunk Splitting
Update `vite.config.ts` to extract dependencies into separate stable chunks. This leverages browser caching effectively.
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/database'],
          // Add other massive dependencies here
        }
      }
    }
  }
});
```

### 4. General UX Enhancements
- Favor WebP or AVIF image formats over PNG/JPEG.
- Use CSS transitions for state changes to make the interface feel responsive.
- Consider adding a `manifest.json` for PWA capabilities and better mobile UX.

## Resources
- [Vite Build Options - Rollup](https://vitejs.dev/config/build-options.html)
- [React Code-Splitting Docs](https://react.dev/reference/react/lazy)
