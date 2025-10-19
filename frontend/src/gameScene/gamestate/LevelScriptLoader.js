import { parseTypeDeclaration, getCharacterForType } from './TypeMappings.js';

/**
 * LevelScriptLoader - Loads and parses C snippet metadata
 * Annotates each line with required action type, operands, and validation rules
 */
export default class LevelScriptLoader {
    constructor() {
        this.levels = new Map();
    }

    /**
     * Load level from configuration
     */
    loadLevel(config) {
        const level = {
            id: config.id,
            title: config.title || `Level ${config.id}`,
            description: config.description || '',
            codeSnippet: config.codeSnippet || '',
            codeLines: this.parseCodeLines(config.codeLines || []),
            initialState: config.initialState || {},
            trayConfig: config.trayConfig || { items: [] },
            metadata: config.metadata || {}
        };

        this.levels.set(level.id, level);
        return level;
    }

    /**
     * Parse code lines with metadata
     * Each line can have annotations like:
     * // @action: assign
     * // @operands: x=5
     * // @expected: x should be 5
     */
    parseCodeLines(rawLines) {
        return rawLines.map((line, index) => {
            if (typeof line === 'string') {
                // Simple string - parse automatically
                return this.parseCodeLine(line, index);
            } else {
                // Pre-configured object
                return {
                    lineNumber: index + 1,
                    code: line.code,
                    operation: line.operation || this.inferOperation(line.code),
                    operands: line.operands || {},
                    expectedState: line.expectedState || null,
                    hint: line.hint || '',
                    metadata: line.metadata || {}
                };
            }
        });
    }

    /**
     * Parse a single code line
     */
    parseCodeLine(code, lineNumber) {
        const trimmed = code.trim();

        // Extract inline metadata comments
        const metadata = this.extractMetadata(code);

        return {
            lineNumber: lineNumber + 1,
            code: trimmed,
            operation: metadata.operation || this.inferOperation(trimmed),
            operands: metadata.operands || this.extractOperands(trimmed),
            expectedState: metadata.expectedState || null,
            hint: metadata.hint || '',
            metadata: metadata.custom || {}
        };
    }

    /**
     * Extract metadata from comments in code
     * Supports annotations like:
     * // @action: assign
     * // @hint: Place the catapult at position 0,0
     */
    extractMetadata(code) {
        const metadata = {
            operation: null,
            operands: null,
            expectedState: null,
            hint: '',
            custom: {}
        };

        // Match annotation comments
        const annotationRegex = /\/\/\s*@(\w+):\s*(.+)/g;
        let match;

        while ((match = annotationRegex.exec(code)) !== null) {
            const [, key, value] = match;

            switch (key) {
                case 'action':
                case 'operation':
                    metadata.operation = value.trim();
                    break;

                case 'operands':
                    metadata.operands = this.parseOperandsString(value.trim());
                    break;

                case 'expected':
                case 'expectedState':
                    metadata.expectedState = this.parseExpectedState(value.trim());
                    break;

                case 'hint':
                    metadata.hint = value.trim();
                    break;

                default:
                    metadata.custom[key] = value.trim();
            }
        }

        return metadata;
    }

