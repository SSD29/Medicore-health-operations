import React, { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  Filter,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { useHospitalData } from '../../context/HospitalDataContext';
import { PatientVisitRecord } from '../../types';

type SortField =
  | 'visit_id'
  | 'visit_date'
  | 'patient_age'
  | 'department'
  | 'visit_type'
  | 'waiting_time_minutes'
  | 'doctor_name'
  | 'admission'
  | 'billing_amount';

export const DataExplorer: React.FC = () => {
  const { filteredRecords, allRecords, setSelectedRecord, exportToCsv } = useHospitalData();

  const [sortField, setSortField] = useState<SortField>('visit_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  // Sort records
  const sortedRecords = useMemo(() => {
    const list = [...filteredRecords];
    list.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const cmp = aVal.localeCompare(bVal);
        return sortDirection === 'asc' ? cmp : -cmp;
      }
      if (typeof aVal === 'boolean') {
        const numA = aVal ? 1 : 0;
        const numB = bVal ? 1 : 0;
        return sortDirection === 'asc' ? numA - numB : numB - numA;
      }
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [filteredRecords, sortField, sortDirection]);

  // Pagination math
  const totalRecords = sortedRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalRecords);
  const paginatedRecords = sortedRecords.slice(startIndex, endIndex);

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-400 ml-1 inline" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-teal-600 ml-1 inline" />
    ) : (
      <ArrowDown className="w-3 h-3 text-teal-600 ml-1 inline" />
    );
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Hospital Operations Data Explorer
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Displaying <strong className="text-slate-800 font-semibold">{totalRecords.toLocaleString()}</strong> matching records out of{' '}
            {allRecords.length.toLocaleString()} total hospital encounters. Click any record row for full multi-variable inspection.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-xs text-slate-600">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <button
            onClick={exportToCsv}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export Filtered</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th
                  onClick={() => handleSort('visit_id')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  Visit ID {renderSortIcon('visit_id')}
                </th>
                <th
                  onClick={() => handleSort('visit_date')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  Date {renderSortIcon('visit_date')}
                </th>
                <th
                  onClick={() => handleSort('patient_age')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  Patient {renderSortIcon('patient_age')}
                </th>
                <th
                  onClick={() => handleSort('department')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  Department {renderSortIcon('department')}
                </th>
                <th
                  onClick={() => handleSort('visit_type')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  Type {renderSortIcon('visit_type')}
                </th>
                <th
                  onClick={() => handleSort('waiting_time_minutes')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors text-right"
                >
                  Wait (min) {renderSortIcon('waiting_time_minutes')}
                </th>
                <th
                  onClick={() => handleSort('doctor_name')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  Attending Doctor {renderSortIcon('doctor_name')}
                </th>
                <th className="py-3 px-3">Status</th>
                <th
                  onClick={() => handleSort('admission')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  Inpatient {renderSortIcon('admission')}
                </th>
                <th
                  onClick={() => handleSort('billing_amount')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors text-right"
                >
                  Billing ($) {renderSortIcon('billing_amount')}
                </th>
                <th className="py-3 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedRecords.length > 0 ? (
                paginatedRecords.map((r) => (
                  <tr
                    key={r.visit_id}
                    onClick={() => setSelectedRecord(r)}
                    className="hover:bg-teal-50/50 cursor-pointer transition-colors"
                  >
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">
                      {r.visit_id}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                      {r.visit_date}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">
                      {r.patient_age}y • {r.gender.charAt(0)}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-800">
                      {r.department}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          r.visit_type === 'Emergency'
                            ? 'bg-orange-50 text-orange-700 border border-orange-200'
                            : r.visit_type === 'Follow-up'
                            ? 'bg-teal-50 text-teal-700 border border-teal-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {r.visit_type} ({r.appointment_type.slice(0, 4)})
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {r.waiting_time_minutes !== null ? (
                        <span
                          className={`font-semibold ${
                            r.waiting_time_minutes > 45 ? 'text-rose-600' : 'text-slate-800'
                          }`}
                        >
                          {r.waiting_time_minutes}m
                        </span>
                      ) : (
                        <span className="text-slate-400">N/A</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 font-medium">
                      {r.doctor_name}
                    </td>
                    <td className="py-2.5 px-3">
                      {r.no_show ? (
                        <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                          No-Show
                        </span>
                      ) : r.cancellation ? (
                        <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                          Cancelled
                        </span>
                      ) : (
                        <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Completed
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      {r.admission ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          {r.ward} ({r.length_of_stay_days}d)
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Outpatient</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-slate-900">
                      ${r.billing_amount.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRecord(r);
                        }}
                        className="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
                        title="View Full Visit Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-400">
                    No hospital records match the current filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div>
            Showing <strong className="font-semibold text-slate-800">{startIndex + 1}</strong> to{' '}
            <strong className="font-semibold text-slate-800">{endIndex}</strong> of{' '}
            <strong className="font-semibold text-slate-800">{totalRecords.toLocaleString()}</strong> filtered records
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={validCurrentPage === 1}
              className="p-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="First Page"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={validCurrentPage === 1}
              className="p-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Previous Page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <span className="px-2 font-medium">
              Page <strong className="font-semibold text-slate-900">{validCurrentPage}</strong> of{' '}
              <strong className="font-semibold text-slate-900">{totalPages}</strong>
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={validCurrentPage === totalPages}
              className="p-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Next Page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={validCurrentPage === totalPages}
              className="p-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Last Page"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
