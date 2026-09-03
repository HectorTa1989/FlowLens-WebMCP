# DataCanvas — Collaborative Data Analytics Workspace

> **Tagline:** Tell your agent what you want to know. Watch the chart appear.

---

## Why This Wins

DataCanvas targets the most technically ambitious judging profile: Andrew Galloni
(Cloudflare VP R&I) wants to see edge-scale data pipelines; Jude Gao (Vercel/Next.js
Core Team) wants to see streaming and React Server Components pushed to their limits;
Sean Roberts (Netlify VP Applied AI) wants a genuinely AI-first architecture. This
submission delivers all three — and does something no competing hackathon entry is likely
to attempt: **it uses WebMCP tools to let an agent construct, modify, and annotate data
visualizations in real time, treating every chart element as a live, tool-accessible
UI surface.**

The key differentiator is bidirectionality: the human can brush/select chart regions, and
that selection is immediately exposed as a WebMCP context tool — the agent can read what
the human is looking at and respond to it without the human having to type a description.
This is the most direct demonstration of the core WebMCP thesis: shared browser context
between humans and agents, not a text relay.

---

## The Problem

Data analysts split their time across three disconnected worlds:
- **SQL editors** (Metabase, Redash) for querying
- **Notebook environments** (Jupyter, Observable) for exploration
- **BI dashboards** (Looker, Tableau) for presentation

Each transition requires copy-pasting queries, reformatting results, and rebuilding charts
from scratch. AI assistants like ChatGPT can write SQL or explain a dataset — but they
can't *see* the chart you're looking at, can't brush a selection and ask "why is this
cluster different?", and can't add an annotation to the visualization you just generated.
The analyst is the bridge between the AI and the actual visualization, doing manual
translation work that defeats the purpose of having an AI assistant.

---

## The Solution

DataCanvas is a browser-native analytics workspace where an AI agent and a human analyst
share the same chart canvas. The agent can:
- Query a connected data source
- Render results as a chart (choosing the right type automatically)
- Read the human's current chart selection
- Add annotations, trendlines, and reference lines to the canvas
- Drill into a highlighted region
- Export the analysis as a slide-ready report

The human stays in full control: they can override any chart choice, edit SQL before it
runs, and approve before any data export. The agent does the exploration and explanation.

---

## WebMCP Tools

