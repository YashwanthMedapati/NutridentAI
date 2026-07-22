import React from "react";
import { BrowserRouter } from "react-router-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import Auth from "./Auth";

const authState = vi.hoisted(() => ({
  value: {
    user: null,
    loadingAuth: false,
    isSupabaseConfigured: true,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    resetPassword: vi.fn(),
  },
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => authState.value,
}));

function renderAuth() {
  return render(
    <BrowserRouter>
      <Auth />
    </BrowserRouter>
  );
}

describe("Auth page", () => {
  beforeEach(() => {
    authState.value = {
      user: null,
      loadingAuth: false,
      isSupabaseConfigured: true,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
    };
  });

  test("renders secure sign in form by default", () => {
    renderAuth();

    expect(screen.getByRole("heading", { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toHaveAttribute("autocomplete", "email");
    expect(screen.getByLabelText(/password/i)).toHaveAttribute("autocomplete", "current-password");
  });

  test("shows stronger password requirements for signup", () => {
    renderAuth();

    fireEvent.click(screen.getByRole("button", { name: /create one/i }));

    expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toHaveAttribute("autocomplete", "new-password");
  });

  test("shows signed-in account state", () => {
    authState.value = {
      ...authState.value,
      user: { email: "person@example.com" },
    };

    renderAuth();

    expect(screen.getByText(/person@example.com/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
  });
});
