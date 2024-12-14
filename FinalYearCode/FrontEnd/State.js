class State {
  #state;
  #name;
  constructor(state,name) {
    this.observers = [];
    this.#state = state;
    this.#name = name;
  }

  subscribe(fn) {
    this.observers.push(fn);
  }

  unsubscribe(fn) {
    this.observers.pop(fn);
  }

  getState() {
    return this.#state;
  }

  setState(state) {
    this.#state = state;
    this.observers.map((fn) => fn(this.#state));
    console.log(`${this.#name} is ${this.#state}`);
  }
}
