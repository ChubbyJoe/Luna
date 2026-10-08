# 0005. Page tree and sidebar: rationale

Decision record for [index.md](index.md). `/develop` builds from `index.md`; this file explains why.

## Context

Luna's promise is "pages inside pages", but after the core writing loop (spec 0004) the sidebar is a flat list of top level pages. The database was shaped for nesting from day one (spec 0002: `parent_id` plus a fractional `position` per row), and the sidebar query already loads every page, so the open problem is not storage. It is how a single owner sees, grows, and reorganizes a tree comfortably, and how the system stays correct when that tree is changed from two tabs at once.

The forces: the design system (spec 0003) promises full keyboard access, axe clean screens in both themes, a calm sidebar with little chrome, and motion limited to short opacity and transform changes. The sidebar is a drawer on phones, where hover does not exist and dragging fights with scrolling. Writes must never break the save loop from spec 0004, whose conflict guard keys on `updated_at`. The app is for one person (and a few friends), so trees run to hundreds of pages, not tens of thousands.

Correctness lives in the database. Spec 0002 already defines the rules (no cycles, at most 64 levels, a parent from the same owner) and planned their trigger as its M2, to ship with this feature. Without it, two tabs making crossing moves could create a loop that makes pages vanish from the tree.

Leaving this undecided blocks feature 6 and everything that hangs off the tree: trash restores to a place in it (feature 8), favorites and search open pages that must be revealed in it (features 9 and 10).

## Options considered

### Option 1: Tree from the cached list, drag with Pragmatic drag and drop plus a Move to command dialog (chosen)

Build the tree in the browser from the existing list query. Drag rows with Atlassian's Pragmatic drag and drop (native browser drag, a tree item hitbox for before, inside, and after zones, an auto scroll add on). Offer "Move to…" in each row's … menu as a searchable shadcn Command dialog. Remember expanded rows in `localStorage` per account. The spec 0002 trigger guards the database.

**Pros**:
- Drag and the dialog share one placement function and one mutation, so most of the logic is tested once.
- The hitbox matches the chosen three zone model directly; native drag needs no pointer or touch sensor setup, and it naturally stays off on touch, which is what was chosen.
- Small, framework agnostic library; it renders nothing, so rows stay shadcn Sidebar markup on Luna tokens.
- The dialog gives keyboard, screen reader, and phone users a complete way to move pages.

**Cons**:
- Two new dependencies (the Pragmatic packages, cmdk).
- Native drag has quirks (drag preview look, no touch), and its drop indicator must be drawn by hand.
- Expand state does not sync across devices.

### Option 2: Move to dialog only, no drag

Same tree and dialog, no drag at all; reorder by choosing a parent in the dialog.

**Pros**:
- Fewest moving parts and no drag library; fully accessible by construction.

**Cons**:
- Reordering siblings becomes clumsy (the dialog only places a page at the end of a parent), which works against the scope's "move and reorder them in the sidebar".
- Feels unlike the Notion model Luna simplifies.

### Option 3: dnd-kit with a custom sortable tree

Use dnd-kit's core and sortable packages, flattening the tree into one sortable list and deriving depth from the sideways offset, as its tree example does.

**Pros**:
- Popular, React first, with pointer, keyboard, and touch sensors and built in screen reader announcements.

**Cons**:
- The tree is an example to copy, not a package; you own a few hundred lines of projection and collision code.
- Its natural model is sideways offset for depth, the fiddly model that was not chosen; the three zone model needs custom collision logic.
- Touch support is a sensor away, which invites the touch drag that was ruled out.

### Option 4: react-arborist (complete tree component)

A ready tree widget with drag, keyboard navigation, and virtualization built in.

**Pros**:
- Fastest to a working tree; virtualization included for very large trees.

**Cons**:
- It renders its own markup and focus model, which fights the shadcn Sidebar, the nested list choice, and Luna's tokens.
- Virtualization is not needed at hundreds of rows and complicates focus and scroll to row.
- A heavier dependency for a sidebar that must stay calm and custom.

## Rationale

Option 1 is the only one that meets both halves of the scope ("move and reorder them in the sidebar") and the design system's rule that nothing depends on a mouse. Drag is the fast path for desktop; the Move to dialog is a complete path for everyone else, and it is built first (M2) so the move mutation and its failure handling exist before drag is layered on (M3). Pragmatic drag and drop wins over dnd-kit because its hitbox already speaks the chosen before, inside, and after model and because it renders nothing, so rows stay ordinary Sidebar markup on Luna tokens. Its native drag being mouse only is a feature here, not a gap, since touch moves go through the dialog.

Building the tree in the browser costs nothing new: the sidebar already reads every page, ordered, in ranges of 1000. A recursive query or a `path` column would add server work to solve a problem that hundreds of rows do not have. The database still has the final word on shape through the trigger spec 0002 designed, and the per owner advisory lock taken before its walk makes crossing moves from two tabs safe, which no amount of client checking can.

Expand state lives in `localStorage` because it is a personal view preference: a column would add a migration and a write on every chevron click to buy cross device sync nobody asked for. The key includes the user id so two accounts in one browser (as the e2e suite does) never share state. Moves are optimistic with a per row rollback and a serial mutation scope, because a drag that lags feels broken, while two queued moves must neither race nor undo each other on failure. No Undo toast: the tree itself shows the result, and the project's toast rule keeps visible success quiet.

Other calls made here, each with its runner up: rename stays on the page title only (runner up: inline rename, which would need a second path into the save session registry); the breadcrumb shows the full path now, since the helper to fold it already exists (runner up: keep the title only); a chevron only on rows with sub pages (runner up: always, like Notion, which adds empty "No pages inside" states); nested lists with Tab and Enter instead of a full ARIA tree widget (runner up: role tree with arrow keys, much more code and awkward with three buttons per row); orphan rows shown at the end of the top level (runner up: hidden until refetch, which can make a page briefly disappear).

## Discovery notes

An Agent Skill and MCP server search ran for Pragmatic drag and drop and cmdk on 2026-10-08. Neither has one; both are code dependencies, and the installed `shadcn` skill already covers adding `command`.
