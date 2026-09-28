# Adventure Land: Blockly Edition

This fork of [Adventure Land](https://adventure.land) adds a **BLOCKLY** panel next to the in-game **CODE** editor. Students snap blocks together to program their character; the blocks turn into JavaScript, which runs in the game's normal code runner. It's meant for middle and high school students learning to program.

- Running a classroom server (Proxmox, Docker): [deploy/README.md](deploy/README.md)
- Putting it on the internet with a Cloudflare Tunnel: [deploy/CLOUDFLARE.md](deploy/CLOUDFLARE.md)

## How it works

1. **BLOCKLY** (top-right bar) opens the panel. Students drag blocks from the categories on the left.
2. Every change regenerates the JavaScript in the **generated code** box under the blocks. Students can read it to see what their blocks mean, and edit it by hand; **RUN** runs whatever is in the box.
3. **RUN** calls `start_runner()`, the same thing the CODE panel's ENGAGE button does. The code runs in the `maincode` iframe, where the whole [runner API](js/runner_functions.js) (`move`, `attack`, `smart_move`, ...) is available. **STOP** calls `stop_runner()`.
4. The workspace autosaves in the browser. **SAVE** and **LOAD** download and open `.xml` files. **EXAMPLES** loads a ready-made program, and **RESET** goes back to the starter bot.

The "Every ___ ms do" block is each program's main loop. It runs its blocks, waits, and repeats, and it never starts a new round before the previous one has finished. That's why blocks that take a while (`await smart_move`, `await attack`) are safe inside it.

When an action block can't run, it writes the reason in the small message box at the bottom right: "Too far to attack", "Charge is not a mage skill", "No hpot0 in the inventory", and so on. This way students aren't left guessing why nothing happens.

## Files

| File | What's in it |
|---|---|
| `js/blockly/custom_blocks.js` | Every Adventure Land block: its look and the JavaScript it becomes, grouped by toolbox category |
| `js/blockly/examples.js` | The example programs (the first one is the starter bot) |
| `js/blockly/panel.js` | The panel: open/close, RUN/STOP, save/load, autosave, examples menu |
| `htmls/contents/blockly.html` | The panel's HTML and the **toolbox** (which blocks appear in which category) |
| `css/blockly.css` | Panel styles |
| `js/blockly/13.3.0/` | Blockly itself, vendored so it works offline and never changes under you |
| `test/blockly/` | Tests (see below) |
| `htmls/index.html` | Loads the scripts, includes the panel, adds the BLOCKLY buttons (marked "Blockly Edition") |

## The blocks

**Loops:** Every ___ ms do · Wait (ms) · Wait until · plus Blockly's repeat / while / for loops (`while` loops pause 250 ms per round so they can't freeze the game).

**Movement:**
- Move to X Y · Move Up/Down/Left/Right
- Travel to (shops and maps) · Travel to where [monster] live
- Move Toward (target) · Follow Player · Teleport to Town · Stop Moving · Dodge

**Combat:**
- Set Target to · Attack · Use Skill · Cast Spell · Heal · Respawn (if dead)
- Can Attack · Skill is ready · Is In Range
- Current Target · Targeted Monster · ___ exists

**Me:** My [HP, HP %, MP, level, XP, gold, position, ...] · Get Character HP/MP/Level/X/Y · Is Character Moving · Is Character Dead · Has Buff.

**Monsters:**
- Nearest Monster · Nearest [type] · Nearest Monster giving at least XP / with attack at most
- Monster [HP, XP, gold, type, ...] of · Is a Monster within ___ pixels · Monster XP/Gold is below · Distance to

**Players:** Nearest Player · Player named · Name · Player [HP, name, class, target, party leader, ...] of · Is Moving.

**Party:** Invite ___ to my party · Accept party invite from.

**Items:** Use HP or MP Potion · Loot Chests · Use Item · How many ___ I have · Buy.

**Messages:** Show Message (the small CODE box) · Write to Game Log · Say in Chat · Log to Browser Console · Note (a comment).

Plus Blockly's standard Logic, Math, Text, Variables and Functions blocks. Functions become `async` functions, so movement and combat blocks work inside them.

**Dropdowns** come from the game data:
- **Skills:** only the student's class skills, plus the abilities everyone has.
- **Destinations:** shops first, then maps you can walk to.
- **Monsters:** only ones that live on normal maps, weakest first.

If a saved program uses a value that isn't in a list (another class's skill, for example), the value is kept, not swapped for something else.

