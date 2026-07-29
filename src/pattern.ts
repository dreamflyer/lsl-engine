import { parseBrackets, startsWithPatterns } from "./util";

export class ASTNode {
    name?: string;
    expression: Expression = "";

    parent?: ASTNode;

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

    constructor(name: string) {
        patterns[name] = this;

        this.withName(name);

        this.init();
    }

    children: ASTNodePattern[] = [];

    abstract isMatching(text: string, start: number, end: number): boolean;

    abstract init(): void;

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
    FOR_LOOP_INITIALIZER_PATTERN: "FOR_LOOP_INITIALIZER_PATTERN",
    FOR_LOOP_CONDITION_PATTERN: "FOR_LOOP_CONDITION_PATTERN",
    FOR_LOOP_FINALIZER_PATTERN: "FOR_LOOP_FINALIZER_PATTERN",
    FOR_LOOP_HEADER_PATTERN: "FOR_LOOP_HEADER_PATTERN",
    FOR_LOOP_PATTERN: "FOR_LOOP_PATTERN",
    WHILE_LOOP_CONDITION_PATTERN: "WHILE_LOOP_CONDITION_PATTERN",
    WHILE_LOOP_HEADER_PATTERN: "WHILE_LOOP_HEADER_PATTERN",
    WHILE_LOOP_PATTERN: "WHILE_LOOP_PATTERN",
    STATE_HEADER_PATTERN: "STATE_HEADER_PATTERN",
    STATE_BODY_PATTERN: "STATE_BODY_PATTERN",
    STATE_PATTERN: "STATE_PATTERN",
    BODY_PATTERN: "BODY_PATTERN",
    ROOT_PATTERN: "ROOT_PATTERN",
    RETURN_PATTERN: "RETURN_PATTERN"
}

const builders: any = {
    VARIABLE_DECLARATION_PATTERN: () => new VariableDeclarationPattern(patternName.VARIABLE_DECLARATION_PATTERN),
    VARIABLE_DECLARATION_HEADER_PATTERN: () => new VariableDeclarationHeaderPattern(patternName.VARIABLE_DECLARATION_HEADER_PATTERN),
    VARIABLE_DECLARATION_VALUE_PATTERN: () => new VariableDeclarationValuePattern(patternName.VARIABLE_DECLARATION_VALUE_PATTERN),
    FUNCTION_DECLARATION_HEADER_PATTERN: () => new FunctionDeclarationHeaderPattern(patternName.FUNCTION_DECLARATION_HEADER_PATTERN),
    ARGUMENTS_DECLARATION_PATTERN: () => new ArgumentsDeclarationPattern(patternName.ARGUMENTS_DECLARATION_PATTERN),
    FUNCTION_DECLARATION_PATTERN: () => new FunctionDeclarationPattern(patternName.FUNCTION_DECLARATION_PATTERN),
    FUNCTION_CALL_PATTERN: () => new FunctionCallPattern(patternName.FUNCTION_CALL_PATTERN),
    FOR_LOOP_INITIALIZER_PATTERN: () => new ForLoopInitializerPattern(patternName.FOR_LOOP_INITIALIZER_PATTERN),
    FOR_LOOP_CONDITION_PATTERN: () => new ForLoopConditionPattern(patternName.FOR_LOOP_CONDITION_PATTERN),
    FOR_LOOP_FINALIZER_PATTERN: () => new ForLoopFinalizerPattern(patternName.FOR_LOOP_FINALIZER_PATTERN),
    FOR_LOOP_HEADER_PATTERN: () => new ForLoopHeaderPattern(patternName.FOR_LOOP_HEADER_PATTERN),
    FOR_LOOP_PATTERN: () => new ForLoopPattern(patternName.FOR_LOOP_PATTERN),
    WHILE_LOOP_CONDITION_PATTERN: () => new WhileLoopConditionPattern(patternName.WHILE_LOOP_CONDITION_PATTERN),
    WHILE_LOOP_HEADER_PATTERN: () => new WhileLoopHeaderPattern(patternName.WHILE_LOOP_HEADER_PATTERN),
    WHILE_LOOP_PATTERN: () => new WhileLoopPattern(patternName.WHILE_LOOP_PATTERN),
    STATE_HEADER_PATTERN: () => new StateHeaderPattern(patternName.STATE_HEADER_PATTERN),
    STATE_BODY_PATTERN: () => new StateBodyPattern(patternName.STATE_BODY_PATTERN),
    STATE_PATTERN: () => new StatePattern(patternName.STATE_PATTERN),
    BODY_PATTERN: () => new BodyPattern(patternName.BODY_PATTERN),
    ROOT_PATTERN: () => new RootPattern(patternName.ROOT_PATTERN),
    RETURN_PATTERN: () => new ReturnPattern(patternName.RETURN_PATTERN)
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
        builders[key](key)
    }

    return patterns[key];
}

