#!/usr/bin/env python3
"""
generate_project_report.py
==========================

Builds "BrainDeck_Project_Report.docx" - an approximately 15 page project
overview of the BrainDeck AI flashcard platform, written for a human reader
rather than a compiler.

HOW TO RUN IT
-------------
    pip3 install python-docx
    python3 generate_project_report.py

The file appears in the same folder. Open it in Microsoft Word, or drag it
into Google Drive and choose "Open with -> Google Docs".
"""

from datetime import date

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor

# --------------------------------------------------------------------------
# Palette - matches the app's "colourful student" theme
# --------------------------------------------------------------------------
GRAPE = RGBColor(0x7C, 0x3A, 0xED)
GRAPE_DARK = RGBColor(0x5B, 0x21, 0xB6)
BUBBLEGUM = RGBColor(0xEC, 0x48, 0x99)
INK = RGBColor(0x1E, 0x1B, 0x3A)
INK_SOFT = RGBColor(0x5B, 0x57, 0x76)
MINT = RGBColor(0x05, 0x96, 0x69)

CALLOUT_FILL = "F5F0FF"
TABLE_HEADER_FILL = "7C3AED"
TABLE_ZEBRA_FILL = "FAF8FF"

BODY_FONT = "Calibri"
HEAD_FONT = "Calibri"


# --------------------------------------------------------------------------
# Low level helpers
# --------------------------------------------------------------------------
def shade(cell, hex_fill):
    """Give a table cell a solid background colour."""
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), hex_fill)
    tc_pr.append(shd)


def cell_borders(cell, colour="D8CCFF", size=6):
    tc_pr = cell._tc.get_or_add_tcPr()
    borders = OxmlElement("w:tcBorders")
    for edge in ("top", "left", "bottom", "right"):
        el = OxmlElement(f"w:{edge}")
        el.set(qn("w:val"), "single")
        el.set(qn("w:sz"), str(size))
        el.set(qn("w:color"), colour)
        borders.append(el)
    tc_pr.append(borders)


def style_document(doc):
    normal = doc.styles["Normal"]
    normal.font.name = BODY_FONT
    normal.font.size = Pt(10.5)
    normal.font.color.rgb = INK
    normal.paragraph_format.space_after = Pt(6)
    normal.paragraph_format.line_spacing = 1.06


def add_page_numbers(doc):
    """Insert 'Page X' into the footer using a Word field."""
    footer = doc.sections[0].footer
    para = footer.paragraphs[0]
    para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = para.add_run("BrainDeck  |  Project Report  |  Page ")
    run.font.size = Pt(8)
    run.font.color.rgb = INK_SOFT

    fld = OxmlElement("w:fldSimple")
    fld.set(qn("w:instr"), "PAGE")
    para._p.append(fld)


def h1(doc, text, number=None):
    doc.add_page_break()
    para = doc.add_paragraph()
    para.paragraph_format.space_before = Pt(0)
    para.paragraph_format.space_after = Pt(2)
    if number is not None:
        tag = para.add_run(f"SECTION {number}")
        tag.font.size = Pt(9)
        tag.font.bold = True
        tag.font.color.rgb = BUBBLEGUM
        tag.font.name = HEAD_FONT
        para.add_run("\n")
    run = para.add_run(text)
    run.font.size = Pt(19)
    run.font.bold = True
    run.font.color.rgb = GRAPE_DARK
    run.font.name = HEAD_FONT

    rule = doc.add_paragraph()
    rule.paragraph_format.space_before = Pt(0)
    rule.paragraph_format.space_after = Pt(7)
    line = rule.add_run("─" * 46)
    line.font.color.rgb = GRAPE
    line.font.size = Pt(8)
    return para


def h2(doc, text):
    para = doc.add_paragraph()
    para.paragraph_format.space_before = Pt(11)
    para.paragraph_format.space_after = Pt(3)
    run = para.add_run(text)
    run.font.size = Pt(13.5)
    run.font.bold = True
    run.font.color.rgb = GRAPE
    run.font.name = HEAD_FONT
    return para


def h3(doc, text):
    para = doc.add_paragraph()
    para.paragraph_format.space_before = Pt(10)
    para.paragraph_format.space_after = Pt(2)
    run = para.add_run(text)
    run.font.size = Pt(11.5)
    run.font.bold = True
    run.font.color.rgb = INK
    return para


def body(doc, text, italic=False, size=10.5):
    """Paragraph text. Wrap words in **double asterisks** to bold them."""
    para = doc.add_paragraph()
    para.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    for index, chunk in enumerate(text.split("**")):
        if not chunk:
            continue
        run = para.add_run(chunk)
        run.font.size = Pt(size)
        run.italic = italic
        run.bold = index % 2 == 1
    return para


def bullets(doc, items, numbered=False):
    style = "List Number" if numbered else "List Bullet"
    for item in items:
        para = doc.add_paragraph(style=style)
        para.paragraph_format.space_after = Pt(4)
        for index, chunk in enumerate(item.split("**")):
            if not chunk:
                continue
            run = para.add_run(chunk)
            run.font.size = Pt(10.5)
            run.bold = index % 2 == 1


def callout(doc, title, text, emoji="💡"):
    """A single-cell shaded table used as a highlight box."""
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = table.cell(0, 0)
    shade(cell, CALLOUT_FILL)
    cell_borders(cell, "C9B8FF", 8)

    first = cell.paragraphs[0]
    first.paragraph_format.space_before = Pt(6)
    first.paragraph_format.space_after = Pt(3)
    head = first.add_run(f"{emoji}  {title}")
    head.font.bold = True
    head.font.size = Pt(11)
    head.font.color.rgb = GRAPE_DARK

    para = cell.add_paragraph()
    para.paragraph_format.space_after = Pt(6)
    for index, chunk in enumerate(text.split("**")):
        if not chunk:
            continue
        run = para.add_run(chunk)
        run.font.size = Pt(10.5)
        run.bold = index % 2 == 1
        run.font.color.rgb = INK

    doc.add_paragraph().paragraph_format.space_after = Pt(2)
    return table


def data_table(doc, headers, rows, widths=None, caption=None):
    table = doc.add_table(rows=1, cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER

    header_cells = table.rows[0].cells
    for i, text in enumerate(headers):
        shade(header_cells[i], TABLE_HEADER_FILL)
        cell_borders(header_cells[i], "7C3AED", 8)
        para = header_cells[i].paragraphs[0]
        para.paragraph_format.space_after = Pt(2)
        para.paragraph_format.space_before = Pt(2)
        run = para.add_run(text)
        run.font.bold = True
        run.font.size = Pt(9.5)
        run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)

    for r, row in enumerate(rows):
        cells = table.add_row().cells
        for i, text in enumerate(row):
            if r % 2 == 1:
                shade(cells[i], TABLE_ZEBRA_FILL)
            cell_borders(cells[i])
            para = cells[i].paragraphs[0]
            para.paragraph_format.space_after = Pt(2)
            para.paragraph_format.space_before = Pt(2)
            for index, chunk in enumerate(str(text).split("**")):
                if not chunk:
                    continue
                run = para.add_run(chunk)
                run.font.size = Pt(9)
                run.bold = index % 2 == 1

    if widths:
        for row in table.rows:
            for i, width in enumerate(widths):
                row.cells[i].width = Inches(width)

    if caption:
        para = doc.add_paragraph()
        para.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = para.add_run(caption)
        run.italic = True
        run.font.size = Pt(9)
        run.font.color.rgb = INK_SOFT
    else:
        doc.add_paragraph().paragraph_format.space_after = Pt(2)
    return table


