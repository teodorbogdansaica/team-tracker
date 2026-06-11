const TEAM_DATA = {
  members: [
    { id: 1, name: "Alice Johnson",   role: "Engineering",  timezone: "America/New_York",   avatar: "AJ", color: "#4F86C6" },
    { id: 2, name: "Bob Martinez",    role: "Engineering",  timezone: "Europe/London",       avatar: "BM", color: "#E07B54" },
    { id: 3, name: "Chen Wei",        role: "Design",       timezone: "Asia/Shanghai",       avatar: "CW", color: "#6BBF6A" },
    { id: 4, name: "Diana Kowalski",  role: "Product",      timezone: "Europe/Warsaw",       avatar: "DK", color: "#B57BCC" },
    { id: 5, name: "Emre Yilmaz",     role: "Engineering",  timezone: "Europe/Istanbul",     avatar: "EY", color: "#E8B84B" },
    { id: 6, name: "Fatima Al-Said",  role: "Support",      timezone: "Asia/Dubai",          avatar: "FA", color: "#5BBCB8" },
    { id: 7, name: "George Papadopoulos", role: "Sales",   timezone: "Europe/Athens",       avatar: "GP", color: "#E56B6F" },
    { id: 8, name: "Hana Tanaka",     role: "Engineering",  timezone: "Asia/Tokyo",          avatar: "HT", color: "#78A5D9" }
  ],
  entries: [
    { memberId: 1, date: "2026-06-15", type: "vacation" },
    { memberId: 1, date: "2026-06-16", type: "vacation" },
    { memberId: 1, date: "2026-06-17", type: "vacation" },
    { memberId: 2, date: "2026-06-12", type: "sick" },
    { memberId: 3, date: "2026-06-18", type: "time_off" },
    { memberId: 4, date: "2026-06-20", type: "vacation" },
    { memberId: 4, date: "2026-06-21", type: "vacation" },
    { memberId: 4, date: "2026-06-22", type: "vacation" },
    { memberId: 5, date: "2026-06-13", type: "time_off" },
    { memberId: 6, date: "2026-06-19", type: "sick" },
    { memberId: 7, date: "2026-06-25", type: "vacation" },
    { memberId: 7, date: "2026-06-26", type: "vacation" },
    { memberId: 8, date: "2026-06-11", type: "time_off" },
  ],
  hours: [
    { memberId: 1, date: "2026-06-11", start: "09:00", end: "17:30" },
    { memberId: 2, date: "2026-06-11", start: "08:00", end: "16:00" },
    { memberId: 3, date: "2026-06-11", start: "10:00", end: "19:00" },
    { memberId: 4, date: "2026-06-11", start: "08:30", end: "16:30" },
    { memberId: 5, date: "2026-06-11", start: "09:00", end: "18:00" },
    { memberId: 6, date: "2026-06-11", start: "07:00", end: "15:00" },
    { memberId: 7, date: "2026-06-11", start: "09:00", end: "17:00" },
    { memberId: 8, date: "2026-06-11", start: "10:00", end: "19:00" },
  ]
};
