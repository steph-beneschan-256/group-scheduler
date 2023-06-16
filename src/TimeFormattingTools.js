/*
    Get the name of each weekday, based on the user's locale
*/
function getWeekdayLabels() {
    let labels = {};
    let formatters = [];
    const weekdayLengthTypes = ["narrow", "short", "long"];
    weekdayLengthTypes.forEach((weekdayLengthType) => {
        labels[weekdayLengthType] = [];
        formatters.push({
            weekdayLengthType: weekdayLengthType,
            formatter: new Intl.DateTimeFormat(undefined, {weekday: weekdayLengthType})
        });
    })

    for(let i = 0; i < 7; ++i) {
        /*
        Start with Sunday
        January 5th, 1970th, was evidently the first Sunday after the epoch
        */
        const utcDate = new Date(Date.UTC(1970, 0, 5+i));
        formatters.forEach(formatter => {
            labels[formatter.weekdayLengthType].push(formatter.formatter.format(utcDate));
        })
    }
    return labels;
}

/*
    Get a label for each hour of the day, based on the user's locale
*/
function getHourLabels() {
    let labels = [];
    const formatter = new Intl.DateTimeFormat(undefined, {timeZone: "UTC", hour: "numeric"});
    for(let i = 0; i < 24; ++i) {
        // Start with the epoch, i.e. 00:00 UTC; 12am
        const utcDate = new Date(60*60*1000*i);
        labels.push(formatter.format(utcDate));
    }
    return labels;
}

const timeFormatter = new Intl.DateTimeFormat(undefined, {timeZone: "UTC", hour: "2-digit", minute: "2-digit"});

class TimeFormattingTools{
    static weekdayLabels = getWeekdayLabels();
    static hourLabels = getHourLabels();
    static getTimeLabel([hours, minutes]) {
        return timeFormatter.format(new Date(60*1000*(60*hours + minutes)));
    }

}

export default TimeFormattingTools;