import {
  Box,
  Button,
  FormControl,
  FormErrorMessage,
  FormHelperText,
  FormLabel,
  HStack,
  Input,
  Text,
  VStack,
} from "@chakra-ui/react";
import * as React from "react";

interface TopicAddFormProps {
  newTitle: string;
  newId: string;
  idError: string;
  onTitleChange: (v: string) => void;
  onIdChange: (v: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export const TopicAddForm = ({
  newTitle,
  newId,
  idError,
  onTitleChange,
  onIdChange,
  onSubmit,
  onCancel,
}: TopicAddFormProps) => {
  return (
    <Box
      marginTop="var(--size-4-3)"
      padding="var(--size-4-3)"
      borderRadius="var(--radius-m)"
      border="1px solid var(--background-modifier-border)"
      backgroundColor="var(--background-secondary)"
    >
      <VStack align="stretch" spacing="var(--size-4-2)">
        <FormControl>
          <FormLabel
            fontSize="var(--font-ui-smaller)"
            color="var(--text-muted)"
            marginBottom="2px"
          >
            タイトル
          </FormLabel>
          <Input
            size="sm"
            placeholder="例: 小説"
            value={newTitle}
            onChange={(e) => onTitleChange(e.target.value)}
            autoFocus
          />
        </FormControl>

        <FormControl isInvalid={!!idError}>
          <FormLabel
            fontSize="var(--font-ui-smaller)"
            color="var(--text-muted)"
            marginBottom="2px"
          >
            ID{" "}
            <Text as="span" color="var(--text-faint)">
              (作成後変更不可)
            </Text>
          </FormLabel>
          <Input
            size="sm"
            placeholder="例: novel"
            value={newId}
            onChange={(e) => onIdChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSubmit();
              if (e.key === "Escape") onCancel();
            }}
            fontFamily="var(--font-monospace)"
          />
          {idError ? (
            <FormErrorMessage fontSize="var(--font-ui-smaller)">
              {idError}
            </FormErrorMessage>
          ) : (
            <FormHelperText
              fontSize="var(--font-ui-smaller)"
              color="var(--text-faint)"
            >
              英小文字・数字・ハイフンのみ。ファイル名のプレフィックスになります。
            </FormHelperText>
          )}
        </FormControl>

        <HStack justify="flex-end" spacing="var(--size-4-2)">
          <Button size="sm" variant="ghost" onClick={onCancel}>
            キャンセル
          </Button>
          <Button
            size="sm"
            backgroundColor="var(--color-accent)"
            color="var(--text-on-accent)"
            _hover={{ backgroundColor: "var(--color-accent-2)" }}
            onClick={onSubmit}
          >
            追加
          </Button>
        </HStack>
      </VStack>
    </Box>
  );
};
