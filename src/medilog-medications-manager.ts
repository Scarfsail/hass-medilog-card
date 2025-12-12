import { LitElement, css, html, nothing } from "lit-element"
import { customElement, property, state } from "lit/decorators.js";
import { Medication } from "./models";
import type { HomeAssistant } from "../hass-frontend/src/types";
import { mdiPlus } from '@mdi/js';
import { sharedStyles, sharedTableStyles } from "./shared-styles";
import { getLocalizeFunction } from "./localize/localize";
import "./medilog-medication-dialog";
import { DataStore } from "./data-store";

@customElement("medilog-medications-manager")
export class MedilogMedicationsManager extends LitElement {
    // Static styles
    static styles = [sharedStyles, sharedTableStyles, css`
        .container {
            padding: 16px;
        }

        .header {
            display: flex;
            justify-content: flex-end;
            align-items: center;
            margin-bottom: 16px;
            gap: 16px;
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
            padding: 8px;
            vertical-align: top;
        }

        table td {
            text-align: left;
        }

        .filter-field {
            width: 100%;
            --mdc-text-field-outlined-idle-border-color: var(--divider-color);
            --mdc-text-field-outlined-hover-border-color: var(--primary-color);
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

    // Public properties
    @property({ attribute: false }) public hass?: HomeAssistant;
    @property({ attribute: false }) public dataStore!: DataStore;

    // State properties
    @state() private _filterName: string = '';
    @state() private _filterUnits: string = '';
    @state() private _filterAntipyretic: string = '';
    @state() private _filterIngredient: string = '';
    @state() private _usageCounts: Map<string, number> = new Map();

    // Lifecycle methods
    async connectedCallback() {
        super.connectedCallback();
        await this._calculateUsageCounts();
    }

    async updated(changedProperties: Map<string, any>) {
        super.updated(changedProperties);
        // Recalculate if dataStore changed
        if (changedProperties.has('dataStore')) {
            await this._calculateUsageCounts();
        }
    }

    // Render method
    render() {
        if (!this.hass) {
            return nothing;
        }

        const localize = getLocalizeFunction(this.hass);
        const filteredMedications = this._getFilteredMedications();

        return html`
            <div class="container">
                <div class="header">
                    <ha-button @click=${this._handleAdd} class="add-button">
                        <ha-icon icon="mdi:plus"></ha-icon>
                        ${localize('medications_manager.add_medication')}
                    </ha-button>
                </div>

                ${filteredMedications.length === 0 && !this._filterName && !this._filterUnits && !this._filterAntipyretic && !this._filterIngredient ? html`
                    <div class="empty-state">
                        <ha-icon icon="mdi:pill"></ha-icon>
                        <p>${localize('medications_manager.empty_state')}</p>
                    </div>
                ` : html`
                    <table>
                        <thead>
                            <tr>
                                <th>
                                    <ha-textfield
                                        class="filter-field"
                                        .label=${localize('medications_manager.column_name')}
                                        .value=${this._filterName}
                                        @input=${(e: Event) => {
                                            this._filterName = (e.target as HTMLInputElement).value;
                                        }}
                                    ></ha-textfield>
                                </th>
                                <th>
                                    <ha-textfield
                                        class="filter-field"
                                        .label=${localize('medications_manager.column_units')}
                                        .value=${this._filterUnits}
                                        @input=${(e: Event) => {
                                            this._filterUnits = (e.target as HTMLInputElement).value;
                                        }}
                                    ></ha-textfield>
                                </th>
                                <th>
                                    <ha-textfield
                                        class="filter-field"
                                        .label=${localize('medications_manager.column_antipyretic')}
                                        .value=${this._filterAntipyretic}
                                        @input=${(e: Event) => {
                                            this._filterAntipyretic = (e.target as HTMLInputElement).value;
                                        }}
                                    ></ha-textfield>
                                </th>
                                <th>
                                    <ha-textfield
                                        class="filter-field"
                                        .label=${localize('medications_manager.column_ingredient')}
                                        .value=${this._filterIngredient}
                                        @input=${(e: Event) => {
                                            this._filterIngredient = (e.target as HTMLInputElement).value;
                                        }}
                                    ></ha-textfield>
                                </th>
                                <th>${localize('medications_manager.column_usage')}</th>
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
                                    <td>${this._usageCounts.get(med.id) ?? 0}</td>
                                </tr>
                            `)}
                        </tbody>
                    </table>
                    ${filteredMedications.length === 0 ? html`
                        <div class="empty-state">
                            <ha-icon icon="mdi:filter-remove"></ha-icon>
                            <p>${localize('medications_manager.no_results')}</p>
                        </div>
                    ` : nothing}
                `}
            </div>
        `;
    }

    // Private helper methods
    private _getFilteredMedications(): Medication[] {
        const localize = getLocalizeFunction(this.hass!);
        
        return this.dataStore?.medications?.all
            .filter(med => {
                const matchesName = !this._filterName.trim() || 
                    med.name.toLowerCase().includes(this._filterName.toLowerCase());
                
                const matchesUnits = !this._filterUnits.trim() || 
                    (med.units?.toLowerCase().includes(this._filterUnits.toLowerCase()) ?? false);
                
                const antipyreticText = med.is_antipyretic 
                    ? localize('medications_manager.yes').toLowerCase()
                    : localize('medications_manager.no').toLowerCase();
                const matchesAntipyretic = !this._filterAntipyretic.trim() || 
                    antipyreticText.includes(this._filterAntipyretic.toLowerCase());
                
                const matchesIngredient = !this._filterIngredient.trim() || 
                    (med.active_ingredient?.toLowerCase().includes(this._filterIngredient.toLowerCase()) ?? false);
                
                return matchesName && matchesUnits && matchesAntipyretic && matchesIngredient;
            })
            .sort((a, b) => a.name.localeCompare(b.name));

    }

    private _handleAdd() {
        showMedicationDialog(this, {
            medications: this.dataStore.medications,
            onClose: (changed: boolean) => {

            }
        });
    }

    private _handleEdit(medication: Medication) {
        showMedicationDialog(this, {
            medication: medication,
            medications: this.dataStore.medications,
            onClose: (changed: boolean) => {
                
            }
        });
    }

    private async _calculateUsageCounts(): Promise<void> {
        if (!this.dataStore?.records || !this.dataStore?.medications?.all) {
            return;
        }

        const counts = new Map<string, number>();
        
        // Initialize counts for all medications
        for (const med of this.dataStore.medications.all) {
            counts.set(med.id, 0);
        }

        // Iterate through all persons and load their stores
        for (const person of this.dataStore.persons.all) {
            try {
                const personStore = await this.dataStore.records.getStoreForPerson(person);
                // Count records for each medication
                for (const record of personStore.all) {
                    if (record.medication_id) {
                        const currentCount = counts.get(record.medication_id) || 0;
                        counts.set(record.medication_id, currentCount + 1);
                    }
                }
            } catch (error) {
                console.error(`Error loading records for person ${person.entity}:`, error);
            }
        }

        this._usageCounts = counts;
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
