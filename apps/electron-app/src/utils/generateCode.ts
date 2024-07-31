import { Edge, Node } from "@xyflow/react";
import { NodeType } from "../render/components/react-flow/ReactFlowCanvas";

const defintions: Record<NodeType, () => string> = {
  Button: defineButton,
  Counter: defineCounter,
  Interval: defineInterval,
  Led: defineLed,
  Figma: defineFigma,
  IfElse: defineIfElse,
  RangeMap: defineRangeMap,
  Mqtt: defineMqtt,
  Sensor: defineSensor,
  Servo: defineServo,
}

export function generateCode(nodes: Node[], edges: Edge[]) {
  let code = `
/*
 * This code was generated by Figma hardware bridge.
 *
 * No warranty is provided.
 */
`

  code += addImports()

  let innerCode = ``

  innerCode += addBoard()

  const boardListners = ["error", "fail", "warn", "exit", "close", "info"]
  boardListners.forEach((listener) => {
    innerCode += addBoardListener(listener)
  })

  innerCode += addBoardListener("ready", false)
  nodes.forEach((node) => {
    node.data.id = node.id // Expose the Id to the options
    innerCode += `  const ${node.type}_${node.id} = new ${node.type}(${JSON.stringify(node.data)});`
    innerCode += addEnter()
  })
  innerCode += addEnter()

  innerCode += `  const nodes = [${nodes.map(node => `{ id: "${node.type}_${node.id}", variable: ${node.type}_${node.id} }`)}];`
  innerCode += addEnter()
  innerCode += addEnter()

  const nodesWithActionListener = nodes.filter(node => edges.some((edge) => edge.source === node.id))

  nodesWithActionListener.forEach((node) => {
    const actions = edges.filter((edge) => edge.source === node.id);

    const actionsGroupedByHandle = actions.reduce(
      (acc, action) => {
        if (!acc[action.sourceHandle]) {
          acc[action.sourceHandle] = [];
        }

        acc[action.sourceHandle].push(action);

        return acc;
      },
      {} as Record<string, Edge[]>,
    );

    Object.entries(actionsGroupedByHandle).forEach(([action, edges]) => {
      innerCode += `  ${node.type}_${node.id}.on("${action}", () => {`
      innerCode += addEnter()

      edges.forEach((edge) => {
        const targetNode = nodes.find((node) => node.id === edge.target);
        // TODO: maybe be a bit more specific about the value and also include the type?
        const shouldSetValue = ["set", "check", "red", "green", "blue", "opacity", "from", "send", "rotate", "to"].includes(edge.targetHandle)
        let value = shouldSetValue ? `${node.type}_${node.id}.value` : undefined

        if (node.type === "RangeMap" && shouldSetValue) {
          // Mapper node
          innerCode += addEnter()
          value = `${node.type}_${node.id}.value[1]`
        }

        // TODO: add support for increment and decrement bigger than 1
        // TODO: add support for multiple values
        innerCode += `    ${targetNode?.type}_${targetNode?.id}.${edge.targetHandle}(${value});`
        innerCode += addEnter()
      })

      innerCode += `  }); // ${node.type}_${node.id} - ${action}`
      innerCode += addEnter()
      innerCode += addEnter()
    })
  })

  innerCode += addNodeProcessListener()
  innerCode += `}); // board - ready`

  code += wrapInTryCatch(innerCode)

  Object.keys(defintions).forEach((type) => {
    if (!nodes.find(node => node.type === type)) {
      return
    }

    code += addEnter()
    code += defintions[type as NodeType]()
  })

  return code
}

function addEnter() {
  return `
`
}

function addImports() {
  return `
const EventEmitter = require("events");
const JohnnyFive = require("johnny-five");
const log = require("electron-log/node");
`
}

function addBoard() {
  return `
const board = new JohnnyFive.Board({
  repl: false,
  debug: false,
});
`
}

function addBoardListener(type: string, selfClosing = true) {
  return `
board.on("${type}", (event) => {
  log.warn("board ${type}", { event });
  process.parentPort.postMessage({ type: "${type}", message: event?.message });
${selfClosing ? `}); // board - ${type}` : ``}
`
}

function addNodeProcessListener() {
  let code = `
process.parentPort.on('message', (e) => {`

  let innerCode = ``

  innerCode += "const node = nodes.find((node) => node.id === \`${e.data.nodeType}_${e.data.nodeId}\`);"
  innerCode += addEnter()
  innerCode += "node?.variable.setExternal(e.data.value)"

  code += wrapInTryCatch(innerCode)

  code += `
}); // process.parentPort.on - 'message'`
  code += addEnter()
  return code
}

function wrapInTryCatch(code: string) {
  return `
try {
  ${code}
} catch(error) {
  log.error("something went wrong", { error });
}
`
}

