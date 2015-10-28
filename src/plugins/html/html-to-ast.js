// LICENSE : MIT
"use strict";
import hast from "hast";
import traverse from "traverse";
import StructuredSource from "structured-source";
import {nodeTypes, tagNameToType} from "./mapping";
/**
 * Remove undocumented properties on TxtNode from node
 * @param {TxtNode} node already has loc,range
 */
function removeUnusedProperties(node) {
    if (typeof node !== "object") {
        return;
    }
    ["position"].forEach(function (key) {
        if (node.hasOwnProperty(key)) {
            delete node[key];
        }
    });
}
export function parse(html) {
    var ast = hast.parse(html);
    var src = new StructuredSource(html);
    traverse(ast).forEach(function (node) {
        if (this.notLeaf) {
            // avoid conflict <input type="text" />
            // AST node has type and position
            if (node.type && node.position) {
                node.type = nodeTypes[node.type];
            } else if (node.type === "root") {
                // FIXME: workaround, should fix hast
                node.type = nodeTypes[node.type];
                let position = src.rangeToLocation([0, html.length]);
                // reverse adjust
                node.position = {
                    start: {line: position.start.line, column: position.start.column + 1},
                    end: {line: position.end.line, column: position.end.column + 1}
                };
            }
            // other element is "Html"
            if (node.tagName && !node.type) {
                let type = tagNameToType[node.tagName];
                if (type) {
                    node.type = type;
                } else {
                    node.type = "Html";
                }
            }
            // map `range`, `loc` and `raw` to node
            if (node.position) {
                var position = node.position;
                // TxtNode's line start with 1
                // TxtNode's column start with 0
                var positionCompensated = {
                    start: {line: position.start.line, column: position.start.column - 1},
                    end: {line: position.end.line, column: position.end.column - 1}
                };
                var range = src.locationToRange(positionCompensated);
                node.loc = positionCompensated;
                node.range = range;
                node.raw = html.slice(range[0], range[1]);
            }
        }
        removeUnusedProperties(node);
    });
    return ast;
}

