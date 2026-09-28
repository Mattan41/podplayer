"use client";

import { useEffect, useState, type FormEvent } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth, type UserRole } from "@/lib/auth-context";
import { BaseButton, BaseCard, BaseField, BaseInput, BaseSelect } from "@/components/base";

type AllowedUser = {
  email: string;
  role: UserRole;
  note: string | null;
  expiresAt: string | null;
  createdAt: string;
  createdBy: string | null;
};

const TABLE_HEADING_CLASS = "px-6 py-3 text-xs font-normal tracking-widest text-muted";

/** Caption style for the definition terms in the mobile card list. */
const CARD_TERM_CLASS = "text-xs tracking-widest text-muted";

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
        <p className="text-sm text-muted">Loading…</p>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="flex flex-1 items-center justify-center p-8">
        <BaseCard className="w-full max-w-md p-8">
          <h1 className="font-mono text-2xl">Access denied</h1>
          <p className="mt-2 text-sm text-muted">
            This page requires the ADMIN role. Sign in with an allowlisted administrator account.
          </p>
        </BaseCard>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-8 p-8">
      <BaseCard className="p-6">
        <h1 className="font-mono text-2xl">Users</h1>
        <p className="mt-1 text-sm text-muted">
          Add a new entry or update an existing one by submitting its e-mail address.
        </p>

        <form onSubmit={submit} className="mt-6 grid gap-4 sm:grid-cols-2">
          <BaseField label="Email">
            <BaseInput
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </BaseField>

          <BaseField label="Role">
            <BaseSelect
              value={newRole}
              onChange={(event) => setNewRole(event.target.value as UserRole)}
            >
              <option value="USER">USER</option>
              <option value="ADMIN">ADMIN</option>
            </BaseSelect>
          </BaseField>

          <BaseField label="Note">
            <BaseInput
              type="text"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </BaseField>

          <BaseField label="Expires at">
            <BaseInput
              type="datetime-local"
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
            />
          </BaseField>

          <div className="sm:col-span-2">
            <BaseButton variant="cta" type="submit">
              Save
            </BaseButton>
          </div>
        </form>
      </BaseCard>

      <BaseCard>
        <div className="flex items-center justify-between border-b border-fg px-6 py-3">
          <h2 className="font-mono text-lg">Allowlist</h2>
          {isLoadingUsers ? <span className="text-xs text-muted">Loading…</span> : null}
        </div>

        {error ? <p className="border-b border-fg px-6 py-3 text-sm">{error}</p> : null}

        {/*
         * One entry list, two layouts. The table is `display: none` below md and
         * the card list is `display: none` from md upwards, so only one of them is
         * ever laid out. Nothing is hidden with opacity: that would keep the
         * overflowing table in the layout and keep the page scrolling sideways.
         * See docs/DECISIONS.md entry 9.
         */}
        <table className="hidden w-full border-collapse text-left text-sm md:table">
          <thead>
            <tr className="border-b border-fg">
              <th className={TABLE_HEADING_CLASS}>Email</th>
              <th className={TABLE_HEADING_CLASS}>Role</th>
              <th className={TABLE_HEADING_CLASS}>Note</th>
              <th className={TABLE_HEADING_CLASS}>Expires at</th>
              <th className={TABLE_HEADING_CLASS}>Created at</th>
              <th className={TABLE_HEADING_CLASS} />
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.email} className="border-b border-fg last:border-b-0">
                <td className="px-6 py-3 font-mono break-all">{user.email}</td>
                <td className="px-6 py-3">{user.role}</td>
                <td className="px-6 py-3 text-muted">{user.note ?? "–"}</td>
                <td className="px-6 py-3 text-muted">{formatTimestamp(user.expiresAt)}</td>
                <td className="px-6 py-3 text-muted">{formatTimestamp(user.createdAt)}</td>
                <td className="px-6 py-3 text-right">
                  <BaseButton variant="danger" size="sm" onClick={() => void remove(user.email)}>
                    Remove
                  </BaseButton>
                </td>
              </tr>
            ))}
            {users.length === 0 && !isLoadingUsers ? (
              <tr>
                <td colSpan={6} className="px-6 py-6 text-sm text-muted">
                  No allowlist entries yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>

        <ul className="md:hidden">
          {users.map((user) => (
            <li key={user.email} className="border-b border-fg p-6 last:border-b-0">
              <p className="font-mono text-sm break-all">{user.email}</p>

              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className={CARD_TERM_CLASS}>Role</dt>
                  <dd className="mt-1 text-sm">{user.role}</dd>
                </div>
                <div>
                  <dt className={CARD_TERM_CLASS}>Expires at</dt>
                  <dd className="mt-1 text-sm">{formatTimestamp(user.expiresAt)}</dd>
                </div>
                {user.note ? (
                  <div>
                    <dt className={CARD_TERM_CLASS}>Note</dt>
                    <dd className="mt-1 text-sm">{user.note}</dd>
                  </div>
                ) : null}
                <div>
                  <dt className={CARD_TERM_CLASS}>Created at</dt>
                  <dd className="mt-1 text-sm">{formatTimestamp(user.createdAt)}</dd>
                </div>
              </dl>

              <BaseButton
                variant="danger"
                size="sm"
                className="mt-4 w-full"
                onClick={() => void remove(user.email)}
              >
                Remove
              </BaseButton>
            </li>
          ))}
          {users.length === 0 && !isLoadingUsers ? (
            <li className="px-6 py-6 text-sm text-muted">No allowlist entries yet.</li>
          ) : null}
        </ul>
      </BaseCard>
    </main>
  );
}
