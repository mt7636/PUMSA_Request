function todayMidnight() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Split requests into three chronological buckets, each pre-sorted. */
function groupRequests(requests) {
  const today = todayMidnight();
  const needsAction = [];
  const upcoming = [];
  const past = [];

  requests.forEach(r => {
    const eventDate = new Date(r.eventDate + 'T00:00:00');
    if (eventDate < today) {
      past.push(r);
    } else if (r.status === 'Not Yet Requested') {
      needsAction.push(r);
    } else {
      upcoming.push(r);
    }
  });

  needsAction.sort((a, b) => {
    const da = computeDeadlineInfo(a.eventDate, a.totalCost).deadline;
    const db = computeDeadlineInfo(b.eventDate, b.totalCost).deadline;
    return (da || 0) - (db || 0);
  });
  upcoming.sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate));
  past.sort((a, b) => new Date(b.eventDate) - new Date(a.eventDate));

  return { needsAction, upcoming, past };
}

function statusStampClass(status) {
  return {
    'Not Yet Requested': 'stamp-pending',
    'Requested': 'stamp-requested',
    'Approved': 'stamp-approved',
    'Denied': 'stamp-denied',
    'Too Late to Request': 'stamp-toolate',
  }[status] || 'stamp-pending';
}

function fmtEventDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return { day: d.toLocaleDateString(undefined, { day: '2-digit' }), mon: d.toLocaleDateString(undefined, { month: 'short' }) };
}

function fmtMoney(n) {
  return '$' + Number(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function fmtTimeRange(start, end) {
  const fmt = (t) => {
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = ((h + 11) % 12) + 1;
    return h12 + (m ? ':' + String(m).padStart(2, '0') : '') + ampm;
  };
  return fmt(start) + ' – ' + fmt(end);
}

/**
 * Build the inner HTML for one ledger entry.
 * opts.showRequester — show the board member's name (admin view)
 * opts.deadlineNote — show the "needs action" deadline flag
 */
function renderEntryHTML(r, opts) {
  opts = opts || {};
  const { day, mon } = fmtEventDate(r.eventDate);
  let deadlineHTML = '';
  if (opts.deadlineNote) {
    const info = computeDeadlineInfo(r.eventDate, r.totalCost);
    deadlineHTML = info.tooLate
      ? '<div class="deadline-flag" style="color:var(--red)">too late for standard timeline</div>'
      : '<div class="deadline-flag">request by ' + fmtDate(info.deadline) + '</div>';
  }
  const requesterHTML = opts.showRequester ? '<span class="mono">' + r.name + ' (' + r.code + ')</span> · ' : '';

  return `
    <div class="datebox"><span class="d">${day}</span>${mon}</div>
    <div class="main">
      <div class="title">${escapeHtml(r.eventName)}</div>
      <div class="meta">${requesterHTML}${fmtTimeRange(r.startTime, r.endTime)} · ${fmtMoney(r.totalCost)}</div>
      ${deadlineHTML}
    </div>
    <div class="side">
      <span class="stamp ${statusStampClass(r.status)}">${r.status}</span>
      ${r.photoUrl ? '<span class="small">📷 photo added</span>' : ''}
    </div>
  `;
}

/**
 * Admin version: splits requests into six buckets instead of three, so
 * status is visible at a glance without opening each card. Order matters
 * for how these get rendered on the page: Too Late, Needs Action,
 * Requested, Approved, Denied, then Past at the very bottom.
 */
function groupRequestsAdmin(requests) {
  const today = todayMidnight();
  const buckets = { tooLate: [], needsAction: [], requested: [], approved: [], denied: [], past: [] };

  requests.forEach(r => {
    const eventDate = new Date(r.eventDate + 'T00:00:00');
    if (eventDate < today) { buckets.past.push(r); return; }

    if (r.status === 'Not Yet Requested') {
      // Auto-promote to "Too Late" the moment the computed cutoff has
      // passed, rather than waiting for an admin to notice and flip the
      // status by hand.
      const missedDeadline = computeDeadlineInfo(r.eventDate, r.totalCost).tooLate;
      (missedDeadline ? buckets.tooLate : buckets.needsAction).push(r);
      return;
    }

    switch (r.status) {
      case 'Too Late to Request': buckets.tooLate.push(r); break;
      case 'Requested': buckets.requested.push(r); break;
      case 'Approved': buckets.approved.push(r); break;
      case 'Denied': buckets.denied.push(r); break;
      default: buckets.needsAction.push(r);
    }
  });

  const byDeadline = (a, b) => {
    const da = computeDeadlineInfo(a.eventDate, a.totalCost).deadline;
    const db = computeDeadlineInfo(b.eventDate, b.totalCost).deadline;
    return (da || 0) - (db || 0);
  };
  const byEventDateAsc = (a, b) => new Date(a.eventDate) - new Date(b.eventDate);

  buckets.tooLate.sort(byEventDateAsc);
  buckets.needsAction.sort(byDeadline);
  buckets.requested.sort(byEventDateAsc);
  buckets.approved.sort(byEventDateAsc);
  buckets.denied.sort(byEventDateAsc);
  buckets.past.sort((a, b) => new Date(b.eventDate) - new Date(a.eventDate));

  return buckets;
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s == null ? '' : s;
  return d.innerHTML;
}
