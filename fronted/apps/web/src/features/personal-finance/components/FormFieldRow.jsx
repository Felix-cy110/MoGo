import React from 'react';

export function FormFieldRow({ label, htmlFor, alignStart = false, children }) {
  return (
    <div className={`form-row${alignStart ? ' form-row-start' : ''}`}>
      <label className="form-row-label" htmlFor={htmlFor}>{label}</label>
      <div className="form-row-control">{children}</div>
    </div>
  );
}
