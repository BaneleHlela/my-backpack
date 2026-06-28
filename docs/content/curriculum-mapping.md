# Mapping Content to the Curriculum

My Backpack's content is organised in a hierarchy that mirrors the way schools think about subjects. This document explains that hierarchy in plain language and shows how it maps to real South African curricula like CAPS and IEB. If you're a teacher, this is where you learn how to place your content correctly in the system.

---

## The Content Hierarchy Explained Simply

Think of My Backpack's content the same way you'd think about a school's timetable.

At the top, you have a **Field** — a broad area of knowledge. Fields are things like Language, Mathematics, or Engineering. These are the big buckets.

Inside each Field are **Subjects** — specific school subjects. Within the Language Field, you might have English Home Language, IsiZulu Home Language, or Afrikaans First Additional Language.

Inside each Subject are **Topics** — the units of study within that subject. English Home Language might have topics like Vocabulary, Reading Comprehension, Creative Writing, or Grammar.

Inside each Topic are **Mini-Apps** — the actual interactive tools learners use to study and practise. A Vocabulary topic might have a Dictionary mini-app and a Quiz mini-app. A Roadmap topic would have a Roadmap mini-app that shows the lesson path.

```
Field
  └── Subject
        └── Topic
              └── Mini-App
```

Think of it like Russian dolls: each one sits inside the one above it.

---

## How CAPS Maps to the Hierarchy

Here is how the South African CAPS curriculum maps to My Backpack's structure for a few examples:

### Example 1: Grade 3 IsiZulu Home Language — Phonics

| CAPS Level | My Backpack |
|---|---|
| Learning area: Languages | Field: Language |
| Subject: IsiZulu Home Language | Subject: IsiZulu Home Language |
| CAPS strand: Listening and Speaking | Topic: Sounds |
| Activity type: Learn and practise vowel sounds | Mini-App: IsiZulu Sounds Roadmap (type: roadmap) |

The roadmap contains nodes for each vowel sound. Each node has study material (audio of the sound) and an assessment (questions asking the learner to identify the sound).

### Example 2: Grade 1 Mathematics — Number Sense

| CAPS Level | My Backpack |
|---|---|
| Learning area: Mathematics | Field: Mathematics |
| Subject: Mathematics Grade 1 | Subject: Mathematics Grade 1 |
| CAPS content area: Numbers, Operations and Relationships | Topic: Number Sense |
| Activity type: Counting and ordering | Mini-App: Counting Roadmap (type: roadmap) |

### Example 3: Grade 12 English — Vocabulary

| CAPS Level | My Backpack |
|---|---|
| Learning area: Languages | Field: Language |
| Subject: English Home Language | Subject: English Home Language |
| CAPS strand: Language in context | Topic: Vocabulary |
| Activity type: Build and practise vocabulary | Mini-App: Vocabulary Dictionary + Quiz (type: dictionary and quiz) |

---

## How Curriculum Tags Work on Nodes

Every roadmap node can be tagged with one or more curriculum references. This solves a common problem: the same content is relevant to multiple grade levels or multiple curricula.

**A curriculum tag looks like this:**
```
Curriculum: CAPS
Grade level: Grade 3
```

A node can have multiple tags simultaneously:

```
Node: "IsiZulu Vowel Sounds"
Tags:
  - CAPS, Grade 2 (introduction)
  - CAPS, Grade 3 (consolidation)
  - CAPS, Grade 4 (revision)
```

This means the same node — with the same content — appears in search results for Grade 2, Grade 3, and Grade 4 teachers, without being duplicated in the database.

### Adding curriculum tags as a teacher

When creating or editing a node in the teacher dashboard (🔜 coming in Phase 3), you choose:
1. Which curriculum (CAPS, IEB, Cambridge, University, or Other)
2. The grade level (Grade R through Grade 12, or a university level)

You can add multiple tags to the same node.

---

## IEB vs CAPS — Same Content, Different Tags

The IEB (Independent Examinations Board) curriculum covers much of the same content as CAPS, but at different grade levels and with different emphases.

In My Backpack, the solution is straightforward: apply both tags to the same node.

**Example:** A node on "Parts of Speech — Nouns" might be appropriate for:
- CAPS Grade 4
- IEB Grade 4
- Cambridge Year 5

Rather than creating three separate nodes with identical content, one node is tagged with all three. Learners and teachers from any of these curricula find the same high-quality content.

---

## Handling Topics That Span Multiple Grades

Some topics are introduced at an early grade and revisited with increasing complexity at later grades. CAPS specifically builds on prior knowledge year by year.

The recommended approach in My Backpack is to create a separate roadmap for each major complexity level, but share nodes where the content is identical.

**Example: Addition in Mathematics**

- **Grade 1 Addition Roadmap** — nodes covering single-digit addition
- **Grade 2 Addition Roadmap** — nodes covering two-digit addition; some nodes tagged at Grade 2 are also tagged Grade 1 for revision
- **Grade 3 Addition Roadmap** — nodes covering three-digit addition with carrying

A Grade 2 teacher who wants learners to revise Grade 1 content can assign the Grade 1 roadmap. The tags make it searchable at the right level.

---

## The Four Curriculum Frameworks

My Backpack currently supports the following curriculum frameworks for tagging:

**CAPS** — Curriculum and Assessment Policy Statement. The standard South African public school curriculum, mandated by the Department of Basic Education. Covers Grade R through Grade 12.

**IEB** — Independent Examinations Board. Used by most independent (private) schools in South Africa. Broadly similar to CAPS but with some differences in grade placement and emphasis.

**Cambridge** — Cambridge Assessment International Education. Used by some international and private schools. Maps to Year groups rather than Grades.

**University** — For post-matric and degree-level content. Grade level would indicate year of study or NQF level.

**Other** — For content that doesn't map to any of the above. Include a description in the node's curriculum tag when using this option.

---

## 🔜 Full Curriculum Mapping Tool — Coming in Phase 3

A visual curriculum mapping tool is planned for Phase 3 of the teacher dashboard. This tool will:

- Show a visual grid of all CAPS content areas across all grade levels
- Let teachers click on any cell to see what content exists in My Backpack for that area
- Show gaps in coverage so content creators know where to focus
- Allow teachers to filter roadmaps and nodes by curriculum area and grade

Until then, curriculum mapping is done manually by applying tags when creating nodes.

---

*Last updated: June 2026*
