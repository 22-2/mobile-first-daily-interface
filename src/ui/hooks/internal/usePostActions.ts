import { usePostMutations } from "src/ui/hooks/internal/usePostMutations";
import { useSubmitAction } from "src/ui/hooks/internal/useSubmitAction";

/**
 * テスト・コンポーネントの後方互換を保つバレル。
 * 実装は useSubmitAction / usePostMutations に分割されている。
 */
export const usePostActions = () => {
  const { handleSubmit } = useSubmitAction();
  const mutations = usePostMutations();
  return { handleSubmit, ...mutations };
};
