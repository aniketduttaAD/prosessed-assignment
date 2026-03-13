"use client";

import { useEffect, useState } from "react";
import { Calendar } from "../../components/Calendar";
import { useEmployeeStore } from "../../store/employeeStore";
import { useAttendanceStore } from "../../store/attendanceStore";

export default function AttendancePage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    () => new Date(),
  );
  const [modalDate, setModalDate] = useState<Date | null>(null);
  const [visibleYear, setVisibleYear] = useState<number>(() =>
    new Date().getFullYear(),
  );
  const [visibleMonth, setVisibleMonth] = useState<number>(
    () => new Date().getMonth() + 1,
  );

  const {
    monthSummary,
    monthSummaryLoading,
    monthSummaryError,
    fetchMonthSummary,
  } = useAttendanceStore();

  useEffect(() => {
    fetchMonthSummary(visibleYear, visibleMonth);
  }, [visibleYear, visibleMonth, fetchMonthSummary]);

  return (
    <section className="attendance-page">
      <header className="attendance-page-header">
        {monthSummaryError && (
          <p className="error" style={{ fontSize: "0.8rem" }}>
            {monthSummaryError}
          </p>
        )}
      </header>
      <div className="attendance-page-calendar">
        <Calendar
          value={selectedDate}
          daySummary={
            monthSummary
              ? Object.fromEntries(
                  Object.entries(monthSummary.days).map(([date, v]) => [
                    date,
                    { ...v, totalEmployees: monthSummary.totalEmployees },
                  ]),
                )
              : undefined
          }
          onChange={(date) => {
            setSelectedDate(date);
            setModalDate(date);
          }}
          onMonthChange={(year, month) => {
            setVisibleYear(year);
            setVisibleMonth(month);
          }}
        />
        {monthSummaryLoading && (
          <div className="calendar-loading-overlay">
            <div className="calendar-loading-shimmer" />
          </div>
        )}
      </div>
      {modalDate && (
        <AttendanceDayModal
          date={modalDate}
          onClose={() => setModalDate(null)}
        />
      )}
    </section>
  );
}

type AttendanceDayModalProps = {
  date: Date;
  onClose: () => void;
};

function AttendanceDayModal({ date, onClose }: AttendanceDayModalProps) {
  const { employees, fetchEmployees } = useEmployeeStore();
  const {
    markAttendance,
    loading,
    dayStatuses,
    dayStatusLoading,
    dayStatusError,
    error: markError,
    fetchDayStatus,
    clearDayStatusError,
  } = useAttendanceStore();

  const isoDate = date.toISOString().slice(0, 10);
  const statusByEmployee = dayStatuses[isoDate] ?? {};
  const today = new Date();
  const isSameDay =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();
  const isEditable = isSameDay;

  useEffect(() => {
    clearDayStatusError();
    const load = async () => {
      if (employees.length === 0) await fetchEmployees();
      await fetchDayStatus(isoDate);
    };
    load();
  }, [
    isoDate,
    clearDayStatusError,
    fetchDayStatus,
    fetchEmployees,
    employees.length,
  ]);

  const handleMark = async (
    employeeId: number,
    status: "PRESENT" | "ABSENT",
  ) => {
    const result = await markAttendance({
      employeeId,
      date: isoDate,
      status,
    });
    if (!result.ok) {
      return;
    }
  };

  const error = dayStatusError ?? markError;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal-header">
          <div>
            <h3 className="modal-title">Mark attendance</h3>
            <p className="modal-description">
              {new Date(isoDate).toLocaleDateString(undefined, {
                weekday: "long",
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </p>
          </div>
          <button
            type="button"
            className="btn-icon"
            onClick={onClose}
            aria-label="Close"
          >
            &times;
          </button>
        </div>
        <div className="modal-body">
          {(dayStatusLoading || employees.length === 0) && (
            <p>Loading employees...</p>
          )}
          {!dayStatusLoading && employees.length > 0 && (
            <ul className="attendance-list">
              {employees.map((emp) => {
                const currentStatus = statusByEmployee[emp.id];
                return (
                  <li key={emp.id} className="attendance-list-row">
                    <div className="attendance-list-info">
                      <div className="attendance-list-name">{emp.fullName}</div>
                      <div className="attendance-list-id">{emp.employeeId}</div>
                    </div>
                    <div className="attendance-list-actions">
                      <button
                        type="button"
                        className={
                          currentStatus === "ABSENT"
                            ? "btn btn-danger"
                            : "btn btn-ghost btn-absent"
                        }
                        disabled={loading || !isEditable}
                        onClick={() => handleMark(emp.id, "ABSENT")}
                      >
                        Absent
                      </button>
                      <button
                        type="button"
                        className={
                          currentStatus === "PRESENT"
                            ? "btn btn-primary"
                            : "btn btn-ghost btn-present"
                        }
                        disabled={loading || !isEditable}
                        onClick={() => handleMark(emp.id, "PRESENT")}
                      >
                        Present
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {error && (
            <p className="error" style={{ marginTop: "0.75rem" }}>
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
