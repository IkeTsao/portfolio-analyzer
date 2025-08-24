let eventGuid = 0;
const d = new Date();
let todayStr = d.toISOString().replace(/T.*$/, ''); // YYYY-MM-DD of today

// Utility to safely stringify objects with potential Date keys
function safeJSONStringify(obj: any): string {
  return JSON.stringify(obj, (key, value) => {
    // Convert Date objects to ISO strings
    if (value instanceof Date) {
      return value.toISOString();
    }
    return value;
  });
}

// Utility to normalize object keys that might be Date objects
function normalizeObjectKeys(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(normalizeObjectKeys);
  }
  
  const normalized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    // Process the value recursively - object keys are always strings in JavaScript
    normalized[key] = normalizeObjectKeys(value);
  }
  
  return normalized;
}

const INITIAL_EVENTS = [
  {
    id: createEventId(),
    title: 'All-day event',
    start: todayStr,
  },
  {
    id: createEventId(),
    title: 'Conference',
    start: dateOps(-3),
    end: todayStr,
  },
  {
    id: createEventId(),
    title: 'Happy Hour',
    start: dateOps(3) + 'T16:00:00',
  },
  {
    id: createEventId(),
    title: 'Dinner',
    daysOfWeek: [5],
    startTime: '19:00:00',
    endTime: '21:00:00',
  },
  {
    id: createEventId(),
    title: 'Meeting',
    start: todayStr + 'T12:00:00',
  },
  {
    id: createEventId(),
    title: 'Lunch',
    daysOfWeek: [1, 2, 3, 4, 5],
    startTime: '12:45:00',
    endTime: '13:45:00',
  },
  {
    id: createEventId(),
    title: 'Business Trip',
    start: dateOps(4),
    end: dateOps(7),
  },
];

function dateOps(value: number) {
  const x = new Date(d.setDate(d.getDate() + value));
  return x.toISOString().replace(/T.*$/, '');
}

function createEventId() {
  return String(eventGuid++);
}

export { INITIAL_EVENTS, dateOps, createEventId, safeJSONStringify, normalizeObjectKeys };
