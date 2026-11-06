# Minecraft — making money from worlds, and the AI tooling (audited Nov 2026)

Filed Nov 6, 2026 at Cherie's request ("add it all to gamepress") after
two research passes: (1) can you make money creating Minecraft worlds,
and what's the best route; (2) are there AI/MCP tools for Minecraft
like the Roblox Studio MCP. Verdicts and numbers are labelled by
source quality — the earnings figures below come from secondary
creator-economy guides, NOT Microsoft-published data; treat them as
estimates until a first payout proves otherwise.

## The money routes, ranked

### 1. Minecraft Marketplace — Partner Program (the real royalty route)

The in-game Bedrock store is curated. Unlike Roblox (anyone publishes,
~25% effective creator rate), Minecraft requires acceptance into the
Partner Program first — then pays a **70% headline creator share**
(Microsoft 30%). Platform-holder fees on console stores can reduce
the effective take; one guide puts creators at ~50% after taxes/fees.
Payouts quarterly via Microsoft Partner Center, $200 minimum.

Requirements (per the 2026 partner guides):
- 18+, and a **registered business entity** (LLC / sole prop) —
  Microsoft contracts with a business, not an individual hobbyist.
- Portfolio of **3+ polished, original Bedrock pieces** (worlds, skin
  packs, texture packs) — application samples, not yet on the store.
- Review takes ~2–12 weeks; acceptance is selective (one guide
  estimates 5–10% of applicants).

What sells: adventure/minigame worlds, survival spawns, mash-up
packs, and **Add-Ons** (gameplay-changing packs — the hot category
since 2024). Typical world pricing ~310–1,340 Minecoins (~$2–8).
Guide-estimated earnings: top partners $200K–500K/yr; a realistic
mid-tier is hundreds to a few thousand a month; per-world lifetime
$5K–100K+ for hits. Bedrock add-on/gameplay scripting is
**JavaScript** (Script API / behavior packs) — web skills transfer;
Luau does not, world-design and terrain-gen do.

Sources: https://generalistprogrammer.com/tutorials/how-to-become-minecraft-marketplace-partner-guide
and https://generalistprogrammer.com/tutorials/minecraft-marketplace-earnings-complete-creator-guide
and https://www.themoneypocket.com/articles/complete-guide-make-money-minecraft

### 2. Join an existing Marketplace partner team (the shortcut in)

Established teams (e.g. Razzleberries and its sub-teams) recruit
builders on BuiltByBit and pay **per map as a revenue share of the
royalties** — a documented offer: a few hundred to a few thousand USD
per map, solo-project share up to ~75% before team/management cuts.
No application or business entity needed to start, and the shipped
maps double as the portfolio for a later direct Partner application.
Source: https://builtbybit.com/threads/minecraft-marketplace-team-looking-for-builders.525526/
(dated 2019 — rates are indicative of the model, re-verify per team.)

### 3. Open market — commissions & premade builds for Java servers

No gate at all: sell spawns, hubs, and maps to Java server owners via
BuiltByBit, Fiverr, r/MinecraftCommissions. Documented range ~$20–500+
for a quality spawn, more for large custom maps; 50% upfront is the
norm. Gig income, not royalties — but first dollars are fastest here.

### 4. The funnel

Free releases on Planet Minecraft / MCPEDL + short-form video build
the portfolio and drive routes 1–3. (The gamepress viral pipeline —
playable link + vertical clip + viral title — maps straight onto
this.) Successful servers and content channels are adjacent income,
not world-selling; out of scope here.

### Recommended path (Moth, Nov 2026)

1. Build 3 polished Bedrock-targeted worlds with the generative
   pipeline (see tooling below); release free with videos = portfolio.
2. Pitch builds to 2–3 existing partner teams in parallel = first
   royalty money without waiting on Microsoft.
3. Apply to the Partner Program directly once the portfolio exists
   (form the business entity if this becomes real).
4. BuiltByBit commissions in the gaps for cash flow.

## AI / MCP tooling — is there a Roblox-MCP equivalent?

