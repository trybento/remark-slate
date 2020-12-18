export interface NodeTypes {
  image?: string;
  paragraph?: string;
  block_quote?: string;
  code_block?: string;
  link?: string;
  ul_list?: string;
  ol_list?: string;
  listItem?: string;
  heading?: {
    1?: string;
    2?: string;
    3?: string;
    4?: string;
    5?: string;
    6?: string;
  };
}

export interface OptionType {
  nodeTypes: NodeTypes;
}

export interface MdastNode {
  type?: string;
  name?: string;
  alt?: string;
  ordered?: boolean;
  value?: string;
  text?: string;
  attributes?: any;
  children?: Array<MdastNode>;
  depth?: 1 | 2 | 3 | 4 | 5 | 6;
  url?: string;
  lang?: string;
  // mdast metadata
  position?: any;
  spread?: any;
  checked?: any;
  indent?: any;
}

export const defaultNodeTypes = {
  image: 'image',
  paragraph: 'paragraph',
  block_quote: 'block_quote',
  code_block: 'code_block',
  link: 'link',
  ul_list: 'bulleted-list',
  ol_list: 'numbered-list',
  listItem: 'list-item',
  heading: {
    1: 'heading_one',
    2: 'heading_two',
    3: 'heading_three',
    4: 'heading_four',
    5: 'heading_five',
    6: 'heading_six',
  },
};

export default function deserialize(
  node: MdastNode,
  opts: OptionType = { nodeTypes: {} }
) {
  const types = {
    ...defaultNodeTypes,
    ...opts.nodeTypes,
    heading: {
      ...defaultNodeTypes.heading,
      ...opts?.nodeTypes?.heading,
    },
  };

  let children = [{ text: '' }];

  if (
    node.children &&
    Array.isArray(node.children) &&
    node.children.length > 0
  ) {
    // @ts-ignore
    children = node.children.map((c: MdastNode) =>
      deserialize(
        {
          ...c,
          ordered: node.ordered || false,
        },
        opts
      )
    );
  }

  const formatButton = (node: MdastNode) => {
    const type = 'button';
    const url = node.attributes?.url || '';
    const buttonText = node.children?.[0]?.value || '';

    const children = [
      {
        type: 'text',
        text: buttonText,
      },
    ];

    return {
      type,
      url,
      children,
    };
  };

  const formatFileUpload = (node: MdastNode) => {
    const type = 'file-select';
    const url = node.attributes?.url || '';
    const buttonText = node.children?.[0]?.value || '';

    const children = [
      {
        type: 'text',
        text: buttonText,
      },
    ];

    return {
      type,
      url,
      children,
    };
  };

  const formatInputField = (node: MdastNode) => {
    const type = 'input';
    const placeholder = node.children?.[0]?.value || '';

    const children = [
      {
        type: 'text',
        text: placeholder,
      },
    ];

    return {
      type,
      children,
    };
  };

  const formatDropdown = (node: MdastNode) => {
    const type = 'select';
    const placeholder = node.children?.[0]?.value || '';

    const nodeAttributes = node.attributes || {};
    const optionLabels = Object.values(nodeAttributes);
    const children = optionLabels.map((label) => ({
      type: 'option',
      value: label, // allow setting actual values at a later time
      children: [
        {
          type: 'text',
          text: label,
        },
      ],
    }));

    return {
      type,
      placeholder,
      children,
    };
  };

  switch (node.type) {
    case 'textDirective':
      switch (node.name) {
        case 'button':
          return formatButton(node);
        case 'fileSelect':
          return formatFileUpload(node);
        case 'inputField':
          return formatInputField(node);
        case 'dropdown':
          return formatDropdown(node);
        default:
          throw new Error('Unrecognized directive');
      }
    case 'heading':
      return { type: types.heading[node.depth || 1], children };
    case 'list':
      return { type: node.ordered ? types.ol_list : types.ul_list, children };
    case 'listItem':
      return { type: types.listItem, children };
    case 'paragraph':
      return { type: types.paragraph, children };
    case 'link':
      return { type: types.link, url: node.url, children };
    case 'image':
      return { type: types.image, url: node.url, alt: node.alt, children };
    case 'blockquote':
      return { type: types.block_quote, children };
    case 'code':
      return {
        type: types.code_block,
        language: node.lang,
        children: [{ text: node.value }],
      };

    case 'html':
      if (node.value?.includes('<br>')) {
        return {
          break: true,
          type: types.paragraph,
          children: [{ text: node.value?.replace(/<br>/g, '') || '' }],
        };
      }
      // TODO: Handle other HTML?
      return { type: 'html', children: [{ text: node.value }] };

    case 'emphasis':
      return {
        italic: true,
        ...forceLeafNode(children),
        ...persistLeafFormats(children),
      };
    case 'strong':
      return {
        bold: true,
        ...forceLeafNode(children),
        ...persistLeafFormats(children),
      };
    case 'delete':
      return {
        strikeThrough: true,
        ...forceLeafNode(children),
        ...persistLeafFormats(children),
      };

    case 'text':
    default:
      return { text: node.value || '' };
  }
}

const forceLeafNode = (children: Array<{ text?: string }>) => ({
  text: children.map((k) => k?.text).join(''),
});

// This function is will take any unknown keys, and bring them up a level
// allowing leaf nodes to have many different formats at once
// for example, bold and italic on the same node
function persistLeafFormats(children: Array<MdastNode>) {
  return children.reduce((acc, node) => {
    Object.keys(node).forEach(function (key) {
      if (key === 'children' || key === 'type' || key === 'text') return;

      // @ts-ignore
      acc[key] = node[key];
    });

    return acc;
  }, {});
}