abstract class AbstractBodyPattern extends ASTNodePattern {
    startPattern = [["{"]];
    endPattern = "}";

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

    init(): void {
        this.children = this.getChildren();
    }

    abstract getChildren(): any;
}

class BodyPattern extends AbstractBodyPattern {
    getChildren() {
        return [
            getPattern(patternName.VARIABLE_DECLARATION_PATTERN),
            getPattern(patternName.FUNCTION_CALL_PATTERN),
            getPattern(patternName.FOR_LOOP_PATTERN),
            getPattern(patternName.WHILE_LOOP_PATTERN),
            getPattern(patternName.RETURN_PATTERN)
        ];
    }
}

class VariableDeclarationHeaderPattern extends ASTNodePattern {
    startPattern = [[primitive, alphanumeric], [alphanumeric]];
    endPattern = alphanumeric;

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

    init(): void {
        
    }
}

class VariableDeclarationValuePattern extends ASTNodePattern {
    startPattern = [[primitive, alphanumeric]];
    endPattern = alphanumeric;

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

    init(): void {
        
    }
}

class VariableDeclarationPattern extends ASTNodePattern {
    startPattern = [[primitive, alphanumeric], [alphanumeric, "="]];
    endPattern = ";";

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

    init(): void {
        this.children = [
            getPattern(patternName.VARIABLE_DECLARATION_HEADER_PATTERN),
            getPattern(patternName.VARIABLE_DECLARATION_VALUE_PATTERN)
        ];
    }
}

class FunctionCallPattern extends ASTNodePattern {
    startPattern = [[alphanumeric, "("]];
    endPattern = ";";

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

    init(): void {

    }
}

class FunctionDeclarationHeaderPattern extends ASTNodePattern {
    startPattern = [[primitive, alphanumeric], [alphanumeric]];
    endPattern = alphanumeric;

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

    init(): void {
        
    }
}

class ArgumentsDeclarationPattern extends ASTNodePattern {
    startPattern? = [["("]];
    endPattern? = ")";

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

    init(): void {
        
    }
}

class FunctionDeclarationPattern extends ASTNodePattern {
    startPattern = [[alphanumeric, "("], [primitive, alphanumeric, "("]];
    endPattern = "}";

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

    init(): void {
        this.children = [
            getPattern(patternName.FUNCTION_DECLARATION_HEADER_PATTERN),
            getPattern(patternName.ARGUMENTS_DECLARATION_PATTERN),
            getPattern(patternName.BODY_PATTERN)
        ];
    }
}

class ForLoopInitializerPattern extends ASTNodePattern {
    startPattern = [];
    endPattern = ";";

    isMatching(text: string, start: number, end: number): boolean  {
        const content = text.substring(start, end).trim();

        if(!content.startsWith("for")) {
            return false;
        }
        
        if(!content.endsWith(this.endPattern)) {
            return false;
        }

        return true;
    }

    bake = (text: string, start: number, end: number): string| ASTNode => {
        let content = text.substring(start, end).trim();

        content = content.substring(3).trim();
        content = content.substring(1).trim();

        content = content.substring(0, content.length - 1).trim();

        return content;
    }

    init(): void {
        
    }
}

class ForLoopConditionPattern extends ASTNodePattern {
    startPattern = [];
    endPattern = ";";

    isMatching(text: string, start: number, end: number): boolean  {
        const content = text.substring(start, end).trim();
        
        if(!content.endsWith(this.endPattern)) {
            return false;
        }

        return true;
    }
    
    bake = (text: string, start: number, end: number): string| ASTNode => {
        let content = text.substring(start, end).trim();

        content = content.substring(0, content.length - 1).trim();

        return content;
    }

    init(): void {
        
    }
}

class ForLoopFinalizerPattern extends ASTNodePattern {
    startPattern = [];
    endPattern = "";

    isMatching(text: string, start: number, end: number): boolean  {
        if(!text.substring(start, end).trim().endsWith(")")) {
            return false;
        }

        return true;
    }

