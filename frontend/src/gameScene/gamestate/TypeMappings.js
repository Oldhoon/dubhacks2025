/**
 * TypeMappings - Defines C type to game character mappings
 * Maps C data types to specific character classes and their behaviors
 */

/**
 * Type-to-Character Mapping
 */
export const TYPE_TO_CHARACTER = {
    'int': 'necromancer',      // Summons and manipulates entities for integer values
    'char': 'lumberjack',      // Handles byte-sized tasks (trees, single items)
    'short': 'mage',           // Grows/transforms for short integer operations
    'pointer': 'catapult',     // Links memory cells, writes through references
    'array': 'field'           // Indicates contiguous memory cells
};

/**
 * Character-to-Type reverse mapping
 */
export const CHARACTER_TO_TYPE = {
    'necromancer': 'int',
    'lumberjack': 'char',
    'mage': 'short',
    'catapult': 'pointer',
    'field': 'array'
};

/**
 * Character descriptions and capabilities
 */
export const CHARACTER_INFO = {
    'necromancer': {
        type: 'int',
        description: 'Summons and manipulates entities to represent integer values',
        operations: ['assign', 'increment', 'decrement', 'arithmetic'],
        valueRange: [-2147483648, 2147483647]
    },
    'lumberjack': {
        type: 'char',
        description: 'Handles byte-sized tasks like planting or cutting individual trees',
        operations: ['assign', 'increment', 'decrement', 'plant', 'cut'],
        valueRange: [0, 255]
    },
    'mage': {
        type: 'short',
        description: 'Grows or transforms plants to represent short integer operations',
        operations: ['assign', 'increment', 'decrement', 'grow', 'transform'],
        valueRange: [-32768, 32767]
    },
    'catapult': {
        type: 'pointer',
        description: 'Links memory cells and writes through references',
        operations: ['reference', 'dereference', 'fire', 'connect'],
        valueRange: null // Pointers don't store values directly
    },
    'field': {
        type: 'array',
        description: 'Contiguous memory cells that pointer actions can traverse',
        operations: ['index', 'traverse', 'swap'],
        valueRange: null
    }
};

/**
 * C operation to gameplay action mapping
 */
export const OPERATION_TO_ACTION = {
    // Declaration: int x;
    'declare': {
        action: 'spawn',
        description: 'Spawn a new character matching the declared type',
        requiredParams: ['type', 'variableName']
    },

    // Assignment: x = 5;
    'assign': {
        action: 'update_value',
        description: 'Character performs action updating its stored value',
        requiredParams: ['variable', 'value']
    },

    // Pointer creation: int *p = &x;
    'reference': {
        action: 'connect',
        description: 'Catapult connects to target variable to represent reference',
        requiredParams: ['pointer', 'target'],
        characterType: 'catapult'
    },

    // Dereference write: *p = 4;
    'deref_write': {
        action: 'fire',
        description: 'Catapult fires to update the linked variable\'s state',
        requiredParams: ['pointer', 'value'],
        characterType: 'catapult'
    },

    // Dereference read: int y = *p;
    'deref_read': {
        action: 'copy',
        description: 'Spawn new variable entity that copies the pointed value',
        requiredParams: ['variable', 'pointer']
    },

    // Array access: trees[1] = trees[3];
    'array_access': {
        action: 'shuffle',
        description: 'Shuffle or swap values between Field tiles',
        requiredParams: ['array', 'sourceIndex', 'destIndex'],
        characterType: 'field'
    },

    // Increment: x++;
    'increment': {
        action: 'increment',
        description: 'Increase character\'s value by 1',
        requiredParams: ['variable']
    },

    // Decrement: x--;
    'decrement': {
        action: 'decrement',
        description: 'Decrease character\'s value by 1',
        requiredParams: ['variable']
    }
};

/**
 * Get character type for a C type
 */
export function getCharacterForType(cType) {
    // Handle pointer types
    if (cType.includes('*')) {
        return TYPE_TO_CHARACTER.pointer;
    }

    // Handle array types
    if (cType.includes('[')) {
        return TYPE_TO_CHARACTER.array;
    }

    // Clean type (remove const, static, etc.)
    const cleanType = cType.replace(/const|static|volatile/g, '').trim();

    // Check base types
    if (cleanType.startsWith('int')) {
        return TYPE_TO_CHARACTER.int;
    }
    if (cleanType.startsWith('char')) {
        return TYPE_TO_CHARACTER.char;
    }
    if (cleanType.startsWith('short')) {
        return TYPE_TO_CHARACTER.short;
    }

    // Default to necromancer for unknown types
    return TYPE_TO_CHARACTER.int;
}

/**
 * Get C type for a character
 */
export function getTypeForCharacter(character) {
    return CHARACTER_TO_TYPE[character] || 'int';
}

/**
 * Validate value range for character type
 */
export function isValidValueForCharacter(character, value) {
    const info = CHARACTER_INFO[character];
    if (!info || !info.valueRange) {
        return true; // No range restrictions
    }

    const [min, max] = info.valueRange;
    return value >= min && value <= max;
}

/**
 * Check if character can perform operation
 */
export function canPerformOperation(character, operation) {
    const info = CHARACTER_INFO[character];
    if (!info) {
        return false;
    }

    return info.operations.includes(operation);
}

/**
 * Parse C type declaration
 * Examples: "int x", "char* name", "int arr[5]"
 */
export function parseTypeDeclaration(declaration) {
    const cleaned = declaration.trim();

    // Match: type name[size] or type* name or type name
    const arrayMatch = cleaned.match(/^(\w+)\s+(\w+)\[(\d*)\]$/);
    if (arrayMatch) {
        return {
            baseType: arrayMatch[1],
            name: arrayMatch[2],
            isArray: true,
            arraySize: arrayMatch[3] ? parseInt(arrayMatch[3]) : null,
            isPointer: false,
            character: TYPE_TO_CHARACTER.array
        };
    }

    const pointerMatch = cleaned.match(/^(\w+)\s*\*+\s*(\w+)$/);
    if (pointerMatch) {
        return {
            baseType: pointerMatch[1],
            name: pointerMatch[2],
            isArray: false,
            isPointer: true,
            character: TYPE_TO_CHARACTER.pointer
        };
    }

    const simpleMatch = cleaned.match(/^(\w+)\s+(\w+)$/);
    if (simpleMatch) {
        const baseType = simpleMatch[1];
        return {
            baseType,
            name: simpleMatch[2],
            isArray: false,
            isPointer: false,
            character: getCharacterForType(baseType)
        };
    }

    return null;
}
