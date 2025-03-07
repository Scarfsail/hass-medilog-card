import dayjs from "dayjs";

export interface PersonInfo {
    entity_id: string;
    name: string;
}

export interface MedilogRecordRaw {
    id?: string,
    datetime: string;
    temperature?: number;
    medication?: string;
    note?: string;
}

export interface MedilogRecord {
    id?: string,
    datetime: dayjs.Dayjs;
    temperature?: number;
    medication?: string;
    note?: string;
}
export interface MedilogRecordsGroupByTime {
    from: dayjs.Dayjs | null,
    to: dayjs.Dayjs,
    records: (MedilogRecord | null)[]
};
