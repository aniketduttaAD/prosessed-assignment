"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { z } from "zod";
import { apiFetch } from "../utils/api";
import { useEmployeeStore } from "../store/employeeStore";

type DepartmentOption = {
  id: number;
  name: string;
};

type FieldErrors = {
  fullName?: string;
  email?: string;
  department?: string;
};

const employeeSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required."),
  email: z
    .string()
    .trim()
    .min(1, "Email is required.")
    .email("Enter a valid email address."),
  department: z.string().trim().min(1, "Department is required."),
});

function generateIdSuffix(): string {
  return String(Math.floor(Math.random() * 10_000)).padStart(4, "0");
}

function buildEmployeeId(fullName: string, suffix: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const first = (parts[0] ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const second = (parts[1] ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

  if (!first) return "";

  const base = second
    ? first.slice(0, 3) + second.slice(0, 3)
    : first.slice(0, 3);
  return `${base}-${suffix}`;
}

type EmployeeFormProps = {
  onClose: () => void;
};

export function EmployeeForm({ onClose }: EmployeeFormProps) {
  const addEmployee = useEmployeeStore((s) => s.addEmployee);
  const loading = useEmployeeStore((s) => s.loading);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");
  const [departmentSearch, setDepartmentSearch] = useState("");

  const [employeeId, setEmployeeId] = useState("");
  const [departmentOptions, setDepartmentOptions] = useState<
    DepartmentOption[]
  >([]);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const idSuffixRef = useRef<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstInputRef.current?.focus();
  }, []);

  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDepartmentOptions([]);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  useEffect(() => {
    const value = departmentSearch.trim();
    if (!value) {
      setDepartmentOptions([]);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const data = await apiFetch<DepartmentOption[]>(
          `/departments?search=${encodeURIComponent(value)}`,
        );
        if (!cancelled) setDepartmentOptions(data);
      } catch {
        if (!cancelled) setDepartmentOptions([]);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [departmentSearch]);

  useEffect(() => {
    const trimmed = fullName.trim();

    if (!trimmed) {
      idSuffixRef.current = null;
      setEmployeeId("");
      return;
    }

    if (!idSuffixRef.current) {
      idSuffixRef.current = generateIdSuffix();
    }

    const id = buildEmployeeId(trimmed, idSuffixRef.current);
    setEmployeeId(id);
  }, [fullName]);

  const handleDepartmentSelect = useCallback((opt: DepartmentOption) => {
    setDepartment(opt.name);
    setDepartmentSearch(opt.name);
    setDepartmentOptions([]);
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setFieldErrors({});

    const validation = employeeSchema.safeParse({
      fullName,
      email,
      department,
    });

    if (!validation.success) {
      const nextErrors: FieldErrors = {};
      for (const issue of validation.error.issues) {
        const field = issue.path[0];
        if (
          field === "fullName" ||
          field === "email" ||
          field === "department"
        ) {
          nextErrors[field] = issue.message;
        }
      }
      setFieldErrors(nextErrors);
      setFormError("Please fix the errors below before continuing.");
      return;
    }

    const result = await addEmployee({
      employeeId: employeeId || `emp-${generateIdSuffix()}`,
      fullName,
      email,
      department,
    });

    if (!result.ok) {
      setFormError(result.error ?? "Something went wrong. Please try again.");
      return;
    }

    setFormSuccess("Employee added successfully.");
    resetForm();
  };

  const resetForm = () => {
    setFullName("");
    setEmail("");
    setDepartment("");
    setDepartmentSearch("");
    setEmployeeId("");
    idSuffixRef.current = null;
    setFieldErrors({});
    setFormError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="modal">
        <div className="modal-header">
          <div>
            <h2 id="modal-title" className="modal-title">
              Add New Employee
            </h2>
            <p className="modal-description">
              Fill in the details to register a new employee.
            </p>
          </div>
          <button
            type="button"
            className="btn-icon"
            onClick={handleClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <div className="modal-body">
          <form onSubmit={handleSubmit} noValidate>
            <div className="generated-id-row">
              <span className="generated-id-label">Employee ID</span>
              {employeeId ? (
                <span className="generated-id">{employeeId}</span>
              ) : (
                <span className="generated-id-empty">auto-generated</span>
              )}
            </div>

            <div className="form-field">
              <label htmlFor="fullName" className="form-label">
                Full Name <span className="required">*</span>
              </label>
              <input
                id="fullName"
                ref={firstInputRef}
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={fieldErrors.fullName ? "input-error" : ""}
                placeholder="e.g. Jane Smith"
                autoComplete="name"
                autoCorrect="off"
              />
              {fieldErrors.fullName && (
                <span className="field-error-text" role="alert">
                  {fieldErrors.fullName}
                </span>
              )}
            </div>

            <div className="form-field">
              <label htmlFor="email" className="form-label">
                Email <span className="required">*</span>
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={fieldErrors.email ? "input-error" : ""}
                placeholder="e.g. jane@company.com"
                autoComplete="email"
                inputMode="email"
              />
              {fieldErrors.email && (
                <span className="field-error-text" role="alert">
                  {fieldErrors.email}
                </span>
              )}
            </div>

            <div className="form-field">
              <label htmlFor="department" className="form-label">
                Department <span className="required">*</span>
              </label>
              <div className="dropdown-wrapper" ref={dropdownRef}>
                <input
                  id="department"
                  type="text"
                  value={departmentSearch}
                  onChange={(e) => {
                    setDepartmentSearch(e.target.value);
                    setDepartment(e.target.value);
                  }}
                  className={fieldErrors.department ? "input-error" : ""}
                  placeholder="Type to search departments"
                  autoComplete="off"
                  role="combobox"
                  aria-expanded={departmentOptions.length > 0}
                  aria-haspopup="listbox"
                  aria-controls="dept-listbox"
                />
                {departmentOptions.length > 0 && (
                  <ul
                    id="dept-listbox"
                    className="dropdown-list"
                    role="listbox"
                    aria-label="Department suggestions"
                  >
                    {departmentOptions.map((opt) => (
                      <li
                        key={opt.id}
                        role="option"
                        aria-selected={department === opt.name}
                        onPointerDown={(e) => {
                          e.preventDefault();
                          handleDepartmentSelect(opt);
                        }}
                      >
                        {opt.name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {fieldErrors.department && (
                <span className="field-error-text" role="alert">
                  {fieldErrors.department}
                </span>
              )}
            </div>

            {formError && (
              <div className="alert alert-error" role="alert">
                {formError}
              </div>
            )}
            {formSuccess && (
              <div className="alert alert-success" role="status">
                {formSuccess}
              </div>
            )}

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={handleClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button type="submit" className="btn" disabled={loading}>
                {loading ? "Saving…" : "Add Employee"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
