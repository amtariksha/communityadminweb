import { isSignableUrl, storedFileLink } from '@/lib/stored-file';

/**
 * Pictures inside the editor: shown through a signed link (or the browser's
 * copy of one just picked), while the HTML the editor reports keeps each
 * picture's stored address. The stored address rides on `data-stored-src`.
 */
const STORED = 'data-stored-src';

/** Points every stored picture in `root` at a signed link; a picture that is not available keeps its address. */
export function showStoredPictures(root: HTMLElement): void {
  root.querySelectorAll('img').forEach((img) => {
    const stored = img.getAttribute(STORED) ?? img.getAttribute('src') ?? '';
    if (!isSignableUrl(stored)) return;
    img.setAttribute(STORED, stored);
    void storedFileLink(stored).then((link) => {
      if (link && img.isConnected && img.getAttribute(STORED) === stored) img.setAttribute('src', link);
    });
  });
}

/** The editor's HTML with every picture back on its stored address. */
export function storedPicturesHtml(root: HTMLElement): string {
  const copy = root.cloneNode(true) as HTMLElement;
  copy.querySelectorAll(`img[${STORED}]`).forEach((img) => {
    img.setAttribute('src', img.getAttribute(STORED) ?? '');
    img.removeAttribute(STORED);
  });
  return copy.innerHTML;
}

/** The markup of a picture just picked: shown from `preview`, saved as `storedUrl`. */
export function pickedPictureHtml(storedUrl: string, preview: string): string {
  const img = document.createElement('img');
  img.setAttribute('src', preview);
  img.setAttribute(STORED, storedUrl);
  return img.outerHTML;
}
