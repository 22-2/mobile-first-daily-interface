# Implementation Plan - Removing Dexie and Fixing Type Errors

The goal is to completely remove the Dexie dependency and fix all 58 TypeScript errors by migrating the database logic to raw IndexedDB using the existing `MFDIDatabase` class as a base.

## Proposed Changes

### 1. `src/db/mfdi-db.ts` — Enhance MFDIDatabase
- Add a `transaction` method to `MFDIDatabase` to support atomic operations across multiple stores.
- Add helper methods/properties for common store operations:
    - `memos`: `clear()`, `bulkPut()`, `deleteByPath()`, `findByPath()`, `count()`, `getAll()`
    - `meta`: `put()`, `get()`, `clear()`
    - `tagStats`: `clear()`, `bulkPut()`, `bulkGet()`, `bulkDelete()`, `toArray()`
- Ensure types are strictly defined to avoid `any`.
- Add `close()` method to `MFDIDatabase`.

### 2. `src/db/impl/DexieMemoRepository.ts` — Refactor to raw IDB
- Update implementation to use the new `MFDIDatabase` methods.
- Remove Dexie specific syntax like `this.db.memos.where(...).equals(...)`.

### 3. `src/db/impl/DexieTagStatsRepository.ts` — Refactor to raw IDB
- Update implementation to use the new `MFDIDatabase` methods.

### 4. `src/db/impl/DexieDBService.ts` — Service Update
- Update `initialize` and `dispose` methods.
- Update transaction calls to match the new `MFDIDatabase.transaction` signature.

### 5. `src/db/indexer/tag-stats-manager.ts` — Indexer Update
- Update to use the new `MFDIDatabase` methods.

### 6. Tests — Fix test breakages
- Update `src/db/mfdi-db.test.ts` and `src/db/mfdi-search.test.ts`.
- Update test setup and assertions to work with raw IndexedDB.

### 7. Post-Migration Cleanup
- Remove `dexie` and `dexie-react-hooks` from `package.json` once everything is stable.

## Verification
- Run `pnpm tsc --noEmit` to ensure zero type errors.
- Run `pnpm test` to ensure database functionality is preserved.