```js
// 1. Run a SQL query against the connected data source
await document.modelContext.registerTool({
  name: "run-query",
  title: "Run SQL Query",
  description: "Executes a SQL query against the connected data source and returns the result as a JSON table. Max 10,000 rows. Use this to answer analytical questions.",
  inputSchema: {
    type: "object",
    properties: {
      sql: {
        type: "string",
        description: "The SQL query to run. Use only SELECT statements."
      },
      description: {
        type: "string",
        description: "A plain-English description of what this query answers"
      }
    },
    required: ["sql", "description"]
  },
  execute: async ({ sql, description }, { signal }) => {
    // Calls a Next.js server action that runs the query via a read-only connection
    const result = await runReadOnlyQuery(sql, signal);
    return {
      description,
      columns: result.columns,
      rows: result.rows,
      rowCount: result.rowCount,
      executionMs: result.executionMs
    };
  },
  annotations: { readOnlyHint: true }
});

// 2. Render a chart from query results
await document.modelContext.registerTool({
  name: "render-chart",
  title: "Render Chart",
  description: "Creates or replaces a chart on the canvas using query result data. Choose the chart type based on what best communicates the data relationship.",
  inputSchema: {
    type: "object",
    properties: {
      queryResultId: {
        type: "string",
        description: "The ID of a previous run-query result to visualize"
      },
      chartType: {
        type: "string",
        enum: ["line", "bar", "scatter", "area", "histogram", "heatmap", "treemap", "funnel"],
        description: "The chart type to use"
      },
      xField: { type: "string", description: "The column to use as the X axis" },
      yField: { type: "string", description: "The column to use as the Y axis or value" },
      colorField: { type: "string", description: "Optional: column to use for color grouping" },
      title: { type: "string", description: "Chart title" },
      position: {
        type: "string",
        enum: ["replace-current", "new-below", "new-right"],
        default: "replace-current"
      }
    },
    required: ["queryResultId", "chartType", "xField", "yField", "title"]
  },
  execute: async (params) => {
    const chartId = await renderChart(params);
    return { chartId, rendered: params.chartType, title: params.title };
  }
});

// 3. Read the current canvas selection (bidirectional!)
await document.modelContext.registerTool({
  name: "get-canvas-selection",
  title: "Read Chart Selection",
  description: "Returns the data points currently selected or brushed by the user on the chart canvas. Use this to understand what the human is focused on without them having to describe it.",
  inputSchema: { type: "object", properties: {} },
  execute: async () => {
    const selection = getCanvasSelection(); // reads Recharts/D3 brush selection state
    if (!selection || selection.points.length === 0) {
      return { hasSelection: false, message: "No selection active" };
    }
    return {
      hasSelection: true,
      chartId: selection.chartId,
      selectedRange: selection.range,    // e.g. { x: ["2024-01", "2024-06"] }
      selectedPoints: selection.points,  // the actual data rows in the selection
      aggregates: selection.aggregates   // mean, min, max, count of selection
    };
  },
  annotations: { readOnlyHint: true }
});

// 4. Add an annotation to a chart
await document.modelContext.registerTool({
  name: "add-annotation",
  title: "Add Chart Annotation",
  description: "Adds a text annotation, reference line, or highlighted region to an existing chart.",
  inputSchema: {
    type: "object",
    properties: {
      chartId: { type: "string" },
      type: {
        type: "string",
        enum: ["text", "reference-line", "reference-area", "arrow"],
        description: "The annotation type"
      },
      value: { type: "number", description: "For reference lines: the axis value to draw the line at" },
      label: { type: "string", description: "The annotation text" },
      axis: { type: "string", enum: ["x", "y"], default: "y" },
      color: { type: "string", default: "#ef4444" }
    },
    required: ["chartId", "type", "label"]
  },
  execute: async (params) => {
    addAnnotationToChart(params);
    return { annotated: params.chartId, type: params.type };
  }
});

// 5. Drill down into a data segment
await document.modelContext.registerTool({
  name: "drill-into-segment",
  title: "Drill Into Segment",
  description: "Narrows the dataset to a specific segment or filter value and adds a new chart below showing the drill-down view.",
  inputSchema: {
    type: "object",
    properties: {
      parentChartId: { type: "string" },
      filterField: { type: "string", description: "The column to filter on" },
      filterValue: { type: "string", description: "The value to filter for" },
      description: { type: "string", description: "What this drill-down is exploring" }
    },
    required: ["parentChartId", "filterField", "filterValue", "description"]
  },
  execute: async ({ parentChartId, filterField, filterValue, description }) => {
    const drillChart = await createDrillDownChart(parentChartId, filterField, filterValue);
    return { newChartId: drillChart.id, description };
  }
});

// 6. Add a trendline or statistical overlay
await document.modelContext.registerTool({
  name: "add-trendline",
  title: "Add Trendline",
  description: "Overlays a statistical trendline (linear regression, moving average, etc.) on a chart.",
  inputSchema: {
    type: "object",
    properties: {
      chartId: { type: "string" },
      type: {
        type: "string",
        enum: ["linear", "exponential", "moving-average-7d", "moving-average-30d", "polynomial"],
        default: "linear"
      },
      label: { type: "string", description: "Optional: label for the trendline in the legend" }
    },
    required: ["chartId", "type"]
  },
  execute: async ({ chartId, type, label }) => {
    addTrendline(chartId, type, label);
    return { chartId, trendline: type };
  }
});

// 7. Export the current canvas as a report
await document.modelContext.registerTool({
  name: "export-report",
  title: "Export Analysis Report",
  description: "Exports all charts and annotations on the current canvas as a structured Markdown report with embedded SVGs. The user downloads this file.",
  inputSchema: {
    type: "object",
    properties: {
      title: { type: "string", description: "Report title" },
      executiveSummary: { type: "string", description: "1-3 sentence summary of the key findings" }
    },
    required: ["title"]
  },
  execute: async ({ title, executiveSummary }) => {
    const report = await generateReport(title, executiveSummary);
    triggerDownload(report.filename, report.content);
    return { exported: report.filename, charts: report.chartCount };
  }
});

// 8. Get schema of the connected data source
await document.modelContext.registerTool({
  name: "get-schema",
  title: "Get Data Schema",
  description: "Returns the tables and columns available in the connected data source. Use this before writing SQL queries.",
  inputSchema: {
    type: "object",
    properties: {
      tableName: {
        type: "string",
        description: "Optional: get detailed column info for a specific table"
      }
    }
  },
  execute: async ({ tableName }) => {
    return await fetchSchema(tableName);
  },
  annotations: { readOnlyHint: true }
});
```

