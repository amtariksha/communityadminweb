'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { Bold, Image as ImageIcon, Italic, Link as LinkIcon, List, ListOrdered, Subscript, Superscript } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isSafeLink, normaliseEditorHtml } from './editor-html';
import { safeWelcomeHtml } from './safe-html';
import { pickedPictureHtml, showStoredPictures, storedPicturesHtml } from './stored-pictures';

/** A picture uploaded for the text: its stored address, and the picked file to show until the text is saved. */
export interface PickedPicture {
  url: string;
  file?: File;
}

interface RichTextEditorProps {
  id: string;
  label: string;
  /** The starting text; later changes to it are not pushed into the editor. */
  initialHtml: string;
  onChange: (html: string) => void;
  /** Uploads a picture and gives it, or null when cancelled. */
  onPickImage?: () => Promise<PickedPicture | null>;
  readOnly?: boolean;
}

type Command = { label: string; icon: ReactNode; command: string };

const COMMANDS: readonly Command[] = [
  { label: 'Bold', icon: <Bold className="h-4 w-4" />, command: 'bold' },
  { label: 'Italic', icon: <Italic className="h-4 w-4" />, command: 'italic' },
  { label: 'Numbered list', icon: <ListOrdered className="h-4 w-4" />, command: 'insertOrderedList' },
  { label: 'Bullet list', icon: <List className="h-4 w-4" />, command: 'insertUnorderedList' },
  { label: 'Subscript', icon: <Subscript className="h-4 w-4" />, command: 'subscript' },
  { label: 'Superscript', icon: <Superscript className="h-4 w-4" />, command: 'superscript' },
];

function run(command: string, value?: string): void {
  // execCommand is deprecated but still the one editing API every browser has.
  document.execCommand(command, false, value);
}

/**
 * A small rich-text editor (PROF-S1's toolbar: lists, sub / superscript, a
 * link, a picture; plus bold and italic). The text is reported as HTML in
 * the API's words; the API keeps only its allow-list.
 */
export function RichTextEditor(props: RichTextEditorProps): ReactNode {
  const box = useRef<HTMLDivElement>(null);
  const previews = useRef<string[]>([]);
  const report = (): void => props.onChange(safeWelcomeHtml(normaliseEditorHtml(box.current ? storedPicturesHtml(box.current) : '')));

  useEffect(() => {
    // Only the first text: the editor owns its content afterwards. Cut down
    // to the allow-list first, whatever the API sent (never raw innerHTML).
    if (box.current) {
      box.current.innerHTML = safeWelcomeHtml(props.initialHtml);
      showStoredPictures(box.current);
    }
    const made = previews.current;
    return () => made.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  function apply(command: string, value?: string): void {
    box.current?.focus();
    run(command, value);
    report();
  }

  function addLink(): void {
    const url = window.prompt('Link address (https://…)') ?? '';
    if (isSafeLink(url)) apply('createLink', url.trim());
  }

  async function addImage(): Promise<void> {
    const picked = await props.onPickImage?.();
    if (!picked) return;
    // The API signs only pictures of saved text, so a new one shows from the picked file.
    const local = picked.file && typeof URL.createObjectURL === 'function' ? URL.createObjectURL(picked.file) : null;
    if (local) previews.current.push(local);
    apply('insertHTML', pickedPictureHtml(picked.url, local ?? picked.url));
  }

  return (
    <div className="rounded-md border">
      {!props.readOnly && (
        <div role="toolbar" aria-label={`${props.label} formatting`} className="flex flex-wrap gap-1 border-b p-1">
          {COMMANDS.map((item) => (
            <Button key={item.command} type="button" size="icon" variant="ghost" title={item.label} aria-label={item.label} onMouseDown={(e) => e.preventDefault()} onClick={() => apply(item.command)}>
              {item.icon}
            </Button>
          ))}
          <Button type="button" size="icon" variant="ghost" title="Link" aria-label="Link" onMouseDown={(e) => e.preventDefault()} onClick={addLink}>
            <LinkIcon className="h-4 w-4" />
          </Button>
          {props.onPickImage && (
            <Button type="button" size="icon" variant="ghost" title="Picture" aria-label="Picture" onMouseDown={(e) => e.preventDefault()} onClick={() => void addImage()}>
              <ImageIcon className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
      <div
        id={props.id}
        ref={box}
        role="textbox"
        aria-multiline="true"
        aria-label={props.label}
        contentEditable={!props.readOnly}
        suppressContentEditableWarning
        onInput={report}
        className="prose prose-sm min-h-40 max-w-none p-3 focus:outline-none [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6"
      />
    </div>
  );
}
