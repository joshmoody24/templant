/**
 * @typedef IrTextNode
 * @property {"text"} type - Type of the node
 * @property {string} content - Text content
 */

/**
 * @typedef IrExpressionNode
 * @property {"output"} type - Type of the node
 * @property {string[]} filters - Filters applied to the expression - TODO flesh this out
 * @property {string[]} postfix - Postfix expression parts
 */

/**
 */

/**
 * @typedef IrTagNode
 * @property {"tag"} type - Type of the node
 * @property {string} name - Name of the tag
 * @property {Object.<string, string>} attributes - Attributes of the tag
 * @property {IrNode[]} children - Child nodes
 */

/**
 * @typedef {IrTextNode | IrExpressionNode | IrTagNode} IrNode
 */
