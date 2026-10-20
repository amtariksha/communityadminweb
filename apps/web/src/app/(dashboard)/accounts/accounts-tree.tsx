'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { BookOpen, ChevronDown, ChevronRight, Pencil, PowerOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatTallyBalance } from '@/lib/utils';
import type { AccountGroup, LedgerAccount } from '@communityos/shared';

// ---------------------------------------------------------------------------
// Tree building utilities
// ---------------------------------------------------------------------------

export interface TreeNode {
  group: AccountGroup;
  children: TreeNode[];
  accounts: LedgerAccount[];
}

export function buildTree(groups: AccountGroup[], accounts: LedgerAccount[]): TreeNode[] {
  const groupMap = new Map<string, TreeNode>();
  for (const group of groups) {
    groupMap.set(group.id, { group, children: [], accounts: [] });
  }

  for (const account of accounts) {
    const node = groupMap.get(account.group_id);
    if (node) {
      node.accounts.push(account);
    }
  }

  const roots: TreeNode[] = [];
  for (const node of groupMap.values()) {
    if (node.group.parent_id) {
      const parent = groupMap.get(node.group.parent_id);
      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    } else {
      roots.push(node);
    }
  }

  function sortChildren(nodes: TreeNode[]): void {
    nodes.sort((a, b) => a.group.sort_order - b.group.sort_order);
    for (const node of nodes) {
      sortChildren(node.children);
    }
  }

  sortChildren(roots);
  return roots;
}

// ---------------------------------------------------------------------------
// Tree node component
// ---------------------------------------------------------------------------

interface TreeNodeViewProps {
  node: TreeNode;
  depth: number;
  // Absent: the tree is read-only (no edit pencils).
  onEditGroup?: (group: AccountGroup) => void;
  onEditAccount?: (account: LedgerAccount) => void;
  // GL-14: absent, no De-Activate button.
  onDeactivateAccount?: (account: LedgerAccount) => void;
}

const typeColors: Record<string, string> = {
  asset: 'text-primary',
  liability: 'text-destructive',
  income: 'text-success',
  expense: 'text-warning',
};

export function TreeNodeView({ node, depth, onEditGroup, onEditAccount, onDeactivateAccount }: TreeNodeViewProps): ReactNode {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children.length > 0 || node.accounts.length > 0;

  return (
    <div>
      <div
        className="group flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent"
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
        onClick={() => setExpanded(!expanded)}
      >
        {hasChildren ? (
          expanded ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          )
        ) : (
          <span className="w-4" />
        )}
        <BookOpen className={`h-4 w-4 shrink-0 ${typeColors[node.group.type] ?? 'text-muted-foreground'}`} />
        <span className="text-sm font-medium">{node.group.name}</span>
        <span className="text-xs text-muted-foreground">({node.group.code})</span>
        {onEditGroup && (
          <button
            type="button"
            className="ml-1 hidden rounded p-0.5 hover:bg-muted group-hover:inline-flex"
            onClick={(e) => {
              e.stopPropagation();
              onEditGroup(node.group);
            }}
            title="Edit group"
          >
            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        )}
      </div>

      {expanded && (
        <>
          {node.children.map((child) => (
            <TreeNodeView
              key={child.group.id}
              node={child}
              depth={depth + 1}
              onEditGroup={onEditGroup}
              onEditAccount={onEditAccount}
              onDeactivateAccount={onDeactivateAccount}
            />
          ))}
          {node.accounts.map((account) => (
            <div
              key={account.id}
              className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent"
              style={{ paddingLeft: `${(depth + 1) * 20 + 8}px` }}
            >
              <span className="w-4" />
              <Link
                href={`/accounts/${account.id}`}
                className="flex flex-1 items-center gap-2"
              >
                {/* Operator asked to drop the (code) suffix — codes
                    are visible in the edit dialog + export columns.
                    The COA tree only needs the name. */}
                <span className="text-sm">{account.name}</span>
                {/* Tally-style balance — never a minus sign. The Dr/Cr
                    suffix flips when the balance moved to the
                    anomalous side (asset gone credit, liability gone
                    debit). See formatTallyBalance. */}
                {(() => {
                  const naturalSide =
                    account.balance_type === 'credit' ? 'credit' : 'debit';
                  const balance = formatTallyBalance(
                    account.current_balance ?? account.opening_balance,
                    naturalSide,
                  );
                  return (
                    <>
                      <span className="ml-auto text-sm font-medium">
                        {balance.text}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {balance.side}
                      </Badge>
                    </>
                  );
                })()}
              </Link>
              {onEditAccount && (
                <button
                  type="button"
                  className="hidden rounded p-0.5 hover:bg-muted group-hover:inline-flex"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditAccount(account);
                  }}
                  title="Edit account"
                >
                  <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              )}
              {onDeactivateAccount && !account.is_system && (
                <button
                  type="button"
                  className="hidden rounded p-0.5 hover:bg-muted group-hover:inline-flex"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeactivateAccount(account);
                  }}
                  title="De-Activate account"
                  aria-label={`De-Activate ${account.name}`}
                >
                  <PowerOff className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tree skeleton
// ---------------------------------------------------------------------------

export function TreeSkeleton(): ReactNode {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-1">
          <Skeleton className="h-8 w-full" />
          <div className="ml-5 space-y-1">
            <Skeleton className="h-7 w-[90%]" />
            <Skeleton className="h-7 w-[85%]" />
          </div>
        </div>
      ))}
    </div>
  );
}