**Retired blocks** are still defined, so old programs load and run, but they're no longer in the toolbox:
- Use Skill by Name
- Get Monster HP/XP/Gold/X/Y (use "Monster [ ] of")
- Get Player HP/MP from (use "Player [ ] of")
- the old "set variable" block

## Saved-program compatibility

Saved programs (`.xml` files and the browser autosave) store each block's **type name**, **field names** and **input names**, such as `useSkill`, `SKILL_NAME` and `TARGET`. **Never rename them.** You can freely change a block's label, tooltip, colour, the code it generates, or which category it's in. To replace a block, add a new one and move the old one to "Retired blocks" at the end of `custom_blocks.js`.

`test/blockly/fixtures/legacy_all_blocks.xml` is a workspace that the original 2024 version saved, with every one of its blocks. The tests load it to make sure nothing breaks.

## Adding a block

1. In `js/blockly/custom_blocks.js`, add a `defineBlock(...)` in the right category section:

   ```js
   defineBlock(
   	"sayHello", // type name: saved in students' files, never change it
   	COLOURS.output,
   	function () {
   		this.appendDummyInput().appendField("Say hello to").appendField(new Blockly.FieldTextInput("friend"), "NAME");
   		action(this, "Says hello in chat"); // action() = a block in a stack; value() = a block that gives back a value
   	},
   	(block) => `say("Hello " + ${quote(block.getFieldValue("NAME"))});\n`,
   );
   ```

2. Add `<block type="sayHello"></block>` to the right category in `htmls/contents/blockly.html`. Give value inputs a `<shadow>` default, the way the existing blocks do.
3. Run the tests. `verify_in_game.js` has a list of cases at the top; add one for your block.

Tips:
- Use functions from the runner API (`js/runner_functions.js`, `js/runner_compat.js`; the in-game DOCS button documents them). Most actions return Promises that **reject** when they fail. Either `await` them inside `try { } catch (error) { }`, or let the loop's catch report the error in the game log.
- If a helper function is needed, add it with `helper(...)` (see `provideTrySkill`). It's only included when a block uses it, and it goes at the bottom of the generated code.
- If a block checks a monster or player, handle "nothing there": `(${entity} || {}).hp`.

## Tests

```sh
cd test/blockly
npm install
npm test                     # fast: generated code, toolbox, examples, old saved files
npx playwright install chromium
BASE=http://localhost npm run verify-in-game   # runs every block in a real game server and a real browser
```

`npm test` takes about a second and needs no server. `verify-in-game` signs up a test character on the server at `BASE`, walks it to some monsters, and runs every block, every dropdown option and the example programs. It reports what each one did. Point it at a test server, not the one your class uses.

## Adventure Land, for developers

This fork follows [kaansoral/adventureland_mongodb](https://github.com/kaansoral/adventureland_mongodb), the current Node.js + MongoDB version of the game. The original Python/App Engine repository was retired in March 2026. Merge upstream with `git fetch upstream && git merge upstream/main` (see deploy/README.md).

- **`main.js`**: the website and API (Express, nunjucks templates in `htmls/`). It loads `common/` (the shared engine, [common_engine](https://github.com/kaansoral/common_engine)) and `secretsandconfig/` (config). Upstream symlinks both; the Docker image downloads the engine and uses `deploy/config/`.
- **`node/server.js <server key>`**: the game world (Socket.IO). Browsers connect straight to it at the server's `address` from the config.
- The two share **MongoDB**. The website also calls the game server's `/server.api/` with the `ACCESS_MASTER` key, which is why both processes need the same fixed keys. MongoDB must be a **replica set**, because the game uses transactions.
- **Game data** (items, monsters, skills, maps) lives in `design/` and reaches the browser as the `G` object (`/data.js`). The map geometry comes from MongoDB, loaded by `scripts/seed_mongodb.js`.
- **Client:**
  - `js/game.js` and `js/functions.js` run the game page.
  - `js/runner_functions.js` is the player-facing code API that runs in the code iframe (`htmls/runner.html`). Its `parent` is the game page, so `parent.entities`, `parent.G` and so on are available.
- **Upstream files this fork edits** (small changes, each marked "Blockly Edition"):
  - `htmls/index.html`
  - `adventure_functions.js` (`server_url`: the website reaches the game server on the same machine directly)
  - `api.js` (a school's IP exception also lifts the signup limit)
- **Quirks worth knowing:**
  - Web signups only work with `Dev: true`, and Dev mode logs API arguments, passwords included.
  - `unsecure_admin` makes *every* visitor an admin; keep it off.
  - After a crash the game server refuses to start for about 12 minutes ("Server Exists"). `deploy/scripts/classroom.js mark-offline` clears it, and Docker runs that automatically.
