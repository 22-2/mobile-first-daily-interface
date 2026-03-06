import { Box, BoxProps } from "@chakra-ui/react";
import { App, EventRef, WorkspaceLeaf } from "obsidian";
import { MagicalEditor } from "obsidian-magical-editor";
import * as React from "react";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

interface ObsidianLiveEditorProps extends Omit<BoxProps, "onChange"> {
  leaf: WorkspaceLeaf;
  app: App;
  value: string;
  onChange: (text: string) => void;
}

export interface ObsidianLiveEditorRef {
  focus: () => void;
  getValue: () => string;
}

export const ObsidianLiveEditor = forwardRef<ObsidianLiveEditorRef, ObsidianLiveEditorProps>(
  ({ leaf, app, value, onChange, ...props }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const magicalEditorRef = useRef<MagicalEditor | null>(null);
    // エディタ自身が発生させた最新値を記録するref。
    // これと value が一致する場合は「自分の入力による更新」なので setContent をスキップする。
    const internalValueRef = useRef<string>(value);
    // 直近で親コンポーネントに送った値を記録するref。親からのこだま（エコー）による上書きを防ぐ。
    const lastSentValueRef = useRef<string>(value);
    const timeoutRef = useRef<number | null>(null);

    useImperativeHandle(ref, () => ({
      focus: () => {
        magicalEditorRef.current?.focus();
      },
      getValue: () => {
        return magicalEditorRef.current?.getContent() ?? internalValueRef.current;
      }
    }));

    const delayedFocus = (activeLeaf?: WorkspaceLeaf | null) => {
      const targetLeaf = activeLeaf;
      if (targetLeaf !== leaf) {
        return;
      }
      if (containerRef.current?.ownerDocument.querySelector(".mfdi-modal-editor")) {
        return;
      }
      
      // すでにエディタ本体にフォーカスがある場合は、奪い合わないようにスキップする
      // これをしないと、裏でファイルの変更検知などで再レンダリングが走った際に、
      // IMEの変換中や選択中のフォーカスがリセットされる原因になる
      const activeCM = (magicalEditorRef.current?.view as any)?.activeCM;
      if (activeCM?.dom?.contains(document.activeElement)) {
        return;
      }

      setTimeout(() => {
        magicalEditorRef.current?.focus();
      });
    };

    useEffect(() => {
      let active = true;
      let eventRef: EventRef;
      const init = async () => {
        if (containerRef.current) {
          containerRef.current.empty();
          const editor = await MagicalEditor.create(app, leaf, {
            onChange: (text) => {
              if (!active) return;
              // エディタが自分で生成した値を記録しておく
              internalValueRef.current = text;

              if (timeoutRef.current !== null) {
                window.clearTimeout(timeoutRef.current);
              }
              
              // Reactへの状態反映を少し遅らせることで、
              // IME変換中などの短期間での連続した重いレンダリングを回避し、メインスレッドのフリーズを防ぐ
              timeoutRef.current = window.setTimeout(() => {
                lastSentValueRef.current = text;
                onChange(text);
                timeoutRef.current = null;
              }, 50);
            },
            initialContent: value,
            placeholder: "なんでもかいていいのよ😊",
          });
          if (active && containerRef.current) {
            magicalEditorRef.current = editor;
            containerRef.current.appendChild(editor.view.containerEl);
            // delayedFocus();
            // eventRef = app.workspace.on("active-leaf-change", delayedFocus);
          } else {
            editor.destroy();
          }
        }
      };

      init();

      return () => {
        active = false;
        if (timeoutRef.current !== null) {
          window.clearTimeout(timeoutRef.current);
        }
        // app.workspace.offref(eventRef);
        magicalEditorRef.current?.destroy();
        magicalEditorRef.current = null;
      };
    }, []);

    // Handle external value changes (e.g. clearing after submit or starting edit)
    // 「エディタ自身が発生させた変更の伝播」は無視し、送信後クリアや編集開始などの
    // 外部からの書き換えのみを反映する。これでIME変換中に setContent が走らなくなる。
    useEffect(() => {
      if (value === internalValueRef.current) return;

      // 親から降ってきた value が、自分が直近に onChange で送った値と同じであれば、
      // それは単なるこだま（エコー）であり、現在ユーザーがさらに先を入力中の可能性が高いので無視する
      if (value !== "" && value === lastSentValueRef.current) return;
      
      // 外部から明示的に値が書き換えられた（送信後のクリアなど）場合は、
      // 保留中のローカルの onChange の反映をキャンセルする
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      internalValueRef.current = value;
      lastSentValueRef.current = value;
      magicalEditorRef.current?.setContent(value);
    }, [value]);

    return (
      <Box
        ref={containerRef}
        {...props}
      />
    );
  }
);
