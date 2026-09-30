# XML Tag Visualizer

A small browser app for exploring match analysis XML files. You pick a file on your computer; everything runs in the browser. Nothing is uploaded to a server.

## What it does

After you load an XML file, the page shows:

1. **Tag counts** — How often each tag (instance `code`) appears, with the color defined in the file’s `ROWS` section.
2. **Label groups** — How often each combination of label group and text appears (for example `RESULTADO` / `UCB 1 - 0 OR`).
3. **Tag timeline** — One horizontal lane per tag. Each instance is a bar from its `start` time to its `end` time (in seconds). Hover a bar to see exact times, duration, and that instance’s labels.

### Terminology

| Term | Meaning in this app |
|------|---------------------|
| **Tag** | The `code` on an `<instance>` (e.g. `UCB SPC+`, `Q1`, `Inicio`). |
| **Label** | A grouped note on an instance: `<label>` with `<group>` and `<text>` (e.g. `RESULTADO`, `QUARTOS`, `ANO`). |

Counts and the timeline are organized by **tags**. Labels appear in the label table and in timeline tooltips.

## How to run

No install or build step is required.

1. Open [`index.html`](index.html) in a modern browser (Chrome, Firefox, Safari, or Edge).
   - Double-click the file, or drag it into a browser window.
2. Under **Analysis XML file**, choose your `.xml` file.

To try a small example first, use [`sample/minimal-match.xml`](sample/minimal-match.xml).

If your browser blocks local scripts when opening `file://` URLs, serve the folder locally instead:

```bash
cd /Users/cam/dev/xml-viz
python3 -m http.server 8765
```

Then open `http://localhost:8765/index.html`.

## How to use the page

1. **Select a file** — The name of the chosen file appears below the file control.
2. **Read the summary** — Tag counts include a short line with total instances and number of distinct tags.
3. **Scan the tables** — Tag table: name, color swatch, count. Label table: group, text, count.
4. **Explore the timeline** — Scroll vertically through lanes and horizontally along the match duration. Axis labels use `minutes:seconds`. Short events may be drawn slightly wider so they stay visible; the tooltip still shows the real start, end, and duration.
5. **Load another file** — Pick a new file to replace the view.
6. **Errors** — If the file is invalid or missing required structure, an error message appears next to the file input. If you already had a successful load, the previous visualization stays on screen until you load a valid file.

## Expected XML shape

The app expects a root `<file>` element with:

- **`ALL_INSTANCES`** — Contains `<instance>` elements. Each instance should have `ID`, `start`, `end`, and `code`, and may have zero or more `<label>` children (`group` + `text`).
- **`ROWS`** (optional but typical) — One `<row>` per tag code, with `R`, `G`, and `B` color channels (0–65535).

Other content in the file is preserved in the in-memory model for future export features but is not shown in the current UI.

## Project layout

| Path | Role |
|------|------|
| `index.html` | Page shell and script loading |
| `styles.css` | Minimal layout |
| `src/readAnalysisFile.js` | Parse XML into an in-memory document |
| `src/writeAnalysisFile.js` | Serialize document back to XML (for future export) |
| `src/editAnalysisDocument.js` | Pure helpers for filtering/editing (for future features) |
| `src/countTags.js` | Tag and label statistics |
| `src/buildTagTimeline.js` | Timeline lane data |
| `src/renderVisualization.js` | Build the HTML view |
| `src/startApplication.js` | File input and error handling |
