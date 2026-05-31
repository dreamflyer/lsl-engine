import { LSLEngine } from "./engine"

const text = `
    integer a = 1;
    float b = 2;

    float c ;

    float abc(float x1, float x2) {
        return x1 + x2;
    }

    log(string text) {
        llOwnerSay(text);
    }

    default {
        state_entry() {
            float x1 = 0.1;
            float x2 = 0.2;

            float x3 = x1 + x2;

            log("ololo" + (string)abc(x1, x2 + x3 + 0.3));
        }
    }
`

const text1 = `
    state_entry() {
        float x1 = 0.1;
        float x2 = 0.2;

        x1 = x1 + 2;

        list a = ["aaa;", x1, x2, <1, 2, 3.0>];

        float x3 = x1 + x2;
        log("ololo" + (string)abc(x1, x2 + x3 + 0.3));

        return x1 + x2;
    }
`

const engine = new LSLEngine(text);

engine.runHandler("state_entry", []);

