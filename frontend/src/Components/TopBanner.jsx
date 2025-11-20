import React from "react";
import "./topBanner.css";

export default function TopBanner({
  boardCode,
  boardName,
  onChangeBoardName,
  onJoinBoardClick,
}) {
  return (
    <div className="top-banner">
      <div className="banner-left">

        <div className="banner-field">
          <label>Board Code:</label>
          <div className="banner-display-box">{boardCode}</div>
        </div>

        <div className="banner-field">
          <label>Name:</label>
          <input
            value={boardName}
            onChange={(e) => onChangeBoardName(e.target.value)}
            placeholder="Board name"
          />
        </div>

      </div>

      <button className="join-board-btn" onClick={onJoinBoardClick}>
        Join Another Board
      </button>
    </div>
  );
}
