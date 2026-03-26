import { MFDIDatabase } from "src/db/mfdi-db";
import { useAppStore } from "src/ui/store/appStore";

/**
 * シングルソース化されたデータベースインスタンスを取得するフック。
 * アプリ全体で一つのインスタンスを使い回すことで、コネクション過多とパース重複を避けます。
 */
export function useMFDIDB(): MFDIDatabase | null {
    return useAppStore((state) => state.db);
}