function defineButton() {
  return `
class Button extends JohnnyFive.Button {
  constructor(options) {
    super(options);
    this.options = options

    this.on("up", this.#postMessage.bind(this, "up"));
    this.on("down", this.#postMessage.bind(this, "down"));
    this.on("hold", this.#postMessage.bind(this, "hold"));
    this.on("change", this.#postMessage.bind(this, "change"));
  }

  get value() {
    return this.value;
  }

  #postMessage(action) {
    if (action !== "change") {
      this.emit("change", this.value);
    }

    process.parentPort.postMessage({ nodeId: this.options.id, action, value: this.value });
  }
}
`
}

function defineLed() {
  return `
class Led extends JohnnyFive.Led {
  #eventEmitter = new EventEmitter();
  #value = null

  constructor(options) {
    super(options);
    this.options = options

    this.#eventEmitter.on("change", this.#postMessage.bind(this, "change"));

    setInterval(() => {
      if(this.#value !== null && this.#value !== this.value) {
        this.#eventEmitter.emit("change");
      }
      this.#value = this.value;
    }, 7)
  }

  // Highjack the on method
  // to allow for a custom actions
  on(action, callback) {
    if (!action) {
      super.on();
      return;
    }

    this.#eventEmitter.on(action, callback);
  }

  #postMessage(action) {
    if (action !== "change") {
      this.emit("change", this.value);
    }

    process.parentPort.postMessage({ nodeId: this.options.id, action, value: this.value });
  }
}
`
}

function defineCounter() {
  return `
class Counter extends EventEmitter {
  #value = 0;

  constructor(options) {
    super();
    this.options = options

    this.on("change", this.#postMessage.bind(this, "change"));
  }

  set value(value) {
    this.#value = parseInt(value);
    this.emit("change", this.value);
  }

  get value() {
    return this.#value;
  }

  increment(amount = 1) {
    this.value += amount;
  }

  decrement(amount = 1) {
    this.value -= amount;
  }

  reset() {
    this.value = 0;
  }

  set(value) {
    this.value = value;
  }

  #postMessage(action) {
    if (action !== "change") {
      this.emit("change", this.value);
    }

    process.parentPort.postMessage({ nodeId: this.options.id, action, value: this.value });
  }
}
`
}


function defineInterval() {
  return `
class Interval extends EventEmitter {
  #minIntervalInMs = 500;
  #value = 0;

  constructor(options) {
    super();
    this.options = options

    this.on("change", this.#postMessage.bind(this, "change"));

    setInterval(() => {
      this.value = performance.now()
    }, this.#interval(options.interval));
  }

  set value(value) {
    this.#value = value;
    this.emit("change", value);
  }

  get value() {
    return this.#value;
  }

  #interval(interval) {
    const parsed = parseInt(interval);
    const isNumber = !isNaN(parsed);

    if (!isNumber) {
      return this.#minIntervalInMs;
    }

    return Math.max(this.#minIntervalInMs, parsed);
  }

  #postMessage(action) {
    if (action !== "change") {
      this.emit("change", this.value);
    }

    process.parentPort.postMessage({ nodeId: this.options.id, action, value: this.value });
  }
}
`
}

function defineFigma() {
  return `
class Figma extends EventEmitter {
  #value = null;
  #defaultRGBA = { r: 0, g: 0, b: 0, a: 0 }

  constructor(options) {
    super();
    this.options = options

    this.on("change", this.#postMessage.bind(this, "change"));
  }

  set value(value) {
    this.#value = value;
    this.emit("change", value);
  }

  get value() {
    return this.#value;
  }

  increment(amount = 1) {
    this.value += amount;
  }

  decrement(amount = 1) {
    this.value -= amount;
  }

  true() {
    this.value = true;
  }

  false() {
    this.value = false;
  }

  toggle() {
    this.value = !this.value;
  }

  set(value) {
    this.value = value;
  }

  setExternal(value) {
    this.#value = value;
  }

  red(value) {
    this.value = { ...this.#defaultRGBA, ...this.#value, r: Math.min(1, value / 255) };
  }

  green(value) {
    this.value = { ...this.#defaultRGBA, ...this.#value, g: Math.min(1, value / 255) };
  }

  blue(value) {
    this.value = { ...this.#defaultRGBA, ...this.#value, b: Math.min(1, value / 255) };
  }

  opacity(value) {
    this.value = { ...this.#defaultRGBA, ...this.#value, a: Math.min(1, value / 100) };
  }

  #postMessage(action) {
    if (action !== "change") {
      this.emit("change", this.value);
    }

    process.parentPort.postMessage({ nodeId: this.options.id, action, value: this.value });
  }
}
  `
}


