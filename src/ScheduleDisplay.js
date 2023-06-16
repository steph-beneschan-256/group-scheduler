function ScheduleDisplay({timeRanges, users,
    weekdayLabels, timeLabels,
    editable, selectedWeekday, onWeekdayLabelTapped,}) {

    return (<>
        {(timeRanges && (timeRanges.length > 0)) ? (
            <div className="schedule-display">
                <div className="schedule-header">
                <div className="schedule-header-inner">
                    {Array(7).fill("").map((v,i) => (
                    <div className={`schedule-header-label ${(editable && (i === selectedWeekday)) ? "weekday-selected" : ""}`}
                    onClick={() => {
                        if(editable)
                            onWeekdayLabelTapped(i)
                        }
                    }>
                        {weekdayLabels.short[i]}
                    </div>
                    ))}
                </div>
                </div>
                <div className="schedule-body">
                    <div className="timeline-labels">
                        {Array(24).fill(0).map((v,i) => (
                        <div className={`time-label time-label-group-${i%3}`}>
                            {timeLabels[i]}
                        </div>
                        ))}
                    </div>

                    <div className="timeline-container">
                        {
                        Array(7).fill(0).map((v,weekday) => (
                            <div key={weekday} className={`timeline ${(editable && (weekday === selectedWeekday)) ? "column-selected" : ""}`}
                            onClick={() => {
                                if(editable)
                                    onWeekdayLabelTapped(weekday)
                                }
                            }>
                            {Array(24).fill(0).map((v,timeslot) => (
                                <div className="timeslot"/>
                            ))} 
                            {timeRanges[weekday].map(range => (
                                <div style={{
                                    position: "absolute",
                                    backgroundColor: "#008000",
                                    opacity: 0.8 * ((range.users && (users.length > 0)) ? range.users.length/users.length : 1), 
                                    top: `${range.start/(24*60)*100}%`,
                                    width: "100%",
                                    height: `${(range.end - range.start)/(24*60)*100}%`,
                                }}>
                                </div>
                            ))}
                            </div>
                        ))
                        }
                    </div>
                </div>    
            </div>)
            : <div>
                It looks like no one has indicated their availability yet.
            </div>
        }
    </>)
} 

export default ScheduleDisplay;