Short answer: **no official one.** Roblox's Studio MCP is first-party
and edits the whole place inside the editor. Mojang/Microsoft publish
no MCP server; everything below is community, and almost all of it is
**Java Edition only** — the Marketplace is Bedrock, which has nothing
comparable (see the pipeline note at the end).

### MCP servers (bot-control family)

These connect an MCP client (Claude Desktop/Code, Cursor, …) to a
bot player via the Mineflayer API. The AI joins the world as a
character and builds/mines/explores/chats at player speed, block by
block. Good for demos, prototypes, and "AI builds live" content;
slow for generating a whole sellable world.

- **yuniko-software/minecraft-mcp-server** — the flagship. Free,
  open source; natural-language control of a bot (build, explore,
  interact); supports Java 1.21.x; world open to LAN or a local
  server. https://github.com/yuniko-software/minecraft-mcp-server
- **MinecraftBuildMCP (minecraft-mcp-server-pixel)** — same family,
  building/pixel-art focus. http://mcpstore.co/server/681317e70b63a9cd4a577b84
- **mcp-minecraft-remote** (nacal) — bot control against remote
  servers, not just localhost (server needs online-mode=false).
  https://hexmos.com/freedevtools/mcp/iot-and-device-control/nacal--mcp-minecraft-remote/
- **Minecraft Client MCP** (CDX-1) — deepest client control of the
  family: pathfinding, combat, inventory/container UIs, world
  snapshots, nearby block/entity queries.
  https://glama.ai/mcp/servers/CDX-1/minecraft-client-mcp
- **RCON-based MCPs** (e.g. ReyxGPT) — AI *administers* a server
  (commands, status) rather than building. Different job; noted for
  completeness.

### GDMC-HTTP + GDPC — the generative route (best fit for us)

NOT MCP, but the closest functional equivalent to "code generates
the world" — and the one that matches a generative pipeline:

- **GDMC-HTTP** is a Java-edition mod exposing a live world over a
  local HTTP API (localhost:9000): read terrain/blocks, place blocks
  in bulk, run commands, extract structures as NBT. Current line:
  GDMC-HTTP 1.8.4 for Minecraft 1.21.11.
  https://modrinth.com/mod/WIrp0w7r
- **GDPC** is the community Python client (`pip install gdpc`) with
  geometry/heightmap helpers built on that API.
  https://pypi.org/project/gdpc/8.0.0/
- Both come from the **GDMC** (Generative Design in Minecraft)
  competition — running since 2018, 2026 edition live — where teams
  write algorithms that generate terrain-adapted settlements on
  unseen maps; recent entries bolt LLMs on for layout and narrative.
  Background: https://www.aiandgames.com/p/generative-design-in-minecraft-in
  and the API wiki: https://gendesignmc.wikidot.com/wiki:submission-httpserver

### Supporting tools

- **Mindcraft** — the best-known pre-MCP LLM-agent framework
  (Mineflayer-based, multi-bot collaboration); reference design for
  "AI agents living in Minecraft," not an MCP server.
- **Amulet** — offline Python world-file editor (MCEdit's successor):
  bulk edits, format conversion. The finishing step below.
- **WorldEdit / WorldPainter** — standard builder tooling for
  terrain and large manual edits; every commission/team workflow
  assumes them.

## The Java → Bedrock pipeline (the catch that shapes everything)

All AI tooling above is Java Edition. The money (Marketplace) is
Bedrock. Working pipeline:

1. Generate/build in **Java** (GDMC-HTTP + GDPC for procedural
   worlds; an MCP bot for hero structures / demo footage).
2. Convert to Bedrock with **Amulet / Chunker** (.mcworld).
3. Polish, add Bedrock gameplay (behavior packs, Script API — JS),
   package, and submit via a partner team or a direct Partner
   account.

Keep the Java originals as source of truth; treat the Bedrock export
like a build artifact.

## Status / next step

Research only — nothing installed or trialled yet (Nov 6, 2026).
Proposed trial when Cherie wants it: Java + GDMC-HTTP + GDPC,
generate one test settlement from a written prompt, compare against
the Roblox world-gen pipeline's output quality and iteration speed.