function defineIfElse() {
  return `
class IfElse extends EventEmitter {
  #value = null

  constructor(options) {
    super();
    this.options = options;

    this.on("change", this.#postMessage.bind(this, "change"));
    this.on("true", this.#postMessage.bind(this, "true"));
    this.on("false", this.#postMessage.bind(this, "false"));
  }

  get value() {
    return this.#value;
  }

  set value(value) {
    this.#value = value;
    this.emit(value ? "true" : "false", value)
  }

  check(input) {
    const validator = this.#validator();
    this.value = validator(input, ...this.options.validatorArgs);
  }

  #validator() {
    switch (this.options.validator) {
      case "boolean":
        return (input) => input === true || ["1", "true", "on", "yes"].includes(String(input).toLowerCase());
      case "number":
        switch (this.options.subValidator) {
          case "equal to":
            return (input, expected) => input == expected;
          case "greater than":
            return (input, expected) => input > expected;
          case "less than":
            return (input, expected) => input < expected;
          case "between":
            return (input, min, max) => input > min && input < max;
          case "outside":
            return (input, min, max) => input < min && input > max;
          case "is even":
            return (input) => input % 2 === 0;
          case "is odd":
            return (input) => input % 2 !== 0;
          default:
            return () => false;
        }
      case "text":
        switch (this.options.subValidator) {
          case "equal to":
            return (input, expected) => input === expected;
          case "includes":
            return (input, expected) => input.includes(expected);
          case "starts with":
            return (input, expected) => input.startsWith(expected);
          case "ends with":
            return (input, expected) => input.endsWith(expected);
          default:
            return () => false;
        }
      default:
        return () => false;
    }
  }

  #postMessage(action) {
    if (action !== "change") {
      this.emit("change", this.value);
    }

    process.parentPort.postMessage({ nodeId: this.options.id, action, value: this.value });
  }
}
`
}

function defineRangeMap() {
  return `
class RangeMap extends EventEmitter {
  #value = [0,0];

  constructor(options) {
    super();
    this.options = options;

    this.on("to", this.#postMessage.bind(this, "to"));
    this.on("change", this.#postMessage.bind(this, "change"));
  }

  get value() {
    return this.#value;
  }

  set value(value) {
    const previousValue = this.#value;

    this.#value = value;
    this.#postMessage("change");

    if(previousValue[1] !== value[1]) {
      this.emit("to", value[1]);
    }
  }

  from(input) {
    if(typeof input === 'boolean') {
      input = input ? 1 : 0;
    }
    const inMin = this.options.from[0] ?? 0;
    const inMax = this.options.from[1] ?? 1023;
    const outMin = this.options.to[0] ?? 0;
    const outMax = this.options.to[1] ?? 1023;

    const output = ((input - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
    const distance = outMax - outMin;
    const normalizedOutput = parseFloat(output).toFixed(distance <= 10 ? 1 : 0);
    this.value = [input, normalizedOutput];
  }

  #postMessage(action) {
    if (action !== "change") {
      this.emit("change", this.value);
    }

    process.parentPort.postMessage({ nodeId: this.options.id, action, value: this.value });
  }
}
`
}


function defineMqtt() {
  return `
class Mqtt extends EventEmitter {
  #value = null;

  constructor(options) {
    super();
    this.options = options;

    this.on("change", this.#postMessage.bind(this, "change"));
    this.on("receive", this.#postMessage.bind(this, "receive"));
  }

  get value() {
    return this.#value;
  }

  set value(value) {
    this.#value = value;
    this.#postMessage("change");
  }

  setExternal(value) {
    this.#value = value;
    this.emit("receive", value);
  }

  send(message) {
    this.#value = message;
    this.emit("change", this.value);
  }

  #postMessage(action) {
    if (action !== "change") {
      this.emit("change", this.value);
    }

    process.parentPort.postMessage({ nodeId: this.options.id, action, value: this.value });
  }
}`
}

function defineSensor() {
  return `
class Sensor extends JohnnyFive.Sensor {
  #value = 0;

  constructor(options) {
    super(options);
    this.options = options;

    this.on("change", () => {
      this.#value = this.raw;
      this.#postMessage("change");
    })
  }

  get value() {
    return this.#value;
  }

  #postMessage(action) {
    if (action !== "change") {
      this.emit("change", this.value);
    }

    process.parentPort.postMessage({ nodeId: this.options.id, action, value: this.value });
  }
}
`
}

function defineServo() {
  return `
class Servo extends JohnnyFive.Servo {
  constructor(options) {
    super(options);
    this.options = options;

    this.on("move:complete", this.postMessage.bind(this, "complete"));
  }

  min() {
    super.min()
    this.postMessage("change");
  }

  max() {
    super.max();
    this.postMessage("change");
  }

  to(position) {
    if(isNaN(position)) return;

    super.to(position);
    this.postMessage("change");
  }

  rotate(speed = 0) {
    if(typeof speed === 'boolean') {
      speed = speed ? 1 : -1;
    }

    if(speed < 0.05 && speed > -0.05) {
      this.stop();
      return;
    }

    this.cw(speed);


    this.postMessage("change");
  }

  stop() {
    super.stop();
    this.postMessage("change");
  }

  postMessage(action) {
    if(!this.options) return;
    this.emit("change", this.value);

    process.parentPort.postMessage({ nodeId: this.options.id, action, value: this.value });
  }
}
`
}
