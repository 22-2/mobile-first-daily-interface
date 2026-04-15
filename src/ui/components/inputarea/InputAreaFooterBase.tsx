import { type FC, type ReactNode, memo } from "react";
import { Box, Button, HStack } from "src/ui/components/primitives";

interface InputAreaFooterBaseProps {
  canSubmit: boolean;
  submitLabel: string;
  onSubmit: () => void;
  /** 指定された場合のみキャンセルボタンを表示する */
  onCancel?: () => void;
  cancelLabel?: string;
  /** 0 以下の場合は非表示 */
  characterCount: number;
  onSubmitContextMenu?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  /** style タグの注入など、フッター内に追加する要素 */
  children?: ReactNode;
}

export const InputAreaFooterBase: FC<InputAreaFooterBaseProps> = memo(
  ({
    canSubmit,
    submitLabel,
    onSubmit,
    onCancel,
    cancelLabel = "キャンセル",
    characterCount,
    onSubmitContextMenu,
    className = "",
    children,
  }) => {
    return (
      <HStack
        className={`justify-end items-center py-[0.5em] pb-[1em] mr-[1.2em] gap-[0.5em] ${className}`}
      >
        {children}

        {characterCount > 0 && (
          <Box className="text-xs text-[var(--text-muted)]">
            {characterCount} chars
          </Box>
        )}

        {onCancel && (
          <Button className="h-[2.4em]" variant="ghost" onClick={onCancel}>
            {cancelLabel}
          </Button>
        )}

        <Button
          disabled={!canSubmit}
          className="h-[2.4em]"
          variant="accent"
          onClick={onSubmit}
          onContextMenu={onSubmitContextMenu}
        >
          {submitLabel}
        </Button>
      </HStack>
    );
  },
);