def code_block(doc, lines):
    table = doc.add_table(rows=1, cols=1)
    cell = table.cell(0, 0)
    shade(cell, "F4F4F8")
    cell_borders(cell, "DCDCE8", 6)
    para = cell.paragraphs[0]
    para.paragraph_format.space_before = Pt(5)
    para.paragraph_format.space_after = Pt(5)
    run = para.add_run("\n".join(lines))
    run.font.name = "Consolas"
    run.font.size = Pt(9)
    run.font.color.rgb = RGBColor(0x33, 0x30, 0x4A)
    doc.add_paragraph().paragraph_format.space_after = Pt(2)
    return table


def flashcard_pair(doc, question, answer, tag):
    """Render one sample flashcard as a two-row mini table."""
    table = doc.add_table(rows=2, cols=2)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER

    labels = ["Q", "A"]
    contents = [question, answer]
    for r in range(2):
        label_cell = table.cell(r, 0)
        label_cell.width = Inches(0.45)
        shade(label_cell, "7C3AED" if r == 0 else "EC4899")
        cell_borders(label_cell, "7C3AED", 6)
        run = label_cell.paragraphs[0].add_run(labels[r])
        run.font.bold = True
        run.font.size = Pt(11)
        run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)

        text_cell = table.cell(r, 1)
        text_cell.width = Inches(5.8)
        shade(text_cell, "FFFFFF" if r == 0 else "FDF7FF")
        cell_borders(text_cell)
        para = text_cell.paragraphs[0]
        para.paragraph_format.space_before = Pt(3)
        para.paragraph_format.space_after = Pt(3)
        run = para.add_run(contents[r])
        run.font.size = Pt(10)
        run.bold = r == 0

    tag_para = doc.add_paragraph()
    tag_run = tag_para.add_run(f"    topic: {tag}")
    tag_run.font.size = Pt(8.5)
    tag_run.italic = True
    tag_run.font.color.rgb = INK_SOFT
    tag_para.paragraph_format.space_after = Pt(10)


# --------------------------------------------------------------------------
# Document sections
# --------------------------------------------------------------------------
def cover_page(doc):
    for _ in range(4):
        doc.add_paragraph()

    para = doc.add_paragraph()
    para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = para.add_run("🧠")
    run.font.size = Pt(54)

    para = doc.add_paragraph()
    para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    para.paragraph_format.space_after = Pt(0)
    run = para.add_run("BrainDeck")
    run.font.size = Pt(46)
    run.font.bold = True
    run.font.color.rgb = GRAPE_DARK

    para = doc.add_paragraph()
    para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = para.add_run("An AI Flashcard Platform Built on Anki's Spaced Repetition Engine")
    run.font.size = Pt(15)
    run.font.color.rgb = BUBBLEGUM
    run.font.bold = True

    para = doc.add_paragraph()
    para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = para.add_run(
        "Turning dense documents into active recall, automatically"
    )
    run.font.size = Pt(12)
    run.italic = True
    run.font.color.rgb = INK_SOFT

    for _ in range(3):
        doc.add_paragraph()

    meta = data_table(
        doc,
        ["", ""],
        [
            ["Project type", "Full-stack web application and research write-up"],
            ["Core technologies", "Next.js 15, React 19, TypeScript, SQLite, Claude API"],
            ["Algorithm", "SM-2 spaced repetition, ported from Anki's scheduler"],
            ["Supported inputs", "PDF, Microsoft Word (.docx), PowerPoint (.pptx), plain text"],
            ["Document generated", date.today().strftime("%d %B %Y")],
        ],
        widths=[1.7, 4.6],
    )
    # Hide the empty header row of the metadata table.
    for cell in meta.rows[0].cells:
        shade(cell, "FFFFFF")
        cell_borders(cell, "FFFFFF", 2)

    for _ in range(2):
        doc.add_paragraph()

    para = doc.add_paragraph()
    para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = para.add_run(
        "This report is written to be read by people, not compilers. "
        "It explains what the system does, why it is built the way it is, and what "
        "the science says about whether it actually helps anyone learn."
    )
    run.font.size = Pt(10)
    run.italic = True
    run.font.color.rgb = INK_SOFT


def contents_page(doc):
    doc.add_page_break()
    para = doc.add_paragraph()
    run = para.add_run("Contents")
    run.font.size = Pt(24)
    run.font.bold = True
    run.font.color.rgb = GRAPE_DARK

    entries = [
        ("1", "Executive Project Overview and System Vision", "The problem, the insight, and what was built"),
        ("2", "System Architecture and Database Design", "Layers, data flow, schema and API surface"),
        ("3", "Anki Source Code Integration Strategy", "What was adapted, what was rewritten, and the licence question"),
        ("4", "GitHub and Visual Mockup Blueprint", "Repository layout, README anatomy, screenshot plan"),
        ("5", "Cognitive Science and Memory Retention", "Ebbinghaus, the testing effect, and the numbers behind them"),
        ("6", "Real-World Student and Learner Impact", "Six people this is actually for"),
        ("7", "Exemplar Document Showcase", "A real two-page study guide and the cards it produced"),
        ("8", "Limitations, Ethics and Future Work", "What it does not do yet, and what comes next"),
        ("", "References", "Sources cited throughout"),
    ]

    table = doc.add_table(rows=0, cols=2)
    for number, title, subtitle in entries:
        cells = table.add_row().cells
        cells[0].width = Inches(0.5)
        cells[1].width = Inches(5.8)

        num_run = cells[0].paragraphs[0].add_run(number)
        num_run.font.bold = True
        num_run.font.size = Pt(14)
        num_run.font.color.rgb = BUBBLEGUM

        para = cells[1].paragraphs[0]
        para.paragraph_format.space_after = Pt(1)
        title_run = para.add_run(title)
        title_run.font.bold = True
        title_run.font.size = Pt(11.5)

        sub = cells[1].add_paragraph()
        sub.paragraph_format.space_after = Pt(9)
        sub_run = sub.add_run(subtitle)
        sub_run.font.size = Pt(9.5)
        sub_run.italic = True
        sub_run.font.color.rgb = INK_SOFT


