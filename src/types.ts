/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ChangelogType = 'feature' | 'improvement' | 'fix' | 'security' | 'announcement';

export interface ChangelogItem {
  id: string;
  title: string;
  description: string;
  type: ChangelogType;
  tags?: string[];
  details?: string; // Markdown or detailed explanation
}

export interface ChangelogRelease {
  id: string;
  version: string;
  date: string;
  title?: string;
  description?: string;
  items: ChangelogItem[];
  isReleased: boolean;
  author?: {
    name: string;
    role: string;
    avatarInitials: string;
  };
}
