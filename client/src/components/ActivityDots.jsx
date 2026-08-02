
import './ActivityDots.css';
function hasLoggedOnDate(logs, targetDate) {
    if (!logs) return false;
    const targetDateString = targetDate.toDateString();
    return logs.some(log => new Date(log.loggedAt).toDateString() === targetDateString);
}
function ActivityDots({ workoutLogs }) {
    const dayLabels = ['S', 'M', 'T', 'W', 'Th', 'F', 'Sa'];

    return (
        <div className="activity-dots">
            {dayLabels.map((label, index) => {
                const targetDate = new Date();
                const currentDay = targetDate.getDay();
                const diff = index - currentDay;
                targetDate.setDate(targetDate.getDate() + diff);

                const logged = hasLoggedOnDate(workoutLogs, targetDate);

                return (
                    <div key={index} className="day-column">
                        <div className={logged ? "dot-active" : "dot-empty"}></div>
                        <span className="day-label">{label}</span>
                    </div>
                );
            })}
        </div>
    );
}

export default ActivityDots;
