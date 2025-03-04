import dayjs from "dayjs";

export interface PersonInfo {
    entity_id: string;
    name: string;
}

export interface MedilogRecordRaw {
    id?: string,
    datetime: string;
    temperature: number;
    pill: string;
    note: string;
}

export interface MedilogRecord {
    id?: string,
    datetime: dayjs.Dayjs;
    temperature: number;
    pill: string;
    note: string;
}