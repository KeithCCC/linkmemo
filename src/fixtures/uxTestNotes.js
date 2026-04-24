const now = Date.now();

const minutesAgo = (minutes) => new Date(now - minutes * 60 * 1000).toISOString();

export const uxTestNotes = [
  {
    id: "ux-1",
    title: "Daily Review",
    content: `# Daily Review

Today I want to keep notes easy to scan on both desktop and mobile.

## What matters
- reading comfort
- clear actions
- easy retrieval

## Next
- adjust typography
- simplify controls
- reduce sidebar pressure

#focus #todo #idea`,
    tags: ["focus", "todo", "idea"],
    focus: true,
    createdAt: minutesAgo(1440),
    updatedAt: minutesAgo(15),
  },
  {
    id: "ux-2",
    title: "Project Kickoff Notes",
    content: `# Project Kickoff Notes

We are testing a realistic signed-in workspace without Google login.

## Goals
- improve note readability on PC
- improve note readability on mobile
- improve control usability

## Questions
- Is the home screen too dense?
- Are the editor actions self-explanatory?
- Can a new user recover from errors?

#project #meeting #ux`,
    tags: ["project", "meeting", "ux"],
    focus: false,
    createdAt: minutesAgo(2880),
    updatedAt: minutesAgo(45),
  },
  {
    id: "ux-3",
    title: "Long Reading Sample",
    content: `# Long Reading Sample

This is a longer note intended for layout testing. It should be comfortable to read without forcing the eyes to travel too far across the page. The content should reveal whether the current line length, spacing, and heading hierarchy are working well.

## Reading

Good reading surfaces need a predictable content width, generous line height, and clear separation between metadata and body copy. On mobile, the content should own the viewport. On desktop, the content should still be the focus rather than the navigation shell.

## Checklist
- [x] include paragraph text
- [x] include headings
- [x] include a checklist
- [ ] verify preview mode
- [ ] verify note detail mode

## Related
See also [[Daily Review]] and [[Editor Controls Audit]]

#reading #layout #project`,
    tags: ["reading", "layout", "project"],
    focus: false,
    createdAt: minutesAgo(4320),
    updatedAt: minutesAgo(90),
  },
  {
    id: "ux-4",
    title: "Editor Controls Audit",
    content: `# Editor Controls Audit

The current editor has several controls that need clearer labels.

## Problems
- icon-only actions are hard to learn
- save should not look the same as secondary navigation
- mobile wrapping is messy

## Candidate changes
1. label save clearly
2. label list navigation clearly
3. group mode controls together

#ux #editor #todo`,
    tags: ["ux", "editor", "todo"],
    focus: true,
    createdAt: minutesAgo(2160),
    updatedAt: minutesAgo(10),
  },
  {
    id: "ux-5",
    title: "Clip Workflow Example",
    content: `# Clip Workflow Example

[Interesting article](https://example.com/article)

This note simulates a clipped page so the clip flow can be tested without live backend dependencies.

#clipping #project`,
    tags: ["clipping", "project"],
    focus: false,
    createdAt: minutesAgo(720),
    updatedAt: minutesAgo(120),
  },
  {
    id: "ux-6",
    title: "Tag Map",
    content: `# Tag Map

#todo #project #meeting #chatgpt #clipping #idea #focus

Use this note to verify search, tag filtering, and dense list readability.
`,
    tags: ["todo", "project", "meeting", "chatgpt", "clipping", "idea", "focus"],
    focus: false,
    createdAt: minutesAgo(3000),
    updatedAt: minutesAgo(150),
  },
  {
    id: "ux-7",
    title: "Writing Group A",
    content: `# Writing Group A

Grouped notes should be easy to identify and filter.

#group:writing #writing;drafts #idea`,
    tags: ["group:writing", "writing;drafts", "idea"],
    focus: false,
    createdAt: minutesAgo(3500),
    updatedAt: minutesAgo(180),
  },
  {
    id: "ux-8",
    title: "Writing Group B",
    content: `# Writing Group B

This note belongs to the same experimental group for filtering tests.

#group:writing #writing;drafts #todo`,
    tags: ["group:writing", "writing;drafts", "todo"],
    focus: false,
    createdAt: minutesAgo(3700),
    updatedAt: minutesAgo(200),
  },
  {
    id: "ux-9",
    title: "Meeting Follow-up",
    content: `# Meeting Follow-up

- send summary
- create action items
- archive old notes

#meeting #todo`,
    tags: ["meeting", "todo"],
    focus: false,
    createdAt: minutesAgo(5400),
    updatedAt: minutesAgo(240),
  },
  {
    id: "ux-10",
    title: "Mobile UX Notes",
    content: `# Mobile UX Notes

The left sidebar should not remain fixed-open on small screens.

## Expected
- content first
- drawer navigation
- fewer cramped columns

#mobile #ux #focus`,
    tags: ["mobile", "ux", "focus"],
    focus: true,
    createdAt: minutesAgo(600),
    updatedAt: minutesAgo(20),
  },
  {
    id: "ux-11",
    title: "Recent Work Snapshot",
    content: `# Recent Work Snapshot

Use this note to confirm recent-note behavior and updated sorting.

#recent #project`,
    tags: ["recent", "project"],
    focus: false,
    createdAt: minutesAgo(400),
    updatedAt: minutesAgo(5),
  },
  {
    id: "ux-12",
    title: "Checklist Example",
    content: `# Checklist Example

- [ ] simplify empty state
- [x] test command palette
- [ ] relabel primary controls
- [ ] improve missing-note recovery

#todo #editor`,
    tags: ["todo", "editor"],
    focus: false,
    createdAt: minutesAgo(1800),
    updatedAt: minutesAgo(30),
  },
];

