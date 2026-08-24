/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChangelogRelease } from './types';

export const CHANGELOG_DATA: ChangelogRelease[] = [
  {
    id: 'rel_2_4_0',
    version: 'v2.4.0',
    date: '2026-07-13',
    title: 'The Editorial Awakening',
    description: 'Introducing a high-fidelity visual overhaul inspired by classic editorial journalism. This update strips away visual noise and embraces pristine typography, clean margins, and an archive-first design philosophy.',
    isReleased: true,
    author: {
      name: 'Clara Sterling',
      role: 'Principal Designer',
      avatarInitials: 'CS'
    },
    items: [
      {
        id: 'item_2_4_0_1',
        title: 'Editorial Aesthetic Design Overhaul',
        description: 'Reconstructed the entire user experience around a warm-paper (#F4F1EA) and rich ink-black (#1A1A1A) contrast. Standardized headers, typography hierarchies, and letter-spacings across all modules.',
        type: 'feature',
        tags: ['UI/UX', 'Editorial-Theme', 'Aesthetic'],
        details: 'Every card, line, and piece of typography has been tuned for balanced negative space. Headings are set in an elegant italicized display serif while numbers and labels use high-contrast monospace structures to reference technical precision.'
      },
      {
        id: 'item_2_4_0_2',
        title: 'Cleaned up broken image dependencies',
        description: 'Removed references to stale header image files, specifically resolving the missing "whats_new_header_1783403615551.jpg" reference that disrupted builds.',
        type: 'fix',
        tags: ['Build', 'Assets', 'Hotfix'],
        details: 'The system now relies entirely on clean, scalable vector indicators and CSS typography layouts. This eliminates unnecessary image fetch cycles and prevents manifest compilation failures.'
      },
      {
        id: 'item_2_4_0_3',
        title: 'Interactive Timeline Navigation',
        description: 'Added a responsive archive sidebar allowing rapid jumping between historical releases and deep-filtering by category.',
        type: 'improvement',
        tags: ['Navigation', 'Timeline', 'Interactive'],
        details: 'Users can quickly filter the list of updates by "Features", "Improvements", "Fixes", or "Security Warnings" to drill down into the historical record.'
      },
      {
        id: 'item_2_4_0_4',
        title: 'Content Search & Indexing Engine',
        description: 'Implemented an inline local indexing engine for text queries across all title and description fields.',
        type: 'feature',
        tags: ['Search', 'Client-Side'],
        details: 'Provides near-instant results when searching for specific modules, keywords, or developer annotations in past releases.'
      }
    ]
  },
  {
    id: 'rel_2_3_5',
    version: 'v2.3.5',
    date: '2026-06-28',
    title: 'Minor Tuning & Type Safety',
    description: 'A focused maintenance update addressing minor runtime warnings, optimizing layout padding density, and reinforcing strict TypeScript structures.',
    isReleased: true,
    author: {
      name: 'Marcus Chen',
      role: 'Core Systems Engineer',
      avatarInitials: 'MC'
    },
    items: [
      {
        id: 'item_2_3_5_1',
        title: 'Strict TS Lint Alignment',
        description: 'Aligned type imports and enum handling with strict build directives to ensure complete compile-time validation.',
        type: 'improvement',
        tags: ['Types', 'TSX', 'Linter'],
        details: 'Updated modules to use named imports and avoided any empty block declarations. This prevents transpilation hiccups in stricter container environments.'
      },
      {
        id: 'item_2_3_5_2',
        title: 'Custom Local Scrollbar Elements',
        description: 'Styled client-side scrolling areas to inherit the editorial ink palette, matching the browser scrollbars to the page aesthetic.',
        type: 'improvement',
        tags: ['CSS', 'Style-Tuning'],
        details: 'Replaced native browser scrollbars with custom 6px high-contrast ink bars for WebKit-based renderers.'
      }
    ]
  },
  {
    id: 'rel_2_3_0',
    version: 'v2.3.0',
    date: '2026-05-15',
    title: 'Collaborative Workspace Expansion',
    description: 'Major platform upgrade introducing cross-module telemetry, custom release tags, and author profiles for distributed technical teams.',
    isReleased: true,
    author: {
      name: 'Elena Rostova',
      role: 'Product Lead',
      avatarInitials: 'ER'
    },
    items: [
      {
        id: 'item_2_3_0_1',
        title: 'Author Profiles & Visual Badges',
        description: 'Introduced explicit author ownership metadata to track who shipped specific patches and feature branches.',
        type: 'feature',
        tags: ['Teamwork', 'Audit', 'Profiles'],
        details: 'Every release now sports a clear visual badge for the principal engineer or designer responsible, including their role and initials.'
      },
      {
        id: 'item_2_3_0_2',
        title: 'Secured Environment Credentials',
        description: 'Ensured all third-party and internal API keys are strictly loaded server-side or lazily initialized to prevent client-side leaks.',
        type: 'security',
        tags: ['Credentials', 'Secret-Manager', 'Server-Proxy'],
        details: 'Hardened the asset transport layer and created a defensive initialization check for external APIs to avoid blank screens on start.'
      },
      {
        id: 'item_2_3_0_3',
        title: 'Refactored CSS Theme Engine',
        description: 'Ported legacy CSS declarations to use Tailwind CSS utility structures directly.',
        type: 'improvement',
        tags: ['Code-Quality', 'Tailwind', 'Refactor'],
        details: 'Replaced multiple inline styling parameters and legacy CSS-in-JS configurations with high-performance tailwind classes, shrinking package size.'
      }
    ]
  },
  {
    id: 'rel_2_2_0',
    version: 'v2.2.0',
    date: '2026-04-01',
    title: 'The Spring Maintenance Harvest',
    description: 'A performance-focused sprint clearing out legacy features, boosting render efficiency, and optimizing client-side database synchronization.',
    isReleased: true,
    author: {
      name: 'Marcus Chen',
      role: 'Core Systems Engineer',
      avatarInitials: 'MC'
    },
    items: [
      {
        id: 'item_2_2_0_1',
        title: 'Render Performance Tuning',
        description: 'Optimized rendering lists of past releases with active view bounds to decrease browser layout calculations by 40%.',
        type: 'improvement',
        tags: ['Render-Speed', 'Virtualization'],
        details: 'The system now dynamically tracks visible cards, reducing background processing for elements outside the primary focus area.'
      },
      {
        id: 'item_2_2_0_2',
        title: 'Strict LocalStorage Schema Validation',
        description: 'Rebuilt local storage filters to automatically validate versions, preventing crashes from outdated cache keys.',
        type: 'security',
        tags: ['LocalCache', 'Validation'],
        details: 'Any schema mismatches found in local user preferences are gracefully recovered and reset to stable defaults automatically.'
      },
      {
        id: 'item_2_2_0_3',
        title: 'Resolved layout flickering in preview panels',
        description: 'Fixed a common bug where expanding a long changelog description caused the side panel to momentarily jump or snap.',
        type: 'fix',
        tags: ['Flicker', 'Animation', 'CSS-Tuning'],
        details: 'Aligned transition bounds and heights to create perfectly smooth easing when toggling rich textual details.'
      }
    ]
  },
  {
    id: 'rel_2_1_0',
    version: 'v2.1.0',
    date: '2026-02-20',
    title: 'System Foundations',
    description: 'Establishing the initial baseline architecture, local state management, and semantic tagging protocols.',
    isReleased: true,
    author: {
      name: 'Elena Rostova',
      role: 'Product Lead',
      avatarInitials: 'ER'
    },
    items: [
      {
        id: 'item_2_1_0_1',
        title: 'Standardized Changelog Schema',
        description: 'Defined the initial TypeScript specifications for ChangelogItem, ChangelogRelease, and tag arrays.',
        type: 'feature',
        tags: ['Types', 'First-Release'],
        details: 'Created the bedrock structure upon which future timelines and details panels are rendered.'
      },
      {
        id: 'item_2_1_0_2',
        title: 'Initial Markdown Parsing Engine',
        description: 'Built a lightweight client-side renderer for handling bold, italic, and inline code segments in release logs.',
        type: 'feature',
        tags: ['Markdown', 'Rich-Text'],
        details: 'Enables developers to write descriptive details with basic markdown markers without importing heavy third-party parsers.'
      }
    ]
  }
];
