import { ArrowDownLeft, ArrowUpRight, Building2, Download, FileSpreadsheet, RefreshCw, Trash2 } from "lucide-react";
import { reportGroups } from "../../constants/reports";
import "./reports.css";

const reportDetails = {
  wastage: { icon: Trash2, tone: "amber", description: "Approved wastage records with product quantities, reasons, and branch details.", badge: "Approved only" },
  "all-shop-transfer": { icon: Building2, tone: "blue", description: "A consolidated transfer report covering all branches.", badge: "All branches" },
  "to-shop": { icon: ArrowUpRight, tone: "teal", description: "Outgoing transfers from your selected branch to other branches.", badge: "Outgoing" },
  "from-shop": { icon: ArrowDownLeft, tone: "blue", description: "Incoming transfers received by your selected branch.", badge: "Incoming" },
};

export function ReportsView({
  busyKey,
  isLoggedIn,
  isAdmin,
  onDownload,
}) {
  return (
    <div className="reports-page">
      <div className="reports-intro">
        <div className="reports-intro-icon"><Download size={24} aria-hidden="true" /></div>
        <div className="reports-intro-copy">
          <h3>Export your records</h3>
          <p>Choose a report below to download an Excel file.</p>
        </div>
        <span className="reports-format"><FileSpreadsheet size={15} aria-hidden="true" />Excel · .xlsx</span>
      </div>
      {reportGroups.map((group) => {
        const reports = group.reports.filter((report) => isAdmin || !report.adminOnly);
        if (!reports.length) return null;
        return <section className="reports-section" key={group.title} aria-label={`${group.title} reports`}>
          <div className="reports-section-heading">
            <h3>{group.title}</h3>
            <span>{reports.length} {reports.length === 1 ? "report" : "reports"}</span>
          </div>
          <div className={`reports-cards${reports.length === 1 ? " reports-cards--single" : ""}`}>
            {reports.map((report) => {
              const details = reportDetails[report.key];
              const Icon = details?.icon || FileSpreadsheet;
              const downloading = busyKey === report.key;
              return <article className="report-download-card" key={report.key} aria-busy={downloading}>
                <div className="report-card-top">
                  <div className={`report-type-icon report-type-icon--${details?.tone || "teal"}`}><Icon size={22} aria-hidden="true" /></div>
                  {details?.badge && <span className="report-scope">{details.badge}</span>}
                </div>
                <div className="report-card-copy">
                  <h4>{report.label}</h4>
                  <p>{details?.description}</p>
                </div>
                <div className="report-file"><FileSpreadsheet size={14} aria-hidden="true" /><span>{report.filename}</span></div>
                <button className="report-download" type="button" onClick={() => onDownload(report)}
                  disabled={!isLoggedIn || Boolean(busyKey)} aria-label={downloading ? `Preparing ${report.label}` : `Download ${report.label} as Excel`}
                  title={!isLoggedIn ? "Sign in to download" : `Download ${report.label}`}>
                  {downloading ? <RefreshCw size={18} className="report-download-spinner" aria-hidden="true" /> : <Download size={18} aria-hidden="true" />}
                  <span aria-live="polite">{downloading ? "Preparing download..." : "Download Excel"}</span>
                </button>
              </article>;
            })}
          </div>
        </section>;
      })}
    </div>
  );
}