    /**
     * Infer operation type from code
     */
    inferOperation(code) {
        // Remove comments
        const cleanCode = code.replace(/\/\/.*$/, '').trim();

        // Declaration with initialization: int x = 5;
        if (/^(int|char|short|long|float|double)\s+\w+\s*=\s*.+;?$/.test(cleanCode)) {
            return 'declare';
        }

        // Declaration without initialization: int x;
        if (/^(int|char|short|long|float|double)\s+\w+;?$/.test(cleanCode)) {
            return 'declare';
        }

        // Pointer declaration: int *p = &x;
        if (/^(int|char|short|long|float|double)\s*\*+\s*\w+\s*=\s*&\w+;?$/.test(cleanCode)) {
            return 'reference';
        }

        // Pointer declaration without init: int *p;
        if (/^(int|char|short|long|float|double)\s*\*+\s*\w+;?$/.test(cleanCode)) {
            return 'declare';
        }

        // Array declaration: int arr[5];
        if (/^(int|char|short|long|float|double)\s+\w+\[\d*\];?$/.test(cleanCode)) {
            return 'declare';
        }

        // Dereference write: *p = value;
        if (/^\*\w+\s*=\s*.+;?$/.test(cleanCode)) {
            return 'deref_write';
        }

        // Dereference read: int y = *p;
        if (/^(int|char|short|long|float|double)\s+\w+\s*=\s*\*\w+;?$/.test(cleanCode)) {
            return 'deref_read';
        }

        // Array access: arr[1] = arr[3];
        if (/^\w+\[\d+\]\s*=\s*\w+\[\d+\];?$/.test(cleanCode)) {
            return 'array_access';
        }

        // Simple assignment
        if (/^\w+\s*=\s*.+;?$/.test(cleanCode)) {
            return 'assign';
        }

        // Increment
        if (/^\w+\+\+;?$/.test(cleanCode) || /^\+\+\w+;?$/.test(cleanCode)) {
            return 'increment';
        }

        // Decrement
        if (/^\w+--;?$/.test(cleanCode) || /^--\w+;?$/.test(cleanCode)) {
            return 'decrement';
        }

        // Function call (could be swap, move, etc.)
        if (/^\w+\s*\(.+\);?$/.test(cleanCode)) {
            const funcName = cleanCode.match(/^(\w+)\s*\(/)[1];
            return funcName.toLowerCase();
        }

        return 'unknown';
    }

    /**
     * Extract operands from code
     */
    extractOperands(code) {
        const cleanCode = code.replace(/\/\/.*$/, '').trim();
        const operands = {};

        // Declaration with initialization: int x = 5;
        const declInitMatch = cleanCode.match(/^(\w+)\s+(\w+)\s*=\s*(.+?);?$/);
        if (declInitMatch && !cleanCode.includes('*') && !cleanCode.includes('[')) {
            const typeDecl = parseTypeDeclaration(`${declInitMatch[1]} ${declInitMatch[2]}`);
            if (typeDecl) {
                operands.type = typeDecl.baseType;
                operands.variable = typeDecl.name;
                operands.initialValue = this.parseValue(declInitMatch[3]);
                operands.characterType = typeDecl.character;
                return operands;
            }
        }

        // Simple declaration: int x;
        const declMatch = cleanCode.match(/^(\w+)\s+(\w+);?$/);
        if (declMatch && !cleanCode.includes('*') && !cleanCode.includes('[')) {
            const typeDecl = parseTypeDeclaration(`${declMatch[1]} ${declMatch[2]}`);
            if (typeDecl) {
                operands.type = typeDecl.baseType;
                operands.variable = typeDecl.name;
                operands.characterType = typeDecl.character;
                return operands;
            }
        }

        // Pointer declaration: int *p = &x;
        const ptrDeclMatch = cleanCode.match(/^(\w+)\s*\*+\s*(\w+)\s*=\s*&(\w+);?$/);
        if (ptrDeclMatch) {
            operands.type = ptrDeclMatch[1];
            operands.pointer = ptrDeclMatch[2];
            operands.target = ptrDeclMatch[3];
            operands.characterType = 'catapult';
            return operands;
        }

        // Pointer declaration without init: int *p;
        const ptrDeclSimpleMatch = cleanCode.match(/^(\w+)\s*\*+\s*(\w+);?$/);
        if (ptrDeclSimpleMatch) {
            operands.type = ptrDeclSimpleMatch[1];
            operands.pointer = ptrDeclSimpleMatch[2];
            operands.characterType = 'catapult';
            return operands;
        }

        // Array declaration: int arr[5];
        const arrDeclMatch = cleanCode.match(/^(\w+)\s+(\w+)\[(\d*)\];?$/);
        if (arrDeclMatch) {
            operands.type = arrDeclMatch[1];
            operands.array = arrDeclMatch[2];
            operands.size = arrDeclMatch[3] ? parseInt(arrDeclMatch[3]) : null;
            operands.characterType = 'field';
            return operands;
        }

        // Dereference read: int y = *p;
        const derefReadMatch = cleanCode.match(/^(\w+)\s+(\w+)\s*=\s*\*(\w+);?$/);
        if (derefReadMatch) {
            operands.type = derefReadMatch[1];
            operands.variable = derefReadMatch[2];
            operands.pointer = derefReadMatch[3];
            return operands;
        }

        // Dereference write: *ptr = value;
        const derefMatch = cleanCode.match(/^\*(\w+)\s*=\s*(.+?);?$/);
        if (derefMatch) {
            operands.pointer = derefMatch[1];
            operands.value = this.parseValue(derefMatch[2]);
            return operands;
        }

        // Array access: arr[1] = arr[3];
        const arrAccessMatch = cleanCode.match(/^(\w+)\[(\d+)\]\s*=\s*(\w+)\[(\d+)\];?$/);
        if (arrAccessMatch) {
            operands.array = arrAccessMatch[1];
            operands.destIndex = parseInt(arrAccessMatch[2]);
            operands.sourceArray = arrAccessMatch[3];
            operands.sourceIndex = parseInt(arrAccessMatch[4]);
            operands.operation = arrAccessMatch[1] === arrAccessMatch[3] ? 'copy' : 'assign';
            return operands;
        }

        // Simple assignment: x = 5;
        const assignMatch = cleanCode.match(/^(\w+)\s*=\s*(.+?);?$/);
        if (assignMatch) {
            operands.variable = assignMatch[1];
            operands.value = this.parseValue(assignMatch[2]);
            return operands;
        }

        // Increment/Decrement: x++;
        const incMatch = cleanCode.match(/^(\w+)\+\+;?$/);
        if (incMatch) {
            operands.variable = incMatch[1];
            return operands;
        }

        const decMatch = cleanCode.match(/^(\w+)--;?$/);
        if (decMatch) {
            operands.variable = decMatch[1];
            return operands;
        }

        // Function call: swap(a, b);
        const funcMatch = cleanCode.match(/^(\w+)\s*\((.+)\);?$/);
        if (funcMatch) {
            const args = funcMatch[2].split(',').map(arg => arg.trim());
            operands.function = funcMatch[1];
            operands.args = args;
            return operands;
        }

        return operands;
    }

    /**
     * Parse operands string from annotation
     * Example: "x=5, y=10" -> { x: 5, y: 10 }
     */
    parseOperandsString(str) {
        const operands = {};
        const pairs = str.split(',');

        for (const pair of pairs) {
            const [key, value] = pair.split('=').map(s => s.trim());
            if (key && value !== undefined) {
                operands[key] = this.parseValue(value);
            }
        }

        return operands;
    }

    /**
     * Parse expected state from annotation
     * Example: "x=5, pos(cat)=0,0" -> { variables: { x: 5 }, entities: { cat: {row:0,col:0} } }
     */
    parseExpectedState(str) {
        const state = {
            variables: {},
            entities: {},
            grid: {}
        };

        const parts = str.split(',').map(s => s.trim());

        for (const part of parts) {
            // Variable: x=5
            const varMatch = part.match(/^(\w+)\s*=\s*(.+)$/);
            if (varMatch && !part.includes('(')) {
                state.variables[varMatch[1]] = this.parseValue(varMatch[2]);
                continue;
            }

            // Entity position: pos(cat)=0,0
            const posMatch = part.match(/^pos\((\w+)\)\s*=\s*(\d+),\s*(\d+)$/);
            if (posMatch) {
                state.entities[posMatch[1]] = {
                    row: parseInt(posMatch[2]),
                    col: parseInt(posMatch[3])
                };
            }
        }

        return state;
    }

    /**
     * Parse value (number, string, boolean)
     */
    parseValue(str) {
        const trimmed = str.trim();

        // Number
        if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
            return parseFloat(trimmed);
        }

        // Boolean
        if (trimmed === 'true') return true;
        if (trimmed === 'false') return false;

        // String (remove quotes if present)
        if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
            return trimmed.slice(1, -1);
        }

        if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
            return trimmed.slice(1, -1);
        }

        // Return as-is
        return trimmed;
    }

    /**
     * Get level by ID
     */
    getLevel(levelId) {
        return this.levels.get(levelId);
    }

    /**
     * Get all levels
     */
    getAllLevels() {
        return Array.from(this.levels.values());
    }

    /**
     * Check if level exists
     */
    hasLevel(levelId) {
        return this.levels.has(levelId);
    }

    /**
     * Create a simple level from C code
     */
    createSimpleLevel(id, title, codeSnippet) {
        const lines = codeSnippet.split('\n').filter(line => {
            const trimmed = line.trim();
            return trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('/*');
        });

        return this.loadLevel({
            id,
            title,
            description: `Execute: ${title}`,
            codeSnippet,
            codeLines: lines,
            initialState: {
                grid: { rows: 5, cols: 5 },
                entities: [],
                variables: {}
            },
            trayConfig: {
                items: ['catapult', 'mage', 'necromancer', 'lumberjack']
            }
        });
    }
}
