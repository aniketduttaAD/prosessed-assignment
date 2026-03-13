"use client";

import { create } from "zustand";
import { apiFetch } from "../utils/api";

export type AttendanceRecord = {
  id: number;
  employeeId: number;
  date: string;
  status: "PRESENT" | "ABSENT";
};

export type MonthSummary = {
  totalEmployees: number;
  days: Record<string, { present: number; absent: number }>;
};

type AttendanceState = {
  loading: boolean;
  error: string | null;

  monthSummary: MonthSummary | null;
  monthSummaryLoading: boolean;
  monthSummaryError: string | null;
  fetchMonthSummary: (year: number, month: number) => Promise<void>;

  dayStatuses: Record<string, Record<number, "PRESENT" | "ABSENT">>;
  dayStatusLoading: boolean;
  dayStatusError: string | null;
  fetchDayStatus: (date: string) => Promise<void>;
  clearDayStatusError: () => void;

  setError: (error: string | null) => void;
  markAttendance: (payload: {
    employeeId: number;
    date: string;
    status: "PRESENT" | "ABSENT" | string;
  }) => Promise<{ ok: boolean; error?: string }>;
};

export const useAttendanceStore = create<AttendanceState>((set, get) => ({
  loading: false,
  error: null,

  monthSummary: null,
  monthSummaryLoading: false,
  monthSummaryError: null,
  async fetchMonthSummary(year, month) {
    set({ monthSummaryLoading: true, monthSummaryError: null });
    try {
      const data = await apiFetch<{
        year: number;
        month: number;
        totalEmployees: number;
        days: Record<string, { present: number; absent: number }>;
      }>(`/attendance/month-summary?year=${year}&month=${month}`);
      set({
        monthSummary: { totalEmployees: data.totalEmployees, days: data.days },
        monthSummaryLoading: false,
      });
    } catch (err: unknown) {
      set({
        monthSummaryError:
          (err as Error)?.message ?? "Failed to load month summary.",
        monthSummary: null,
        monthSummaryLoading: false,
      });
    }
  },

  dayStatuses: {},
  dayStatusLoading: false,
  dayStatusError: null,
  async fetchDayStatus(date) {
    set({ dayStatusLoading: true, dayStatusError: null });
    try {
      const data = await apiFetch<{
        date: string;
        statuses: Record<number, "PRESENT" | "ABSENT">;
      }>(`/attendance/day?date=${date}`);
      set((s) => ({
        dayStatuses: { ...s.dayStatuses, [date]: data.statuses },
        dayStatusLoading: false,
      }));
    } catch (err: unknown) {
      set({
        dayStatusError:
          (err as Error)?.message ?? "Failed to load attendance for this day.",
        dayStatusLoading: false,
      });
    }
  },
  clearDayStatusError() {
    set({ dayStatusError: null, error: null });
  },

  setError(error) {
    set({ error });
  },

  async markAttendance(payload) {
    set({ loading: true, error: null });
    try {
      await apiFetch<AttendanceRecord>("/attendance", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const { dayStatuses } = get();
      const status = payload.status as "PRESENT" | "ABSENT";
      const nextDayStatuses = {
        ...dayStatuses,
        [payload.date]: {
          ...(dayStatuses[payload.date] ?? {}),
          [payload.employeeId]: status,
        },
      };
      set({ dayStatuses: nextDayStatuses, loading: false });
      return { ok: true as const };
    } catch (err: unknown) {
      set({
        loading: false,
        error: (err as Error)?.message ?? "Failed to mark attendance.",
      });
      return {
        ok: false as const,
        error: (err as Error)?.message ?? "Failed to mark attendance.",
      };
    }
  },
}));
