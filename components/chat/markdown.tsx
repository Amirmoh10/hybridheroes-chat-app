import { CHAT_COLORS, CHAT_FONTS } from "@/components/chat/theme";
import { Fragment } from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";

type MarkdownSpan = {
  bold?: boolean;
  code?: boolean;
  text: string;
};

type MarkdownBlock =
  | {
      kind: "paragraph";
      spans: MarkdownSpan[];
    }
  | {
      kind: "heading";
      level: number;
      spans: MarkdownSpan[];
    }
  | {
      kind: "list";
      items: MarkdownSpan[][];
      ordered: boolean;
      start: number;
    }
  | {
      kind: "code";
      text: string;
    };

const BULLET_PATTERN = /^\s*[-*•]\s+(.+)$/;
const CODE_FENCE_PATTERN = /^\s*```(?:\w+)?\s*$/;
const HEADING_PATTERN = /^(#{1,3})\s+(.+)$/;
const ORDERED_LIST_PATTERN = /^\s*(\d+)[.)]\s+(.+)$/;
const MONOSPACE_FONT = Platform.select({
  android: "monospace",
  default: "Menlo",
});

function parseInline(text: string, inheritedSpan: Omit<MarkdownSpan, "text"> = {}) {
  const spans: MarkdownSpan[] = [];
  let index = 0;

  const pushText = (nextText: string, nextSpan = inheritedSpan) => {
    if (!nextText) {
      return;
    }

    spans.push({
      ...nextSpan,
      text: nextText,
    });
  };

  while (index < text.length) {
    const codeIndex = text.indexOf("`", index);
    const boldIndex = text.indexOf("**", index);
    const nextCodeIndex = codeIndex === -1 ? Number.POSITIVE_INFINITY : codeIndex;
    const nextBoldIndex = boldIndex === -1 ? Number.POSITIVE_INFINITY : boldIndex;

    if (nextCodeIndex === Number.POSITIVE_INFINITY && nextBoldIndex === Number.POSITIVE_INFINITY) {
      pushText(text.slice(index));
      break;
    }

    if (nextCodeIndex < nextBoldIndex) {
      pushText(text.slice(index, codeIndex));

      const endIndex = text.indexOf("`", codeIndex + 1);

      if (endIndex === -1) {
        pushText(text.slice(codeIndex));
        break;
      }

      pushText(text.slice(codeIndex + 1, endIndex), {
        ...inheritedSpan,
        code: true,
      });
      index = endIndex + 1;
      continue;
    }

    pushText(text.slice(index, boldIndex));

    const endIndex = text.indexOf("**", boldIndex + 2);

    if (endIndex === -1) {
      pushText(text.slice(boldIndex));
      break;
    }

    spans.push(
      ...parseInline(text.slice(boldIndex + 2, endIndex), {
        ...inheritedSpan,
        bold: true,
      }),
    );
    index = endIndex + 2;
  }

  if (spans.length === 0) {
    pushText(text);
  }

  return spans;
}

function createParagraphBlock(lines: string[]): MarkdownBlock | null {
  const content = lines.join(" ").trim();

  if (!content) {
    return null;
  }

  return {
    kind: "paragraph",
    spans: parseInline(content),
  };
}

function parseMarkdown(text: string) {
  const normalizedText = text.replace(/\r\n/g, "\n").trim();

  if (!normalizedText) {
    return [];
  }

  const lines = normalizedText.split("\n");
  const blocks: MarkdownBlock[] = [];
  let paragraphLines: string[] = [];
  let listItems: string[][] = [];
  let listOrdered = false;
  let listStart = 1;
  let currentListItem: string[] | null = null;
  let codeLines: string[] = [];
  let isCodeBlock = false;

  const pushParagraph = () => {
    const block = createParagraphBlock(paragraphLines);

    if (block) {
      blocks.push(block);
    }

    paragraphLines = [];
  };

  const finishListItem = () => {
    if (!currentListItem || currentListItem.length === 0) {
      currentListItem = null;
      return;
    }

    listItems.push(currentListItem);
    currentListItem = null;
  };

  const pushList = () => {
    finishListItem();

    if (listItems.length === 0) {
      return;
    }

    blocks.push({
      kind: "list",
      items: listItems.map((item) => parseInline(item.join(" ").trim())),
      ordered: listOrdered,
      start: listStart,
    });

    listItems = [];
    listOrdered = false;
    listStart = 1;
  };

  const pushCodeBlock = () => {
    blocks.push({
      kind: "code",
      text: codeLines.join("\n").replace(/\n+$/, ""),
    });

    codeLines = [];
    isCodeBlock = false;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (isCodeBlock) {
      if (CODE_FENCE_PATTERN.test(line)) {
        pushCodeBlock();
      } else {
        codeLines.push(rawLine);
      }

      continue;
    }

    if (!line) {
      pushParagraph();
      pushList();
      continue;
    }

    if (CODE_FENCE_PATTERN.test(line)) {
      pushParagraph();
      pushList();
      isCodeBlock = true;
      continue;
    }

    const headingMatch = line.match(HEADING_PATTERN);

    if (headingMatch) {
      pushParagraph();
      pushList();
      blocks.push({
        kind: "heading",
        level: headingMatch[1].length,
        spans: parseInline(headingMatch[2].trim()),
      });
      continue;
    }

    const bulletMatch = line.match(BULLET_PATTERN);

    if (bulletMatch) {
      if (listOrdered) {
        pushList();
      }

      pushParagraph();
      finishListItem();
      listOrdered = false;
      currentListItem = [bulletMatch[1].trim()];
      continue;
    }

    const orderedMatch = line.match(ORDERED_LIST_PATTERN);

    if (orderedMatch) {
      if (!listOrdered && listItems.length > 0) {
        pushList();
      }

      pushParagraph();
      finishListItem();
      listOrdered = true;
      listStart = listItems.length === 0 ? Number(orderedMatch[1]) : listStart;
      currentListItem = [orderedMatch[2].trim()];
      continue;
    }

    if (currentListItem && /^\s{2,}/.test(rawLine)) {
      currentListItem.push(line);
      continue;
    }

    pushList();
    paragraphLines.push(line);
  }

  if (isCodeBlock) {
    pushCodeBlock();
  }

  pushParagraph();
  pushList();

  return blocks;
}

