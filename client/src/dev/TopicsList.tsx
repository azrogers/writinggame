import { useAtom } from "jotai";
import {
  Button,
  Icon,
  List,
  ListContent,
  ListHeader,
  ListItem,
} from "semantic-ui-react";
import { selectedSentence, selectedTopic, topics } from "./DeveloperMode";

const TopicsList = () => {
  const [_selectedTopic, _setSelectedTopic] = useAtom(selectedTopic);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_selectedSentence, _setSelectedSentence] = useAtom(selectedSentence);
  const [_topics, _setTopics] = useAtom(topics);

  return (
    <>
      <List selection verticalAlign="middle">
        {_topics.map((topic, i) => {
          return (
            <ListItem
              active={i == _selectedTopic}
              key={`topic-${i}`}
              onClick={() => {
                _setSelectedTopic(i == _selectedTopic ? -1 : i);
                _setSelectedSentence(-1);
              }}>
              <ListContent>
                <ListHeader>{topic.name}</ListHeader>
                ID: {topic.id}
              </ListContent>
            </ListItem>
          );
        })}
      </List>
      <div className="TopicActions">
        <Button
          icon
          onClick={() => {
            _topics.push({
              id: "",
              name: "",
              layout: "paragraph",
            });
            _setTopics([..._topics]);
          }}>
          <Icon name="add" />
        </Button>
        <Button
          icon
          disabled={_selectedTopic == -1}
          onClick={() => {
            _topics.splice(_selectedTopic, 1);
            _setTopics([..._topics]);
            _setSelectedTopic(-1);
          }}>
          <Icon name="minus" />
        </Button>
      </div>
    </>
  );
};

export default TopicsList;
