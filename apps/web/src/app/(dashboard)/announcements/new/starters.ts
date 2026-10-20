/**
 * Starting drafts other screens open Create Announcement with, by key
 * (`/announcements/new?draft=<key>`). Only known keys are used: the text is
 * ours, never taken from the link. Nothing is sent until the admin posts.
 */
export const NOTICE_STARTERS: Readonly<Record<string, { title: string; body: string }>> = {
  // Gate & Visitors › Usage Summary › Inform Residents (GATE-44).
  'gate-preapprove': {
    title: 'Pre-approve your visitors',
    body:
      '<p>Expecting a guest, a delivery or a cab? Pre-approve them in the app before they arrive. ' +
      'The guard checks them in straight away with the code you share, and you are told when they come in.</p>',
  },
};

export function noticeStarter(key: string | null): { title: string; body: string } | undefined {
  return key && Object.prototype.hasOwnProperty.call(NOTICE_STARTERS, key) ? NOTICE_STARTERS[key] : undefined;
}
