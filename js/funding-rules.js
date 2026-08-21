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
 * Given an event date and total cost, find the LAST Projects Board Thursday
 * meeting that still leaves the required lead time before the event, and
 * the Monday 11:59pm deadline to submit by for that meeting. This is the
 * final cutoff — submitting any time before it is fine, but missing it
 * means the standard lead-time requirement can no longer be met.
 * Returns { tooLate, deadline, meetingDate, leadWeeks }.
 */
function computeDeadlineInfo(eventDateStr, totalCost) {
  const leadWeeks = Number(totalCost) > 750 ? 3 : 2;
  const eventDate = new Date(eventDateStr + 'T00:00:00');
  const now = new Date();

  // The latest a meeting could occur and still leave the required lead time.
  const cutoff = new Date(eventDate);
  cutoff.setDate(cutoff.getDate() - leadWeeks * 7);
  cutoff.setHours(0, 0, 0, 0);

  // Step back to the most recent Thursday on or before that cutoff.
  let thursday = new Date(cutoff);
  const daysSinceThursday = (thursday.getDay() - 4 + 7) % 7;
  thursday.setDate(thursday.getDate() - daysSinceThursday);

  // Walk further back, skipping any Thursday that falls in a break, until
  // we land on an actual meeting date. Capped generously (30 weeks) —
  // no real academic break runs anywhere near that long.
  let meetingDate = null;
  for (let i = 0; i < 30; i++) {
    if (!isDateInBreak(thursday)) { meetingDate = new Date(thursday); break; }
    thursday.setDate(thursday.getDate() - 7);
  }
  if (!meetingDate) return { tooLate: true, deadline: null, meetingDate: null, leadWeeks };

  const deadline = new Date(meetingDate);
  deadline.setDate(deadline.getDate() - 3); // Monday before that Thursday
  deadline.setHours(23, 59, 0, 0);

  if (deadline < now) return { tooLate: true, deadline: null, meetingDate: null, leadWeeks };
  return { tooLate: false, deadline, meetingDate, leadWeeks };
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
