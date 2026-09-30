import { ChevronDown, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
/** Search, filter, sort and pagination state for any admin collection. */
export function useTable(rows, config) {
  const configRef = useRef(config);
  configRef.current = config;
  const [state, setState] = useState({
    search: "",
    sortKey: null,
    sortDir: "asc",
    filter: "All",
    page: 1,
  });
  const filtered = useMemo(() => {
    const { searchKeys, filterKey } = configRef.current;
    const term = state.search.trim().toLowerCase();
    let out = rows;
    if (term) {
      out = out.filter((row) => searchKeys.some((key) => String(row[key] ?? "").toLowerCase().includes(term)));
    }
    if (filterKey && state.filter !== "All") {
      const key = filterKey;
      out = out.filter((row) => String(row[key]) === state.filter);
    }
    if (state.sortKey) {
      const key = state.sortKey;
      const dir = state.sortDir === "asc" ? 1 : -1;
      out = [...out].sort((a, b) => {
        const left = a[key];
        const right = b[key];
        if (typeof left === "number" && typeof right === "number")
          return (left - right) * dir;
        return String(left ?? "").localeCompare(String(right ?? "")) * dir;
      });
    }
    return out;
  }, [rows, state]);
  const pageSize = config.pageSize ?? 8;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.min(state.page, pageCount);
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  const patch = useCallback((changes) => {
    setState((current) => ({ ...current, page: 1, ...changes }));
  }, []);
  const toggleSort = useCallback((key) => {
    setState((current) => ({
      ...current,
      page: 1,
      sortKey: key,
      sortDir: current.sortKey === key && current.sortDir === "asc" ? "desc" : "asc",
    }));
  }, []);
  return {
    visible,
    total: filtered.length,
    allRows: filtered,
    page,
    pageCount,
    pageSize,
    state,
    setSearch: (search) => patch({ search }),
    setFilter: (filter) => patch({ filter }),
    setPage: (value) => setState((current) => ({ ...current, page: value })),
    toggleSort,
    reset: () => setState({ search: "", sortKey: null, sortDir: "asc", filter: "All", page: 1 }),
  };
}
export function DataTable({ columns, table, emptyText, toolbar, }) {
  const activeFilter = table.state.filter;
  return (<div className="table-card">
   <div className="table-toolbar">
    <label className="table-search">
     <Search size={15}/>
     <input value={table.state.search} onChange={(event) => table.setSearch(event.target.value)} placeholder="Search records" aria-label="Search records"/>
    </label>
    {toolbar}
    <span className="table-count">
     {table.total} {table.total === 1 ? "record" : "records"}
    </span>
   </div>

   <div className="table-scroll">
    <table className="data-table">
     <thead>
      <tr>
       {columns.map((column) => (<th key={column.key} style={column.width ? { width: column.width } : undefined} className={column.align === "end" ? "align-end" : undefined}>
         {column.sortable ? (<button type="button" className="sort-button" onClick={() => table.toggleSort(column.key)}>
           {column.label}
           <ChevronDown size={13} className={table.state.sortKey === column.key
          ? table.state.sortDir === "desc"
            ? "sort-icon sort-flip"
            : "sort-icon sort-active"
          : "sort-icon sort-idle"}/>
          </button>) : (column.label)}
        </th>))}
      </tr>
     </thead>
     <tbody>
      {table.visible.length === 0 ? (<tr>
        <td colSpan={columns.length} className="table-empty">
         {table.state.search || activeFilter !== "All" ? "No records match your filters." : emptyText}
        </td>
       </tr>) : (table.visible.map((row) => (<tr key={row.id}>
         {columns.map((column) => (<td key={column.key} className={column.align === "end" ? "align-end" : undefined}>
           {column.render ? column.render(row) : String(row[column.key] ?? "")}
          </td>))}
        </tr>)))}
     </tbody>
    </table>
   </div>

   {table.pageCount > 1 && (<div className="table-foot">
     <span>
      Page {table.page} of {table.pageCount}
     </span>
     <div className="table-pager">
      <button type="button" onClick={() => table.setPage(Math.max(1, table.page - 1))} disabled={table.page === 1} aria-label="Previous page">
       <ChevronLeft size={16}/>
      </button>
      <button type="button" onClick={() => table.setPage(Math.min(table.pageCount, table.page + 1))} disabled={table.page === table.pageCount} aria-label="Next page">
       <ChevronRight size={16}/>
      </button>
     </div>
    </div>)}
  </div>);
}
/** Status dropdown shown in a table toolbar. */
export function FilterSelect({ label, value, options, onChange, }) {
  return (<label className="table-filter">
   <span>{label}</span>
   <select value={value} onChange={(event) => onChange(event.target.value)}>
    <option value="All">All</option>
    {options.map((option) => (<option key={option} value={option}>
      {option}
     </option>))}
   </select>
  </label>);
}
