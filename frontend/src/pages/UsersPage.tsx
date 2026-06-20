import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { createUser } from "../api/users";
import { Card, CardBody, Input, Label, Select } from "../components/ui";
import { Button } from "../components/Button";
import { PageHeader } from "../components/PageHeader";
import type { UserRole } from "../types";

const ROLES: UserRole[] = ["CASE_MANAGER", "MEDICAL_STAFF", "FINANCE", "ADMIN", "VIEWER"];

const PERMISSIONS: Record<UserRole, string[]> = {
  CASE_MANAGER: ["Create / edit / close cases", "Manage case services", "Add notes"],
  MEDICAL_STAFF: ["View cases", "Add diagnosis & medical notes", "Upload medical documents"],
  FINANCE: ["Manage pricing & contracts", "Generate invoices", "Process payments", "View financial reports"],
  ADMIN: ["Full access", "Manage users", "System configuration"],
  VIEWER: ["Read-only access to assigned cases"],
};

export function UsersPage() {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("CASE_MANAGER");
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: createUser,
    onSuccess: (user) => {
      setSuccess(`User ${user.email} created successfully.`);
      setError(null);
      setEmail("");
      setFullName("");
      setPassword("");
    },
    onError: (err: any) => {
      setError(err?.response?.data?.error ?? "Failed to create user.");
      setSuccess(null);
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    mutation.mutate({ email, fullName, password, role });
  }

  return (
    <div className="p-8">
      <PageHeader title="Users & Roles" subtitle="Manage system users and their permissions" />

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardBody>
            <h2 className="mb-3 text-sm font-semibold text-slate-700">Create new user</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <Label htmlFor="fullName">Full name</Label>
                <Input id="fullName" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="password">Temporary password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <Select id="role" value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r.replace(/_/g, " ")}
                    </option>
                  ))}
                </Select>
              </div>

              {error && <p className="text-sm text-rose-600">{error}</p>}
              {success && <p className="text-sm text-teal-700">{success}</p>}

              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Creating…" : "Create user"}
              </Button>
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h2 className="mb-3 text-sm font-semibold text-slate-700">Permissions matrix</h2>
            <div className="space-y-4">
              {ROLES.map((r) => (
                <div key={r}>
                  <div className="text-sm font-medium text-slate-800">{r.replace(/_/g, " ")}</div>
                  <ul className="mt-1 list-inside list-disc text-xs text-slate-500">
                    {PERMISSIONS[r].map((perm) => (
                      <li key={perm}>{perm}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
