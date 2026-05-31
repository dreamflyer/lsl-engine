export function parseBrackets1(text: string): any[] | null {
    const opening = ['{', '[', '(', '<'];
    const closing = ['}', ']', ')', '>'];
    const matching: { [key: string]: string } = {
        '}': '{',
        ']': '[',
        ')': '(',
        '<': '>'
    };

    let index = 0;

    function parse(expectedClosing: string | null | undefined): any[] | null {
        const result: any[] = [];
        let currentText = "";

        while (index < text.length) {
            const char = text[index] || "";

            if (opening.includes(char)) {
                if (currentText || result.length === 0) {
                    result.push(currentText);
                    currentText = "";
                }

                const openType = char;
                const closeType = closing[opening.indexOf(char)];
                
                index++;
                const innerContent = parse(closeType);
                
                if (innerContent === null) return null;

                const formattedContent: any = innerContent;
                // if (innerContent.length === 1 && typeof innerContent[0] === 'string') {
                //     formattedContent = [innerContent[0]];
                // } else if (innerContent.length === 0) {
                //     formattedContent = [];
                // }

                result.push({
                    type: openType,
                    content: formattedContent
                });

                continue;
            }

            if (closing.includes(char)) {
                if (char === expectedClosing) {
                    result.push(currentText);
                    index++;
                    return result;
                } else {
                    return null;
                }
            }

            currentText += char;
            index++;
        }

        if(expectedClosing !== null) {
            return null;
        }

        result.push(currentText);
        return result;
    }

    const finalResult = parse(null);
    return finalResult;
}

export function validateBrackets(brackets: any[] | null, bracketType: string): boolean {
    if(!brackets) {
        return false;
    }

    const filteredBrackets = brackets.filter(item => item && !!item.type);

    if(filteredBrackets.length != 1) {
        return false;
    }

    return filteredBrackets[0].type == bracketType;
}

export function startsWithPatterns(text: string, patterns: (string | RegExp)[]): boolean {
    const patternSources = patterns.map(p => {
      if (p instanceof RegExp) {
        return `(?:${p.source})`;
      }
      
      return `(?:${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`;
    });
  
    const fullPatternSource = '^' + patternSources.join('\\b\\s*');
  
    const firstRegExp = patterns.find(p => p instanceof RegExp) as RegExp | undefined;
    const flags = firstRegExp ? firstRegExp.flags.replace('g', '') : '';
  
    const finalRegex = new RegExp(fullPatternSource, flags);
  
    return finalRegex.test(text);
}

export function parseBrackets(text: string): any[] {
    const opening = ['{', '[', '(', '<'];
    const closing = ['}', ']', ')', '>'];

    let index = 0;

    function parse(expectedClosing: string | null | undefined): any[] | null {
        const result: any[] = [];
        let currentText = "";
        let inString = false;

        while (index < text.length) {
            const char = text[index] || "";

            if (inString && char === '\\') {
                currentText += char;
                index++;
                if (index < text.length) {
                    currentText += text[index];
                    index++;
                }
                continue;
            }

            if (char === '"') {
                inString = !inString;
                currentText += char;
                index++;
                continue;
            }

            if (inString) {
                currentText += char;
                index++;
                continue;
            }

            if (opening.includes(char)) {
                if (currentText || result.length === 0) {
                    result.push(currentText);
                    currentText = "";
                }

                const openType = char;
                const closeType = closing[opening.indexOf(char)];
                
                index++;
                const innerContent = parse(closeType);
                
                if (innerContent === null) return null;

                result.push({
                    type: openType,
                    content: innerContent
                });

                continue;
            }

            if (closing.includes(char)) {
                if (char === expectedClosing) {
                    result.push(currentText);
                    index++;
                    return result;
                } else {
                    return null;
                }
            }

            currentText += char;
            index++;
        }

        if (inString) {
            return null;
        }

        if (expectedClosing !== null) {
            return null;
        }

        result.push(currentText);
        return result;
    }

    const finalResult = parse(null);
    return finalResult as any[];
}

export function toJsExpression(lslExpr: string): string {
    const tree = parseBrackets(lslExpr);
    if (!tree) throw new Error("Syntax Error: Unbalanced brackets/strings");

    function processNode(node: any): string {
        if (typeof node === 'string') {
            return patchFlatExpression(node);
        }

        if (node && node.type) {
            const innerContent = node.content.map(processNode).join('');

            if (node.type === '<') {
                return `lsl_vector(${innerContent})`;
            }
            
            return node.type + innerContent + getClosingBracket(node.type);
        }
        return '';
    }

    function getClosingBracket(open: string): string {
        if (open === '[') return ']';
        if (open === '{') return '}';
        if (open === '(') return ')';
        if (open === '<') return '>';
        return '';
    }

    function patchFlatExpression(str: string): string {
        let res = str;

        const typeRegex = /\((string|integer|float|vector|rotation|list)\)\s*([a-zA-Z0-9_]+|\([^)]+\))/g;
        
        while (typeRegex.test(res)) {
            res = res.replace(typeRegex, (match, type, target) => {
                return `lsl_type_cast(${target}, "${type}")`;
            });
        }

        const opRegex = /([a-zA-Z0-9_().[\]"'\s]+)\s*([+*])\s*([a-zA-Z0-9_().[\]"'\s]+)/g;
        
        return res;
    }

    let jsCode = tree.map(processNode).join('');
    
    jsCode = wrapOperators(jsCode);

    return jsCode;
}

function wrapOperators(code: string): string {
    let patched = code;
    patched = patched.replace(/([^\s+]+)\s*(\*)\s*([^\s+]+)/g, 'lsl_op($1, "*", $3)');
    patched = patched.replace(/([^\s]+)\s*(\+)\s*([^\s]+)/g, 'lsl_op($1, "+", $3)');
    
    return patched;
}

