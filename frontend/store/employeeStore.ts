"use client";

import { create } from "zustand";
import { apiFetch } from "../utils/api";

export type Employee = {
  id: number;
  employeeId: string;
  fullName: string;
  email: string;
  department: string;
  departmentId?: number | null;
};

type EmployeeListResponse = {
  items: Employee[];
  page: number;
  pageSize: number;
  totalEmployees: number;
  totalDepartments: number;
  hasMore: boolean;
};

type EmployeeState = {
  employees: Employee[];
  page: number;
  hasMore: boolean;
  totalEmployees: number;
  totalDepartments: number;
  loading: boolean;
  error: string | null;
  fetchEmployees: (opts?: {
    reset?: boolean;
    search?: string;
    department?: string;
  }) => Promise<void>;
  addEmployee: (
    payload: Omit<Employee, "id">,
  ) => Promise<{ ok: boolean; error?: string }>;
  deleteEmployee: (id: number) => Promise<{ ok: boolean; error?: string }>;
};

export const useEmployeeStore = create<EmployeeState>((set, get) => ({
  employees: [],
  page: 1,
  hasMore: true,
  totalEmployees: 0,
  totalDepartments: 0,
  loading: false,
  error: null,
  async fetchEmployees(opts) {
    const { reset = false, search, department } = opts || {};
    const currentState = get();

    if (!reset && !currentState.hasMore) {
      return;
    }

    const nextPage = reset ? 1 : currentState.page + 1;

    set({ loading: true, error: null });
    try {
      const params = new URLSearchParams();
      params.set("page", String(nextPage));
      params.set("pageSize", "10");
      if (search && search.trim()) {
        params.set("search", search.trim());
      }
      if (department && department !== "all") {
        params.set("department", department);
      }

      const data = await apiFetch<EmployeeListResponse>(
        `/employees?${params.toString()}`,
      );

      set({
        employees: reset
          ? data.items
          : [...currentState.employees, ...data.items],
        page: data.page,
        hasMore: data.hasMore,
        totalEmployees: data.totalEmployees,
        totalDepartments: data.totalDepartments,
        loading: false,
      });
    } catch (err: unknown) {
      set({
        error: (err as Error)?.message ?? "Failed to load employees.",
        loading: false,
      });
    }
  },
  async addEmployee(payload) {
    set({ loading: true, error: null });
    try {
      const created = await apiFetch<Employee>("/employees", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      set({ employees: [created, ...get().employees], loading: false });
      return { ok: true as const };
    } catch (err: unknown) {
      set({ loading: false });
      return {
        ok: false as const,
        error: (err as Error)?.message ?? "Failed to add employee.",
      };
    }
  },
  async deleteEmployee(id) {
    set({ loading: true, error: null });
    try {
      await apiFetch<void>(`/employees/${id}`, { method: "DELETE" });
      const { employees, totalEmployees } = get();
      set({
        employees: employees.filter((e) => e.id !== id),
        totalEmployees: Math.max(0, totalEmployees - 1),
        loading: false,
      });
      return { ok: true as const };
    } catch (err: unknown) {
      set({
        loading: false,
        error: (err as Error)?.message ?? "Failed to delete employee.",
      });
      return {
        ok: false as const,
        error: (err as Error)?.message ?? "Failed to delete employee.",
      };
    }
  },
}));
