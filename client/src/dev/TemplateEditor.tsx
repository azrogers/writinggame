import { TextArea } from "semantic-ui-react";
import {
  selectedSentence,
  selectedTopic,
  sentences,
  topics,
} from "./DeveloperMode";
import { useAtom } from "jotai";

const TemplateEditor = () => {
  const [_selectedTopic] = useAtom(selectedTopic);
  const [_topics] = useAtom(topics);
  const [_sentences, _setSentences] = useAtom(sentences);
  const [_selectedSentence] = useAtom(selectedSentence);

  const topic = _topics[_selectedTopic];
  const topicTemplates = _sentences[topic.id].templates;
  const template = topicTemplates[_selectedSentence];

  return (
    <TextArea
      style={{ width: "100%", height: "100%" }}
      value={template}
      onChange={(e) => {
        topicTemplates[_selectedSentence] = e.target.value;
        _setSentences({ ..._sentences });
      }}
    />
  );
};

export default TemplateEditor;
