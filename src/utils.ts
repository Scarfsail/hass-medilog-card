import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import isoWeek from 'dayjs/plugin/isoWeek'

dayjs.extend(duration);
dayjs.extend(isoWeek);

export class Utils {

    public static getDurationMmSs(dateTimeFrom: dayjs.ConfigType, dateTimeTo: dayjs.ConfigType = new Date()): string {
        const duration = dayjs.duration(dayjs(dateTimeTo).diff(dateTimeFrom));
        const totalSeconds = duration.asSeconds();
        const minutes = Math.trunc(totalSeconds / 60);
        const seconds = Math.trunc(totalSeconds % 60);
        return minutes + ":" + (seconds > 9 ? seconds : "0" + seconds);
    }

    public static formatDurationFromTo(dateTimeFrom: dayjs.ConfigType, dateTimeTo: dayjs.ConfigType = new Date()): string {
        return this.formatDuration(dayjs.duration(dayjs(dateTimeTo).diff(dateTimeFrom)));
    }

    public static formatDuration(duration: duration.Duration): string {
        const hours = duration.hours();
        const minutes = duration.minutes();
        const seconds = duration.seconds();

        if (duration.asMonths() >= 1) {
            const weeks = duration.weeks();
            const months = Math.floor(duration.asMonths());
            return `${months}m ${weeks}t`;
        }

        if (duration.asWeeks() >= 1) {
            const weeks = duration.weeks();
            const days = duration.days() - (weeks * 7);
            return `${weeks}t ${days}d`;
        }

        if (duration.asDays() >= 1)
            return `${duration.days()}d ${hours}h`;

        if (duration.asHours() >= 1)
            return `${hours}h ${minutes}m`;

        if (duration.asMinutes() >= 5)
            return `${minutes}m`;

        return `${minutes}m ${seconds}s`;
    }

    public static getDayString(date: dayjs.Dayjs, shortName: boolean = false): string {
        return Utils.getDayStringFromIsoDayOfWeek(date.isoWeekday(), shortName);
    }

    public static getDayStringFromIsoDayOfWeek(isoDayOfWeek: number, shortName: boolean = false): string {
        switch (isoDayOfWeek) {
            case 1: return shortName ? "Po" : "pondělí";
            case 2: return shortName ? "Út" : "úterý";
            case 3: return shortName ? "St" : "středa";
            case 4: return shortName ? "Čt" : "čtvrtek";
            case 5: return shortName ? "Pá" : "pátek";
            case 6: return shortName ? "So" : "sobota";
            case 7: return shortName ? "Ne" : "neděle";
            default: throw ("Unsupported day of week: " + isoDayOfWeek);
        }
    }
    public static getMonthString(date: dayjs.Dayjs, shortName: boolean = false): string {
        return Utils.getMonthStringFromMonthNumber(date.month(), shortName);
    }
    public static getMonthStringFromMonthNumber(monthNumber: number, shortName: boolean = false): string {
        switch (monthNumber) {
            case 0: return shortName ? "Led" : "Leden (1)";
            case 1: return shortName ? "Úno" : "Únor (2)";
            case 2: return shortName ? "Bře" : "Březen (3)";
            case 3: return shortName ? "Dub" : "Duben (4)";
            case 4: return shortName ? "Kvě" : "Květen (5)";
            case 5: return shortName ? "Črv" : "Červen (6)";
            case 6: return shortName ? "Čvn" : "Červenec (7)";
            case 7: return shortName ? "Srp" : "Srpen (8)";
            case 8: return shortName ? "Zář" : "Září (9)";
            case 9: return shortName ? "Říj" : "Říjen (10)";
            case 10: return shortName ? "List" : "Listopad (11)";
            case 11: return shortName ? "Pro" : "Prosinec (12)";

            default: throw ("Unsupported day of month: " + monthNumber);
        }
    }

    public static formatDaysAgoAsName(dateTimeFrom: dayjs.ConfigType): string {
        const days = Math.floor(dayjs.duration(this.getDate(dayjs(dateTimeFrom)).diff(this.getDate(dayjs()))).asDays());
        if (days == 0)
            return "dnes";

        if (days == 1)
            return "zítra";

        if (days == 2)
            return "pozítří";

        if (days >= 3 && days <= 4)
            return `za ${days} dny`;

        return `za ${days} dní`;
    }

    public static getDurationFromTimeString(time: string): duration.Duration {
        const parts = time.split(":");
        return dayjs.duration({ hours: +parts[0], minutes: +parts[1], seconds: +parts[2] });
    }

    public static getTimeStringFromDuration(dur: duration.Duration): string {
        return `${dur.hours()}:${dur.minutes() ?? "0"}:${dur.seconds() ?? "0"}`
    }


    public static getDate(dateTime: dayjs.Dayjs): dayjs.Dayjs {
        return dateTime.hour(0).minute(0).second(0).millisecond(0);
    }
}