package reminder

import "time"

// NextRun tính lần chạy tiếp theo (UTC). schedule: hourly | daily | weekly.
func NextRun(schedule string, hour, minute, weekday int, from time.Time) time.Time {
	loc := time.UTC
	from = from.In(loc)
	switch schedule {
	case "hourly":
		return from.Add(time.Hour).Truncate(time.Minute)
	case "daily":
		t := time.Date(from.Year(), from.Month(), from.Day(), hour, minute, 0, 0, loc)
		if !t.After(from) {
			t = t.AddDate(0, 0, 1)
		}
		return t
	case "weekly":
		targetWD := time.Weekday(weekday % 7)
		for i := 0; i < 14; i++ {
			day := from.AddDate(0, 0, i)
			y, m, d := day.Date()
			at := time.Date(y, m, d, hour, minute, 0, 0, loc)
			if at.Weekday() != targetWD {
				continue
			}
			if at.After(from) {
				return at
			}
		}
		return from.Add(7 * 24 * time.Hour)
	default:
		return from.Add(24 * time.Hour)
	}
}
