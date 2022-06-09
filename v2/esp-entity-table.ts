import {html, css, LitElement} from "lit";
import {customElement, state} from "lit/decorators.js";
import cssReset from "./css/reset";
import cssButton from "./css/button";
import {log} from "util";

interface entityConfig {
    unique_id: string;
    domain: string;
    id: string;
    state: string;
    detail: string;
    value: string;
    name: string;
    when: string;
    icon?: string;
    option?: string[];
    target_temperature?: Number;
    current_temperature?: Number;
    mode?: Number;
    speed_count?: Number;
    speed_level?: Number;
    speed: string;
}

@customElement("esp-entity-table")
export class EntityTable extends LitElement {
    @state({type: Array, reflect: true}) entities: entityConfig[] = [];
    @state({type: WebSocket, reflect: true}) ws: WebSocket;

    constructor() {
        super();
    }

    connectedCallback() {
        super.connectedCallback();
        let espEntityClass = this;
        let ws = new WebSocket("ws://localhost:8083/entity");
        ws.onopen = function () {
            console.log("connected")
        };

        ws.onclose = function () {
            console.log("onclose")
        };
        ws.onmessage = function (evt) {
            espEntityClass.receiveMessage(evt.data)
        }
        this.ws = ws
    }

    receiveMessage(message: string) {
        const data = JSON.parse(message);
        for (const dataKey in data) {
            this.handleEntity(data[dataKey])
        }
        this.requestUpdate();
    }

    handleEntity(data:any) {
        let idx = this.entities.findIndex((x) => x.unique_id === data.id);
        if (idx === -1 && data.id) {
            // Dynamically add discovered..
            let parts = data.id.split(".");
            let entity = {
                ...data,
                domain: parts[1],
                unique_id: data.id,
                id: parts.slice(1).join("-"),
            } as entityConfig;
            this.entities.push(entity);
            this.entities.sort((a, b) => (a.name < b.name ? -1 : 1));
        } else {
            delete data.id;
            delete data.domain;
            delete data.unique_id;
            Object.assign(this.entities[idx], data);
        }
    }

    actionButton(entity: entityConfig, label: String, action?: String) {
        let a = action || label.toLowerCase();
        return html`
            <button class="rnd" @click=${() => this.restAction(entity, a)}>
                ${label}
            </button>`;
    }

    select(
        entity: entityConfig,
        action: string,
        opt: String,
        options: String[],
        val: string
    ) {
        return html`<select
                @change="${(e: Event) => {
                    let val = e.target?.value;
                    this.restAction(entity, `${action}?${opt}=${val}`);
                }}"
        >
            ${options.map(
                    (option) =>
                            html`
                                <option value="${option}" ?selected="${option == val}">
                                    ${option}
                                </option>
                            `
            )}
        </select>`;
    }

    range(
        entity: entityConfig,
        action: string,
        opt: String,
        value: Number,
        min: Number,
        max: Number,
        step: Number,
    ) {
        return html`<label>${min || 0}</label>
        <input
                type="${entity.mode == 1 ? "number" : "range"}"
                name="${entity.unique_id}"
                id="${entity.unique_id}"
                value="${value}"
                step="${step}"
                min="${min}"
                max="${max}"
                @change="${(e: Event) => {
                    let val = e.target?.value;
                    this.mqttAction({"payload": {"brightness":val},"topic":entity.command_topic})
                }}"
        />
        <label>${max || 100}</label>`;
    }

    colorValue(ev: CustomEvent) {
        const color = ev.target?.value
        const r = parseInt(color.substr(1, 2), 16)
        const g = parseInt(color.substr(3, 2), 16)
        const b = parseInt(color.substr(5, 2), 16)
        console.log(`red: ${r}, green: ${g}, blue: ${b}`)
        return [r,g,b]
    }

    colorHex(value: any) {
        function componentToHex(c: { toString: (arg0: number) => any; }) {
            let hex = c.toString(16)
            return hex.length == 1 ? "0" + hex : hex
        }
        let json = JSON.parse(value)
        return "#"+componentToHex(json.r)+componentToHex(json.g)+componentToHex(json.b)
    }



    color(entity: entityConfig, value: any) {
        value = this.colorHex(value)
        return html`
            <input
                    type="color"
                    id="${entity.unique_id}"
                    value="${value}"
                    @change="${(e: CustomEvent) => {
                        let rgb = this.colorValue(e);
                        this.mqttAction({"payload": {"color":{"r":rgb[0],"g":rgb[1],"b":rgb[2],}},"topic":entity.command_topic})
                    }}"
            ></input>`;
    }

