// Adventure Land - Blockly Edition: the BLOCKLY panel (htmls/contents/blockly.html).
// Opening/closing, RUN/STOP, saving, loading and the examples menu.
// The blocks themselves are in custom_blocks.js, the example programs in examples.js.

var BLOCKLY_VERSION = "13.3.0";
var BLOCKLY_STORAGE_KEY = "blockly_workspace";
var blockly_workspace = null;

function toggle_block() {
	var blockui = document.getElementById("blockui");
	if (!blockui) return;
	blockui.classList.toggle("open");
	// Blockly measures its container, so resize once the panel is visible
	if (blockui.classList.contains("open") && blockly_workspace) Blockly.svgResize(blockly_workspace);
	$(":focus").blur();
}

function initBlockly() {
	var blockui = document.getElementById("blockui");
	if (!blockui || !window.Blockly) return;

	blockly_workspace = Blockly.inject("blocklyDiv", {
		toolbox: document.getElementById("toolbox"),
		media: "/js/blockly/" + BLOCKLY_VERSION + "/media/", // served locally so classrooms work offline
		collapse: true,
		comments: false,
		disable: false,
		maxBlocks: Infinity,
		trashcan: true,
		scrollbars: true,
		oneBasedIndex: true,
		zoom: {
			controls: true,
			wheel: true,
			startScale: 1.0,
			maxScale: 3,
			minScale: 0.3,
			scaleSpeed: 1.2,
		},
		grid: {
			spacing: 20,
			length: 3,
			colour: "#ccc",
			snap: true,
		},
	});

	blockly_workspace.addChangeListener(function (event) {
		if (event.isUiEvent) return;
		document.getElementById("generatedBlockCode").value = javascript.javascriptGenerator.workspaceToCode(blockly_workspace);
		blockly_autosave();
	});

	var codeOutput = document.getElementById("generatedBlockCode");

	function resizeBlockly() {
		if (!blockui.classList.contains("open")) return;
		Blockly.svgResize(blockly_workspace);
	}

	// Drag the right edge to change the panel width
	document.getElementById("blocklyResizeHandle").addEventListener("mousedown", function (e) {
		e.preventDefault();
		function drag(e) {
			blockui.style.width = Math.max(300, e.clientX - blockui.offsetLeft) + "px";
			resizeBlockly();
		}
		function stop() {
			document.removeEventListener("mousemove", drag);
			document.removeEventListener("mouseup", stop);
		}
		document.addEventListener("mousemove", drag);
		document.addEventListener("mouseup", stop);
	});

	// Drag the bar between the workspace and the code box to split the height
	document.getElementById("blocklyCodeResizeHandle").addEventListener("mousedown", function (e) {
		e.preventDefault();
		var startY = e.clientY,
			startHeight = codeOutput.offsetHeight;
		function drag(e) {
			codeOutput.style.height = Math.max(40, startHeight - (e.clientY - startY)) + "px";
			resizeBlockly();
		}
		function stop() {
			document.removeEventListener("mousemove", drag);
			document.removeEventListener("mouseup", stop);
		}
		document.addEventListener("mousemove", drag);
		document.addEventListener("mouseup", stop);
	});

	window.addEventListener("resize", resizeBlockly);
	blockly_fill_examples();
	blockly_restore();
}

document.addEventListener("DOMContentLoaded", initBlockly);

// ---------------------------------------------------------------------------
// Running
// ---------------------------------------------------------------------------

// Runs the generated code in the game's main code runner (the same iframe the CODE panel's
// ENGAGE button uses), so the game's events, on_destroy, handle_command etc. reach it.
// The code box can be edited by hand: RUN runs what's in the box.
function runBlocklyCode() {
	var code = document.getElementById("generatedBlockCode").value;
	if (code_run) stop_runner();
	start_runner(0, "// Blockly generated code\n(async () => {\n" + code + "\n})();\n");
}

function stopBlocklyCode() {
	if (code_run) stop_runner();
}

// ---------------------------------------------------------------------------
// Saving, loading and examples
// ---------------------------------------------------------------------------

function blockly_workspace_xml() {
	return Blockly.Xml.domToPrettyText(Blockly.Xml.workspaceToDom(blockly_workspace));
}

function blockly_load_xml(xmlText) {
	Blockly.Xml.clearWorkspaceAndLoadFromXml(Blockly.utils.xml.textToDom(xmlText), blockly_workspace);
}

// Keep the workspace in the browser so a page refresh doesn't lose the student's work
function blockly_autosave() {
	try {
		localStorage.setItem(BLOCKLY_STORAGE_KEY, blockly_workspace_xml());
	} catch (e) {}
}

function blockly_restore() {
	var saved = null;
	try {
		saved = localStorage.getItem(BLOCKLY_STORAGE_KEY);
	} catch (e) {}
	try {
		blockly_load_xml(saved || BLOCKLY_EXAMPLES[0].xml);
	} catch (e) {
		console.error("Blockly: couldn't restore the saved workspace, loading the starter bot", e);
		blockly_load_xml(BLOCKLY_EXAMPLES[0].xml);
	}
}

function blockly_fill_examples() {
	var select = document.getElementById("blocklyExamples");
	if (!select) return;
	BLOCKLY_EXAMPLES.forEach(function (example, index) {
		var option = document.createElement("option");
		option.value = index;
		option.textContent = example.name;
		select.appendChild(option);
	});
}

function loadExample(select) {
	var example = BLOCKLY_EXAMPLES[select.value];
	select.value = "";
	if (!example || !blockly_workspace) return;
	if (blockly_workspace.getAllBlocks().length && !confirm("Replace your blocks with the '" + example.name + "' example? (Use SAVE first if you want to keep them)")) return;
	blockly_load_xml(example.xml);
}

function resetBlocks() {
	if (!blockly_workspace) return;
	if (!confirm("Clear the workspace and start over with the starter bot? (Use SAVE first if you want to keep it)")) return;
	blockly_load_xml(BLOCKLY_EXAMPLES[0].xml);
}

function saveBlocks() {
	if (!blockly_workspace) return;
	var blob = new Blob([blockly_workspace_xml()], { type: "text/xml" });
	var link = document.createElement("a");
	link.href = URL.createObjectURL(blob);
	link.download = "blockly_workspace.xml";
	link.click();
}

function loadBlocks(event) {
	if (!blockly_workspace) return;
	var file = event.target.files[0];
	if (!file) return;
	var reader = new FileReader();
	reader.onload = function (e) {
		try {
			blockly_load_xml(e.target.result);
		} catch (err) {
			console.error("Error parsing XML:", err);
			alert("Failed to load blocks. Please make sure the file is a valid Blockly XML file.");
		}
	};
	reader.readAsText(file);
	event.target.value = ""; // allow loading the same file again
}
