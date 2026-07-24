# Frontend Design System

## Status

Implemented

## Purpose

Keep the administrative, faculty, and student portals visually consistent without changing their domain workflows, permissions, routes, API contracts, or validation rules.

## Foundation

- React 19, Tailwind CSS v4, Geist, Lucide, and shadcn/ui remain the frontend foundation.
- `src/index.css` owns the semantic palette, radius, typography, focus, surface, and application-layout tokens.
- Institutional navy is the primary action/navigation color. Neutral white/slate surfaces carry structure; semantic success, warning, information, and destructive tokens carry meaning.
- Shared controls use a 36 px default height, 8 px primary radius, visible keyboard focus, and restrained shadows.

## Page Composition

`src/components/page-layout.tsx` provides reusable page primitives:

- `Page`, `PageHeader`, `PageHeading`, `PageTitle`, and `PageDescription`
- `PageActions`, `PageToolbar`, and `PageSurface`

The standard page grid is capped at 1440 px with responsive 16/24/32 px gutters. Toolbars group search and filters in a bordered neutral surface. High-density data remains table-first with horizontal scrolling on narrow viewports.

## Shared Components

- Buttons: primary, secondary, outline, ghost, and destructive intent; icons use Lucide and inherit the component size.
- Forms: inputs, textareas, Radix selects, native selects, and input groups share height, border, focus, disabled, and error behavior.
- Data: tables use a neutral header, 44 px header rows, compact body spacing, and row hover feedback.
- Tabs: the shared `TabsList` defaults to the icon-free line treatment. Labels share the available width, the selected tab uses a primary underline, and narrow tab strips scroll horizontally without shrinking label text. Use the filled variant only for an intentional segmented control, not page navigation.
- Feedback: badges support neutral, information, success, warning, and destructive states; dialogs use a restrained overlay, responsive viewport bounds, and semantic footer surface.
- Cards: bordered white surfaces with 8 px radius and minimal shadow.

## Portal Shells

- Admin, Faculty, and Student shells use a 15 rem collapsible sidebar and 72 px sticky header.
- Brand treatment, avatar scale, account actions, spacing, and active navigation state are shared.
- Administrative navigation is grouped into Workspace, Student lifecycle, Academic operations, Operations, and Administration. Permission filtering and direct-route guards are unchanged.
- Faculty and Student labels and menus remain role-scoped; portal switching still follows the authenticated `availablePortals` list.

## Responsive Rules

- Page actions and toolbars stack at mobile widths.
- Sidebars use the existing mobile sheet behavior.
- Tables scroll within their container rather than expanding the page.
- Long dialogs stay within the viewport and scroll vertically; all shared tab strips scroll horizontally without shrinking labels.
- Desktop and 375 px browser checks are required for dense list and modal changes.

## Accessibility and Interaction

- Every interactive control keeps a visible focus state.
- Icon-only controls retain accessible labels through their shared component implementation.
- Destructive actions remain visually distinct from primary actions.
- Styling must not replace backend authorization; see [[Authentication and Roles]].

## Validation Baseline

- `npm run typecheck`
- `npm run build`
- Targeted ESLint for the changed shell/page/design-system files
- Live Docker browser flows: Scheduling, Finance, and Users & Accounts tab switching; Students list → Create Student Record dialog at desktop and 375 px
- Focused cross-role Playwright scheduling suite

## Known Limitations

- The main production chunk remains about 3.14 MB before gzip and triggers the existing Vite size warning.
- Repo-wide ESLint still contains legacy React Compiler, explicit `any`, Fast Refresh, and E2E cleanup findings; see [[Known Issues]].
- Fifteen legacy native `<select>` elements remain, but inherit the same semantic control styling. Future touched forms should prefer `NativeSelect` or the shared Radix `Select`.

## Related Notes

- [[Frontend Structure]]
- [[Faculty Portal]]
- [[Student Portal]]
- [[Development Setup]]
- [[Known Issues]]
