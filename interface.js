/* Interface navigation, automatic updates, and the added Discordian calendar.
   Original astro.js and calendar.js are unchanged. */
function stepDate(unit, direction) {
    var form = document.gregorian;
    var year = Number(form.year.value), month = form.month.selectedIndex + 1;
    var day = Number(form.day.value);
    var time = [Number(form.hour.value), Number(form.min.value), Number(form.sec.value)];
    var status = document.getElementById('step-status');
    if (!form.year.value.trim() || !form.day.value.trim() || !Number.isSafeInteger(year) ||
        !Number.isInteger(day) || month < 1 || day < 1 ||
        day > gregorian_to_jd(month === 12 ? year + 1 : year, month === 12 ? 1 : month + 1, 1) - gregorian_to_jd(year, month, 1) ||
        time.some(function (n) { return !Number.isInteger(n); }) ||
        time[0] < 0 || time[0] > 23 || time[1] < 0 || time[1] > 59 || time[2] < 0 || time[2] > 59) {
        status.textContent = 'Enter a valid Gregorian date and time before stepping.';
        return;
    }
    var jd;
    if (unit === 'day') {
        jd = gregorian_to_jd(year, month, day) + direction;
    } else {
        var totalMonths = year * 12 + month - 1 + direction *
            (unit === 'century' ? 1200 : unit === 'year' ? 12 : 1);
        year = Math.floor(totalMonths / 12);
        month = totalMonths - year * 12 + 1;
        var nextMonth = month === 12 ? 1 : month + 1;
        var nextYear = month === 12 ? year + 1 : year;
        var daysInMonth = gregorian_to_jd(nextYear, nextMonth, 1) - gregorian_to_jd(year, month, 1);
        jd = gregorian_to_jd(year, month, Math.min(day, daysInMonth));
    }
    setJulian(jd + (time[0] * 3600 + time[1] * 60 + time[2]) / 86400);
    status.textContent = 'Gregorian date: ' + form.year.value + '-' +
        String(form.month.selectedIndex + 1).padStart(2, '0') + '-' + String(form.day.value).padStart(2, '0');
}
// Discordian dates use season 1..5 and day 1..73. Season/day 0 denotes
// St. Tib's Day, which belongs to neither a season nor the five-day week.
function jd_to_discordian(jd) {
    jd = Math.floor(jd - 0.5) + 0.5;
    var g = jd_to_gregorian(jd), year = g[0];
    if (g[1] === 2 && g[2] === 29) return [year + 1166, 0, 0];
    var ordinal = jd - gregorian_to_jd(year, 1, 1);
    if (leap_gregorian(year) && ordinal > 59) ordinal--;
    return [year + 1166, Math.floor(ordinal / 73) + 1, ordinal % 73 + 1];
}
function discordian_to_jd(year, season, day) {
    var gyear = year - 1166;
    if (!Number.isSafeInteger(year)) return NaN;
    if (season === 0 && day === 0) {
        if (!leap_gregorian(gyear)) return NaN;
        return gregorian_to_jd(gyear, 2, 29);
    }
    if (!Number.isSafeInteger(year) || !Number.isInteger(season) ||
        !Number.isInteger(day) || season < 1 || season > 5 || day < 1 || day > 73) return NaN;
    var ordinal = (season - 1) * 73 + day - 1;
    return gregorian_to_jd(gyear, 1, 1) + ordinal +
        (leap_gregorian(gyear) && ordinal >= 59 ? 1 : 0);
}
function updateDiscordian() {
    var f = document.forms.discordian;
    var date = jd_to_discordian(Number(document.julianday.day.value));
    var tibs = date[1] === 0;
    f.year.value = date[0];
    f.tibs.checked = tibs;
    f.tibs.disabled = !leap_gregorian(date[0] - 1166);
    f.season.disabled = f.day.disabled = tibs;
    f.season.selectedIndex = tibs ? -1 : date[1] - 1;
    f.day.value = tibs ? '' : date[2];
    var ordinal = (date[1] - 1) * 73 + date[2] - 1;
    f.weekday.value = tibs ? 'Outside the week' :
        ['Sweetmorn', 'Boomtime', 'Pungenday', 'Prickle-Prickle', 'Setting Orange'][ordinal % 5];
    f.holyday.value = tibs ? "St. Tib's Day" : date[2] === 5 ?
        ['Mungday', 'Mojoday', 'Syaday', 'Zaraday', 'Maladay'][date[1] - 1] : date[2] === 50 ?
        ['Chaoflux', 'Discoflux', 'Confuflux', 'Bureflux', 'Afflux'][date[1] - 1] : '';
}
function calcDiscordian() {
    var f = document.forms.discordian, year = Number(f.year.value);
    if (!f.year.value.trim() || !Number.isSafeInteger(year)) return;
    // Moving St. Tib's Day to a common year uses Chaos 60 (March 1).
    var tibs = f.tibs.checked && leap_gregorian(year - 1166);
    var season = tibs ? 0 : Number(f.season.value) || 1;
    var day = tibs ? 0 : f.day.value.trim() === '' ? 60 : Number(f.day.value);
    var jd = discordian_to_jd(year, season, day);
    if (Number.isFinite(jd)) setJulian(jd);
    else document.getElementById('step-status').textContent = 'Discordian days must be between 1 and 73.';
}

