import { LitElement, html, css } from 'lit';
//import ApexCharts from 'apexcharts';
import dayjs from 'dayjs';
import { customElement, property, query, state } from "lit/decorators.js";
import { Medication, MedilogRecord } from './models';
import { Medications } from './medications';

type ApexCharts = any;
@customElement("medilog-records-chart")
class MedilogRecordsChart extends LitElement {

    @property({ attribute: false }) public records: (MedilogRecord | null)[] = [];
    @property({ attribute: false }) public medications!: Medications;
    @query('#chart') private chartElement?: HTMLElement;

    private chart?: ApexCharts;
    updated(changedProperties: Map<string, any>) {
        if (changedProperties.has('records')) {
            this.createChart();
        }
    }

    createChart() {
        if (this.chart)
            this.chart.destroy();
        const records = this.records.filter(record => record!=null);
        // Create a series for temperature data (only include records with temperature)
        const temperatureSeries = records
            .filter(record => record.temperature)
            .map(record => ({
                x: record.datetime.valueOf(), // Convert dayjs object to timestamp
                y: record.temperature
            }));

        // Create annotations for medication events (records with medication)
        const medicationAnnotations = records
            .filter(record => record.medication_id)
            .map(record => ({
                x: record.datetime.valueOf(),
                borderColor: '#FF4560',
                label: {
                    text: this.medications.getMedicationName(record.medication_id) || 'Medication',
                    style: {
                        color: '#fff',
                        background: '#FF4560'
                    }
                }
            }));

        // Configure the chart options
        const options = {
            chart: {
                type: 'line',
                height: 350
            },
            series: [{
                name: 'Teplota',
                data: temperatureSeries
            }],
            xaxis: {
                type: 'datetime'
            },
            annotations: {
                xaxis: medicationAnnotations
            },
            dataLabels: {
                enabled: true,
                offsetY: -10,
                formatter: function(val:number) {
                    return val + "°";
                },
                style: {
                    colors: ['#333']
                }
            },
            tooltip: {
                theme: 'dark',
                x: {
                    format: 'MMM dd, yyyy HH:mm',
                },
                y: {
                    formatter: function(val:number) {
                        return val + "°";
                    }
                }
            },
            markers: {
                size: 6,
                colors: undefined,
                strokeColors: '#fff',
                strokeWidth: 2,
                strokeOpacity: 0.9,
                strokeDashArray: 0,
                fillOpacity: 1,
                shape: "circle",
                hover: {
                    size: 8
                }
            }
        };

        // Render the chart inside the shadow DOM element with id "chart"
        console.log("Creating chart with options", options);
        // Use the window object to access the globally available ApexCharts
        const ApexChartsLib = (window as any).ApexCharts;
        if (!ApexChartsLib) {
            const err = 'ApexCharts library not found globally. Install apex-card via HACS to use this card.'
            console.error(err);
            return html`<h1>${err}</h1>`;
        }
        this.chart = new ApexChartsLib(this.chartElement, options);
        this.chart.render();
    }

    disconnectedCallback(): void {
        super.disconnectedCallback();
        this.chart?.destroy();
    }

    render() {
        return html`<div id="chart"></div>`;
    }
}
