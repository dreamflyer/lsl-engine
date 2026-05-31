function getOpResultType(leftType: string, rightType: string, op: string) {
    if (['vector', 'rotation', 'list'].includes(leftType) || ['vector', 'rotation', 'list'].includes(rightType)) {
        if (op === '+') return leftType === 'list' || rightType === 'list' ? 'list' : leftType;
        if (op === '*') return leftType === 'vector' && rightType === 'rotation' ? 'vector' : leftType;
        return leftType;
    }
    return 'primitive';
}

function tokenizeSlice(str: string) {
    if (!str) return [];
    return str.match(/(".*?"|\b\d+(?:\.\d+)?\b|[a-zA-Z_][a-zA-Z0-9_]*|==|[\+\-\*\/\=\,]|[^\s\w"]+)/g) || [];
}

export function toJsExpression(node: any, typesMap: { [x: string]: string; }) {
    if(node && typeof node === 'object' && !Array.isArray(node)) {
        const inner:any = toJsExpression(node.content, typesMap);
        if (node.type === '<') return { code: `lsl_vector(${inner.code})`, type: 'vector' };
        if (node.type === '[') return { code: `lsl_list(${inner.code})`, type: 'list' };
        if (node.type === '(') return { code: `(${inner.code})`, type: inner.type };
        return { code: `(${inner.code})`, type: 'primitive' };
    }

    const rawElements = Array.isArray(node) ? node : [node];
    let atoms: any[] = [];
    const lslTypes = ['string', 'integer', 'float', 'vector', 'rotation', 'list'];
    
    for(let i = 0; i < rawElements.length; i++) {
        let el = rawElements[i];
        
        if(typeof el === 'string') {
            let tokens = tokenizeSlice(el);
            for (let token of tokens) {
                atoms.push({ type: 'token', value: token });
            }
        } else if(el && typeof el === 'object') {
            if(el.type === '(') {
                const innerStr = el.content.map((c: string) => typeof c === 'string' ? c.trim() : '').join('');
                if (lslTypes.includes(innerStr)) {
                    atoms.push({
                        type: 'type_cast',
                        castTo: innerStr
                    });
                    continue;
                }
            }

            if(el.type === '(' && atoms.length > 0 && atoms[atoms.length - 1].type === 'token' && /[a-zA-Z_]/.test(atoms[atoms.length - 1].value)) {
                let funcAtom = atoms.pop();
                let innerRes = toJsExpression(el.content, typesMap);
                
                atoms.push({
                    type: 'function_call',
                    name: funcAtom.value,
                    code: `${funcAtom.value}(${innerRes.code})`,
                    returnType: typesMap[funcAtom.value] || 'primitive'
                });
            } else {
                let res = toJsExpression(el, typesMap);
                atoms.push({
                    type: 'lsl_object',
                    code: res.code,
                    lslType: res.type
                });
            }
        }
    }

    let codeChunks: any[] = [];
    let currentType = 'primitive';

    function getNextAtomData(index: number): any {
        let atom = atoms[index];
        if (!atom) return null;

        if (atom.type === 'type_cast') {
            let nextData = getNextAtomData(index + 1);
            if (nextData) {
                return {
                    code: `lsl_type_cast(${nextData.code}, "${atom.castTo}")`,
                    type: atom.castTo,
                    consumedCount: nextData.consumedCount + 1
                };
            }
        }
        if (atom.type === 'lsl_object') {
            return { code: atom.code, type: atom.lslType, consumedCount: 1 };
        }
        if (atom.type === 'function_call') {
            return { code: atom.code, type: atom.returnType, consumedCount: 1 };
        }
        if (atom.type === 'token') {
            let token = atom.value;
            let type = 'primitive';
            if (token.startsWith('"')) type = 'string';
            else if (/[a-zA-Z_]/.test(token)) type = typesMap[token] || 'primitive';
            else if (/^\d/.test(token)) type = 'primitive';
            return { code: token, type: type, consumedCount: 1 };
        }
        return null;
    }

    for (let i = 0; i < atoms.length; i++) {
        let atom = atoms[i];

        if(atom.type === 'type_cast') {
            let nextData = getNextAtomData(i + 1);
            if (nextData) {
                codeChunks.push(`lsl_type_cast(${nextData.code}, "${atom.castTo}")`);
                currentType = atom.castTo;
                i += nextData.consumedCount;
            }
            continue;
        }

        if (atom.type === 'lsl_object') {
            codeChunks.push(atom.code);
            currentType = atom.lslType;
        } 
        else if (atom.type === 'function_call') {
            codeChunks.push(atom.code);
            currentType = atom.returnType;
        } 
        else if (atom.type === 'token') {
            let token = atom.value;

            if (['+', '-', '*', '/'].includes(token)) {
                let nextData = getNextAtomData(i + 1);

                if(currentType === 'vector' || currentType === 'rotation' || currentType === 'list') {
                    let method = token === '+' ? 'add' : token === '*' ? 'mul' : token === '-' ? 'sub' : 'div';
                    let leftHand = codeChunks.pop();

                    if (nextData) {
                        codeChunks.push(`${leftHand}.${method}(${nextData.code})`);
                        currentType = getOpResultType(currentType, nextData.type, token);
                        i += nextData.consumedCount;
                    } else {
                        codeChunks.push(`${leftHand}.${method}(/* syntax error */)`);
                    }
                } else {
                    codeChunks.push(token);
                }
            } 
            else {
                if (token.startsWith('"')) currentType = 'string';
                else if (/[a-zA-Z_]/.test(token)) currentType = typesMap[token] || 'primitive';
                else if (/^\d/.test(token)) currentType = 'primitive';
                
                codeChunks.push(token);
            }
        }
    }

    return {
        code: codeChunks.join(' ').replace(/\s+\./g, '.'),
        type: currentType
    };
}