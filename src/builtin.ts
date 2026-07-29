import { SLList, SLVector, SLRotation } from "./structure";

function llOwnerSay(message: string) {
    console.log("Owner says: " + message);
}

export const builtinFunctions: {[key: string]: {type: string, value: Function}} = {
    lsl_type_cast: {
        type: "primitive",
        value: (value: any, type: string) => {
            if (type === "string") {
                return String(value);
            } else if (type === "integer") {
                return parseInt(value);
            } else if (type === "float") {
                return parseFloat(value);
            }
            
            return value;
        }
    },
    lsl_list: {
        type: "list",
        value: (value: any) => {
            return new SLList(value);
        }
    },
    lsl_vector: {
        type: "vector",
        value: (...args: any[]) => {
            return new SLVector(args[0], args[1], args[2]);
        }
    },
    llOwnerSay: {
        type: "void",
        value: llOwnerSay
    },
    llList2String: {
        type: "string",
        value: (list: SLList, index: number) => {
            return list.items[index] + '';
        }
    }
}