### Dynamic Tool Registration — Selection-Aware Tools

When the user makes a chart brush selection, dynamically register tools that are only
meaningful in that context:

```js
chartCanvas.on("brush-selection-change", async (selection) => {
  // Abort previous selection tools
  selectionAC?.abort();
  if (!selection || selection.points.length === 0) return;

  selectionAC = new AbortController();
  const { signal } = selectionAC;

  // Register tool to compare selection to baseline
  await document.modelContext.registerTool({
    name: "compare-selection-to-baseline",
    title: "Compare Selection to Baseline",
    description: `Compare the currently brushed region (${selection.points.length} data points) to the overall dataset average.`,
    inputSchema: { type: "object", properties: {} },
    execute: async () => compareToBaseline(selection),
    annotations: { readOnlyHint: true }
  }, { signal });

  // Register tool to explain anomalies in this selection
  await document.modelContext.registerTool({
    name: "explain-selection-anomaly",
    title: "Explain Selection",
    description: "Generates a statistical explanation of why the currently selected region differs from the trend.",
    inputSchema: { type: "object", properties: {} },
    execute: async () => analyzeSelectionAnomaly(selection),
    annotations: { readOnlyHint: true }
  }, { signal });
});
```

---

## User Journey (E-commerce Revenue Drop)

1. Analyst connects Supabase (demo mode: pre-loaded e-commerce orders dataset, 3 tables)
2. Agent: *"I see you have an orders table with ~120k rows. What do you want to explore?"*
3. Analyst: *"Why did revenue drop in March?"*
4. Agent calls `get-schema("orders")` → sees columns: date, amount, category, region, channel
5. Agent calls `run-query` with monthly revenue by channel → gets result
6. Agent calls `render-chart(resultId, "line", "month", "revenue", "channel", "Revenue by Channel")`
   → chart appears with 4 colored lines
7. Agent calls `add-annotation(chartId, "reference-line", "March 2024 revenue drop", ...)` → red line added
8. Analyst brushes the March dip region on the chart
9. `compare-selection-to-baseline` tool auto-registers; agent calls it immediately
10. Agent: *"March email channel revenue is 43% below the 6-month average. Other channels unaffected."*
11. Agent calls `drill-into-segment(chartId, "channel", "email", "Email channel March drill-down")`
    → new chart below shows email orders by day in March
12. Agent calls `add-trendline(drillChartId, "linear")` → trendline shows the decline started March 7
13. Agent calls `add-annotation(drillChartId, "text", "Email deliverability incident started here", ...)` at March 7
14. Analyst: *"Export this"*
15. Agent calls `export-report("Revenue Drop Analysis — March 2024", "Email channel revenue declined...")`
16. **Markdown report downloads with embedded charts and findings**

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) + TypeScript |
| Charts | Recharts (brush selection support) + D3 for trendlines |
| Data source | Supabase (demo datasets pre-loaded; optional live connection) |
| SQL execution | Next.js server action → read-only Supabase connection |
| Agent | claude-sonnet-4-6 via streaming server actions |
| In-page agent | Right panel chat, same-origin |
| State | Zustand (canvas state: charts, annotations, selection) |
| Hosting | Vercel (Edge Functions for query execution) |

---

## Build Prompt

