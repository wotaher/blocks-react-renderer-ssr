import * as React from 'react';

import { Text } from './Text';

import type {
  Node,
  GetPropsFromNode,
  BlocksComponents,
  ModifiersComponents,
} from './BlocksRenderer';

type BlockComponentProps = GetPropsFromNode<Node>;

interface BlockProps {
  content: Node;
  blocks: BlocksComponents;
  modifiers: ModifiersComponents;
}

const voidTypes = ['image'];

/**
 * Add props that are specific to a block type, and not present in that node type
 */
const augmentProps = (content: Node) => {
  const { children: childrenNodes, type, ...props } = content;

  if (type === 'code') {
    // Builds a plain text string from an array of nodes, regardless of links or modifiers
    const getPlainText = (children: typeof childrenNodes): string => {
      return children.reduce((currentPlainText, node) => {
        if (node.type === 'text') {
          return currentPlainText.concat(node.text);
        }

        if (node.type === 'link') {
          return currentPlainText.concat(getPlainText(node.children));
        }

        return currentPlainText;
      }, '');
    };

    return {
      ...props,
      plainText: getPlainText(content.children),
    };
  }

  return props;
};

const Block = (props: BlockProps) => {
  const { content, blocks, modifiers } = props;

  const { children: childrenNodes, type, ...nodeProps } = content;

  // Get matching React component from the props
  const BlockComponent = blocks[type] as React.ComponentType<BlockComponentProps> | undefined;

  if (!BlockComponent) {
    console.warn(`[@strapi/block-react-renderer] No component found for block type "${type}"`);
    // Don't throw an error, just ignore the block
    return null;
  }

  // Handle void types separately as they should not render children
  if (voidTypes.includes(type)) {
    return <BlockComponent {...nodeProps} />;
  }

  // Handle empty paragraphs separately as they should render a <br> tag
  if (
    type === 'paragraph' &&
    childrenNodes.length === 1 &&
    childrenNodes[0].type === 'text' &&
    childrenNodes[0].text === ''
  ) {
    return <br />;
  }

  const augmentedProps = augmentProps(content);

  return (
    <BlockComponent {...augmentedProps}>
      {childrenNodes.map((childNode, index) => {
        if (childNode.type === 'text') {
          const { type: _type, ...childNodeProps } = childNode;

          // TODO use node as key with WeakMap
          return <Text {...childNodeProps} modifierComponents={modifiers} key={index} />;
        }

        // TODO use node as key with WeakMap
        return <Block {...props} content={childNode} key={index} />;
      })}
    </BlockComponent>
  );
};

export { Block };