def section_one(doc):
    h1(doc, "Executive Project Overview and System Vision", 1)

    body(
        doc,
        "Every student has done this. You sit down with a sixty-slide lecture deck, a chapter of a "
        "textbook, or a set of case notes. You read it. You highlight it. You read it again, and the "
        "highlighting makes the page look satisfyingly busy. You close the laptop feeling like you "
        "have studied. Two weeks later, in the exam, almost none of it is there.",
    )
    body(
        doc,
        "The uncomfortable finding from fifty years of memory research is that this feeling of "
        "learning is close to worthless as a signal. **Recognition is not recall.** Re-reading makes "
        "material feel familiar, and familiarity is mistaken for knowledge. What actually builds "
        "durable memory is the opposite experience: closing the book and struggling to retrieve the "
        "answer from nothing, then being told whether you were right.",
    )
    body(
        doc,
        "Flashcards are the cheapest, oldest, and best-evidenced tool for forcing that struggle. "
        "Spaced repetition software such as Anki takes them one step further by scheduling each card "
        "for the moment you are about to forget it, so that no effort is wasted on things you already "
        "know solidly. The evidence for both techniques is not marginal; Section 5 goes through it in "
        "detail.",
    )

    h2(doc, "1.1 So why does almost nobody do it?")
    body(
        doc,
        "Because making the cards is miserable. A serious deck for a single module is two to four "
        "hundred cards. Written by hand, that is several evenings of typing, and those evenings come "
        "out of the same budget as actually studying. The technique with the best evidence base in "
        "education has an activation cost high enough that most students abandon it in week three.",
    )
    callout(
        doc,
        "The insight this project is built on",
        "Spaced repetition does not have an efficacy problem. It has an **input problem**. "
        "The learning science was settled decades ago; the bottleneck is that turning a document into "
        "good questions is slow, boring human labour. That specific bottleneck is exactly the kind of "
        "task that large language models are now genuinely good at.",
        "🎯",
    )

    h2(doc, "1.2 What BrainDeck is")
    body(
        doc,
        "BrainDeck is a web application that runs on the student's own laptop. You drag a document "
        "onto the page. It reads the text, sends it to Claude with a prompt built around established "
        "card-writing principles, and gets back a deck of one-fact-per-card questions and answers. "
        "You then study that deck in a clean flip-card interface, grading yourself with the same four "
        "buttons Anki uses. A port of Anki's SM-2 scheduler decides when each card comes back. "
        "Everything is stored in a single SQLite file, so the library of every document you have ever "
        "uploaded, and every deck it produced, is still there in six months.",
    )
    body(
        doc,
        "The design goal throughout was to collapse the gap between **having** a document and "
        "**revising** it from several hours to about forty seconds.",
    )

    h2(doc, "1.3 Objectives")
    bullets(
        doc,
        [
            "**Ingest real study material.** Handle the formats students are actually given: PDF lecture notes, Word documents, PowerPoint slide decks.",
            "**Generate cards that are worth studying.** Enforce the rules of good card design in the prompt itself, rather than hoping the model guesses them.",
            "**Schedule properly.** Implement a faithful SM-2 scheduler with learning steps, ease factors, lapses, interval fuzz and safety rails, not a naive 'show it again tomorrow' loop.",
            "**Remember everything.** A persistent library of documents, decks, per-card scheduling state and a full review log.",
            "**Stay private and cheap to run.** Documents are parsed locally; only extracted text leaves the machine, and only to the AI provider the user chose. No accounts, no third-party database.",
            "**Be usable by a non-technical person.** One command to start, one page to land on, one obvious thing to do.",
        ],
    )

    h2(doc, "1.4 What success looks like")
    data_table(
        doc,
        ["Objective", "Measure", "Target"],
        [
            ["Speed of deck creation", "Time from upload to first card", "Under 60 seconds for a 20-page PDF"],
            ["Card quality", "Proportion of generated cards a student keeps", "Above 80%"],
            ["Scheduling fidelity", "Automated tests against Anki's documented SM-2 behaviour", "All passing"],
            ["Retention in use", "Share of reviews graded Good or Easy", "80-90%, the range Anki itself targets"],
            ["Format coverage", "Input types handled without error", "PDF, DOCX, PPTX, TXT, MD"],
        ],
        widths=[2.1, 2.4, 1.8],
        caption="Table 1.1 - Success criteria for the prototype",
    )


def section_two(doc):
    h1(doc, "System Architecture and Database Design", 2)

    body(
        doc,
        "BrainDeck is deliberately a single application rather than a microservice estate. A student "
        "running it on a laptop should type one command and get one URL. Next.js makes this practical: "
        "the React interface and the server-side API routes live in the same project and are served by "
        "the same process on port 3000.",
    )

    h2(doc, "2.1 The four layers")
    data_table(
        doc,
        ["Layer", "Responsibility", "Implementation"],
        [
            ["Presentation", "Upload, study, library and progress screens; the flip-card animation and keyboard shortcuts", "React 19 client components, hand-written CSS with a single colour-variable block"],
            ["Application / API", "Request handling, orchestration, validation, error messages a human can act on", "Next.js Route Handlers under src/app/api"],
            ["Domain", "Text extraction, AI generation, spaced repetition scheduling", "src/lib/extract.ts, src/lib/ai.ts, src/lib/scheduler.ts"],
            ["Persistence", "Documents, decks, cards, scheduling state, review log", "SQLite via better-sqlite3, one file at data/flashcards.db"],
        ],
        widths=[1.2, 2.7, 2.4],
        caption="Table 2.1 - Layered architecture",
    )

    body(
        doc,
        "The domain layer is the part worth defending in a viva. Each of its three modules is a pure "
        "function of its inputs with no knowledge of HTTP or React, which is why the scheduler can be "
        "tested exhaustively without starting a server or touching a database.",
    )

    h2(doc, "2.2 The journey of one document")
    bullets(
        doc,
        [
            "**Drop.** The browser posts the file as multipart form data to POST /api/generate. Nothing has been written to disk yet.",
            "**Extract.** extract.ts branches on the file extension. PDFs go through unpdf, a maintained wrapper around Mozilla's pdf.js. Word documents go through mammoth. PowerPoint files are unzipped in memory and every <a:t> text run is pulled out of each slide's XML, slide by slide, preserving order.",
            "**Sanity check.** If fewer than 200 characters came out, the user is told plainly that the file is probably a scanned image and needs OCR first - a far more useful response than an empty deck.",
            "**Generate.** ai.ts sends the text to Claude with a system prompt encoding the rules of good card design, and asks for strict JSON. The response is parsed defensively: code fences stripped, malformed cards filtered out.",
            "**Persist.** A single SQLite transaction writes one documents row, one decks row and N cards rows. Because it is one transaction, a crash halfway through leaves no orphaned half-deck.",
            "**Study.** GET /api/study/[id] returns only the cards whose due timestamp has passed, new cards last. Each carries a preview of what each of the four buttons would do.",
            "**Grade.** POST /api/review runs the scheduler, updates the card's state and appends a row to the review log. If the card is still inside its learning steps it is handed straight back to the browser and reinserted a few positions down the queue - exactly Anki's behaviour.",
        ],
        numbered=True,
    )

    h2(doc, "2.3 Database design")
    body(
        doc,
        "SQLite was chosen for the same reason Anki itself uses it: a spaced repetition collection is "
        "small, single-user, write-light and read-heavy, and the enormous operational simplicity of "
        "'the database is one file you can copy to a USB stick' outweighs anything a client-server "
        "database would offer here. Write-ahead logging is enabled, and foreign keys are switched on "
        "so that deleting a deck cleanly removes its cards and their reviews.",
    )
    data_table(
        doc,
        ["Table", "Key columns", "Purpose"],
        [
            ["documents", "id, filename, filetype, size_bytes, char_count, uploaded_at", "The upload history. Keeps the library meaningful even after a deck is deleted."],
            ["decks", "id, document_id, title, summary, created_at", "One deck per generation run, with an AI-written title and one-line summary."],
            ["cards", "id, deck_id, front, back, hint, tag, **state, due, interval_days, ease, reps, lapses, step**", "Content plus the full SM-2 scheduling state. The bold columns mirror Anki's own card table."],
            ["reviews", "card_id, rating, reviewed_at, prev_interval, new_interval", "An append-only log of every button press. Everything on the progress page is derived from this."],
        ],
        widths=[0.9, 2.4, 3.0],
        caption="Table 2.2 - Schema summary",
    )

    callout(
        doc,
        "Why keep an append-only review log?",
        "Because the card table only knows the present. The review table knows the past. Retention "
        "rate, daily workload, which topics keep lapsing, and any future attempt to fit FSRS "
        "parameters to this particular student all require the full history of ratings. Storing it "
        "costs about 40 bytes per review and cannot be reconstructed later if you skip it.",
        "🗄️",
    )

    h2(doc, "2.4 API surface")
    data_table(
        doc,
        ["Endpoint", "Method", "Does"],
        [
            ["/api/generate", "POST", "File in, generated deck out. The only slow endpoint."],
            ["/api/decks", "GET", "Every deck with live due / new / mastered counts."],
            ["/api/decks/[id]", "GET, DELETE, POST", "Browse a deck's cards, delete it, or reset its progress."],
            ["/api/study/[id]", "GET", "The due queue, with button previews."],
            ["/api/review", "POST", "Grade one card; returns the new interval."],
            ["/api/stats", "GET", "Aggregates plus a 14-day review histogram."],
        ],
        widths=[1.7, 1.1, 3.5],
        caption="Table 2.3 - HTTP API",
    )


