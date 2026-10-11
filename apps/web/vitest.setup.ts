import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(cleanup);

// The app's Dialog drives a native <dialog> through showModal() / close(),
// which jsdom does not implement. Toggling `open` is all the tests need.
const dialogProto = HTMLDialogElement.prototype;
if (typeof dialogProto.showModal !== 'function') {
  dialogProto.showModal = function showModal(this: HTMLDialogElement): void {
    this.setAttribute('open', '');
  };
}
if (typeof dialogProto.close !== 'function') {
  dialogProto.close = function close(this: HTMLDialogElement): void {
    this.removeAttribute('open');
  };
}