```
Build a Next.js 14 (App Router, TypeScript) web app called "DataCanvas" — a collaborative
data analytics workspace powered by WebMCP, where an AI agent and a human analyst explore
data together on a shared chart canvas.

PAGES:
- /: Connect a data source (Supabase URL + anon key) OR enter Demo Mode
- /canvas/[id]: The main analysis workspace
- /canvas/demo: Hardcoded demo with pre-loaded e-commerce dataset (orders, products,
  customers tables — 120k rows seeded via Supabase SQL seed file)

WORKSPACE LAYOUT:
Left panel (65%):
  - Schema explorer: collapsible tree of tables/columns (fetched on connect)
  - Chart canvas: vertically stacked chart cards. Each card has:
    - Title (editable by human)
    - Recharts chart with brush selection enabled
    - Action bar: change chart type, add trendline, duplicate, delete
    - Annotation overlay (text bubbles, reference lines from WebMCP tools)
    - Small badge showing which WebMCP tools generated this chart

Right panel (35%):
  - Agent chat (claude-sonnet-4-6 via /api/chat server action, streaming)
  - Tool call cards: each tool call shown as a collapsible card with name, args, result
  - "Available tools" expandable section showing live WebMCP tool list
  - Token usage counter

WEBMCP TOOLS (registered in canvas client component):
1. run-query(sql, description) → readOnlyHint: true
   - Executes via /api/query server action (Supabase read-only connection)
   - Caches results in component state with a UUID resultId
   - AbortSignal passed through to the fetch
2. render-chart(queryResultId, chartType, xField, yField, colorField?, title, position?)
   - Creates/replaces a Recharts chart card in the canvas state
3. get-canvas-selection() → readOnlyHint: true
   - Returns Recharts brush state: selected range + data points in selection
4. add-annotation(chartId, type, label, value?, axis?, color?)
   - Adds annotation overlay to a chart card
5. drill-into-segment(parentChartId, filterField, filterValue, description)
   - Runs a filtered version of the parent chart's query, renders new chart below
6. add-trendline(chartId, type, label?)
   - Adds a computed trendline overlay using regression-js
7. export-report(title, executiveSummary?)
   - Serializes all chart cards + annotations to Markdown with embedded base64 SVGs
   - Triggers browser download
8. get-schema(tableName?)
   - readOnlyHint: true
   - Queries Supabase information_schema

DYNAMIC TOOLS (brush selection):
When Recharts fires onBrushChange with a non-empty selection:
  - Abort previous selectionAC controller
  - Create new selectionAC
  - Register: compare-selection-to-baseline() → readOnlyHint: true
  - Register: explain-selection-anomaly() → readOnlyHint: true
When selection cleared: abort selectionAC (tools auto-unregistered via signal)
Show a toolchange listener that logs each registration/unregistration to the agent panel.

AGENT:
System prompt: "You are a data analyst assistant. You have access to WebMCP tools to
query the connected database, render charts, annotate them, and drill into segments.
Always call get-schema before writing SQL. Prefer calling render-chart after run-query
to show results visually. When the user asks about something specific on the chart,
call get-canvas-selection to read what they're looking at."
Parse tool calls from Claude's response (JSON block format).
Execute tool calls via executeTool(); stream results back to the panel.

DEMO DATASET:
Supabase SQL seed file at /supabase/seed.sql:
- orders(id, created_at, amount, category, region, channel, product_id, customer_id)
- products(id, name, category, price, margin_pct)
- customers(id, region, acquisition_channel, signup_date)
120k order rows spanning Jan 2023 – Dec 2024 with a built-in March 2024 email revenue
anomaly and a Q4 2024 seasonal spike.

REGRESSION LIBRARY:
Use regression-js (npm: regression) for trendline computation client-side.

ANNOTATIONS:
- run-query, get-canvas-selection, get-schema, export-report: readOnlyHint: true
- run-query: untrustedContentHint: false (we control the DB)

OPEN SOURCE: MIT license. Vercel deployment. Include a README with demo walkthrough.
```

---

## Judging Criteria Alignment

| Criterion | How DataCanvas scores |
|---|---|
| **WebMCP Leverage** | 8 tools + 2 dynamic selection tools; brush-driven dynamic registration; AbortSignal on queries; `toolchange` logging; most sophisticated tool lifecycle of all 5 submissions |
| **Execution** | Full analytics workspace, interactive charts, brush selection, annotations, trendlines, export |
| **Potential Impact** | Every data analyst, startup founder, and BI team. Direct path to a $49/month SaaS replacing parts of Metabase/Observable |
| **Creativity & Ambition** | **Bidirectional context**: human's chart brush selection becomes a live WebMCP context signal — the agent can read what the human is looking at without the human describing it. No competing submission will have this. |

---

## The Killer Demo Moment

At 1:45 in the demo video:

> The analyst brushes the March dip on the chart. No typing. The agent's panel instantly
> shows: *"I can see you've selected March 1–15 (342 data points). Comparing to baseline…"*
> — the agent called `get-canvas-selection()` automatically via a `toolchange` listener
> that fires when the brush changes.

**This is the shot. This is the moment that wins.**

It shows, concretely and visually, what WebMCP uniquely enables vs. any other AI integration
pattern: a shared context between human and agent that neither REST APIs nor browser
extensions nor copy-paste can replicate. The human didn't type a description. The agent
didn't scrape the DOM. The chart selection was a live tool surface — and the agent just read it.
