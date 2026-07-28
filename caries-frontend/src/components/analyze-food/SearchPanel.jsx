import React from "react";
import { Spinner } from "../UI";

export function SearchPanel({ searchText, onChange, onSearch, loading }) {
  return (
    <div className="search-input-row">
      <input
        className="search-big-input"
        type="text"
        placeholder="Type a food name… e.g. pasta, banana, pizza"
        value={searchText}
        onChange={onChange}
        onKeyDown={e => e.key === "Enter" && onSearch()}
      />
      <button className="btn-primary" onClick={onSearch} disabled={loading}>
        {loading ? <><Spinner /> Searching…</> : "Search"}
      </button>
    </div>
  );
}