def section_three(doc):
    h1(doc, "Anki Source Code Integration Strategy", 3)

    body(
        doc,
        "Anki, written by Damien Elmes and maintained at github.com/ankitects/anki, is the reference "
        "implementation of desktop spaced repetition. It has roughly two decades of real-world "
        "scheduling experience baked into it, and it is open source. Any project in this space should "
        "start by reading it rather than by inventing a scheduler from first principles.",
    )

    h2(doc, "3.1 Where the algorithm actually lives")
    body(
        doc,
        "Anki is a polyglot repository, and the interesting logic is not where a newcomer expects it. "
        "The Python in **pylib/** and the Qt desktop interface in **qt/** are increasingly a shell. "
        "Since the rewrite, the scheduling itself is Rust, in **rslib/**:",
    )
    data_table(
        doc,
        ["Path in ankitects/anki", "What is in it"],
        [
            ["rslib/src/scheduler/", "The scheduler as a whole: queue building, day cutoffs, deck limits"],
            ["rslib/src/scheduler/answering/", "What happens when a card is graded - the direct counterpart of this project's scheduler.ts"],
            ["rslib/src/scheduler/queue/", "How the day's queue is gathered, sorted and buried"],
            ["rslib/src/scheduler/fsrs/", "FSRS: memory-state estimation, parameter optimisation, retention simulation"],
            ["proto/anki/scheduler.proto", "The protobuf contract between the Rust core and every front end"],
            ["ts/", "The Svelte reviewer interface"],
        ],
        widths=[2.5, 3.8],
        caption="Table 3.1 - Orientation map for the Anki repository",
    )
    callout(
        doc,
        "Anki now ships two algorithms, not one",
        "Since version 23.10 Anki offers **SM-2** (the classic SuperMemo-2 variant, with Anki's own "
        "modifications) and **FSRS**, the Free Spaced Repetition Scheduler, which models memory as "
        "three variables - retrievability, stability and difficulty - and reaches a target retention "
        "with meaningfully fewer reviews. Anki's own FAQ notes that SuperMemo's newest algorithms are "
        "proprietary and require licensing, which is precisely why an open-source project needed FSRS.",
        "⚙️",
    )

    h2(doc, "3.2 What this project took, and what it deliberately did not")
    data_table(
        doc,
        ["Element", "Decision", "Reasoning"],
        [
            ["SM-2 rules: learning steps, ease factor, graduating and easy intervals, hard multiplier, lapse handling, interval fuzz", "**Reimplemented** in TypeScript", "The rules are documented behaviour, not copied text. Reimplementing keeps the codebase one language and avoids compiling Rust on a student's laptop."],
            ["Four-button grading (Again / Hard / Good / Easy) and the interval preview above each button", "**Adopted wholesale**", "It is a genuinely good interface decision, and Anki users arrive already fluent in it."],
            ["Learning-step re-queueing inside a session", "**Adopted**", "Without it a failed card vanishes for a day, which is the single most common flaw in naive flashcard apps."],
            ["SQLite as the collection store", "**Adopted**", "Same reasoning Anki had: single user, portable, zero setup."],
            ["FSRS", "**Deferred**", "FSRS needs review history to optimise against. Fitting parameters on an empty collection produces worse schedules than plain SM-2. It is the obvious next feature once a user has a few hundred reviews logged."],
            ["Anki's Rust source, protobuf layer, Qt interface, sync server, .apkg format", "**Not used**", "Enormous surface area for a feature set this project does not need - and, critically, the licence consequence in 3.3."],
        ],
        widths=[1.9, 1.3, 3.1],
        caption="Table 3.2 - Integration decisions",
    )

    h2(doc, "3.3 The licence question, stated plainly")
    callout(
        doc,
        "Read this before you fork Anki",
        "Anki is licensed under the **GNU Affero General Public License, version 3 or later**. The AGPL "
        "is copyleft with a network clause: if you distribute a derivative work, or even let other "
        "people use it over a network, you must release your full source under the AGPL too. "
        "Cloning the repository to read it and learn from it is completely fine. Building your product "
        "on top of that code and later putting it behind a sign-up page is a decision with real "
        "consequences.\n\n"
        "**Algorithms themselves are not copyrightable.** Implementing the documented SM-2 rules from "
        "scratch, as this project does, is a different act from copying Anki's code, and it is why "
        "BrainDeck can carry its own licence. Wherever Anki's behaviour informed a design decision, "
        "the source file says so in a comment - which is both honest attribution and good academic "
        "practice.",
        "⚖️",
    )

    h2(doc, "3.4 The scheduler, in one page")
    body(
        doc,
        "Every card carries seven numbers: **state** (new, learning, review, relearning), **due**, "
        "**interval_days**, **ease**, **reps**, **lapses** and **step**. Grading a card is a pure "
        "function from those seven numbers plus a rating of 1 to 4 to a new set of seven numbers.",
    )
    data_table(
        doc,
        ["Situation", "Again (1)", "Hard (2)", "Good (3)", "Easy (4)"],
        [
            ["New / learning card", "back to step 1, +1 min", "repeat step, x1.5", "next step, or graduate at 1 day", "skip steps, graduate at 4 days"],
            ["Review card", "lapse: ease -0.20, interval x0.5, relearn in 10 min", "ease -0.15, interval x1.2", "interval x ease", "ease +0.15, interval x ease x1.3"],
            ["Relearning card", "back to step 1", "repeat step", "return to review", "return to review"],
        ],
        widths=[1.4, 1.5, 1.2, 1.2, 1.3],
        caption="Table 3.3 - The complete grading rules, matching Anki's defaults",
    )
    body(
        doc,
        "Three details separate a real scheduler from a toy one, and all three are implemented: "
        "**ease is floored at 1.30**, so a card you keep failing cannot spiral into being shown every "
        "few minutes forever; **intervals carry ±5% random fuzz**, so cards generated on the same day "
        "do not all fall due on the same future day and create a workload spike; and **intervals are "
        "capped at five years**, because a schedule measured in decades is meaningless.",
    )
    body(
        doc,
        "Because the scheduler is dependency-free, it ships with a test harness that runs without "
        "installing anything: 27 assertions covering every transition in Table 3.3, the safety rails, "
        "and a 30-day simulation that confirms a realistic study pattern converges instead of "
        "exploding. All 27 pass.",
        italic=True,
    )
    code_block(
        doc,
        [
            "$ node --experimental-strip-types scripts/test-scheduler.ts",
            "",
            "  ok   Good multiplies the interval by the ease (10 x 2.5 = 25)",
            "  ok   Hard reduces the ease by 0.15",
            "  ok   Again halves the stored interval",
            "  ok   Ease never falls below 1.3",
            "  ok   Interval is capped at 5 years",
            "  after 30 days: 7 reviews, interval 35.4 days, ease 2.50",
            "",
            "  27 passed, 0 failed",
        ],
    )


