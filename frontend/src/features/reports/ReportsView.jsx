import { Download, FileSpreadsheet, RefreshCw } from "lucide-react";
import { reportGroups } from "../../constants/reports";

export function ReportsView({
  busyKey,
  isLoggedIn,
  isAdmin,
  onDownload,
}) {
  return (
    <div className="report-groups">
      {reportGroups.map((group) => (
        <section className="report-section" key={group.title}>
          <h3>{group.title}</h3>

          <div className="report-grid">
            {group.reports
              .filter((report) => isAdmin || !report.adminOnly)
              .map((report) => (
                <article className="report-card" key={report.key}>
                  <div>
                    <FileSpreadsheet size={22} />
                    <h4>{report.label}</h4>
                    <span>{report.filename}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onDownload(report)}
                    disabled={!isLoggedIn || Boolean(busyKey)}
                    title={
                      !isLoggedIn
                        ? "Login first"
                        : `Download ${report.label}`
                    }
                  >
                    {busyKey === report.key ? (
                      <RefreshCw size={16} className="spin" />
                    ) : (
                      <Download size={16} />
                    )}
                    Download
                  </button>
                </article>
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}