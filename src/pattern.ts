import { parseBrackets, startsWithPatterns } from "./util";

export class ASTNode {
    name?: string;
    expression: Expression = "";

    parent?: ASTNode;

    eval: any;

    withParent(parent: ASTNode): ASTNode {
        this.parent = parent;

        return this;
    }
}

type Expression = ASTNode | ASTNode[] | string;

export abstract class  ASTNodePattern {
    name?: string;
    startPattern?: any;
    endPattern?: any;

    abstract children: ASTNodePattern[];

    abstract isMatching(text: string, start: number, end: number): boolean;

    bake?: (text: string, start: number, end: number) => string | ASTNode;

    body?: (text: string, start: number, end: number) => string;

    withName = (name: string): ASTNodePattern => {
        this.name = name;

        return this;
    };
}

const patterns: any = {};

export const patternName = {
    VARIABLE_DECLARATION_PATTERN: "VARIABLE_DECLARATION_PATTERN",
    VARIABLE_DECLARATION_HEADER_PATTERN: "VARIABLE_DECLARATION_HEADER_PATTERN",
    VARIABLE_DECLARATION_VALUE_PATTERN: "VARIABLE_DECLARATION_VALUE_PATTERN",
    FUNCTION_DECLARATION_HEADER_PATTERN: "FUNCTION_DECLARATION_HEADER_PATTERN",
    ARGUMENTS_DECLARATION_PATTERN: "ARGUMENTS_DECLARATION_PATTERN",
    FUNCTION_DECLARATION_PATTERN: "FUNCTION_DECLARATION_PATTERN",
    FUNCTION_CALL_PATTERN: "FUNCTION_CALL_PATTERN",
    STATE_HEADER_PATTERN: "STATE_HEADER_PATTERN",
    STATE_BODY_PATTERN: "STATE_BODY_PATTERN",
    STATE_PATTERN: "STATE_PATTERN",
    BODY_PATTERN: "BODY_PATTERN",
    ROOT_PATTERN: "ROOT_PATTERN",
    RETURN_PATTERN: "RETURN_PATTERN"
}

const builders: any = {
    VARIABLE_DECLARATION_PATTERN: () => new VariableDeclarationPattern(),
    VARIABLE_DECLARATION_HEADER_PATTERN: () => new VariableDeclarationHeaderPattern(),
    VARIABLE_DECLARATION_VALUE_PATTERN: () => new VariableDeclarationValuePattern(),
    FUNCTION_DECLARATION_HEADER_PATTERN: () => new FunctionDeclarationHeaderPattern(),
    ARGUMENTS_DECLARATION_PATTERN: () => new ArgumentsDeclarationPattern(),
    FUNCTION_DECLARATION_PATTERN: () => new FunctionDeclarationPattern(),
    FUNCTION_CALL_PATTERN: () => new FunctionCallPattern(),
    STATE_HEADER_PATTERN: () => new StateHeaderPattern(),
    STATE_BODY_PATTERN: () => new StateBodyPattern(),
    STATE_PATTERN: () => new StatePattern(),
    BODY_PATTERN: () => new BodyPattern(),
    ROOT_PATTERN: () => new RootPattern(),
    RETURN_PATTERN: () => new ReturnPattern()
};

export interface ASTNodeDescription {
    pattern: ASTNodePattern;

    start: number;
    end: number;
}

const alphanumeric = /[a-z0-9]+/i;
const primitive = /integer|float|string|list|key/;

export function getPattern(key: string): ASTNodePattern {
    if(!patterns[key]) {
        patterns[key] = builders[key]().withName(key);
    }

    return patterns[key];
}

abstract class AbstractBodyPattern extends ASTNodePattern {
    startPattern = [["{"]];
    endPattern = "}";

    children = this.getChildren();

    isMatching(text: string, start: number, end: number): boolean  {
        const content = text.substring(start, end).trim();

        if(!content.startsWith("{")) {
            return false;
        }

        if(!content.endsWith("}")) {
            return false;
        }

        const brackets = parseBrackets(content);

        if(!brackets) {
            return false;
        }

        const topBrackets = brackets.filter(item => !!item.type)

        if(topBrackets.length != 1) {
            return false;
        }

        return true;
    }