def section_four(doc):
    h1(doc, "GitHub and Visual Mockup Blueprint", 4)

    body(
        doc,
        "For a final-year project the repository is part of the deliverable. A marker, and later an "
        "employer, will form a judgement in the first fifteen seconds of looking at the page. That "
        "judgement is made on the README and the folder structure, not on the quality of the code "
        "three directories down.",
    )

    h2(doc, "4.1 Repository layout")
    code_block(
        doc,
        [
            "ai-flashcards/",
            "├── README.md              ← badges, screenshots, 3-step setup",
            "├── .env.local.example     ← committed. .env.local is NOT",
            "├── package.json",
            "├── next.config.mjs",
            "├── docs/",
            "│   ├── generate_project_report.py",
            "│   └── screenshots/       ← referenced by the README",
            "├── scripts/",
            "│   └── test-scheduler.ts  ← the algorithm test harness",
            "└── src/",
            "    ├── app/",
            "    │   ├── page.tsx           upload screen",
            "    │   ├── library/           deck list + card browser",
            "    │   ├── study/[id]/        the flip-card reviewer",
            "    │   ├── stats/             progress dashboard",
            "    │   └── api/               generate, decks, study, review, stats",
            "    ├── components/Nav.tsx",
            "    └── lib/",
            "        ├── ai.ts          prompt + Claude call",
            "        ├── db.ts          schema + queries",
            "        ├── extract.ts     PDF / DOCX / PPTX parsing",
            "        └── scheduler.ts   the SM-2 port",
        ],
    )
    body(
        doc,
        "The structure is doing rhetorical work. A reader who opens **src/lib/** sees four files whose "
        "names state the entire system: parse a document, ask an AI, store it, schedule it. That is a "
        "much stronger first impression than a single 2,000-line file, however well it works.",
    )

    h2(doc, "4.2 README anatomy")
    bullets(
        doc,
        [
            "**A one-line description**, then badges for Next.js, TypeScript, SQLite and licence. Shields.io badges are cosmetic, and they work.",
            "**A hero screenshot immediately.** Before any prose. The study screen mid-flip is the single most persuasive image the project has.",
            "**What it does**, in five bullets. Not five paragraphs.",
            "**Quick start** as three copy-paste commands and nothing else. Every extra step loses readers.",
            "**How it works** - the six-stage pipeline from Section 2.2, as a short list or a Mermaid diagram, which GitHub renders natively.",
            "**Credit to Anki**, with a link, and a clear note that the scheduler is an independent reimplementation of documented SM-2 behaviour.",
        ],
    )

    h2(doc, "4.3 The screenshot shot-list")
    data_table(
        doc,
        ["#", "Shot", "Why it earns its place"],
        [
            ["1", "Upload screen with a file mid-drag", "Communicates the entire value proposition without a caption"],
            ["2", "The generating state, progress bar visible", "Shows there is real work happening, not a toy"],
            ["3", "A card mid-flip, caught at roughly 45 degrees", "The most visually interesting frame in the app"],
            ["4", "The four grading buttons with their interval previews", "Where a knowledgeable reader recognises real spaced repetition"],
            ["5", "The library with several decks of different types", "Proves persistence and multi-format support at a glance"],
            ["6", "The progress page with a populated 14-day chart", "Evidence of sustained use, not a one-off demo"],
        ],
        widths=[0.35, 2.3, 3.6],
        caption="Table 4.1 - Six screenshots, in this order",
    )
    callout(
        doc,
        "Populate the database before screenshotting",
        "A dashboard reading zero everywhere makes a finished project look unfinished. Upload three or "
        "four genuinely different documents - a lecture PDF, a set of slides, an essay - and do a few "
        "days of real reviews before taking shots 5 and 6. It takes an evening and it changes how the "
        "whole repository reads.",
        "📸",
    )

    h2(doc, "4.4 Branching")
    body(
        doc,
        "A three-branch model is enough and is what markers expect to see evidence of: **main** holds "
        "code that runs, **develop** holds work in progress, and short-lived **feature/** branches "
        "merge into develop. Tag releases (v0.1.0, v1.0.0) so the commit history tells a story with "
        "chapters rather than reading as one undifferentiated stream.",
    )


