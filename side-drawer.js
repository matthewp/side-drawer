// @ts-check

const style = `
:host {
  background-color: #ffffff;
  width: 350px;
  max-width: 75vw;
  z-index: 10;
}

::slotted(*) {
  box-sizing: border-box;
}

dialog {
  all: unset;

  width: inherit;
  max-width: inherit;

  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  height: 100%;

  transform: translateX(-100%);
  transition: var(
    --side-drawer-transition,
    transform 0.25s ease-out
  );
}

/* putting this here in case this is ever fixed:
 https://github.com/whatwg/html/issues/7732 */
dialog,
dialog::backdrop {
  overscroll-behavior: contain;
}

dialog:modal {
  background-color: inherit;
  box-shadow: 0px 0px 25px 0px rgba(0, 0, 0, 0.5);
  border-top-right-radius: inherit;
  border-bottom-right-radius: inherit;
}

dialog::backdrop {
  background-color: #000;
  backdrop-filter: var(--side-drawer-backdrop-filter, none);

  opacity: 0;
  transition: var(
    --side-drawer-overlay-transition,
    opacity linear 0.25s
  );
}

:host([open]) dialog[open],
:host([open]) dialog[open]::backdrop {
    transition-delay:0s;
    transform: none;
}

:host([open]) dialog[open]::backdrop {
    transition-delay: 0s;
    opacity: var(--side-drawer-overlay-opacity, .7);
}
`;
// NOTE: for some reason "transitionend" is never called if my CSS selector is
// just "dialog[open]", which is why the selector has ":host([open])" at the beginning

const template = `<dialog part="dialog"><slot></slot></dialog>`;

// using a template so it only needs to be parsed once, whereas setting
// innerHTML directly in the custom element ctor means the HTML would get parsed
// for every custom element on the page
const tmpl = document.createElement("template");
tmpl.innerHTML = `<style>${style}</style>${template}`;

/**
 * A simple side drawer custom element
 */
export class SideDrawer extends HTMLElement {
  constructor() {
    super();

    const shadowRoot = this.attachShadow({ mode: "open" });
    shadowRoot.appendChild(tmpl.content.cloneNode(true));

    /**
     * @internal
     * @type {HTMLDialogElement | null}
     */
    this._dialog = /** @type {HTMLDialogElement} */ (
      shadowRoot.querySelector("dialog")
    );
  }

  connectedCallback() {
    if (this._dialog) {
      this._dialog.addEventListener("click", (event) => {
        if (event.target === this._dialog) {
          this.open = false;
        }
      });

      this._dialog.addEventListener("close", () => {
        this.open = false;
      });
    }

    this.upgradeProperty("open");
  }

  // from https://web.dev/custom-elements-best-practices/#make-properties-lazy
  /**
   * @param {string} prop
   *
   * @internal
   */
  upgradeProperty(prop) {
    if (this.hasOwnProperty(prop)) {
      let value = this[prop];
      delete this[prop];
      this[prop] = value;
    }
  }

  get open() {
    return this.hasAttribute("open");
  }

  set open(isOpen) {
    if (isOpen) {
      if (!this.hasAttribute("open")) {
        this.setAttribute("open", "");
      }
    } else {
      if (this.hasAttribute("open")) {
        this.removeAttribute("open");
      }
    }
  }

  static get observedAttributes() {
    return ["open"];
  }

  /**
   * @param {string} name
   * @param {unknown} _oldValue
   * @param {unknown} _newValue
   * @memberof WcMenuButton
   */
  attributeChangedCallback(name, _oldValue, _newValue) {
    if (name === "open") {
      // When the drawer is closed, update keyboard/screen reader behavior.
      if (!this.open) {
        this._dialog.addEventListener(
          "transitionend",
          () => {
            this._dialog.close();
          },
          { once: true },
        );

        this.dispatchEvent(
          new CustomEvent("close", {
            bubbles: true,
          }),
        );
      } else {
        this._dialog.showModal();

        this.dispatchEvent(
          new CustomEvent("open", {
            bubbles: true,
          }),
        );
      }
    }
  }
}

customElements.define("side-drawer", SideDrawer);