    bake = (text: string, start: number, end: number): string| ASTNode => {
        let content = text.substring(start, end - 1).trim();

        return content;
    }

    init(): void {
        
    }
}

class ForLoopHeaderPattern extends ASTNodePattern {
    startPattern = [["for","("]];
    endPattern = ")";

    isMatching(text: string, start: number, end: number): boolean  {
        const content = text.substring(start, end).trim();

        if(!content.endsWith(this.endPattern)) {
            return false;
        }

        if(!startsWithPatterns(content, this.startPattern[0]!)) {
            return false;
        }

        if(content.split(";").length != 3) {
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

        if(topBrackets[0].type != "(") {
            return false;
        }

        return true;
    }

    bake = (text: string, start: number, end: number): string| ASTNode => {
        let content = text.substring(start, end).trim();

        content = content.substring(3);

        content = content.substring(0, content.length - 1).trim();

        return content;
    }

    init(): void {
        this.children = [
            getPattern(patternName.FOR_LOOP_INITIALIZER_PATTERN),
            getPattern(patternName.FOR_LOOP_CONDITION_PATTERN),
            getPattern(patternName.FOR_LOOP_FINALIZER_PATTERN)
        ];
    }
}

class ForLoopPattern extends ASTNodePattern {
    startPattern: any = [["for", "("]];
    endPattern = "}";

    isMatching(text: string, start: number, end: number): boolean  {
        const content = text.substring(start, end).trim();

        if(!content.endsWith(this.endPattern)) {
            return false;
        }

        if(!startsWithPatterns(content, this.startPattern[0]!)) {
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

    init(): void {
        this.children = [
            getPattern(patternName.FOR_LOOP_HEADER_PATTERN),
            getPattern(patternName.BODY_PATTERN)
        ];
    }
}

class WhileLoopConditionPattern extends ASTNodePattern {
    startPattern = [];
    endPattern = ")";

    isMatching(text: string, start: number, end: number): boolean  {
        const content = text.substring(start, end).trim();

        if(!content.startsWith("while")) {
            return false;
        }
        
        if(!content.endsWith(this.endPattern)) {
            return false;
        }

        return true;
    }
    
    bake = (text: string, start: number, end: number): string| ASTNode => {
        let content = text.substring(start, end).trim();

        content = content.substring(5).trim();
        content = content.substring(1).trim();

        content = content.substring(0, content.length - 1).trim();

        return content;
    }

    init(): void {
        
    }
}

class WhileLoopHeaderPattern extends ASTNodePattern {
    startPattern = [["while","("]];
    endPattern = ")";

    isMatching(text: string, start: number, end: number): boolean  {
        const content = text.substring(start, end).trim();

        if(!content.endsWith(this.endPattern)) {
            return false;
        }

        if(!startsWithPatterns(content, this.startPattern[0]!)) {
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

        if(topBrackets[0].type != "(") {
            return false;
        }

        return true;
    }

    bake = (text: string, start: number, end: number): string| ASTNode => {
        let content = text.substring(start, end).trim();

        content = content.substring(5);

        content = content.substring(0, content.length - 1).trim();

        return content;
    }

    init(): void {
        this.children = [
            getPattern(patternName.WHILE_LOOP_CONDITION_PATTERN)
        ];
    }
}

class WhileLoopPattern extends ASTNodePattern {
    startPattern: any = [["while", "("]];
    endPattern = "}";

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

    init(): void {
        this.children = [
            getPattern(patternName.WHILE_LOOP_HEADER_PATTERN),
            getPattern(patternName.BODY_PATTERN)
        ];
    }
}

class StateHeaderPattern extends ASTNodePattern {
    startPattern = [[alphanumeric]];
    endPattern = alphanumeric;

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

    init(): void {
        
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

    init(): void {
        this.children = [
            getPattern(patternName.STATE_HEADER_PATTERN),
            getPattern(patternName.STATE_BODY_PATTERN)
        ];
    }
}

class RootPattern extends ASTNodePattern {
    startPattern = [];
    endPattern = "";

    isMatching(text: string, start: number, end: number) {
        return true;
    }

    init(): void {
        this.children = [
            getPattern(patternName.FUNCTION_DECLARATION_PATTERN),
            getPattern(patternName.VARIABLE_DECLARATION_PATTERN),
            getPattern(patternName.STATE_PATTERN)
        ];
    }
}

class ReturnPattern extends ASTNodePattern {
    startPattern = [["return"]];
    endPattern = ";";

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

    init(): void {
        
    }
}