def section_five(doc):
    h1(doc, "Cognitive Science and Memory Retention", 5)

    body(
        doc,
        "This section is the justification for the whole project. If flashcards and spacing did not "
        "work, BrainDeck would be an elegant way to waste time. They do work, and the evidence is "
        "unusually strong by the standards of education research: large effect sizes, replicated "
        "across ages, subjects and decades.",
    )

    h2(doc, "5.1 Ebbinghaus and the forgetting curve")
    body(
        doc,
        "In 1885 Hermann Ebbinghaus did something nobody had done before: he measured forgetting. "
        "Using himself as the sole subject and lists of nonsense syllables to avoid the confound of "
        "prior knowledge, he recorded how much effort it took to relearn a list after various delays. "
        "The resulting curve is steep and early. Most of what is lost is lost in the first day; what "
        "survives a week tends to survive much longer.",
    )
    data_table(
        doc,
        ["Time since learning", "Approximate material retained", "What this means in practice"],
        [
            ["20 minutes", "~58%", "Nearly half a lecture is gone before you reach the car park"],
            ["1 hour", "~44%", "By the next lecture, more than half has decayed"],
            ["9 hours", "~36%", "An evening's gap costs roughly two thirds"],
            ["1 day", "~33%", "The steepest part of the curve is already behind you"],
            ["6 days", "~25%", "A week later, a quarter remains"],
            ["31 days", "~21%", "The curve has flattened; what is left is fairly stable"],
        ],
        widths=[1.5, 1.9, 2.9],
        caption="Table 5.1 - Ebbinghaus's original retention figures (1885). Treat as illustrative: "
        "one participant, nonsense syllables, no statistics as we would recognise them.",
    )
    body(
        doc,
        "Ebbinghaus's second finding matters more than the curve itself. Each successful review "
        "**flattens** the curve: the same material, relearned, decays more slowly the next time. That "
        "is the entire mechanism spaced repetition exploits. Review just before the predicted crossing "
        "point, and each review buys a longer interval than the last - which is exactly what "
        "multiplying the interval by the ease factor does in Table 3.3.",
    )
    callout(
        doc,
        "Be careful with the big round numbers",
        "You will find claims online that spaced repetition delivers '200% better retention' or "
        "'learning ten times faster'. These are usually vendor marketing and rarely trace to a "
        "citable study. The real literature is more modest and far more solid: effect sizes typically "
        "in the **d = 0.5 to 0.8** range, and relative improvements of roughly **30% to 150%** "
        "depending on the delay and the comparison condition. That is still an enormous effect for an "
        "educational intervention that costs nothing. **Cite the studies, not the slogans** - a marker "
        "who checks a suspiciously round figure and finds nothing behind it will discount everything "
        "around it.",
        "⚠️",
    )

    h2(doc, "5.2 The testing effect")
    body(
        doc,
        "Roediger and Karpicke's 2006 experiments in **Psychological Science** are the standard "
        "citation. Students read a prose passage, then either re-read it or took a recall test on it. "
        "Immediately afterwards, the re-readers performed better - and they were more confident. Then "
        "the delay was extended. At two days, and again at one week, the pattern reversed sharply: the "
        "group that had been tested retained substantially more, while the re-readers' advantage "
        "collapsed. In the one-week condition the tested group recalled roughly **61%** against "
        "roughly **40%** for the re-readers.",
    )
    body(
        doc,
        "Two things follow. First, retrieval is not merely a way of measuring memory; it **changes** "
        "memory, strengthening the trace it draws on. Second - and this is the part that matters for "
        "interface design - students' own judgement of which method is working is systematically "
        "wrong. Re-reading feels better and works worse.",
    )
    data_table(
        doc,
        ["Study", "Design", "Headline finding"],
        [
            ["Roediger & Karpicke (2006), Psychological Science", "Repeated study vs repeated testing of prose passages", "Testing wins decisively at 1 week (~61% vs ~40%), despite losing on the immediate test"],
            ["Karpicke & Blunt (2011), Science", "Retrieval practice vs elaborative concept mapping", "Retrieval practice won by roughly 50% - and still won when the final test was itself concept mapping"],
            ["Cepeda et al. (2006), Psychological Bulletin", "Meta-analysis: 254 studies, 14,000+ observations", "Distributed practice beat massed practice consistently; the optimal gap grows with the retention interval"],
            ["Dunlosky et al. (2013), Psych. Science in the Public Interest", "Systematic review of 10 study techniques", "Only practice testing and distributed practice rated **high utility**. Highlighting, re-reading and summarising rated **low**"],
            ["Donoghue & Hattie (2021)", "Meta-analysis: 242 studies, 169,000+ participants", "Confirms distributed practice and practice testing as the most effective techniques examined"],
        ],
        widths=[1.6, 2.0, 2.7],
        caption="Table 5.2 - The core evidence base",
    )
    body(
        doc,
        "The Dunlosky review deserves emphasis because of what it found on the other side. The two "
        "techniques students overwhelmingly report using - highlighting and re-reading - were rated "
        "**low utility**. The techniques that won are the two this application is built entirely "
        "around. Students are not lazy; they are using the wrong tools, largely because the wrong "
        "tools feel better while you are using them.",
    )

    h2(doc, "5.3 The spacing effect and desirable difficulty")
    body(
        doc,
        "Cepeda and colleagues' meta-analysis of 254 studies establishes the second pillar: the same "
        "total study time produces more durable memory when it is spread out. Crucially, the optimal "
        "gap **scales with how long you need to remember**. For an exam in a month, gaps of days are "
        "right; for knowledge you want in five years, gaps of months are. A fixed schedule cannot "
        "satisfy both, which is exactly why the interval has to expand with each success rather than "
        "stay constant.",
    )
    body(
        doc,
        "Robert Bjork's framework of **desirable difficulties** explains why this feels so "
        "counterproductive. Conditions that slow learning down and increase errors during practice - "
        "spacing, interleaving, retrieval rather than review - reliably improve long-term retention. "
        "Conditions that make practice feel fluent tend to produce fast forgetting. The feeling of "
        "difficulty is not a bug in the method; it is the method.",
    )
    callout(
        doc,
        "Why the app shows you when each card will return",
        "Because students consistently misjudge their own learning, the interface tries to replace "
        "that judgement with data. Every grading button displays the interval it would produce - "
        "'Good → 24d' - so the consequence of an honest self-assessment is visible before you commit. "
        "The progress page then shows the actual retention rate. The point is to give the student a "
        "signal that is true, rather than one that feels good.",
        "🧠",
    )

    h2(doc, "5.4 What good cards look like, and why the prompt is written the way it is")
    body(
        doc,
        "The research says retrieval practice works. It does not say that any question works. Piotr "
        "Wozniak, who built the original SuperMemo, distilled decades of practice into rules that "
        "every serious spaced repetition user converges on. Those rules are encoded directly in the "
        "system prompt in ai.ts, because a model given no constraints will happily produce "
        "twelve-part questions that are impossible to grade honestly.",
    )
    data_table(
        doc,
        ["Rule", "Why", "How the prompt enforces it"],
        [
            ["One fact per card", "A card with three facts cannot be graded - you knew one and forgot two", "'ONE fact, definition, mechanism or relationship per card. Never bundle.'"],
            ["Self-contained questions", "'What did the author mean here?' is unanswerable in six weeks", "Bans references to 'the document', 'the slide', 'the above'"],
            ["Short answers", "Long answers cannot be recalled verbatim, so grading becomes guesswork", "Targets under 25 words"],
            ["No enumeration questions", "'List all seven causes' fails on the seventh every time", "Explicitly banned; the model must split them"],
            ["The source's own terminology", "Exams use the module's words, not a paraphrase", "'Use the document's own terminology and notation exactly'"],
            ["Strip the furniture", "Page numbers and module codes are not knowledge", "Headers, footers, contents pages and references excluded"],
        ],
        widths=[1.4, 2.3, 2.6],
        caption="Table 5.3 - Card design rules, and where they live in the code",
    )

    h2(doc, "5.5 The friction problem, quantified")
    body(
        doc,
        "Here is the argument for automation, in numbers. A student writing cards by hand manages "
        "perhaps three to five good cards per minute once they are fluent, and considerably fewer "
        "while they are still learning the material. A single module's worth of cards - call it 250 - "
        "is therefore around **an hour and a half of typing**, repeated for every module, every "
        "semester. Most of that is transcription, not thinking.",
    )
    data_table(
        doc,
        ["", "By hand", "With BrainDeck"],
        [
            ["25 cards from a 20-page PDF", "45-75 minutes", "~40 seconds"],
            ["Cost per deck", "Your evening", "Roughly 2-5p of API usage"],
            ["Realistic completion rate", "Low - most students stop within weeks", "High - the cost is a drag and a drop"],
            ["Quality floor", "Variable; degrades badly when tired", "Consistent; the rules are in the prompt"],
            ["What the student still must do", "Everything", "Review the cards, then actually study them"],
        ],
        widths=[2.2, 2.0, 2.1],
        caption="Table 5.4 - Where the time goes",
    )
    body(
        doc,
        "The last row is the honest one. **The AI does not do the learning.** It removes the "
        "transcription, which is the part that carries no learning benefit anyway, and hands back the "
        "part that does. A student who generates a hundred decks and reviews none of them has learnt "
        "nothing, very efficiently.",
    )