    body = (text: string, start: number, end: number): string => {
        let content = text.substring(start, end).trim();

        content = content.substring(1);

        content = content.substring(0, content.length - 1);

        return content.trim();
    }

    abstract getChildren(): any;
}

class BodyPattern extends AbstractBodyPattern {
    getChildren() {
        return [
            getPattern(patternName.VARIABLE_DECLARATION_PATTERN),
            getPattern(patternName.FUNCTION_CALL_PATTERN),
            getPattern(patternName.RETURN_PATTERN)
        ];
    }
}

class VariableDeclarationHeaderPattern extends ASTNodePattern {
    startPattern = [[primitive, alphanumeric], [alphanumeric]];
    endPattern = alphanumeric;

    children = [];

    isMatching(text: string, start: number, end: number): boolean  {
        let actualEnd = text.indexOf(";", start);

        if(actualEnd == -1) {
            return false;
        }

        let anotherEnd = text.indexOf("=", start);

        if(anotherEnd > 0 && anotherEnd < actualEnd) {
            actualEnd = anotherEnd;
        }

        if(actualEnd != end) {
            return false;
        }

        const content = text.substring(start, end).trim();

        if(!this.startPattern.find(item => startsWithPatterns(content, item))) {
            return false;
        }

        return true;
    }
}

class VariableDeclarationValuePattern extends ASTNodePattern {
    startPattern = [[primitive, alphanumeric]];
    endPattern = alphanumeric;

    children = [];

    isMatching(text: string, start: number, end: number): boolean  {
        const content = text.substring(start, end).trim();

        if(!content) {
            return false;
        }

        if(!content.endsWith(";")) {
            return false;
        }

        const brackets = parseBrackets(content);

        if(!brackets) {
            return false;
        }

        return true;
    }

    bake = (text: string, start: number, end: number): string| ASTNode => {
        let content = text.substring(start, end).trim();

        content = content.substring(1);

        content = content.substring(0, content.length - 1).trim();

        return content;
    }
}

class VariableDeclarationPattern extends ASTNodePattern {
    startPattern = [[primitive, alphanumeric], [alphanumeric, "="]];
    endPattern = ";";

    children = [
            getPattern(patternName.VARIABLE_DECLARATION_HEADER_PATTERN),
            getPattern(patternName.VARIABLE_DECLARATION_VALUE_PATTERN)
    ];

    isMatching(text: string, start: number, end: number): boolean  {
        const content = text.substring(start, end).trim();

        if(!content.endsWith(this.endPattern)) {
            return false;
        }

        if(!this.startPattern.find((item: any) => startsWithPatterns(content, item))) {
            return false;
        }

        const brackets = parseBrackets(content);

        if(!brackets) {
            return false;
        }

        return true;
    }
}

class FunctionCallPattern extends ASTNodePattern {
    startPattern = [[alphanumeric, "("]];
    endPattern = ";";

    children = [];

    isMatching(text: string, start: number, end: number): boolean  {
        const content = text.substring(start, end).trim();

        if(!content.endsWith(this.endPattern)) {
            return false;
        }

        const brackets = parseBrackets(content);

        if(!brackets) {
            return false;
        }

        const patterns = this.startPattern[0];

        if(patterns && !startsWithPatterns(content, patterns)) {
            return false;
        }

        return true;
    }
}

class FunctionDeclarationHeaderPattern extends ASTNodePattern {
    startPattern = [[primitive, alphanumeric], [alphanumeric]];
    endPattern = alphanumeric;

    children = [];

    isMatching(text: string, start: number, end: number): boolean  {
        let actualEnd = text.indexOf("(", start);

        if(actualEnd == -1) {
            return false;
        }

        if(actualEnd != end) {
            return false;
        }

        const content = text.substring(start, end).trim();

        if(!this.startPattern.find(item => startsWithPatterns(content, item))) {
            return false;
        }

        return true;
    }
}

class ArgumentsDeclarationPattern extends ASTNodePattern {
    startPattern? = [["("]];
    endPattern? = ")"
    children: ASTNodePattern[] = [];

