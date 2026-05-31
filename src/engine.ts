import { parse } from "./parser";
import { ASTNode, patternName } from "./pattern";

import { parseBrackets } from "./util";
import { toJsExpression } from "./converter1";

import { SLList, SLVector, SLRotation } from "./structure";
import { builtinFunctions } from "./builtin";

function createExpressionRunner(lslExpression: string, variables: any): Function {
    const typesMap: { [key: string]: string } = {};

    Object.keys(variables).forEach(key => {
        typesMap[key] = variables[key].type;
    });

    const patched = toJsExpression(parseBrackets(lslExpression), typesMap);
    
    const argNames = Object.keys(typesMap).sort();

    const result = new Function(...argNames, `return ${patched.code};`);

    return (...args: any[]) => {
        const returning = result(...args);
        return returning;
    };
}

function createDeclaredFunctionRunner(declaration: ASTNode): Function {
    const headerText: string = (<any>declaration).expression[0].expression;

    const tokens = headerText.split(/ +/);

    const type: string = tokens[0] || "";
    const name: string = tokens[1] || "";

    const declaredArgs = argumentsFromFunctionDeclaration(declaration);

    const argNames = Object.keys(declaredArgs);

    function result(parentStack: Stack, ...args: any[]) {
        const stack: Stack = parentStack.createChild(declaration);
        
        for(let i = 0; i < argNames.length; i++) {
            stack.declareVariable(declaredArgs[i]!.name, declaredArgs[i]!.type, args[i]);
        }

        runBody((<any>declaration).expression[2], stack);

        (<any>stack).parent = undefined;

        return stack.retVal;
    }

    result.declared = true;

    return result;
}

function variableFromVariableDeclaration(variable: ASTNode): { [key: string]: string } | undefined {
    const headerText: string = (<any>variable).expression[0].expression;

    const tokens = headerText.split(/ +/);

    if(tokens.length != 2) {
        return undefined;
    }

    const type: string = tokens[0] || "";
    const name: string = tokens[1] || "";

    return {[name]: type};
}

function variableFromFunctionDeclaration(functionDeclaration: ASTNode): { [key: string]: string } | undefined {
    const headerText: string = (<any>functionDeclaration).expression[0].expression;

    const tokens = headerText.split(/ +/);

    if(tokens.length != 2) {
        return {[headerText.trim()]: "void"};
    }

    const type: string = tokens[0] || "";
    const name: string = tokens[1] || "";

    return {[name]: type};
}

function argumentsFromFunctionDeclaration(functionDeclaration: ASTNode): { name: string, type: string}[] {
    const argsText = (<any>functionDeclaration).expression[1].expression.trim().slice(1, -1).trim();

    if(!argsText) {
        return [];
    }

    const result: any[] = [];

    argsText.split(",").map((item: string) => item.trim().split(/ +/)).forEach((arg: string) => {
        const type: string = arg[0] || "";
        const name: string = arg[1] || "";

        result.push({name, type});
    });

    return result;
}

function visibleDeclaredVaribablesAbove(node: ASTNode): { [key: string]: string } {
    let current : ASTNode | undefined = node;

    let result: any = {};

    while(current) {
        if(current.name == patternName.BODY_PATTERN) {
                const elements = (<any>current).expression as ASTNode[];

                for(const item of elements) {
                    if(item == node) {
                        break;
                    }
                    if(item.name == patternName.VARIABLE_DECLARATION_PATTERN) {
                        const declared = variableFromVariableDeclaration(item);

                        if(declared) {
                            result = {...result, ...declared};
                        }
                    }
                }
        } else if(current.name == patternName.FUNCTION_DECLARATION_PATTERN) {
            const args: any = {};
            
            argumentsFromFunctionDeclaration(current).forEach(item => {
                args[item.name] = item.type;
            });

            result = {...result, ...args};
        } else if(current.name == patternName.ROOT_PATTERN) {
            const elements = (<any>current).expression as ASTNode[];

            for(const item of elements) {
                if(item == node) {
                    break;
                }
                if(item.name == patternName.VARIABLE_DECLARATION_PATTERN) {
                    const declared = variableFromVariableDeclaration(item);

                    if(declared) {
                        result = {...result, ...declared};
                    }
                } else if(item.name == patternName.FUNCTION_DECLARATION_PATTERN) {
                    const declared = variableFromFunctionDeclaration(item);

                    if(declared) {
                        result = {...result, ...declared};
                    }
                }
            }
        }

        if(!current.parent) {
            builtinFunctions && Object.keys(builtinFunctions).forEach(key => {
                result[key] = builtinFunctions[key]!.type;
            });
        }

        current = current.parent;
    }

    return result;
}

function runBody(body: ASTNode, stack: Stack) {
    (<any>body).expression.forEach((element: ASTNode) => {
        if(element.name == patternName.VARIABLE_DECLARATION_PATTERN) {
            stack.declareOrSetVariableFromNode(element);
        } else if(element.name == patternName.FUNCTION_CALL_PATTERN) {
            stack.evalExpression(element);
        } else if(element.name == patternName.RETURN_PATTERN) {
            stack.retVal = stack.evalExpression(element);
        } else if(element.name == patternName.FUNCTION_DECLARATION_PATTERN) {
            stack.declareFunction(element);  
        }
    })
}

function lslExpressionFromNode(node: ASTNode): string {
    if(node.name == patternName.VARIABLE_DECLARATION_PATTERN) {
        return (<any>node).expression[1].expression.trim();
    }

    if(node.name == patternName.FUNCTION_CALL_PATTERN) {
        return (<any>node).expression.trim();
    }

    if(node.name == patternName.RETURN_PATTERN) {
        return (<any>node).expression.trim().replace(/^return\s+/, "");
    }

    return "";
}

