import React from "react";
import "./joinBoardModal.css";

export default function JoinBoardModal({
  show,
  onClose,
  codeInput,
  setCodeInput,
  onJoin,
}) {
  if (!show) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <h2>Join a Board</h2>

        <input
          className="modal-input"
          placeholder="Enter board code"
          value={codeInput}
          onChange={(e) => setCodeInput(e.target.value)}
        />

        <div className="modal-buttons">
          <button className="modal-join-btn" onClick={onJoin}>Join</button>
          <button className="modal-cancel-btn" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
