# Agent Guidelines for hass-medilog-card

## LitElement Component Structure

All LitElement components in this project follow a strict organization pattern for consistency and maintainability. When creating or modifying components, **always** follow this order:

### 1. Static Configuration Methods (HA-specific)
Place these first for Home Assistant card components:
```typescript
@customElement("my-card")
export class MyCard extends LitElement implements LovelaceCard {
    // Static configuration methods (HA-specific)
    public static async getStubConfig(hass: HomeAssistant) { ... }
    public static getConfigElement() { ... }
    public static getConfigForm() { ... }
```

### 2. Static Styles
Always place `static styles` before instance properties:
```typescript
    // Static styles
    static styles = [sharedStyles, css`
        .my-class {
            color: red;
        }
    `]
```

### 3. Private Properties
Non-reactive private properties:
```typescript
    // Private properties
    private _internalValue?: string;
    private readonly someConstant = 500;
```

### 4. Public Properties
Properties decorated with `@property`:
```typescript
    // Public properties
    @property({ attribute: false }) public hass?: HomeAssistant;
    @property({ attribute: false }) public person?: PersonInfo;
```

### 5. State Properties
Private reactive properties decorated with `@state`:
```typescript
    // State properties
    @state() private _isLoading = false;
    @state() private _data?: MyData;
```

### 6. Constructor
Only if needed:
```typescript
    // Constructor
    constructor() {
        super();
        // Initialization
    }
```

### 7. HA-Specific Property Setters
For Home Assistant cards:
```typescript
    // HA-specific property setter
    public set hass(value: HomeAssistant) {
        this._hass = value;
    }
```

### 8. HA-Specific Methods
For Home Assistant cards, place interface methods here:
```typescript
    // HA-specific methods
    async setConfig(config: MyCardConfig) { ... }
    getCardSize() { ... }
    getGridOptions() { ... }
```

### 9. Lifecycle Methods
**Always in this execution order:**
```typescript
    // Lifecycle methods
    connectedCallback() {
        super.connectedCallback();
        // Setup
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        // Cleanup
    }

    willUpdate(changedProperties: PropertyValues) {
        // Compute derived values before render
    }

    updated(changedProperties: PropertyValues) {
        // Actions after each update
    }

    firstUpdated(changedProperties: PropertyValues) {
        // One-time setup after first render
    }
```

### 10. Render Method
The main template rendering method:
```typescript
    // Render method
    render() {
        return html`...`;
    }
```

### 11. Public Helper Methods
Any public methods that are part of the component's API:
```typescript
    // Public methods
    public showDialog(params: DialogParams): void { ... }
```

### 12. Private Helper Methods
All private methods at the end:
```typescript
    // Private helper methods
    private _handleClick() { ... }
    private async _fetchData() { ... }
    private _computeValue() { ... }
}
```

### 13. Card Registration
For Home Assistant cards, add at the bottom of the file (outside the class):
```typescript
// Card registration
(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
    type: 'custom:my-card',
    name: 'My Card',
    description: 'Description',
    preview: true,
});
```

## Key Principles

1. **Always call `super` first** in lifecycle methods
2. **CSS before properties** - `static styles` should be early in the class
3. **Group by visibility and purpose**: static → public → private
4. **Lifecycle in execution order**: connected → willUpdate → render → firstUpdated → updated → disconnected
5. **Render should be pure** - no property changes inside `render()`
6. **Use `willUpdate()` for computed values**, not `render()`
7. **Event handlers and utilities at the end** as private helper methods

## Example Complete Structure

```typescript
import { LitElement, css, html } from "lit-element"
import { customElement, property, state } from "lit/decorators.js";

@customElement("my-component")
export class MyComponent extends LitElement {
    // Static styles
    static styles = css`
        :host {
            display: block;
        }
    `

    // Private properties
    private _timer?: number;

    // Public properties
    @property({ attribute: false }) public data?: MyData;

    // State properties
    @state() private _isLoading = false;

    // Lifecycle methods
    connectedCallback() {
        super.connectedCallback();
        this._startTimer();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        if (this._timer) clearTimeout(this._timer);
    }

    // Render method
    render() {
        if (this._isLoading) {
            return html`<ha-circular-progress active></ha-circular-progress>`;
        }
        return html`<div>${this.data?.name}</div>`;
    }

    // Private helper methods
    private _startTimer() {
        this._timer = window.setTimeout(() => {
            this._isLoading = false;
        }, 1000);
    }

    private _handleClick() {
        // Handle click
    }
}
```

## Common Patterns

### Dialog Components
```typescript
@customElement("my-dialog")
export class MyDialog extends LitElement {
    // Static styles
    static styles = [sharedStyles, css`...`]

    // Public properties
    @property({ attribute: false }) public hass!: HomeAssistant;

    // State properties
    @state() private _params?: DialogParams;

    // Public methods
    public showDialog(params: DialogParams): void {
        this._params = params;
    }

    // Render method
    render() { ... }

    // Private helper methods
    private _handleClose() { ... }
}
```

### Home Assistant Cards
```typescript
@customElement("my-card")
export class MyCard extends LitElement implements LovelaceCard {
    // Static configuration methods (HA-specific)
    public static async getStubConfig(hass: HomeAssistant) { ... }

    // Static styles
    static styles = [sharedStyles, css`...`]

    // Private config
    private config?: MyCardConfig;

    // State properties
    @state() private _hass?: HomeAssistant;

    // HA-specific property setter
    public set hass(value: HomeAssistant) {
        this._hass = value;
    }

    // HA-specific methods
    async setConfig(config: MyCardConfig) { ... }
    getCardSize() { ... }

    // Lifecycle methods
    connectedCallback() { ... }
    disconnectedCallback() { ... }

    // Render method
    render() { ... }

    // Private helper methods
    private async _fetchData() { ... }
}

// Card registration
(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({ ... });
```

## Notes

- This structure is based on Lit framework best practices and Home Assistant custom card conventions
- It ensures consistent code organization across the entire project
- It makes components easier to understand and maintain
- It follows the natural lifecycle flow of LitElement components
