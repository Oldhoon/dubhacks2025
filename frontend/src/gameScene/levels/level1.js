/**
 * Level 1: Simple Assignment
 * Teach the player to assign a value by placing a unit
 */
export default {
    id: 'level-1',
    title: 'Assignment 101',
    description: 'Learn how assignment works in C by placing units on the grid.',

    codeSnippet: `
int x = 5;
int y = 3;
`,

    codeLines: [
        {
            code: 'int x = 5;',
            operation: 'assign',
            operands: {
                variable: 'x',
                value: 5
            },
            expectedState: {
                variables: {
                    x: 5
                },
                entities: {
                    'entity-x': { row: 0, col: 0 }
                }
            },
            hint: 'Place a Catapult at position (0, 0) to assign x = 5',
            metadata: {
                autoAdvance: true,
                entityType: 'catapult'
            }
        },
        {
            code: 'int y = 3;',
            operation: 'assign',
            operands: {
                variable: 'y',
                value: 3
            },
            expectedState: {
                variables: {
                    x: 5,
                    y: 3
                },
                entities: {
                    'entity-x': { row: 0, col: 0 },
                    'entity-y': { row: 0, col: 1 }
                }
            },
            hint: 'Place a Mage at position (0, 1) to assign y = 3',
            metadata: {
                autoAdvance: true,
                entityType: 'mage'
            }
        }
    ],

    initialState: {
        grid: {
            rows: 5,
            cols: 5
        },
        entities: [],
        variables: {},
        tray: {
            items: [
                { type: 'catapult', metadata: { value: 5 } },
                { type: 'mage', metadata: { value: 3 } }
            ]
        }
    },

    trayConfig: {
        slots: 4,
        items: ['catapult', 'mage']
    },

    metadata: {
        difficulty: 'easy',
        category: 'basics',
        unlocks: ['level-2']
    }
};
