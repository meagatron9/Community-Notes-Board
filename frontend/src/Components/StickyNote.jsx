import { useState, useRef, useEffect } from "react";
import { Pencil } from "lucide-react";
import "./stickyNote.css";

export default function StickyNote({ note, notes, setNotes }) {
  const [isDragging, setIsDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  // timers stored in refs (no stale state, no extra re-renders)
  const editHoverTimerRef = useRef(null);      // 3s -> show edit button
  const bringTopTimerRef = useRef(null);       // 5s -> bring to top / message

  const [showEditBtn, setShowEditBtn] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const contentRef = useRef(null);

  // selection for rich-text editing
  const savedSelection = useRef(null);

  // overlap message
  const [message, setMessage] = useState(null);
  const [messagePos, setMessagePos] = useState(null);

  // ------------------------------
  // SELECTION HELPERS
  // ------------------------------
  function saveSelection() {
    const sel = window.getSelection();
    if (sel.rangeCount > 0) {
      savedSelection.current = sel.getRangeAt(0);
    }
  }

  function restoreSelection() {
    const sel = window.getSelection();
    sel.removeAllRanges();
    if (savedSelection.current) {
      sel.addRange(savedSelection.current);
    }
  }

  // ------------------------------
  // TIMER HELPERS
  // ------------------------------
  function clearHoverTimers() {
    if (editHoverTimerRef.current) {
      clearTimeout(editHoverTimerRef.current);
      editHoverTimerRef.current = null;
    }
    if (bringTopTimerRef.current) {
      clearTimeout(bringTopTimerRef.current);
      bringTopTimerRef.current = null;
    }
  }

  // ------------------------------
  // OVERLAP CALCULATION
  // ------------------------------
  function computeOverlapInfo() {
    const NOTE_SIZE = 180;
    const thisX = note.x;
    const thisY = note.y;
    const thisRight = thisX + NOTE_SIZE;
    const thisBottom = thisY + NOTE_SIZE;

    let totalOverlapArea = 0;
    let overlappingCount = 0;
    const noteArea = NOTE_SIZE * NOTE_SIZE;

    notes.forEach((n) => {
      if (n.id === note.id) return;

      const otherX = n.x;
      const otherY = n.y;
      const otherRight = otherX + NOTE_SIZE;
      const otherBottom = otherY + NOTE_SIZE;

      const overlapWidth = Math.max(
        0,
        Math.min(thisRight, otherRight) - Math.max(thisX, otherX)
      );
      const overlapHeight = Math.max(
        0,
        Math.min(thisBottom, otherBottom) - Math.max(thisY, otherY)
      );

      if (overlapWidth > 0 && overlapHeight > 0) {
        const area = overlapWidth * overlapHeight;
        overlappingCount += 1;
        totalOverlapArea += area;
      }
    });

    if (totalOverlapArea > noteArea) {
      totalOverlapArea = noteArea;
    }

    const ratio = noteArea === 0 ? 0 : totalOverlapArea / noteArea;
    const isMostlyCovered = ratio >= 0.6; // your 60% rule

    return { isMostlyCovered, overlappingCount };
  }

  function bringNoteToTop() {
    const maxZ = notes.reduce(
      (max, n) => Math.max(max, n.zIndex || 0),
      0
    );

    setNotes(
      notes.map((n) =>
        n.id === note.id ? { ...n, zIndex: maxZ + 1 } : n
      )
    );
  }

  function handleFiveSecondHover() {
    const { isMostlyCovered, overlappingCount } = computeOverlapInfo();

    if (!isMostlyCovered) {
      // visible enough -> bring to top
      bringNoteToTop();
    } else {
      // mostly covered -> show message below cursor
      if (overlappingCount > 0 && messagePos) {
        setMessage(`${overlappingCount} notes are overlapping this note`);
      } else if (messagePos) {
        setMessage("Notes are overlapping this note");
      }

      if (messagePos) {
        const hideTimer = setTimeout(() => {
          setMessage(null);
        }, 3000);
        // no need to store hide timer; it only affects message
        return () => clearTimeout(hideTimer);
      }
    }
  }

  // ------------------------------
  // HOVER LOGIC (3s + 5s)
  // ------------------------------
  function handleMouseEnter(e) {
    if (isEditing) return;

    // track a starting position for message (center of note)
    const rect = e.currentTarget.getBoundingClientRect();
    setMessagePos({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2 + 12,
    });

    clearHoverTimers();

    // 3s -> show edit button
    editHoverTimerRef.current = setTimeout(() => {
      setShowEditBtn(true);
    }, 3000);

    // 5s -> bring to top or show overlap message
    bringTopTimerRef.current = setTimeout(() => {
      handleFiveSecondHover();
    }, 5000);
  }

  function handleMouseLeave() {
    clearHoverTimers();
    setShowEditBtn(false);
    setMessage(null);
  }

  // track cursor for positioning the message under the cursor
  function handleMouseMoveWrapper(e) {
    setMessagePos({
      x: e.clientX,
      y: e.clientY + 12,
    });

    handleMouseMove(e);
  }

  // ------------------------------
  // DRAG LOGIC
  // ------------------------------
  function handleMouseDown(e) {
    if (isEditing) {
      e.stopPropagation();
      return;
    }

    setShowEditBtn(false);
    clearHoverTimers();

    setIsDragging(true);

    const rect = e.currentTarget.getBoundingClientRect();
    setOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }

  function handleMouseMove(e) {
    if (isEditing) return;
    if (!isDragging) return;

    clearHoverTimers();
    setShowEditBtn(false);

    const board = e.currentTarget.closest(".notes-board");
    if (!board) return;

    const boardRect = board.getBoundingClientRect();
    const noteWidth = 180;
    const noteHeight = 180;

    let newX = e.clientX - boardRect.left - offset.x;
    let newY = e.clientY - boardRect.top - offset.y;

    if (newX < 0) newX = 0;
    if (newX > boardRect.width - noteWidth)
      newX = boardRect.width - noteWidth;

    if (newY < 0) newY = 0;
    if (newY > boardRect.height - noteHeight)
      newY = boardRect.height - noteHeight;

    setNotes(
      notes.map((n) =>
        n.id === note.id ? { ...n, x: newX, y: newY } : n
      )
    );
  }

  function handleMouseUp() {
    setIsDragging(false);
  }

  // cleanup on unmount
  useEffect(() => {
    return () => {
      clearHoverTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ------------------------------
  // EDIT MODE
  // ------------------------------
  function enterEditMode() {
    setIsEditing(true);
    setShowEditBtn(false);
    clearHoverTimers();

    setTimeout(() => {
      if (contentRef.current) {
        contentRef.current.focus();
        saveSelection();
      }
    }, 30);
  }

  function exitEditMode() {
    const newHTML = contentRef.current.innerHTML;

    setNotes(
      notes.map((n) =>
        n.id === note.id ? { ...n, html: newHTML } : n
      )
    );

    setIsEditing(false);
  }

  // ------------------------------
  // TEXT COMMANDS
  // ------------------------------
  function applyCommand(cmd) {
    if (!contentRef.current) return;
    contentRef.current.focus();
    restoreSelection();
    document.execCommand(cmd, false, null);
    saveSelection();
  }

  // ------------------------------
  // STYLES
  // ------------------------------
  const style = {
    "--note-color": note.color,
    transform: `translate(${note.x}px, ${note.y}px) rotate(${note.rotation}deg)`,
    boxShadow: `0 ${note.shadowDepth}px ${
      note.shadowDepth * 2
    }px rgba(0,0,0,0.25)`,
    position: "absolute",
    cursor: isDragging ? "grabbing" : "grab",
    zIndex: note.zIndex || 1,
  };

  const styleClass = `sticky-note note-style-${note.styleType || "plain"} ${
    showEditBtn ? "hover-darken" : ""
  }`;

  return (
    <>
      <div
        className={styleClass}
        style={style}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMoveWrapper}
        onMouseUp={handleMouseUp}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* EDIT BUTTON (after 3s hover) */}
        {showEditBtn && !isEditing && (
          <button
            className="edit-note-btn"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              enterEditMode();
            }}
          >
            <Pencil size={16} />
          </button>
        )}

        {/* CONTENT */}
        <div
          className={`sticky-note-content ${isEditing ? "editing" : ""}`}
          contentEditable={isEditing}
          suppressContentEditableWarning={true}
          ref={contentRef}
          onKeyUp={saveSelection}
          onMouseUp={saveSelection}
          onInput={saveSelection}
          dangerouslySetInnerHTML={{ __html: note.html }}
        />

        {/* DELETE BUTTON */}
        {!isEditing && (
          <button
            className="delete-note-btn"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setNotes(notes.filter((n) => n.id !== note.id));
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* TOOLBAR WHEN EDITING */}
      {isEditing && (
        <div
          className="note-toolbar-wrapper"
          style={{ transform: `translate(${note.x}px, ${note.y + 190}px)` }}
        >
          <div className="text-style-toolbar">
            <button
              type="button"
              className="text-style-btn"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyCommand("bold")}
            >
              <strong>B</strong>
            </button>

            <button
              type="button"
              className="text-style-btn"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyCommand("italic")}
            >
              <i>i</i>
            </button>

            <button
              type="button"
              className="text-style-btn"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyCommand("underline")}
            >
              <u>u</u>
            </button>

            <button
              type="button"
              className="text-style-btn done-btn"
              onMouseDown={(e) => e.preventDefault()}
              onClick={exitEditMode}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* OVERLAP MESSAGE BELOW CURSOR */}
      {message && messagePos && (
        <div
          className="overlap-message"
          style={{
            position: "fixed",
            left: messagePos.x + 8,
            top: messagePos.y + 8,
            background: "rgba(0,0,0,0.8)",
            color: "#fff",
            padding: "6px 10px",
            borderRadius: "6px",
            fontSize: "0.75rem",
            pointerEvents: "none",
            zIndex: 9999,
          }}
        >
          {message}
        </div>
      )}
    </>
  );
}
