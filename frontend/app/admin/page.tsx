"use client";

import { useEffect, useState, type FormEvent } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth, type UserRole } from "@/lib/auth-context";

type AllowedUser = {
  email: string;
  role: UserRole;
  note: string | null;
  expiresAt: string | null;
  createdAt: string;
  createdBy: string | null;
};

const LABEL_CLASS = "text-xs tracking-widest text-fg/70";

const INPUT_CLASS =
  "rounded-none border border-fg bg-bg px-3 py-2 text-sm text-fg focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

const CTA_BUTTON_CLASS =
  "cursor-pointer rounded-none border-2 border-cta bg-cta px-3 py-1 font-mono text-xs tracking-wide text-bg transition-colors hover:bg-bg hover:text-cta focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50";

const HEADING_CLASS = "px-6 py-3 text-xs font-normal tracking-widest text-fg/70";

function formatTimestamp(value: string | null): string {
  if (!value) {
    return "–";
  }
  return new Date(value).toLocaleString();
}

export default function AdminPage() {
  const { role, isLoading } = useAuth();

  const [users, setUsers] = useState<AllowedUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("USER");
  const [note, setNote] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const isAdmin = role === "ADMIN";

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    let isCancelled = false;

    const loadUsers = async () => {
      try {
        const response = await apiFetch("/api/admin/users");
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }
        const loaded = (await response.json()) as AllowedUser[];
        if (!isCancelled) {
          setUsers(loaded);
          setError(null);
        }
      } catch (loadError) {
        if (!isCancelled) {
          setError(
            loadError instanceof Error ? loadError.message : "Could not load the allowlist.",
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingUsers(false);
        }
      }
    };

    void loadUsers();

    return () => {
      isCancelled = true;
    };
  }, [isAdmin, reloadToken]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    try {
      const response = await apiFetch("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({
          email,
          role: newRole,
          note: note === "" ? null : note,
          expiresAt: expiresAt === "" ? null : new Date(expiresAt).toISOString(),
        }),
      });
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      setEmail("");
      setNewRole("USER");
      setNote("");
      setExpiresAt("");
      setIsLoadingUsers(true);
      setReloadToken((token) => token + 1);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not save the user.");
    }
  };

  const remove = async (targetEmail: string) => {
    setError(null);
    try {
      const response = await apiFetch(`/api/admin/users/${encodeURIComponent(targetEmail)}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      setIsLoadingUsers(true);
      setReloadToken((token) => token + 1);
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Could not remove the user.");
    }
  };

  if (isLoading) {
    return (
      <main className="flex flex-1 items-center justify-center p-8">
        <p className="text-sm text-fg/70">Loading…</p>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="flex flex-1 items-center justify-center p-8">
        <section className="w-full max-w-md rounded-none border border-fg bg-bg p-8">
          <h1 className="font-mono text-2xl">Access denied</h1>
          <p className="mt-2 text-sm text-fg/70">
            This page requires the ADMIN role. Sign in with an allowlisted administrator account.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-8 p-8">
      <section className="rounded-none border border-fg bg-bg p-6">
        <h1 className="font-mono text-2xl">Users</h1>
        <p className="mt-1 text-sm text-fg/70">
          Add a new entry or update an existing one by submitting its e-mail address.
        </p>

        <form onSubmit={submit} className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className={LABEL_CLASS}>Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={INPUT_CLASS}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className={LABEL_CLASS}>Role</span>
            <select
              value={newRole}
              onChange={(event) => setNewRole(event.target.value as UserRole)}
              className={INPUT_CLASS}
            >
              <option value="USER">USER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className={LABEL_CLASS}>Note</span>
            <input
              type="text"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className={INPUT_CLASS}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className={LABEL_CLASS}>Expires at</span>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
              className={INPUT_CLASS}
            />
          </label>

          <div className="sm:col-span-2">
            <button type="submit" className={CTA_BUTTON_CLASS}>
              Save
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-none border border-fg bg-bg">
        <div className="flex items-center justify-between border-b border-fg px-6 py-3">
          <h2 className="font-mono text-lg">Allowlist</h2>
          {isLoadingUsers ? <span className="text-xs text-fg/70">Loading…</span> : null}
        </div>

        {error ? <p className="border-b border-fg px-6 py-3 text-sm text-fg">{error}</p> : null}

        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-fg">
              <th className={HEADING_CLASS}>Email</th>
              <th className={HEADING_CLASS}>Role</th>
              <th className={HEADING_CLASS}>Note</th>
              <th className={HEADING_CLASS}>Expires at</th>
              <th className={HEADING_CLASS}>Created at</th>
              <th className={HEADING_CLASS} />
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.email} className="border-b border-fg last:border-b-0">
                <td className="px-6 py-3 font-mono">{user.email}</td>
                <td className="px-6 py-3">{user.role}</td>
                <td className="px-6 py-3 text-fg/70">{user.note ?? "–"}</td>
                <td className="px-6 py-3 text-fg/70">{formatTimestamp(user.expiresAt)}</td>
                <td className="px-6 py-3 text-fg/70">{formatTimestamp(user.createdAt)}</td>
                <td className="px-6 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => void remove(user.email)}
                    className={CTA_BUTTON_CLASS}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && !isLoadingUsers ? (
              <tr>
                <td colSpan={6} className="px-6 py-6 text-sm text-fg/70">
                  No allowlist entries yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </main>
  );
}
