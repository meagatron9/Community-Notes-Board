import { useState, useRef } from "react";
import { Palette } from "lucide-react";
import StickyNote from "../Components/StickyNote.jsx";
import "./dashboard.css";
import TopBanner from "../Components/TopBanner.jsx";
import JoinBoardModal from "../Components/JoinBoardModal.jsx";

export default function Dashboard() {
  const MAX_CHARS = 180;
  const MAX_LINES = 7;

  const NOTE_SIZE = 180;             // ⭐ ADDED
  const ALLOWED_OVERLAP = 20;        // ⭐ ADDED
  const MIN_SEPARATION = NOTE_SIZE - ALLOWED_OVERLAP; // 160px separation needed

  const boardRef = useRef(null);     // ⭐ ADDED

  const [notes, setNotes] = useState([]);
  const [color, setColor] = useState("#fff59d");
  const [styleType, setStyleType] = useState("plain");

  const [showOptions, setShowOptions] = useState(false);

  // rich text editor
  const editorRef = useRef(null);
  const [editorHtml, setEditorHtml] = useState("");
  const [charCount, setCharCount] = useState(0);

  const [showFontMenu, setShowFontMenu] = useState(false);
  const [fontFilter, setFontFilter] = useState("");

  const [formatState, setFormatState] = useState({
    bold: false,
    italic: false,
    underline: false,
  });

  const PALETTE_OPTIONS = [
    { id: "yellow", type: "color", value: "#fff59d" },
    { id: "pink", type: "color", value: "#ffd1dc" },
    { id: "blue", type: "color", value: "#cce5ff" },
    { id: "green", type: "color", value: "#d4f8d4" },
    { id: "lined", type: "style", value: "lined" },
    { id: "grid", type: "style", value: "grid" },
    { id: "none", type: "style", value: "none" },
  ];

  const FONT_OPTIONS = [
    { label: "Default", family: "inherit" },
    { label: "Arial", family: "Arial, sans-serif" },
    { label: "Helvetica", family: "Helvetica, Arial, sans-serif" },
    { label: "Times New Roman", family: '"Times New Roman", serif' },
    { label: "Georgia", family: "Georgia, serif" },
    { label: "Courier New", family: '"Courier New", monospace' },
    { label: "Verdana", family: "Verdana, sans-serif" },
    { label: "Tahoma", family: "Tahoma, sans-serif" },
  ];

  const [boardCode, setBoardCode] = useState("ABC123");
  const [boardName, setBoardName] = useState("My Board");

  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState("");


  // ⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐
  // ⭐ RANDOM SPAWN + ANTI-OVERLAP LOGIC
  // ⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function isTooOverlappingPos(x, y, existing) {
    return existing.some(n => {
      const dx = Math.abs(n.x - x);
      const dy = Math.abs(n.y - y);
      return dx < MIN_SEPARATION && dy < MIN_SEPARATION;
    });
  }

  function getRandomCenterPosition(boardEl) {
    const boardWidth = boardEl.clientWidth;
    const boardHeight = boardEl.clientHeight;

    const centerX = boardWidth / 2 - NOTE_SIZE / 2;
    const centerY = boardHeight / 2 - NOTE_SIZE / 2;

    const offsetX = Math.random() * 200 - 100;
    const offsetY = Math.random() * 200 - 100;

    const x = clamp(centerX + offsetX, 0, boardWidth - NOTE_SIZE);
    const y = clamp(centerY + offsetY, 0, boardHeight - NOTE_SIZE);

    return { x, y };
  }

  function findSpawnPosition(boardEl, existing) {
    if (!boardEl) return { x: 50, y: 50 };

    let candidate = getRandomCenterPosition(boardEl);

    // 1) Try many random positions
    for (let i = 0; i < 35; i++) {
      if (!isTooOverlappingPos(candidate.x, candidate.y, existing)) {
        return candidate;
      }
      candidate = getRandomCenterPosition(boardEl);
    }

    // 2) Push-away snap mode
    let { x, y } = candidate;
    const boardWidth = boardEl.clientWidth;
    const boardHeight = boardEl.clientHeight;

    for (let step = 0; step < 20 && isTooOverlappingPos(x, y, existing); step++) {
      existing.forEach(n => {
        const dx = (x + NOTE_SIZE / 2) - (n.x + NOTE_SIZE / 2);
        const dy = (y + NOTE_SIZE / 2) - (n.y + NOTE_SIZE / 2);
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        const ux = dx / dist;
        const uy = dy / dist;

        x += ux * 24;
        y += uy * 24;

        x = clamp(x, 0, boardWidth - NOTE_SIZE);
        y = clamp(y, 0, boardHeight - NOTE_SIZE);
      });
    }

    return { x, y };
  }


  // ---------- rich text helpers ----------

  function refreshFormatState() {
    setFormatState({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
    });
  }

  function handleEditorInput(e) {
    setEditorHtml(e.currentTarget.innerHTML);
    setCharCount(e.currentTarget.innerText.length);
    refreshFormatState();
  }

  function handleEditorKeyDown(e) {
    if (
      charCount >= MAX_CHARS &&
      !e.metaKey &&
      !e.ctrlKey &&
      !e.altKey &&
      e.key.length === 1
    ) {
      e.preventDefault();
      return;
    }

    const editor = editorRef.current;
    if (editor && e.key === "Enter") {
      const text = editor.innerText;
      const lines = text.split(/\n/);
      if (lines.length >= MAX_LINES) {
        e.preventDefault();
        return;
      }
    }
  }

  function focusEditor() {
    if (editorRef.current) editorRef.current.focus();
  }

  function applyCommand(cmd) {
    focusEditor();
    document.execCommand(cmd, false, null);
    refreshFormatState();
  }

  function applyFont(family) {
    focusEditor();
    if (family === "inherit") {
      document.execCommand("removeFormat", false, null);
    } else {
      const firstName = family.split(",")[0];
      document.execCommand("fontName", false, firstName.replace(/"/g, ""));
    }
    refreshFormatState();
  }


  // ---------- add note ----------
  function addNote() {
    if (!editorRef.current) return;

    const plain = editorRef.current.innerText
      .split(/\n/)
      .slice(0, MAX_LINES)
      .join("\n")
      .trim();

    if (!plain) return;

    // ⭐ NEW: find good spawn spot
    const boardEl = boardRef.current;
    const { x, y } = findSpawnPosition(boardEl, notes);

    const newNote = {
      id: Date.now(),
      html: editorHtml,
      color,
      styleType,
      x,
      y,
      rotation: (Math.random() * 8 - 4).toFixed(2),
      shadowDepth: Math.floor(Math.random() * 4) + 2,
    };

    setNotes([...notes, newNote]);

    editorRef.current.innerHTML = "";
    setEditorHtml("");
    setCharCount(0);
    refreshFormatState();
  }


  // ---------- render ----------
  const filteredFonts = FONT_OPTIONS.filter((f) =>
    f.label.toLowerCase().includes(fontFilter.toLowerCase())
  );

  return (
    <div className="dashboard-wrapper">

      <TopBanner
        boardCode={boardCode}
        boardName={boardName}
        onChangeBoardName={setBoardName}
        onJoinBoardClick={() => setShowJoinModal(true)}
      />

      <div className="notes-board" ref={boardRef}>
        {notes.map((note) => (
          <StickyNote
            key={note.id}
            note={note}
            notes={notes}
            setNotes={setNotes}
          />
        ))}
      </div>

      {/* ---------- input + toolbar + buttons ---------- */}
      <div className="note-controls">
        <div className="note-input-wrapper">
          <div
            ref={editorRef}
            className={`note-editor note-style-${styleType}`}
            contentEditable
            suppressContentEditableWarning
            onInput={handleEditorInput}
            onKeyDown={handleEditorKeyDown}
            style={{ "--note-color": color }}
            data-placeholder="Write your note to post to the board..."
          />
          <div className="char-count">
            {charCount}/{MAX_CHARS}
          </div>

          <div className="text-style-toolbar">
            <button
              type="button"
              className={`text-style-btn ${formatState.bold ? "active" : ""}`}
              onClick={() => applyCommand("bold")}
            >
              <strong>B</strong>
            </button>

            <button
              type="button"
              className={`text-style-btn ${formatState.italic ? "active" : ""}`}
              onClick={() => applyCommand("italic")}
            >
              <i>i</i>
            </button>

            <button
              type="button"
              className={`text-style-btn ${formatState.underline ? "active" : ""}`}
              onClick={() => applyCommand("underline")}
            >
              <u>u</u>
            </button>

            <div className="font-dropdown">
              <button
                type="button"
                className="text-style-btn"
                onClick={() => setShowFontMenu((v) => !v)}
              >
                Font
              </button>

              {showFontMenu && (
                <div className="font-menu">
                  <input
                    className="font-search"
                    placeholder="Search font..."
                    value={fontFilter}
                    onChange={(e) => setFontFilter(e.target.value)}
                  />

                  <div className="font-options">
                    {filteredFonts.map((f) => (
                      <button
                        key={f.label}
                        type="button"
                        className="font-option"
                        onClick={() => {
                          applyFont(f.family);
                          setShowFontMenu(false);
                        }}
                        style={{ fontFamily: f.family }}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* colors + styles radial menu */}
        <div className="color-wrapper">
          <button
            className="color-btn"
            type="button"
            onClick={() => setShowOptions((v) => !v)}
          >
            <Palette size={18} />
          </button>

          {showOptions && (
            <div className="color-arc">
              {PALETTE_OPTIONS.map((opt, index) => {
                const radius = 32;
                const startDeg = -140;
                const stepDeg = 360 / PALETTE_OPTIONS.length;
                const angleDeg = startDeg + index * stepDeg;
                const angleRad = (angleDeg * Math.PI) / 180;

                const xPos = Math.cos(angleRad) * radius;
                const yPos = Math.sin(angleRad) * radius;

                const isColor = opt.type === "color";

                const classes = [
                  "option-dot",
                  isColor ? "color-dot" : "style-dot",
                ];

                if (!isColor) classes.push(`style-${opt.value}`);

                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={classes.join(" ")}
                    style={{
                      transform: `translate(${xPos}px, ${yPos}px) translate(-50%, -50%)`,
                      backgroundColor: isColor ? opt.value : "transparent",
                    }}
                    onClick={() => {
                      if (isColor) setColor(opt.value);
                      else setStyleType(opt.value);
                      setShowOptions(false);
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>

        <button className="add-btn" type="button" onClick={addNote}>
          Post Note
        </button>
      </div>
    </div>
  );
}
