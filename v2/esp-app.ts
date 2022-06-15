import { LitElement, html, css, PropertyValues } from "lit";
import { customElement, state, query } from "lit/decorators.js";

import "./esp-entity-table";
import "./esp-log";
import "./esp-switch";
import "./esp-logo";
import cssReset from "./css/reset";
import cssButton from "./css/button";

interface Config {
  ota: boolean;
  title: string;
}

@customElement("esp-app")
export default class EspApp extends LitElement {
  @state() scheme: string = "";
  @state() ping: string = "";
  @query("#beat")
  beat!: HTMLSpanElement;

  version: String = import.meta.env.PACKAGE_VERSION;
  config: Config = { ota: false, title: "" };

  darkQuery: MediaQueryList = window.matchMedia("(prefers-color-scheme: dark)");

  frames = [{ color: "inherit" }, { color: "red", transform: "scale(1.25) translateY(-30%)" }, { color: "inherit" }];

  constructor() {
    super();
  }

  firstUpdated(changedProperties: PropertyValues) {
    super.firstUpdated(changedProperties);
    document.getElementsByTagName("head")[0].innerHTML +=
      '<meta name=viewport content="width=device-width, initial-scale=1,user-scalable=no">';
    const l = <HTMLLinkElement>document.querySelector("link[rel~='icon']"); // Set favicon to house
    l.href =
      'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25"><path d="M1 12.5h2.9v7.8h17v-7.8h2.9l-2.9-2.9V4.5h-1.8v3.3L12.3 1 1 12.5Z"/></svg>';
    this.darkQuery.addEventListener("change", () => {
      this.scheme = this.isDark();
    });
    this.scheme = this.isDark();

  }

  isDark() {
    return this.darkQuery.matches ? "dark" : "light";
  }

  updated(changedProperties: Map<string, unknown>) {
    super.updated(changedProperties);
    if (changedProperties.has("scheme")) {
      let el = document.documentElement;
      document.documentElement.style.setProperty("color-scheme", this.scheme);
    }
    if (changedProperties.has("ping")) {
      this.beat.animate(this.frames, 1000);
    }
  }

  ota() {
    if (this.config.ota)
      return html`<h2>OTA Update</h2>
        <form method="POST" action="/update" enctype="multipart/form-data">
          <input class="btn" type="file" name="update" />
          <input class="btn" type="submit" value="Update" />
        </form>`;
  }

  render() {
    return html`
      <h1>
        <a href="https://esphome.io/web-api" class="logo">
          <esp-logo></esp-logo>
        </a>
        ${this.config.title}
        <span id="beat" title="${this.version}">❤</span>
      </h1>
      <main class="flex-grid-half">
        <section class="col">
          <esp-entity-table></esp-entity-table>
          <h2>
            <esp-switch
              color="var(--primary-color,currentColor)"
              class="right"
              .state="${this.scheme}"
              @state="${(e: CustomEvent) => (this.scheme = e.detail.state)}"
              labelOn="🌒"
              labelOff="☀️"
              stateOn="dark"
              stateOff="light"
              optimistic
            >
            </esp-switch>
            Scheme
          </h2>
          ${this.ota()}
        </section>
      </main>
    `;
  }

  static get styles() {
    return [
      cssReset,
      cssButton,
      css`
        .flex-grid {
          display: flex;
        }
        .flex-grid .col {
          flex: 2;
        }
        .flex-grid-half {
          display: flex;
          justify-content: space-evenly;
        }
        .col {
          width: 48%;
        }

        @media (max-width: 600px) {
          .flex-grid,
          .flex-grid-half {
            display: block;
          }
          .col {
            width: 100%;
            margin: 0 0 10px 0;
          }
        }

        * {
          box-sizing: border-box;
        }
        .flex-grid {
          margin: 0 0 20px 0;
        }
        h1 {
          text-align: center;
          width: 100%;
          line-height: 4rem;
        }
        h1,
        h2 {
          border-bottom: 1px solid #eaecef;
          margin-bottom: 0.25rem;
        }
        #beat {
          float: right;
          height: 1rem;
        }
        a.logo {
          height: 4rem;
          float: left;
          color: inherit;
        }
        .right {
          float: right;
        }
      `,
    ];
  }
}
