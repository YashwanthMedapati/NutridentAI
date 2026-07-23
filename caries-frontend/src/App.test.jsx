import React from "react";
import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("react-router-dom", () => ({
  BrowserRouter: ({ children }) => <div>{children}</div>,
  Routes: ({ children }) => <div>{children}</div>,
  Route: ({ element }) => element,
  NavLink: ({ children, to, className, onClick }) => (
    <a href={to} className={typeof className === "function" ? className({ isActive: false }) : className} onClick={onClick}>
      {children}
    </a>
  ),
  Link: ({ children, to, className }) => <a href={to} className={className}>{children}</a>,
  useNavigate: () => vi.fn(),
}));

import App from "./App";

test("renders the NutriDent app shell", () => {
  render(<App />);
  expect(screen.getAllByText(/NutriDent AI/i).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/Analyze Food/i).length).toBeGreaterThan(0);
});

test("renders core navigation for logs, settings, account, and privacy", () => {
  render(<App />);
  expect(screen.getAllByText(/Daily Log/i).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/Analytics/i).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/Why This Score/i).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/Settings/i).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/Sign In/i).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/Privacy/i).length).toBeGreaterThan(0);
});