    switch(entity: entityConfig) {
        return html`
            <esp-switch
                    color="var(--primary-color,currentColor)"
                    .state="${entity.status?.state}"
                    @state="${(e: CustomEvent) => {
                        if (entity.domain === "switch") {
                            this.mqttAction({"payload": e.detail.state,"topic":entity.command_topic});
                        } else if (entity.domain === "light"){
                            this.mqttAction({"payload": {"state":e.detail.state},"topic":entity.command_topic});
                        }
                    }}"
            ></esp-switch>`;
    }

    control(entity: entityConfig) {
        if (entity.domain === "switch") return [this.switch(entity)];

        if (entity.domain === "fan") {
            return [
                entity.speed,
                " ",
                entity.speed_level,
                this.switch(entity),
                entity.speed_count
                    ? this.range(
                        entity,
                        `turn_${entity.state.toLowerCase()}`,
                        "speed_level",
                        entity.speed_level,
                        0,
                        entity.speed_count,
                        1
                    )
                    : "",
            ];
        }

        if (entity.domain === "light")
            return [
                this.switch(entity),
                entity.effects &&
                this.select(
                    entity,
                    "turn_on",
                    "effect",
                    entity.effects,
                    entity.effect
                ),
                entity.status?.brightness
                    ? this.range(
                        entity,
                        `turn_${entity.status.state.toLowerCase()}`,
                        "brightness",
                        entity.status.brightness,
                        0,
                        255,
                        1
                    )
                    : "",
                entity.status?.color
                    ? this.color(
                        entity, entity.status?.color
                    )
                    : "",
            ];
        if (entity.domain === "lock")
            return html`${this.actionButton(entity, "🔐", "lock")}
            ${this.actionButton(entity, "🔓", "unlock")}
            ${this.actionButton(entity, "↑", "open")} `;
        if (entity.domain === "cover")
            return html`${this.actionButton(entity, "↑", "open")}
            ${this.actionButton(entity, "☐", "stop")}
            ${this.actionButton(entity, "↓", "close")}`;
        if (entity.domain === "button")
            return html`${this.actionButton(entity, "☐", "press ")}`;
        if (entity.domain === "select") {
            return this.select(entity, "set", "option", entity.option, entity.value);
        }
        if (entity.domain === "number") {
            return this.range(
                entity,
                "set",
                "value",
                entity.value,
                entity.min_value,
                entity.max_value,
                entity.step
            );
        }
        if (entity.domain === "climate")
            return html`
                ${entity.state}
                <label>${entity.current_temperature}</label>
                ${entity.target_temperature_low} ${entity.target_temperature_high}
                <div>
                    ${this.range(
                            entity,
                            "set",
                            "target_temperature",
                            entity.value,
                            entity.min_temp,
                            entity.max_temp,
                            entity.step,
                            0
                    )}
                </div>
                <br/><label
                >Mode:
                    ${entity.modes.map(
                            (mode) => html`
                                <input type="radio" name="mode" @change="${(e: Event) => {
                                    let val = e.target?.value;
                                    this.restAction(entity, `set?mode=${val}`);
                                }}"
                                       value="${mode}" ?checked=${entity.mode === mode}>${mode}</input> `
                    )}
                </label>
            `;
        return html``;
    }

    restAction(entity: entityConfig, action: String, value: any) {
        fetch(`/${entity.domain}/${entity.id}/${action}`, {
            method: "POST",
            body: value === undefined || entity.domain !== "light" ? "true" :  JSON.stringify(value)
        }).then((r) => {
            console.log(r);
        });
    }

    mqttAction(payload: any) {
        this.ws.send(JSON.stringify(payload))
    }

    render() {
        return html`
            <table>
                <thead>
                <tr>
                    <th>Name</th>
                    <th>State</th>
                    <th>Actions</th>
                </tr>
                </thead>
                <tbody>
                ${this.entities.map(
                        (component) => html`
                            <tr>
                                <td>${component.name}</td>
                                <td>${component.status?.state}</td>
                                <td>${this.control(component)}</td>
                            </tr>
                        `
                )}
                </tbody>
            </table>
        `;
    }

    static get styles() {
        return [
            cssReset,
            cssButton,
            css`
        table {
          border-spacing: 0;
          border-collapse: collapse;
          width: 100%;
          border: 1px solid currentColor;
        }

        th {
          font-weight: 600;
          text-align: left;
        }
        th,
        td {
          padding: 0.25rem 0.5rem;
          border: 1px solid currentColor;
        }
        td:nth-child(2),
        th:nth-child(2) {
          text-align: center;
        }
        tr th,
        tr:nth-child(2n) {
          background-color: rgba(127, 127, 127, 0.3);
        }
        select {
          background-color: inherit;
          color: inherit;
          width: 100%;
          border-radius: 4px;
        }
        option {
          color: currentColor;
          background-color: var(--primary-color, currentColor);
        }
        input[type="range"] {
          width: calc(100% - 4rem);
        }
      `,
        ];
    }
}
