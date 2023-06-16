
import { useRef, useState } from "react";
import "./schedule-display.css";
import "./schedule-picker.css";
import FireBaseManager from "./firebase";
import TimeFormattingTools from "./TimeFormattingTools";
import ScheduleDisplay from "./ScheduleDisplay";

const weekdayLabels = TimeFormattingTools.weekdayLabels;
const hourLabels = TimeFormattingTools.hourLabels;

export default function SchedulePickerVerII({userName, saveData, isSavingData}) {
    const [selectedWeekday, setSelectedWeekday] = useState(0);
    const [availableRanges, setAvailableRanges] = useState(Array(7).fill(0).map(_ => []));

    const [rangeInputStartTime, setRangeInputStartTime] = useState("00:00");
    const [rangeInputEndTime, setRangeInputEndTime] = useState("23:59");

    function removeOverlap(timeRanges) {
        let allMinutes = Array(24*60).fill(false);
        timeRanges.forEach(range => {
            for(let i = range.start; i <= range.end; ++i) {
                allMinutes[i] = true;
            }
        })
        return FireBaseManager.getTimeRangesFromMatrices([[allMinutes]][0]);
    }

    function addNewTimeRange() {
        const startTimeStr = rangeInputStartTime;
        const endTimeStr = rangeInputEndTime;

        if(!startTimeStr || !endTimeStr)
            return;
        const [startHours, startMinutes] = startTimeStr.split(':').map(x => parseInt(x));
        const [endHours, endMinutes] = endTimeStr.split(':').map(x => parseInt(x));

        const newRange = {
            start: 60*startHours + startMinutes,
            end: Math.min((60*endHours + endMinutes), (60*24-1))
        };
        const newTimeRanges = removeOverlap(availableRanges[selectedWeekday].concat([newRange]));

        //If two or more of the time ranges specified by the user have overlap, merge them together
        setAvailableRanges(
            availableRanges.map((dayRanges, dayIndex) => 
            (dayIndex === selectedWeekday) ? newTimeRanges
            : dayRanges)
        )
    }

    function removeTimeRange(i) {
        setAvailableRanges(
            availableRanges.map((dayRanges, dayIndex) => 
            (dayIndex === selectedWeekday) ? availableRanges[dayIndex].slice(0,i).concat(availableRanges[dayIndex].slice(i+1))
            : dayRanges)
        )        
    }

    function saveTimeRanges() {
        let compressedRanges = [];
        availableRanges.forEach((ranges) => {
            //let i = 0;
            let i = "";
            let allMinutes = Array(24*60).fill(false);
            ranges.forEach(range => {
                for(let i = range.start; i <= range.end; ++i) {
                    allMinutes[i] = true;
                }
            });
            allMinutes.forEach(availableAtMinute => {
                i += availableAtMinute ? '1' : '0';
            })
            compressedRanges.push(i);
        });
        saveData(compressedRanges);

    }

    return <div className="schedule-picker">

        <div className="schedule-picker-header">
            <button onClick={() => setSelectedWeekday((selectedWeekday + 6) % 7)}>
                {"<"}
            </button>
            <h3>
                {weekdayLabels.long[selectedWeekday]}:
            </h3>
            <button onClick={() => setSelectedWeekday((selectedWeekday + 1) % 7)}>
                {">"}
            </button>
        </div>

        <p>What times are you available on this weekday?</p>
        <div className="time-ranges-list">
            {
                availableRanges[selectedWeekday].map((range, index) => (
                    <div className="time-range">
                        <div className="time-range-a">             
                            {TimeFormattingTools.getTimeLabel([Math.floor(range.start/60), range.start%60])}
                            {" - "}
                            {TimeFormattingTools.getTimeLabel([Math.floor(range.end/60), range.end%60])}
                        </div>
                        <div className="time-range-b">
                            <button onClick={() => removeTimeRange(index)}>
                                Remove
                            </button>
                        </div>
                    </div>
                ))
            }

        </div>
        <div>
            <input type="time"
            value={rangeInputStartTime}
            onChange={e => setRangeInputStartTime(e.target.value)}
            />
            -
            <input type="time"
            value={rangeInputEndTime}
            onChange={e => setRangeInputEndTime(e.target.value)}
            />
            <button onClick={addNewTimeRange}>
                add range
            </button>            
        </div>

        <h4>Preview:</h4>
        <ScheduleDisplay
        timeRanges={availableRanges}
        weekdayLabels={weekdayLabels}
        timeLabels={hourLabels}
        editable={true}
        selectedWeekday={selectedWeekday}
        onWeekdayLabelTapped={i => setSelectedWeekday(i)}
        />
        <div className="schedule-picker">
            {
                isSavingData ? "saving..."
                : <button disabled={!userName}
                onClick={saveTimeRanges}
                className="long-button"
                >
                    Save Changes
                </button>
            }
            
            {
                !userName && <p>
                    Please enter your name to save your availability data.
                </p>
            }
        </div>
        
    </div>
    

}