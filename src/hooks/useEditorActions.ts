import { useCallback, useState } from 'react';
import type { FormatType } from '@/components/publish/EditorToolbar';
import { useImagePaste } from '@/hooks/useImagePaste';

interface UseEditorActionsParams {
  content: string;
  setContent: (content: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  cursorPositionRef: React.MutableRefObject<number>;
  setShowImageDialog: (show: boolean) => void;
  setShowLinkDialog: (show: boolean) => void;
  setPublishError: (error: string | null) => void;
  username?: string;
}

export function useEditorActions({
  content,
  setContent,
  textareaRef,
  cursorPositionRef,
  setShowImageDialog,
  setShowLinkDialog,
  setPublishError,
  username,
}: UseEditorActionsParams) {
  const [isPasteUploading, setIsPasteUploading] = useState(false);
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
        case 'h4':
          insertAtCursor('\n#### ');
          break;
        case 'h5':
          insertAtCursor('\n##### ');
          break;
        case 'h6':
          insertAtCursor('\n###### ');
          break;
        case 'bulletList':
          insertAtCursor('\n- ');
          break;
        case 'numberedList':
          insertAtCursor('\n1. ');
          break;
        case 'alignLeft':
          insertMarkdown('<div style="text-align: left">', '</div>', 'left-aligned text');
          break;
        case 'alignCenter':
          insertMarkdown('<center>', '</center>', 'centered text');
          break;
        case 'alignRight':
          insertMarkdown('<div style="text-align: right">', '</div>', 'right-aligned text');
          break;
        case 'alignJustify':
          insertMarkdown('<div style="text-align: justify">', '</div>', 'justified text');
          break;
        case 'table':
          insertAtCursor(
            '\n| Header 1 | Header 2 | Header 3 |\n| --- | --- | --- |\n| Cell 1 | Cell 2 | Cell 3 |\n| Cell 4 | Cell 5 | Cell 6 |\n'
          );
          break;
        case 'divider':
          insertAtCursor('\n\n---\n\n');
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

  const handlePasteImageUploaded = useCallback(
    (url: string) => {
      const markdown = `\n![](${url})\n`;
      const textarea = textareaRef.current;
      const pos = textarea ? textarea.selectionStart : content.length;
      const newContent = content.substring(0, pos) + markdown + content.substring(pos);
      setContent(newContent);

      setTimeout(() => {
        if (textarea) {
          textarea.focus();
          const newPos = pos + markdown.length;
          textarea.setSelectionRange(newPos, newPos);
        }
      }, 0);
    },
    [content, setContent, textareaRef]
  );

  const { handlePaste } = useImagePaste({
    username,
    onUploadStart: () => setIsPasteUploading(true),
    onImageUploaded: handlePasteImageUploaded,
    onError: (msg) => setPublishError(msg),
    onUploadEnd: () => setIsPasteUploading(false),
    disabled: isPasteUploading,
  });

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
    handlePaste,
    isPasteUploading,
  };
}
