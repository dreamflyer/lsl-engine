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
    llOwnerSay: {
        type: "void",
        value: llOwnerSay
    }
}