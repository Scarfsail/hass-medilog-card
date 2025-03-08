import dayjs from "dayjs";


export interface PersonInfoRaw {
    entity: string;
    recent_record:MedilogRecordRaw | null;
}

export interface PersonInfo {
    entity: string;
    name: string;
    recent_record: MedilogRecord | null;
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
