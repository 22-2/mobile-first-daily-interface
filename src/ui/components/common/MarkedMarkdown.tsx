import Markdown from "marked-react";

interface Props {
  content: string;
}

export const MarkedMarkdown: React.FC<Props> = ({ content }) => {
  return <Markdown>{content}</Markdown>;
};
