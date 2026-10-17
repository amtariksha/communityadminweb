/** Saves a file the browser already holds under the given name. */
export function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/**
 * Prints a complete HTML page through a hidden frame, so the screen's
 * menus and buttons never reach the paper and no pop-up is opened.
 */
export function printHtml(html: string): void {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.position = 'fixed';
  frame.style.width = '0';
  frame.style.height = '0';
  frame.style.border = '0';
  document.body.appendChild(frame);
  const target = frame.contentWindow;
  if (!target) {
    frame.remove();
    return;
  }
  target.document.open();
  target.document.write(html);
  target.document.close();
  target.focus();
  target.print();
  // Leave the frame long enough for the print dialog to read it.
  window.setTimeout(() => frame.remove(), 60_000);
}
