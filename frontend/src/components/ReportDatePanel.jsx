import { FileSpreadsheet } from 'lucide-react'

export function ReportDatePanel({
  dateMode,
  endDate,
  month,
  onDateModeChange,
  onEndDateChange,
  onMonthChange,
  onStartDateChange,
  startDate,
}) {
  return (
    <section className="panel filters-panel">
      <div className="panel-title">
        <FileSpreadsheet size={18} />
        <h2>Report Dates</h2>
      </div>

      <div className="segmented" aria-label="Date mode">
        <button
          type="button"
          className={dateMode === 'month' ? 'active' : ''}
          onClick={() => onDateModeChange('month')}
        >
          Month
        </button>
        <button
          type="button"
          className={dateMode === 'range' ? 'active' : ''}
          onClick={() => onDateModeChange('range')}
        >
          Range
        </button>
      </div>

      {dateMode === 'month' ? (
        <label>
          Month
          <input
            type="month"
            value={month}
            onChange={(event) => onMonthChange(event.target.value)}
          />
        </label>
      ) : (
        <div className="date-grid">
          <label>
            Start
            <input
              type="date"
              value={startDate}
              onChange={(event) => onStartDateChange(event.target.value)}
            />
          </label>
          <label>
            End
            <input
              type="date"
              value={endDate}
              onChange={(event) => onEndDateChange(event.target.value)}
            />
          </label>
        </div>
      )}
    </section>
  )
}
