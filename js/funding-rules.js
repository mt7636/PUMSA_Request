// ---------------------------------------------------------------------------
// Projects Board funding rules
// Source: https://usg.princeton.edu/projectsboardclubfunding
// Double-check this page each semester — deadlines and criteria can change.
// ---------------------------------------------------------------------------

// Weeks Projects Board meets during the semester should exclude these ranges.
// *** UPDATE THIS EVERY SEMESTER *** using the registrar's academic calendar.
// Dates are inclusive, 'YYYY-MM-DD'. The two rows below are placeholder
// EXAMPLES — replace them with the real dates before relying on this tool.
const ACADEMIC_BREAKS = [
  // { start: '2026-11-21', end: '2026-11-30', label: 'Thanksgiving Break (EXAMPLE — verify)' },
  // { start: '2026-12-19', end: '2027-01-25', label: 'Winter Break (EXAMPLE — verify)' },
];

const FUNDING_SOURCES = [
  { id: 'Projects Board', label: 'Projects Board', locked: true, auto: false,
    note: 'Applied to every request automatically.' },
  { id: 'Alcohol Initiative', label: 'Alcohol Initiative', locked: false, auto: true,
    note: 'Auto-suggested for events Thu/Fri/Sat night, roughly 10pm–2am. Confirm against the Projects Board page.' },
  { id: 'Academic Departments', label: 'Academic Departments', note: 'Co-sponsorship tied to an academic department.' },
  { id: 'Campus Conversations Fund', label: 'Campus Conversations Fund', note: 'For events sparking dialogue across campus communities.' },
  { id: 'Carl Fields Center (on campus)', label: 'Carl Fields Center (on campus)', note: 'Diversity/multicultural programming, on campus.' },
  { id: 'Carl Fields Center (off campus)', label: 'Carl Fields Center (off campus)', note: 'Diversity/multicultural programming, off campus/travel.' },
  { id: 'Princeton Student Events Committee', label: 'Princeton Student Events Committee', note: 'Large, campus-wide events.' },
  { id: 'High Meadows Sustainability Fund', label: 'High Meadows Sustainability Fund', note: 'Sustainability-focused programming.' },
  { id: 'ODUS Conference Fund', label: 'ODUS Conference Fund', note: 'Conference travel/registration.' },
  { id: 'Pace Council for Civic Values', label: 'Pace Council for Civic Values', note: 'Civic engagement & service programming.' },
];

function isDateInBreak(date) {
  return ACADEMIC_BREAKS.some(b => date >= new Date(b.start + 'T00:00:00') && date <= new Date(b.end + 'T23:59:59'));
}

/** Suggest Alcohol Initiative if the event falls Thu/Fri/Sat night, 10pm-2am. */
function suggestsAlcoholInitiative(eventDateStr, startTime, endTime) {
  if (!eventDateStr || !startTime) return false;
  const d = new Date(eventDateStr + 'T00:00:00');
  const day = d.getDay(); // 0=Sun ... 4=Thu, 5=Fri, 6=Sat
  if ([4, 5, 6].indexOf(day) === -1) return false;
  const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  let startMin = toMin(startTime);
  let endMin = endTime ? toMin(endTime) : startMin;
  if (endMin <= startMin) endMin += 24 * 60; // crosses midnight
  const windowStart = 22 * 60;      // 10:00 PM
  const windowEnd = 26 * 60;        // 2:00 AM next day
  return startMin < windowEnd && endMin > windowStart;
}

/**
 * Given an event date and total cost, find the soonest upcoming Thursday
 * Projects Board meeting the request can still target, and the Monday
 * 11:59pm deadline to submit by. Returns { tooLate, deadline, meetingDate, leadWeeks }.
 */
function computeDeadlineInfo(eventDateStr, totalCost) {
  const leadWeeks = Number(totalCost) > 750 ? 3 : 2;
  const eventDate = new Date(eventDateStr + 'T00:00:00');
  const now = new Date();

  // Find the next upcoming Thursday (or today, if today is Thursday).
  let thursday = new Date();
  thursday.setHours(0, 0, 0, 0);
  const daysUntilThursday = (4 - thursday.getDay() + 7) % 7;
  thursday.setDate(thursday.getDate() + daysUntilThursday);

  for (let i = 0; i < 30; i++) {
    if (!isDateInBreak(thursday)) {
      const deadline = new Date(thursday);
      deadline.setDate(deadline.getDate() - 3); // Monday
      deadline.setHours(23, 59, 0, 0);

      const gapDays = (eventDate - thursday) / (1000 * 60 * 60 * 24);
      const leadOk = gapDays >= leadWeeks * 7;

      if (leadOk && deadline >= now) {
        return { tooLate: false, deadline, meetingDate: new Date(thursday), leadWeeks };
      }
      if (!leadOk) {
        // Gap only shrinks as Thursdays move forward, so it will never recover.
        return { tooLate: true, deadline: null, meetingDate: null, leadWeeks };
      }
    }
    thursday.setDate(thursday.getDate() + 7);
  }
  return { tooLate: true, deadline: null, meetingDate: null, leadWeeks };
}

function fmtDate(d) {
  if (!d) return '';
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function fmtDateTime(d) {
  if (!d) return '';
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) +
    ' at ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}
