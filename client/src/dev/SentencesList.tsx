import { useAtom } from "jotai";
import {
  selectedSentence,
  selectedTopic,
  sentences,
  topics,
} from "./DeveloperMode";
import { Button, Icon, List, ListContent, ListItem } from "semantic-ui-react";

const SentencesList = () => {
  const [_selectedTopic] = useAtom(selectedTopic);
  const [_topics] = useAtom(topics);
  const [_sentences, _setSentences] = useAtom(sentences);
  const [_selectedSentence, _setSelectedSentence] = useAtom(selectedSentence);

  const topic = _topics[_selectedTopic];
  const topicTemplates = _sentences[topic.id].templates;

  return (
    <>
      <List selection verticalAlign="middle">
        {topicTemplates.map((template, i) => {
          return (
            <ListItem
              active={i == _selectedSentence}
              key={`sentence-${i}`}
              onClick={() => {
                _setSelectedSentence(i == _selectedSentence ? -1 : i);
              }}>
              <ListContent>"{template}"</ListContent>
            </ListItem>
          );
        })}
      </List>
      <div className="SentenceActions">
        <Button
          icon
          onClick={() => {
            topicTemplates.push("");
            _setSentences({ ..._sentences });
          }}>
          <Icon name="add" />
        </Button>
        <Button
          icon
          disabled={_selectedSentence == -1}
          onClick={() => {
            topicTemplates.splice(_selectedSentence, 1);
            _setSentences({ ..._sentences });
            _setSelectedSentence(-1);
          }}>
          <Icon name="minus" />
        </Button>
      </div>
    </>
  );
};

export default SentencesList;
