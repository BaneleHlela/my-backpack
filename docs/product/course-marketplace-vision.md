# Course Marketplace & Multi-Provider Courses (Future Vision)

**Status:** Deferred. Not needed until the platform has real external teachers/institutions creating content, not just Banele authoring it directly. Captured now so the `Course`/`Roadmap` model being built today doesn't need a breaking migration later.

This elaborates on a line already in `roadmap-vision.md`'s Long-Term Vision: *"Teachers are rewarded for creating quality content that other schools and learners benefit from — a content marketplace where great teaching earns income."* This document is what that actually looks like, mechanically.

---

## The idea

Today, all content is authored by one person (Banele), moving from seed files to the Content Studio dashboard. Longer-term, the platform opens up to external course providers:

- A school (e.g. a Grade 1 Maths department) forms a **team** of teachers who create and manage a course together.
- A different school can create their **own competing course** covering the same curriculum slot — same grade, same subject, different team, different approach.
- Not limited to traditional/CAPS schooling — independent teams could offer non-curriculum courses too (Python, acting, professional skills — this is the same territory as Phase 4's "University-level and professional content").
- **Students choose** which course to take for a given learning objective, the way you'd choose between competing courses on any online learning platform.
- A teacher can also just **recommend** a course without managing it — a lighter endorsement, distinct from being a listed instructor.

## Why

- Course quality becomes visible and rewarded — well-regarded courses/instructors can be compensated based on enrollment/outcomes (exact mechanism TBD — this is the "great teaching earns income" line).
- Students get real choice instead of one fixed path per subject.
- Teachers get a lightweight way to point students at good material without building it themselves. Offering assistance when needed.

## How it plugs into the model being built now

- `Course` gets a `team` field (instructors/managers). Added now as a reserved placeholder with no behaviour yet — shape gets defined when this is actually built.
- A `RoadmapNode` in an overview-level roadmap (e.g. a subject-wide "all of Maths" roadmap, or a future certificate/degree roadmap) doesn't point at one fixed Course — it points at a **set** of Courses that all satisfy that node (`linkedCourseIds: ObjectId[]`, plural from day one, not a single ID). A student picks which of the linked courses to take. This generalises the `linkedRoadmapId` portal-node idea from earlier planning: instead of "this node links to one specific roadmap," it becomes "this node links to one or more equivalent courses."
- Assigning courses to nodes can be **manual** (via the dashboard — an admin picks which node(s) a course satisfies) or **automatic** later (a course goes through an approval process and the system slots it into matching roadmap(s)/node(s) by curriculum tag, subject, and grade).
- The same mechanism — a node linking to multiple interchangeable things — is what lets a roadmap represent a **certificate or degree**: each node is a required course (or a choice of courses), sequenced into a bigger credential. Ties directly into Phase 4's testing-centre and university-level content plans.

## Not needed yet

Team/instructor management, course approval workflow, competing-course ranking, and reward/payout mechanics are all out of scope until the platform has real external teachers. The only thing this changes about what gets built **now**: `Course.team` exists as a reserved field, and `RoadmapNode`'s course-linking is array-shaped from the start.

---

*Added: July 2026, alongside the Course/Roadmap model restructure.*
