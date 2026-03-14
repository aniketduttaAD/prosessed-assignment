"use client";

import { useEffect, useRef, useState } from "react";
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
  const {
    employees,
    fetchEmployees,
    loading,
    hasMore,
    error: employeesError,
  } = useEmployeeStore();
  const {
    markAttendance,
    loading: markLoading,
    dayStatuses,
    dayStatusLoading,
    dayStatusError,
    error: markError,
    fetchDayStatus,
    clearDayStatusError,
  } = useAttendanceStore();

  const [search, setSearch] = useState("");
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const isFetchingMoreRef = useRef(false);

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
    fetchEmployees({ reset: true, search: "" });
    fetchDayStatus(isoDate);
  }, [isoDate, clearDayStatusError, fetchDayStatus, fetchEmployees]);

  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      fetchEmployees({ reset: true, search });
    }, 300);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [search, fetchEmployees]);

  useEffect(() => {
    if (!loadMoreRef.current) return;
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (
        entry.isIntersecting &&
        !loading &&
        hasMore &&
        !isFetchingMoreRef.current
      ) {
        isFetchingMoreRef.current = true;
        fetchEmployees({ search }).finally(() => {
          isFetchingMoreRef.current = false;
        });
      }
    });
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [fetchEmployees, loading, hasMore, search]);

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

  const error = dayStatusError ?? markError ?? employeesError;

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
          <div className="filter-bar attendance-modal-filter">
            <div className="filter-group filter-group-wide filter-group-search">
              <label className="filter-label">
                Search employees
                <input
                  type="text"
                  placeholder="Search by name, ID, email, or department"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
            </div>
          </div>

          {loading && employees.length === 0 ? (
            <p>Loading employees…</p>
          ) : dayStatusLoading ? (
            <p>Loading attendance…</p>
          ) : (
            <>
              {employeesError && (
                <p className="error" style={{ marginTop: "0.5rem" }}>
                  {employeesError}
                </p>
              )}
              {!dayStatusLoading &&
                !loading &&
                employees.length === 0 &&
                !employeesError && <p>No employees match your search.</p>}
            </>
          )}
          {!dayStatusLoading && employees.length > 0 && (
            <>
              <ul className="attendance-list">
                {employees.map((emp) => {
                  const currentStatus = statusByEmployee[emp.id];
                  return (
                    <li key={emp.id} className="attendance-list-row">
                      <div className="attendance-list-info">
                        <div className="attendance-list-name">
                          {emp.fullName}
                        </div>
                        <div className="attendance-list-id">
                          {emp.employeeId}
                        </div>
                      </div>
                      <div className="attendance-list-actions">
                        <button
                          type="button"
                          className={
                            currentStatus === "ABSENT"
                              ? "btn btn-danger"
                              : "btn btn-ghost btn-absent"
                          }
                          disabled={markLoading || !isEditable}
                          onClick={() => handleMark(emp.id, "ABSENT")}
                        >
                          Absent
                        </button>
                        <button
                          type="button"
                          className={
                            currentStatus === "PRESENT"
                              ? "btn"
                              : "btn btn-ghost btn-present"
                          }
                          disabled={markLoading || !isEditable}
                          onClick={() => handleMark(emp.id, "PRESENT")}
                        >
                          Present
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <div ref={loadMoreRef} />
              {loading && hasMore && (
                <div className="employee-list-loading">
                  Loading more employees…
                </div>
              )}
            </>
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