const defaults: any = {
    "string": "",
    "integer": 0,
    "float": 0.0,
    "vector": new SLVector(0, 0, 0),
    "rotation": new SLRotation(0, 0, 0, 1),
    "list": new SLList([])
}

class Stack {
    parent?: Stack;

    node: ASTNode;

    variables: { [key: string]: { type: string, value: any } } = {};

    compiledExpressions: { [key: string]: Function } = {};

    retVal: any = undefined;

    constructor(node: ASTNode, parent?: Stack) {
        this.node = node;
        (<any>this).parent = parent;
    }

    evalExpression(node: ASTNode): any {
        const lslExpression = lslExpressionFromNode(node);
        const declaredVariables = visibleDeclaredVaribablesAbove(node);
        if(!this.compiledExpressions[lslExpression]) {
            this.compiledExpressions[lslExpression] = createExpressionRunner(lslExpression, declaredVariables);
        }

        const runtimeVariables = this.getRuntimeVariables();

        if(Object.keys(declaredVariables).length != Object.keys(runtimeVariables).length) {
            throw new Error("Runtime and declared variables not match: " + lslExpression);
        }

        const variables: any[] = [];

        Object.keys(runtimeVariables).sort().forEach(key => {
            let value = this.getRuntimeVariables()[key]!.value;

            variables.push(value.declared ? (...args: any[]) => value(this, ...args) : value);
        });

        const runner: Function = this.compiledExpressions[lslExpression];

        return runner(...variables);
    }

    declareVariable(name: string, type: string, value: any) {
        this.variables[name] = {type, value};
    }

    declareOrSetVariableFromNode(variableDeclaration: ASTNode) {
        const headerText: string = (<any>variableDeclaration).expression[0].expression;

        const tokens = headerText.split(/ +/);

        if(tokens.length == 2) {
            this.declareVariableFromNode(variableDeclaration);
        } else if(tokens.length == 1) {
            this.setVariableFromNode(variableDeclaration);
        }
    }

    declareVariableFromNode(variableDeclaration: ASTNode) {
        const headerText: string = (<any>variableDeclaration).expression[0].expression;

        const tokens = headerText.split(/ +/);

        const type: string = tokens[0] || "";
        const name: string = tokens[1] || "";

        const valueText  = (<any>variableDeclaration).expression[1].expression.trim();

        let value: any = defaults[type];

        if(valueText) {
            value = this.evalExpression(variableDeclaration);
        }

        this.variables[name] = {type, value: value};
    }

    setVariableFromNode(variableAssigment: ASTNode) {
        const name: string = (<any>variableAssigment).expression[0].expression.trim();

        const value = this.evalExpression(variableAssigment);

        let currentStack: Stack | undefined = this;

        while(currentStack && !currentStack.variables[name] && !(currentStack.parent == undefined || currentStack == this)) {
            currentStack = currentStack.parent;
        }

        if(currentStack) {
            (<any>currentStack).variables[name].value = value;
        }
    }

    declareFunction(functionDeclaration: ASTNode, putToStack: boolean = true) {
        const headerText: string = (<any>functionDeclaration).expression[0].expression;
        
        const tokens = headerText.split(/ +/);
        
        let type: string = tokens[0] || "";
        let name: string = tokens[1] || "";

        if(tokens.length == 1) {
            type = "void";
            name = tokens[0] || "";
        }

        const instance = createDeclaredFunctionRunner(functionDeclaration); 

        if(putToStack) {
            this.variables[name] = {type, value: instance};
        }
    }

    getRuntimeVariables(caller: Stack = this): { [key: string]: { type: string, value: any } } {
        const result: any = this.parent?.getRuntimeVariables(caller) || {};

        if(caller == this || !this.parent) {
            return {...result, ...this.variables};
        } else {
            return result;
        }
    }

    createChild(node: ASTNode): Stack {
        const result = new Stack(node, this);

        return result;
    }
}

class ASTNodeVisitor {
    private visit: (node: ASTNode) => void;

    constructor(visit : (node: ASTNode) => void) {
        this.visit = visit;
    }

    start(node: ASTNode) {
        this.visit(node);

        if(Array.isArray(node.expression)) {
            for(const child of node.expression) {
                this.start(child);
            }
        }
    }
}

interface LSLEngineConfig {
    owner_uuid: string;
    creator_uuid: string;
}

export class LSLEngine {
    private rootAst: ASTNode;

    private rootStack: Stack;

    private handlers: { [key: string]: ASTNode } = {};

    private currentState: string = "default";

    constructor(lsl: string) {
        this.rootAst = parse(lsl);

        this.rootStack = new Stack(this.rootAst, undefined);

        this.loadBuiltins();

        runBody(this.rootAst, this.rootStack);

        const visitor = new ASTNodeVisitor((node) => {
            if(node.parent && node.name == patternName.FUNCTION_DECLARATION_PATTERN && node.parent.name == patternName.STATE_BODY_PATTERN) {
                this.handlers["default_" + (<any>node).expression[0].expression] = node; 
            }
        });

        visitor.start(this.rootAst);
    }

    loadBuiltins() {
        Object.keys(builtinFunctions).forEach(key => {
            this.rootStack.declareVariable(key, builtinFunctions[key]!.type, builtinFunctions[key]!.value);
        });
    }

    teleport() {
        
    }

    runHandler(handlerName: string, args: {name: string, value: string}[]) {
        const handler: ASTNode = this.handlers[this.currentState + "_" + handlerName]!;
        const stack = this.rootStack.createChild(handler);

        runBody((<any>handler).expression[2], stack);

        (<any>stack).parent = undefined;
    }
}