    isMatching(text: string, start: number, end: number): boolean {
        const content = text.substring(start, end).trim();

        if(!content.endsWith(")")) {
            return false;
        }

        if(!content.startsWith("(")) {
            return false;
        }

        const brackets = parseBrackets(content);

        if(!brackets) {
            return false;
        }

        const topBrackets = brackets.filter(item => !!item.type)

        if(topBrackets.length != 1) {
            return false;
        }

        if(topBrackets[0].content.length != 1) {
            return false;
        }

        if(topBrackets[0].content[0].type) {
            return false;
        }

        if(!topBrackets[0].content[0].trim()) {
            return true;
        }

        const args = topBrackets[0].content[0].split(",").map((item: string) => item.trim());

        for(const arg of args) {
            if(!startsWithPatterns(arg, [primitive, alphanumeric])) {
                return false;
            }
        }

        return true;
    }
}

class FunctionDeclarationPattern extends ASTNodePattern {
    startPattern = [[alphanumeric, "("], [primitive, alphanumeric, "("]];
    endPattern = "}";

    children = [
        getPattern(patternName.FUNCTION_DECLARATION_HEADER_PATTERN),
        getPattern(patternName.ARGUMENTS_DECLARATION_PATTERN),
        getPattern(patternName.BODY_PATTERN)
    ];

    isMatching(text: string, start: number, end: number): boolean  {
        const content = text.substring(start, end).trim();

        if(!content.endsWith(this.endPattern)) {
            return false;
        }

        const brackets = parseBrackets(content);

       if(!brackets) {
            return false;
        }

        const topBrackets = brackets.filter(item => !!item.type)

        if(topBrackets.length != 2) {
            return false;
        }

        if(!(topBrackets[0].type == "(" && topBrackets[1].type == "{")) {
            return false;
        }

        if(brackets.indexOf(topBrackets[0]) != 1) {
            return false;
        }

        const header = brackets[0].trim();

        if(!header) {
            return false;
        }

        const split = header.split(/ +/).map((item: any) => item.trim())

        if(split.length > 2) {
            return false;
        }

        if(split.length == 2) {
            return primitive.test(split[0])
        }

        return true;
    }
}

class StateHeaderPattern extends ASTNodePattern {
    startPattern = [[alphanumeric]];
    endPattern = alphanumeric;

    children = [];

    isMatching(text: string, start: number, end: number): boolean {
        const content = text.substring(start, end).trim();

        if(!content) {
            return false;
        }

        const actualEnd = text.indexOf("{", start);

        if(actualEnd == -1) {
            return false;
        }

        if(end != actualEnd) {
            return false;
        }

        return true;
    }
}

class StateBodyPattern extends AbstractBodyPattern {
    getChildren() {
        return [
            getPattern(patternName.FUNCTION_DECLARATION_PATTERN)
        ];
    }
}

class StatePattern extends ASTNodePattern {
    startPattern = [[alphanumeric, "{"]];
    endPattern = "}";

    children = [
        getPattern(patternName.STATE_HEADER_PATTERN),
        getPattern(patternName.STATE_BODY_PATTERN)
    ];

    isMatching(text: string, start: number, end: number): boolean  {
        const content = text.substring(start, end).trim();

        if(!content.endsWith(this.endPattern)) {
            return false;
        }

        const patterns = this.startPattern[0];

        if(patterns && !startsWithPatterns(content, patterns)) {
            return false;
        }

        const brackets = parseBrackets(content);

        if(!brackets) {
            return false;
        }

        const topBrackets = brackets.filter(item => !!item.type)

        if(topBrackets.length != 1) {
            return false;
        }

        if(topBrackets[0].type != '{') {
            return false;
        }

        return true;
    }
}

class RootPattern extends ASTNodePattern {
    startPattern = [];
    endPattern = "";

    children = [
        getPattern(patternName.FUNCTION_DECLARATION_PATTERN),
        getPattern(patternName.VARIABLE_DECLARATION_PATTERN),
        getPattern(patternName.STATE_PATTERN)
    ];

    isMatching(text: string, start: number, end: number) {
        return true;
    }
}

class ReturnPattern extends ASTNodePattern {
    startPattern = [["return"]];
    endPattern = ";";

    children = [];

    isMatching(text: string, start: number, end: number): boolean  {
        const content = text.substring(start, end).trim();

        if(!content.endsWith(this.endPattern)) {
            return false;
        }

        const brackets = parseBrackets(content);

        if(!brackets) {
            return false;
        }

        if(!this.startPattern.find(item => startsWithPatterns(content, item))) {
            return false;
        }

        return true;
    }
}