function renderSpans(spans: MarkdownSpan[], keyPrefix: string) {
  return spans.map((span, index) => (
    <Text
      key={`${keyPrefix}-${index}`}
      style={[
        span.bold ? styles.bold : null,
        span.code ? styles.inlineCode : null,
      ]}
    >
      {span.text}
    </Text>
  ));
}

type MarkdownTextProps = {
  text: string;
};

export function MarkdownText({ text }: MarkdownTextProps) {
  const blocks = parseMarkdown(text);

  return (
    <View style={styles.container}>
      {blocks.map((block, blockIndex) => {
        if (block.kind === "heading") {
          return (
            <Text
              key={`heading-${blockIndex}`}
              style={[
                styles.heading,
                block.level === 1 ? styles.headingLarge : null,
              ]}
            >
              {renderSpans(block.spans, `heading-${blockIndex}`)}
            </Text>
          );
        }

        if (block.kind === "list") {
          return (
            <View key={`list-${blockIndex}`} style={styles.list}>
              {block.items.map((item, itemIndex) => (
                <View key={`list-item-${itemIndex}`} style={styles.listItem}>
                  <Text style={styles.marker}>
                    {block.ordered ? `${block.start + itemIndex}.` : `\u2022`}
                  </Text>
                  <Text style={styles.body}>
                    {renderSpans(item, `list-item-${blockIndex}-${itemIndex}`)}
                  </Text>
                </View>
              ))}
            </View>
          );
        }

        if (block.kind === "code") {
          return (
            <ScrollView
              horizontal={true}
              key={`code-${blockIndex}`}
              showsHorizontalScrollIndicator={false}
              style={styles.codeBlock}
            >
              <Text selectable={true} style={styles.codeBlockText}>
                {block.text || " "}
              </Text>
            </ScrollView>
          );
        }

        return (
          <Fragment key={`paragraph-${blockIndex}`}>
            <Text style={styles.body}>
              {renderSpans(block.spans, `paragraph-${blockIndex}`)}
            </Text>
          </Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 20,
    width: "100%",
  },
  heading: {
    color: CHAT_COLORS.textPrimary,
    fontFamily: CHAT_FONTS.bold,
    fontSize: 21,
    letterSpacing: -0.2,
    lineHeight: 29,
    marginTop: 2,
  },
  headingLarge: {
    fontSize: 23,
    lineHeight: 31,
  },
  list: {
    gap: 17,
    paddingVertical: 2,
  },
  listItem: {
    alignItems: "flex-start",
    flexDirection: "row",
    width: "100%",
  },
  marker: {
    color: CHAT_COLORS.textPrimary,
    fontFamily: CHAT_FONTS.regular,
    fontSize: 19,
    lineHeight: 30,
    marginRight: 18,
    minWidth: 22,
    textAlign: "left",
  },
  body: {
    color: CHAT_COLORS.textPrimary,
    flex: 1,
    fontFamily: CHAT_FONTS.regular,
    fontSize: 19,
    letterSpacing: -0.2,
    lineHeight: 30,
  },
  bold: {
    fontFamily: CHAT_FONTS.bold,
  },
  inlineCode: {
    backgroundColor: CHAT_COLORS.surfaceMuted,
    borderRadius: 5,
    fontFamily: MONOSPACE_FONT,
    fontSize: 17,
  },
  codeBlock: {
    backgroundColor: CHAT_COLORS.surfaceMuted,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    width: "100%",
  },
  codeBlockText: {
    color: CHAT_COLORS.textPrimary,
    fontFamily: MONOSPACE_FONT,
    fontSize: 15,
    lineHeight: 22,
  },
});
