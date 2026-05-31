import { ASTNodePattern, ASTNodeDescription, ASTNode, getPattern, patternName } from "./pattern";

function getMatch(start: number, end: number, text: string, parentPattern: ASTNodePattern): ASTNodePattern | undefined | null {
    for(const item of parentPattern.children) {
        if(item.isMatching(text, start, end)) {
            return item;
        }
    }

    return null;
}

function toDescription(start: number, end: number, pattern: ASTNodePattern) {
    return {start, end, pattern}
}

function bake(description: ASTNodeDescription, text: string): ASTNode {
    const result = new ASTNode();
        
    let content = text.substring(description.start, description.end);
    
    if(description.pattern.children.length) {
        if(description.pattern.body) {
            content = description.pattern.body(content, 0, content.length);
        }

        const tempNode = parse(content, description.pattern)

        result.expression = tempNode.expression;

        (<any>result).expression.forEach((node: ASTNode) => node.parent = result);
    } else {
        result.expression = description.pattern.bake ? description.pattern.bake(text, description.start, description.end) : content.trim();
    }

    (<any>result).text = content;
    (<any>result).name = description.pattern.name;

    return result;
}

export function parse(text: string, pattern: ASTNodePattern = getPattern(patternName.ROOT_PATTERN), start: number = 0, end: number = 1): ASTNode {
    const textLength = text.length;

    const result = new ASTNode();

    if(pattern.name === patternName.ROOT_PATTERN) {
        result.name = "ROOT_PATTERN";
    }

    result.expression = [];

    while(start < textLength && end <= textLength) {
        let nodePattern = getMatch(start, end, text, pattern);
        
        if(!nodePattern) {
            end +=1;

            continue;
        }

        const bakedNode: ASTNode = bake(toDescription(start, end, nodePattern), text);

        result.expression.push(bakedNode.withParent(result));

        start = end;
    }

    return result;
}