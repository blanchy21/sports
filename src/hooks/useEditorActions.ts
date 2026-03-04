import { useCallback } from 'react';
import type { FormatType } from '@/components/publish/EditorToolbar';

interface UseEditorActionsParams {
  content: string;
  setContent: (content: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  cursorPositionRef: React.MutableRefObject<number>;
  setShowImageDialog: (show: boolean) => void;
  setShowLinkDialog: (show: boolean) => void;
  setPublishError: (error: string | null) => void;
}

export function useEditorActions({
  content,
  setContent,
  textareaRef,
  cursorPositionRef,
  setShowImageDialog,
  setShowLinkDialog,
  setPublishError,
}: UseEditorActionsParams) {
  const insertMarkdown = useCallback(
    (before: string, after: string = '', placeholder: string = '') => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = content.substring(start, end);
      const textToInsert = selectedText || placeholder;

      const newText =
        content.substring(0, start) + before + textToInsert + after + content.substring(end);
      setContent(newText);

      setTimeout(() => {
        const newCursorPos = start + before.length + textToInsert.length;
        textarea.focus();
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    },
    [content, setContent, textareaRef]
  );

  const insertAtCursor = useCallback(
    (text: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const newText = content.substring(0, start) + text + content.substring(start);
      setContent(newText);

      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + text.length, start + text.length);
      }, 0);
    },
    [content, setContent, textareaRef]
  );

  const handleFormat = useCallback(
    (type: FormatType) => {
      switch (type) {
        case 'bold':
          insertMarkdown('**', '**', 'bold text');
          break;
        case 'italic':
          insertMarkdown('*', '*', 'italic text');
          break;
        case 'underline':
          insertMarkdown('<u>', '</u>', 'underlined text');
          break;
        case 'strikethrough':
          insertMarkdown('~~', '~~', 'strikethrough text');
          break;
        case 'code':
          insertMarkdown('`', '`', 'code');
          break;
        case 'quote':
          insertAtCursor('\n> ');
          break;
        case 'h1':
          insertAtCursor('\n# ');
          break;
        case 'h2':
          insertAtCursor('\n## ');
          break;
        case 'h3':
          insertAtCursor('\n### ');
          break;
        case 'bulletList':
          insertAtCursor('\n- ');
          break;
        case 'numberedList':
          insertAtCursor('\n1. ');
          break;
      }
    },
    [insertMarkdown, insertAtCursor]
  );

  const handleInsertImage = useCallback(() => {
    cursorPositionRef.current = textareaRef.current?.selectionStart ?? content.length;
    setShowImageDialog(true);
  }, [content.length, cursorPositionRef, textareaRef, setShowImageDialog]);

  const handleImageDialogInsert = useCallback(
    (markdown: string) => {
      const pos = cursorPositionRef.current;
      const newContent = content.substring(0, pos) + markdown + content.substring(pos);
      setContent(newContent);

      setTimeout(() => {
        const textarea = textareaRef.current;
        if (textarea) {
          textarea.focus();
          const newPos = pos + markdown.length;
          textarea.setSelectionRange(newPos, newPos);
        }
      }, 0);

      setShowImageDialog(false);
    },
    [content, setContent, cursorPositionRef, textareaRef, setShowImageDialog]
  );

  const handleInsertLink = useCallback(() => {
    setShowLinkDialog(true);
  }, [setShowLinkDialog]);

  const handleLinkDialogInsert = useCallback(
    (url: string, text: string) => {
      const displayText = text || url;
      insertMarkdown('[', `](${url})`, displayText);
      setShowLinkDialog(false);
      setPublishError(null);
    },
    [insertMarkdown, setShowLinkDialog, setPublishError]
  );

  const handleEmoji = useCallback(
    (emoji: string) => {
      insertAtCursor(emoji);
    },
    [insertAtCursor]
  );

  const handleInsertGif = useCallback(
    (gifUrl: string) => {
      const markdown = `\n![gif](${gifUrl})\n`;
      insertAtCursor(markdown);
    },
    [insertAtCursor]
  );

  const handleUndo = useCallback(() => {
    document.execCommand('undo');
  }, []);

  const handleRedo = useCallback(() => {
    document.execCommand('redo');
  }, []);

  return {
    handleFormat,
    handleInsertImage,
    handleImageDialogInsert,
    handleInsertLink,
    handleLinkDialogInsert,
    handleEmoji,
    handleInsertGif,
    handleUndo,
    handleRedo,
  };
}