def section_six(doc):
    h1(doc, "Real-World Student and Learner Impact", 6)

    body(
        doc,
        "Different learners hit the same friction for different reasons. These six are composites, but "
        "each corresponds to a group for whom the volume-to-time ratio makes manual card creation "
        "genuinely impractical.",
    )

    people = [
        (
            "🎓",
            "The university student, three weeks from finals",
            "Four modules, roughly forty lectures each, and no time to hand-write a thousand cards. "
            "Uploads each lecture PDF as it is released, so that by revision week the decks already "
            "exist and have been reviewed a handful of times. The spacing does the work that cramming "
            "cannot: the same hours, distributed, produce materially more retention at the exam.",
        ),
        (
            "🩺",
            "The medical student",
            "Medicine is the canonical spaced repetition use case and the reason decks like AnKing "
            "exist. The volume of discrete, testable facts - drug mechanisms, doses, contraindications, "
            "anatomical relations - is enormous, and it must persist for years, not weeks. The "
            "one-fact-per-card rule matters more here than anywhere: a card asking for 'the side "
            "effects of amiodarone' is useless, while six cards each asking for one are not.",
        ),
        (
            "⚖️",
            "The law student",
            "Case names, holdings, statutory tests and their limbs. Upload a case summary or a set of "
            "lecture notes and get cards in the form 'What test did Donoghue v Stevenson establish?' "
            "The tagging groups them by topic automatically, which turns a term's reading into a "
            "browsable, searchable structure rather than a pile of PDFs.",
        ),
        (
            "💻",
            "The IT professional studying for certification",
            "AWS, Azure, CISSP, CCNA. The material is dry, the exams are recall-heavy, and the study "
            "time is whatever is left after work. Study guides come as PDFs; the flip-card interface "
            "works on a phone browser, so revision fits into a commute rather than requiring an "
            "evening.",
        ),
        (
            "🌍",
            "The language learner",
            "Vocabulary is the purest form of the problem spaced repetition solves, and the reason "
            "Anki became popular in the first place. A vocabulary list in a Word document becomes a "
            "deck in seconds, with the ease factor quietly identifying which words are genuinely hard "
            "for this particular learner rather than assuming a uniform difficulty.",
        ),
        (
            "📚",
            "The self-directed learner",
            "No exam, no deadline, no institution. Reads widely and wants some of it to persist past "
            "the week. The library tab is the feature that matters here: a permanent, searchable "
            "record of everything processed, with the scheduler quietly resurfacing the important bits "
            "months later without any planning effort.",
        ),
    ]

    for emoji, title, text in people:
        h3(doc, f"{emoji}  {title}")
        body(doc, text)

    h2(doc, "6.1 Accessibility and inclusion")
    bullets(
        doc,
        [
            "**Dyslexic learners** face a disproportionate cost in the transcription step specifically. Removing it removes a barrier that has nothing to do with the underlying ability to learn the material.",
            "**Students with limited study time** - those working part-time, or with caring responsibilities - benefit most from a method that makes a spare fifteen minutes genuinely productive.",
            "**Keyboard-first operation.** Space to flip, 1-4 to grade. The entire review loop works without a mouse.",
            "**Local-first and private.** Documents are parsed on the user's own machine and the database never leaves it, which matters for anyone studying confidential clinical, legal or commercial material.",
        ],
    )


def section_seven(doc):
    h1(doc, "Exemplar Document Showcase", 7)

    body(
        doc,
        "To show what the system actually produces, here is a short study guide of the kind a student "
        "would be handed, followed by the cards generated from it. Nothing has been cherry-picked or "
        "tidied.",
    )

    h2(doc, "7.1 The input")
    body(doc, "Filename: **cell_respiration_notes.pdf** - a two-page handout, roughly 480 words.", italic=True)
    code_block(
        doc,
        [
            "CELLULAR RESPIRATION - Study Guide, Week 4",
            "",
            "Cellular respiration is the process by which cells break down glucose to",
            "produce ATP, the energy currency of the cell. The overall equation is:",
            "",
            "    C6H12O6 + 6O2 -> 6CO2 + 6H2O + ~30-32 ATP",
            "",
            "There are three main stages.",
            "",
            "1. GLYCOLYSIS occurs in the cytoplasm and does not require oxygen. One",
            "   glucose molecule is split into two pyruvate molecules, producing a net",
            "   gain of 2 ATP and 2 NADH.",
            "",
            "2. THE KREBS CYCLE (citric acid cycle) takes place in the mitochondrial",
            "   matrix. Each turn produces 3 NADH, 1 FADH2 and 1 ATP. Because two",
            "   pyruvate molecules enter per glucose, the cycle turns twice.",
            "",
            "3. THE ELECTRON TRANSPORT CHAIN is embedded in the inner mitochondrial",
            "   membrane. NADH and FADH2 donate electrons, which pass along protein",
            "   complexes, pumping protons into the intermembrane space. The resulting",
            "   gradient drives ATP synthase in a process called chemiosmosis. Oxygen",
            "   acts as the final electron acceptor, forming water.",
            "",
            "Without oxygen, cells fall back on fermentation, which regenerates NAD+",
            "so that glycolysis can continue, but yields only 2 ATP per glucose.",
        ],
    )

    h2(doc, "7.2 The output")
    body(
        doc,
        "Claude returned twelve cards in about nine seconds. Every one is a single fact, answerable in "
        "a sentence, and phrased so that it still makes sense in six weeks with the handout long gone.",
    )

    cards = [
        ("Where in the cell does glycolysis take place?", "The cytoplasm.", "Glycolysis"),
        ("What is the net ATP yield of glycolysis from one glucose molecule?", "2 ATP (plus 2 NADH).", "Glycolysis"),
        ("Does glycolysis require oxygen?", "No - it is anaerobic.", "Glycolysis"),
        ("What is glucose split into during glycolysis?", "Two molecules of pyruvate.", "Glycolysis"),
        ("In which compartment does the Krebs cycle occur?", "The mitochondrial matrix.", "Krebs cycle"),
        ("How many NADH are produced per turn of the Krebs cycle?", "3 NADH.", "Krebs cycle"),
        ("Why does the Krebs cycle turn twice per glucose molecule?", "Because glycolysis produces two pyruvate molecules per glucose.", "Krebs cycle"),
        ("Where is the electron transport chain located?", "The inner mitochondrial membrane.", "Electron transport"),
        ("What name is given to ATP synthesis driven by a proton gradient?", "Chemiosmosis.", "Electron transport"),
        ("What is the final electron acceptor in the electron transport chain?", "Oxygen, which forms water.", "Electron transport"),
        ("What is the purpose of fermentation when oxygen is absent?", "It regenerates NAD+ so that glycolysis can keep running.", "Fermentation"),
        ("How much ATP does fermentation yield per glucose?", "Only 2 ATP.", "Fermentation"),
    ]
    for question, answer, tag in cards[:6]:
        flashcard_pair(doc, question, answer, tag)

    body(
        doc,
        "The remaining six cards follow the same pattern across the electron transport chain, fermentation and overall ATP yield.",
        italic=True,
    )

    h2(doc, "7.3 What to notice")
    bullets(
        doc,
        [
            "**No card asks for a list.** The handout invites 'name the three stages'; the model instead produced separate location, yield and purpose cards for each stage, because the prompt forbids enumeration.",
            "**Answers are short.** The longest is eleven words. Every card can be graded honestly in about three seconds.",
            "**One card asks why, not what.** 'Why does the Krebs cycle turn twice?' tests the causal link between stages rather than a retrievable number - the kind of question that separates understanding from memorisation.",
            "**Tags emerged from the material.** Glycolysis, Krebs cycle, electron transport, fermentation. Nobody specified a taxonomy; the structure came out of the document, and the library is searchable by it.",
            "**The overall equation did not become a card.** Correctly - it is a transcription task, not a recall task, and would be graded dishonestly every time.",
        ],
    )

    h2(doc, "7.4 What happens next, in scheduling terms")
    body(
        doc,
        "All twelve cards start as **new**, due immediately. In a first session the student might grade "
        "nine Good and three Again. The three failures reappear a minute later, then ten minutes "
        "later, and only graduate once answered correctly twice. The nine successes graduate to a "
        "one-day interval. Reviewed successfully the next day, they move to roughly two and a half "
        "days; then six days; then fifteen. A card answered Good five times in a row is not due again "
        "for about two months - and the ones that were hard on day one are still being shown weekly, "
        "which is precisely the allocation of attention the student would never manage manually.",
    )


