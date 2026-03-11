# Agri System Vue

## Source Structure

```
src/
  api/
    http.ts
    index.ts
    modules/
  assets/
  components/
  composables/
  constants/
  layouts/
  router/
  stores/
  types/
    api.ts
    entity.ts
  utils/
  views/
```

## Directory Responsibilities

- `src/api/http.ts`: single axios client entry, request/response interceptors, auth token handling.
- `src/api/modules/*`: domain API wrappers only (auth/system/task/crop/material/iot/report).
- `src/types/api.ts`: generic transport types (`R<T>`, `MpPage<T>`).
- `src/types/entity.ts`: business entity and DTO types (`User`, `Role`, `Task`, etc).
- `src/components`: reusable UI components.
- `src/composables`: reusable composition logic hooks.
- `src/constants`: static constants and role/task maps.
- `src/utils`: pure helpers and permission helpers.
- `src/views`: page-level views.
- `src/layouts`: app layout shells.
- `src/router`: route table and route guards.
- `src/stores`: Pinia stores.

## Run

- Install: `npm install`
- Dev: `npm run dev`
- Type check: `npm run type-check`
- Build: `npm run build-only`