// Every existing conversion funnels through this function, including Calculate,
// Today, date navigation, and URL presets. Add Discordian output at that point.
var originalUpdateFromGregorian = updateFromGregorian;
updateFromGregorian = function () {
    originalUpdateFromGregorian();
    updateDiscordian();
};

var calendarCalculators = {
    gregorian: calcGregorian, juliancalendar: calcJulianCalendar,
    hebrew: calcHebrew, islamic: calcIslamic, persiana: calcPersiana,
    persian: calcPersian, mayancount: calcMayanCount,
    indiancivilcalendar: calcIndianCivilCalendar, french: calcFrench,
    discordian: calcDiscordian, isoweek: calcIsoWeek, isoday: calcIsoDay,
    julianday: calcJulian, modifiedjulianday: calcModifiedJulian,
    unixtime: calcUnixTime, excelserial1900: calcExcelSerial1900,
    excelserial1904: calcExcelSerial1904
};
function automaticCalendarUpdate(event) {
    var field = event.target, form = field.form;
    if (!form || !calendarCalculators[form.id] || field.readOnly || field.disabled ||
        (field.type !== 'text' && field.type !== 'select-one' && field.type !== 'checkbox')) return;
    // Selects and checkboxes commit with change; text updates while typing.
    if (event.type === 'input' && field.type !== 'text') return;
    var inputs = Array.from(form.querySelectorAll('input[type="text"]')).filter(function (input) {
        return !input.readOnly && !input.disabled;
    });
    if (inputs.some(function (input) {
        var value = input.value.trim();
        var decimal = ['julianday', 'modifiedjulianday', 'unixtime', 'excelserial1900', 'excelserial1904'].indexOf(form.id) !== -1;
        return !(decimal ? /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/ : /^[+-]?\d+$/).test(value) ||
            !Number.isFinite(Number(value));
    })) return;
    var value = field.value, start = field.selectionStart, end = field.selectionEnd;
    calendarCalculators[form.id]();
    // Preserve the active text while typing, including leading zeroes and caret.
    // On change/blur the original converter may normalize overflowing dates.
    if (event.type === 'input' && field.type === 'text') {
        field.value = value;
        field.setSelectionRange(start, end);
    }
}
document.querySelector('.calendars').addEventListener('input', automaticCalendarUpdate);
document.querySelector('.calendars').addEventListener('change', automaticCalendarUpdate);
setDateToToday();
if (location.search) presetDataToRequest(location.search.substring(1));
else calcGregorian();