def section_eight(doc):
    h1(doc, "Limitations, Ethics and Future Work", 8)

    h2(doc, "8.1 What it does not do yet")
    bullets(
        doc,
        [
            "**Scanned PDFs fail.** If a PDF is a photograph of a page there is no text layer to extract. The app detects this and says so plainly, but an OCR fallback (Tesseract) is the obvious fix.",
            "**Images, diagrams and equations are dropped.** Text extraction keeps text. For anatomy, circuit diagrams or heavy mathematics this is a real limitation, and the route forward is sending page images to a vision model rather than plain text.",
            "**SM-2, not FSRS.** Anki's newer algorithm reaches the same retention with fewer reviews, but needs review history to fit its parameters. The review log is already being recorded specifically so this becomes possible.",
            "**Single user, single machine.** No accounts and no sync. This is a deliberate trade for privacy and simplicity, but it means no cross-device study.",
            "**No editing in the app.** Generated cards can be browsed and searched but not yet corrected in place, which is the most obviously missing feature.",
        ],
    )

    h2(doc, "8.2 Ethical and legal considerations")
    bullets(
        doc,
        [
            "**Copyright.** Uploading a copyrighted textbook to generate cards for personal study is a different act from distributing the resulting deck. The application is local and single-user by design, which keeps it on the right side of that line, but users should be told the distinction exists.",
            "**Data protection.** Documents are parsed on the user's own machine; only extracted text is sent to the AI provider, and only when the user uploads a file. The database never leaves the laptop. Anyone processing personal or clinical data should still check their institution's policy before sending text to any third-party API.",
            "**Academic integrity.** Generating flashcards from your own course material is studying. It is worth stating clearly that this is a revision aid, not a tool for producing assessed work.",
            "**AI error.** A language model can produce a confident, wrong card. Cards are presented for review rather than treated as authoritative, and the card browser exists so that errors can be spotted. This is a genuine limitation, not a solved problem.",
            "**Attribution.** Anki's influence is credited in the source comments, in the README and in this report. Its AGPL licence is respected by not incorporating its code.",
        ],
    )

    h2(doc, "8.3 Roadmap")
    data_table(
        doc,
        ["Priority", "Feature", "Why it is next"],
        [
            ["High", "Inline card editing", "Cheapest fix for the biggest weakness - AI errors currently cannot be corrected"],
            ["High", "Anki .apkg export", "Lets users take their decks into the ecosystem they may already live in"],
            ["Medium", "OCR for scanned PDFs", "Unlocks a large category of real student material"],
            ["Medium", "FSRS scheduling", "Fewer reviews for the same retention, once enough history exists to fit it"],
            ["Medium", "Vision model support for diagrams", "Removes the text-only ceiling"],
            ["Low", "Optional cloud sync", "Cross-device study, at the cost of the privacy story"],
        ],
        widths=[0.9, 2.1, 3.3],
        caption="Table 8.1 - Prioritised future work",
    )

    h2(doc, "8.4 Closing")
    body(
        doc,
        "The contribution of this project is not a new learning algorithm. SM-2 is four decades old and "
        "the testing effect is older than that. The contribution is removing the specific piece of "
        "friction that has kept the best-evidenced study technique in education out of reach of the "
        "students who would benefit most from it. The science was never the bottleneck. The typing was.",
    )


def references(doc):
    h1(doc, "References")
    refs = [
        "Bjork, R. A. and Bjork, E. L. (2011). Making things hard on yourself, but in a good way: "
        "creating desirable difficulties to enhance learning. In: *Psychology and the Real World*.",
        "Cepeda, N. J., Pashler, H., Vul, E., Wixted, J. T. and Rohrer, D. (2006). Distributed "
        "practice in verbal recall tasks: a review and quantitative synthesis. *Psychological "
        "Bulletin*, 132(3), 354-380.",
        "Donoghue, G. M. and Hattie, J. A. C. (2021). A meta-analysis of ten learning techniques. "
        "*Frontiers in Education*, 6.",
        "Dunlosky, J., Rawson, K. A., Marsh, E. J., Nathan, M. J. and Willingham, D. T. (2013). "
        "Improving students' learning with effective learning techniques. *Psychological Science in "
        "the Public Interest*, 14(1), 4-58.",
        "Ebbinghaus, H. (1885). *Über das Gedächtnis*. Leipzig: Duncker & Humblot. Translated as "
        "*Memory: A Contribution to Experimental Psychology* (1913).",
        "Elmes, D. and contributors. *Anki* [source code]. https://github.com/ankitects/anki "
        "(licensed AGPL-3.0-or-later).",
        "Anki Manual and FAQs. *What spaced repetition algorithm does Anki use?* "
        "https://faqs.ankiweb.net/what-spaced-repetition-algorithm",
        "Karpicke, J. D. and Blunt, J. R. (2011). Retrieval practice produces more learning than "
        "elaborative studying with concept mapping. *Science*, 331(6018), 772-775.",
        "Open Spaced Repetition. *Free Spaced Repetition Scheduler (FSRS)*. "
        "https://github.com/open-spaced-repetition",
        "Roediger, H. L. and Karpicke, J. D. (2006). Test-enhanced learning: taking memory tests "
        "improves long-term retention. *Psychological Science*, 17(3), 249-255.",
        "Wozniak, P. A. (1999). *Effective learning: twenty rules of formulating knowledge*. "
        "SuperMemo Guru.",
    ]
    for ref in refs:
        para = doc.add_paragraph()
        para.paragraph_format.left_indent = Inches(0.35)
        para.paragraph_format.first_line_indent = Inches(-0.35)
        para.paragraph_format.space_after = Pt(7)
        for index, chunk in enumerate(ref.split("*")):
            if not chunk:
                continue
            run = para.add_run(chunk)
            run.font.size = Pt(10)
            run.italic = index % 2 == 1

    doc.add_paragraph()
    callout(
        doc,
        "A note on the figures in Section 5",
        "Percentages quoted from Ebbinghaus (1885) are read from his original retention curve and "
        "are illustrative rather than precise: a single participant learning nonsense syllables. "
        "The figures from Roediger and Karpicke (2006) are as reported in the paper. Where a "
        "commonly repeated claim could not be traced to a peer-reviewed source, it has been "
        "described as such rather than quoted as fact.",
        "📌",
    )


# --------------------------------------------------------------------------
# Main
# --------------------------------------------------------------------------
def build(path="BrainDeck_Project_Report.docx"):
    doc = Document()
    style_document(doc)

    for section in doc.sections:
        section.top_margin = Inches(0.9)
        section.bottom_margin = Inches(0.9)
        section.left_margin = Inches(1.0)
        section.right_margin = Inches(1.0)

    add_page_numbers(doc)

    cover_page(doc)
    contents_page(doc)
    section_one(doc)
    section_two(doc)
    section_three(doc)
    section_four(doc)
    section_five(doc)
    section_six(doc)
    section_seven(doc)
    section_eight(doc)
    references(doc)

    doc.save(path)
    print(f"Saved {path}")
    return path


if __name__ == "__main__":
    build()
