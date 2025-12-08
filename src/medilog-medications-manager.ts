import { LitElement, css, html, nothing } from "lit-element"
import { customElement, property, state } from "lit/decorators.js";
import { Medication } from "./models";
import type { HomeAssistant } from "../hass-frontend/src/types";
import { mdiPlus } from '@mdi/js';
import { sharedStyles, sharedTableStyles } from "./shared-styles";
import { getLocalizeFunction } from "./localize/localize";
import "./medilog-medication-dialog";
import { Medications } from "./medications";

@customElement("medilog-medications-manager")
export class MedilogMedicationsManager extends LitElement {

    @property({ attribute: false }) public hass?: HomeAssistant;
    @property({ attribute: false }) public medications!: Medications;
    @state() private _searchQuery: string = '';

    private _getFilteredMedications(): Medication[] {
        if (!this._searchQuery.trim()) {
            return [...this.medications.all ?? []].sort((a, b) => a.name.localeCompare(b.name));
        }

        const query = this._searchQuery.toLowerCase();
        return this.medications?.all
            .filter(med =>
                med.name.toLowerCase().includes(query) ||
                (med.active_ingredient?.toLowerCase().includes(query) ?? false)
            )
            .sort((a, b) => a.name.localeCompare(b.name));
    }

    static styles = [sharedStyles, sharedTableStyles, css`
        .container {
            padding: 16px;
        }

        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
            gap: 16px;
        }

        .search-bar {
            flex: 1;
            max-width: 400px;
        }

        .add-button {
            --mdc-theme-primary: var(--success-color);
            height: 48px;
            font-weight: bold;
            border-radius: 12px;
            padding: 0 24px;
        }

        table th {
            text-align: left;
        }

        table td {
            text-align: left;
        }

        .empty-state {
            text-align: center;
            padding: 48px 16px;
            color: var(--secondary-text-color);
        }

        .empty-state ha-icon {
            --mdc-icon-size: 64px;
            color: var(--disabled-text-color);
            margin-bottom: 16px;
        }

        .antipyretic-badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 4px 8px;
            border-radius: 12px;
            background-color: var(--info-color);
            color: white;
            font-size: 0.875rem;
        }
    `]

    render() {
        if (!this.hass) {
            return nothing;
        }

        const localize = getLocalizeFunction(this.hass);
        const filteredMedications = this._getFilteredMedications();

        return html`
            <div class="container">
                <div class="header">
                    <ha-textfield
                        class="search-bar"
                        .label=${localize('medications_manager.search_placeholder')}
                        .value=${this._searchQuery}
                        @input=${(e: Event) => {
                this._searchQuery = (e.target as HTMLInputElement).value;
            }}
                    >
                        <ha-icon icon="mdi:magnify" slot="leadingIcon"></ha-icon>
                    </ha-textfield>
                    
                    <ha-button @click=${this._handleAdd} class="add-button">
                        <ha-icon icon="mdi:plus"></ha-icon>
                        ${localize('medications_manager.add_medication')}
                    </ha-button>
                </div>

                ${filteredMedications.length === 0 ? html`
                    <div class="empty-state">
                        <ha-icon icon="mdi:pill"></ha-icon>
                        <p>${this._searchQuery ? localize('medications_manager.no_results') : localize('medications_manager.empty_state')}</p>
                    </div>
                ` : html`
                    <table>
                        <thead>
                            <tr>
                                <th>${localize('medications_manager.column_name')}</th>
                                <th>${localize('medications_manager.column_units')}</th>
                                <th>${localize('medications_manager.column_antipyretic')}</th>
                                <th>${localize('medications_manager.column_ingredient')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filteredMedications.map(med => html`
                                <tr @click=${() => this._handleEdit(med)}>
                                    <td><strong>${med.name}</strong></td>
                                    <td>${med.units || '-'}</td>
                                    <td>
                                        ${med.is_antipyretic ? html`
                                            <span class="antipyretic-badge">
                                                <ha-icon icon="mdi:thermometer"></ha-icon>
                                                ${localize('medications_manager.yes')}
                                            </span>
                                        ` : localize('medications_manager.no')}
                                    </td>
                                    <td>${med.active_ingredient || '-'}</td>
                                </tr>
                            `)}
                        </tbody>
                    </table>
                `}
            </div>
        `;
    }

    private _handleAdd() {
        showMedicationDialog(this, {
            medications: this.medications,
            onClose: (changed: boolean) => {

            }
        });
    }

    private _handleEdit(medication: Medication) {
        showMedicationDialog(this, {
            medication: medication,
            medications: this.medications,
            onClose: (changed: boolean) => {
                
            }
        });
    }
}

export function showMedicationDialog(element: HTMLElement, params: import('./medilog-medication-dialog').MedicationDialogParams) {
    const event = new CustomEvent("show-dialog", {
        bubbles: true,
        composed: true,
        detail: {
            dialogTag: "medilog-medication-dialog",
            dialogImport: () => import("./medilog-medication-dialog"),
            dialogParams: params
        }
    });
    element.dispatchEvent(event);
}
