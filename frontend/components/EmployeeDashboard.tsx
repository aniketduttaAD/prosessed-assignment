"use client";

import { useEffect, useRef, useState } from "react";
import { useEmployeeStore } from "../store/employeeStore";
import { EmployeeForm } from "./EmployeeForm";

export function EmployeeDashboard() {
  const {
    employees,
    fetchEmployees,
    loading,
    error,
    totalEmployees,
    totalDepartments,
    hasMore,
    deleteEmployee,
  } = useEmployeeStore();

  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isFetchingMoreRef = useRef(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchEmployees({ reset: true, search });
  }, []);

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

    return () => {
      observer.disconnect();
    };
  }, [fetchEmployees, loading, hasMore, search]);

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchEmployees({ reset: true, search });
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [search, fetchEmployees]);

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await deleteEmployee(id);
    } finally {
      setDeletingId((current) => (current === id ? null : current));
    }
  };

  return (
    <section>
      <div className="card">
        <div className="dashboard-stats">
          <div className="dashboard-stat">
            <div className="dashboard-stat-label">Total Employees</div>
            <div className="dashboard-stat-value">
              {loading && totalEmployees === 0 ? "---" : totalEmployees}
            </div>
          </div>

          <div className="dashboard-stat">
            <div className="dashboard-stat-label">Departments</div>
            <div className="dashboard-stat-value">
              {loading && totalDepartments === 0 ? "---" : totalDepartments}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="filter-bar">
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

          <div className="filter-group filter-group-actions">
            <button
              type="button"
              className="btn dashboard-add-btn"
              onClick={() => setIsAddOpen(true)}
              aria-label="Add new employee"
            >
              <span className="dashboard-add-btn-icon" aria-hidden>
                +
              </span>
              <span className="dashboard-add-btn-text">Add New Employee</span>
            </button>
          </div>
        </div>

        {loading && employees.length === 0 && <p>Loading employees...</p>}
        {error && <p className="error">{error}</p>}
        {!loading && !error && employees.length === 0 && (
          <p>No employees match the current filters.</p>
        )}

        {employees.length > 0 && (
          <>
            <div className="table-responsive employee-table-desktop">
              <table>
                <thead>
                  <tr>
                    <th>Employee ID</th>
                    <th>Full Name</th>
                    <th>Email</th>
                    <th>Department</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => (
                    <tr key={emp.id}>
                      <td data-label="Employee ID">{emp.employeeId}</td>
                      <td data-label="Full Name">{emp.fullName}</td>
                      <td data-label="Email">{emp.email}</td>
                      <td data-label="Department">{emp.department}</td>
                      <td data-label="Actions">
                        <button
                          type="button"
                          className="btn-icon btn-icon-danger"
                          aria-label="Delete employee"
                          disabled={deletingId === emp.id}
                          onClick={() => handleDelete(emp.id)}
                        >
                          {deletingId === emp.id ? "Deleting…" : "Delete"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="employee-cards-mobile">
              {employees.map((emp) => (
                <article key={emp.id} className="employee-card">
                  <div className="employee-card-header">
                    <div>
                      <span className="employee-card-dept">
                        {emp.department}
                      </span>
                      <div className="employee-card-row">
                        <span className="employee-card-id">
                          {emp.employeeId}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-icon btn-icon-danger"
                      aria-label="Delete employee"
                      disabled={deletingId === emp.id}
                      onClick={() => handleDelete(emp.id)}
                    >
                      {deletingId === emp.id ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                  <div className="employee-card-body">
                    <div className="employee-card-row">
                      <span className="employee-card-label">Name</span>
                      <span className="employee-card-value">
                        {emp.fullName}
                      </span>
                    </div>
                    <div className="employee-card-row">
                      <span className="employee-card-label">Email</span>
                      <span className="employee-card-value">{emp.email}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div ref={loadMoreRef} />

            {loading && hasMore && (
              <div className="employee-list-loading">
                Loading more employees…
              </div>
            )}
          </>
        )}
      </div>

      {isAddOpen && <EmployeeForm onClose={() => setIsAddOpen(false)} />}
    </section>
  );
}
