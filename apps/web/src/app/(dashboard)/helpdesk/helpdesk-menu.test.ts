import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { classicMenu, type MenuNode } from '@/components/layout/menu/classic-menu';
import { standardMenu } from '@/components/layout/menu/standard-menu';
import { visibleMenu } from '@/components/layout/menu/menu-access';

// The HelpDesk Tracker module of the classic menu (HELP-11).

const helpdesk = classicMenu.find((node) => node.id === 'helpdesk') as MenuNode;
const visible = visibleMenu(classicMenu, { roleAllowlist: null }).find((node) => node.id === 'helpdesk') as MenuNode;
const routeExists = (href: string): boolean =>
  existsSync(join(process.cwd(), 'src', 'app', '(dashboard)', href.split('?')[0], 'page.tsx'));

describe('classic menu — HelpDesk Tracker', () => {
  it('holds the committee’s five children in their order', () => {
    expect(helpdesk.children?.slice(0, 5).map((child) => child.label)).toEqual([
      'Setup',
      'Escalation',
      'Open Requests',
      'Closed Requests',
      'Reports',
    ]);
  });

  it('opens Setup on its categories screen, with the setup screens as sub-tabs', () => {
    const setup = visible.children?.find((child) => child.id === 'helpdesk.setup');

    expect(setup?.tabs?.map((tab) => tab.href)).toEqual([
      '/helpdesk/setup/categories',
      '/helpdesk/setup/notifications',
      '/helpdesk/setup/auto-responses',
    ]);
    expect(visible.children?.find((child) => child.id === 'helpdesk.escalation')?.href).toBe('/helpdesk/escalation');
  });

  it('has a Create Request button on every page that opens a real route', () => {
    expect(helpdesk.create?.label).toBe('Create Request');
    expect(routeExists(helpdesk.create?.href ?? '')).toBe(true);
  });

  it('closes to the request list, where the desk works', () => {
    expect(helpdesk.close).toBeDefined();
    expect(routeExists(helpdesk.close ?? '')).toBe(true);
  });

  it('offers Show Logs of the helpdesk setup on the four Setup screens and Escalation', () => {
    const setup = helpdesk.children?.find((child) => child.id === 'helpdesk.setup');
    const tabs = setup?.tabs ?? [];
    const escalation = helpdesk.children?.find((child) => child.id === 'helpdesk.escalation');

    expect(tabs).toHaveLength(4);
    expect(tabs.every((tab) => tab.logs?.includes('helpdesk'))).toBe(true);
    expect(escalation?.logs).toEqual(['helpdesk']);
  });

  it('follows the Tickets feature, and standard keeps Tickets → /tickets', () => {
    const withoutTickets = visibleMenu(classicMenu, { roleAllowlist: null, enabledFeatures: ['invoices'] });
    expect(withoutTickets.find((node) => node.id === 'helpdesk')).toBeUndefined();

    const tickets = standardMenu.flatMap((group) => group.items).find((item) => item.label === 'Tickets');
    expect(tickets?.href).toBe('/tickets');
    expect(tickets?.feature).toBe('tickets');
  });
});
