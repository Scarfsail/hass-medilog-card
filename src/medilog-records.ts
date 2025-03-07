import { LitElement, css, html, PropertyValues } from "lit-element"
import { customElement, property, state } from "lit/decorators.js";
import dayjs from "dayjs";
import duration from 'dayjs/plugin/duration'
import 'dayjs/locale/cs';
import { MedilogRecord, MedilogRecordRaw, MedilogRecordsGroupByTime, PersonInfo } from "./models";
import type { HomeAssistant } from "../hass-frontend/src/types";
import { MedilogRecordDetailDialogParams } from "./medilog-record-detail-dialog";
import { Utils } from "./utils";
import { getLocalizeFunction } from "./localize/localize";
dayjs.extend(duration);

@customElement("medilog-records")
export class MedilogRecords extends LitElement {
    @property({ attribute: false }) public person?: PersonInfo
    @property({ attribute: false }) public hass?: HomeAssistant;
    @property({ attribute: false }) public records?: MedilogRecord[];

    static styles = css`
        .record-table {
            border-collapse: collapse;
            margin-bottom: 16px;
        }
        
        .record-table th {
            text-align: left;
            padding: 8px 16px;
            border-bottom: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
            color: var(--secondary-text-color);
            font-weight: 500;
        }
        
        .record-table td {
            padding: 8px 16px;
            border-bottom: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
        }
        
        .record-table tbody tr {
            cursor: pointer;
        }
        
        .record-table tbody tr:hover {
            background-color: var(--primary-color);
            color: var(--text-primary-color);
        }
    `

    render() {
        if (!this.person) {
            return "Person is not defined";
        }

        if (!this.records) {
            return html`<ha-circular-progress active></ha-circular-progress>`;
        }

        const localize = getLocalizeFunction(this.hass!);
        return html`
            <table class="record-table">
                <thead>
                    <tr>
                        <th>${localize('table.datetime')}</th>
                        <th>${localize('table.before')}</th>
                        <th>${localize('table.temperature')}</th>
                        <th>${localize('table.medication')}</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.records.map(record => html`
                        <tr @click=${() => this.showRecordDetailsDialog(record)}>
                            <td>${record.datetime.format('DD.MM.YYYY HH:mm')}</td>
                            <td>${Utils.formatDurationFromTo(record.datetime)}</td>
                            <td>${record.temperature ? `${record.temperature} °C` : '-'}</td>
                            <td>${record.medication || '-'}</td>
                        </tr>
                    `)}
                </tbody>
            </table>
        `
    }

    private showRecordDetailsDialog(record: MedilogRecord) {
        showMedilogRecordDetailDialog(this, {
            record: record,
            personId: this.person?.entity_id || '',
            closed: this.dialogClosed.bind(this)
        });
    }

    private dialogClosed(changed: boolean) {
        if (changed) {
            // Fire a custom event to notify parent components that records have been changed
            this.dispatchEvent(new CustomEvent("records-changed", {
                bubbles: true,
                composed: true,
                detail: { personId: this.person?.entity_id }
            }));

        }
    }

}

export function showMedilogRecordDetailDialog(element: HTMLElement, params: MedilogRecordDetailDialogParams) {
    const event = new CustomEvent("show-dialog", {
        bubbles: true,
        composed: true,
        detail: {
            dialogTag: "medilog-record-detail-dialog",
            dialogImport: () => import("./medilog-record-detail-dialog"),
            dialogParams: params
        }
    });
    element.dispatchEvent(event);
}
